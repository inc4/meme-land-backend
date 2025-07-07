import { v4 as uuidv4 } from 'uuid';

export class ParticipationService {
  #dataModel;
  #campaignService;
  #presaleContract;
  #composeDataPage;
  #logger;
  #campaignCache;
  #isExistedParticipationProcessed

  constructor(dataModel, campaignService, presaleContract, pageDataComposer, logger) {
    this.#dataModel = dataModel;
    this.#campaignService = campaignService;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
    this.#logger = logger;
    this.#campaignCache = new Map();
    this.#isExistedParticipationProcessed = false;
    this.#presaleContract.subscribe('participateEvent', this.#handleParticipationEvent.bind(this));
    this.#presaleContract.subscribe('calculateDistributionEvent', this.#handleCalculateDistributionEvent.bind(this));
    this.#restoreStateFromLogs()
  }

  async get(conditions, page = 0, limit = 10) {
    const result = await this.#dataModel.paginate(conditions, {
      page: page + 1, // paginate use 1 as first page
      limit,
      sort: { distributionPosition: 1, createdAt: 1 },// -1(DESC) | 1(ASC)
    });
    return this.#composeDataPage(result);
  }

  async #getCampaignId(tokenName, tokenSymbol) {
    const cacheKey = `${tokenName}_${tokenSymbol}`;
    let campaignId = this.#campaignCache.get(cacheKey);

    if (!campaignId) {
      const campaigns = await this.#campaignService.get({ tokenSymbol, tokenName }, 0, 1);
      campaignId = campaigns.page.data[0]?.campaignId;
      if (!campaignId) {
        // throw new Error(`Campaign "${cacheKey}" not found`);
        this.#logger.debug('Participation campaign not found: ', { tokenName, tokenSymbol });
      }
      this.#campaignCache.set(cacheKey, campaignId);
    }
    return campaignId;
  }

  async #getLastProcessedSlot() {
    return (await this.#dataModel
      .findOne()
      .sort('-lastProcessedSlot')
      .select('lastProcessedSlot')
      .lean())
      ?.lastProcessedSlot || null;
  }

  async #restoreStateFromLogs() {
    const lastProcessedSlot = await this.#getLastProcessedSlot()
    if (lastProcessedSlot) {
      await this.#presaleContract.recoverParticipationFromSignatures(lastProcessedSlot, this.#handleSkippedEventsBatch.bind(this))
    }
    this.#isExistedParticipationProcessed = true;
  }

  async #waitUntilExistedParticipantsProcessed(intervalMs = 100) {
    while (!this.#isExistedParticipationProcessed) {
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }


  async #handleParticipationEvent(eventData) {
    if (!this.#isExistedParticipationProcessed) {
      await this.#waitUntilExistedParticipantsProcessed();
    }
    this.#logger.debug('Participation event: ', eventData);
    await this.#saveParticipationRecord(eventData);
  }

  async #handleSkippedEventsBatch(eventDataList) {
    this.#logger.debug(`Handling skipped participation batch. Count: ${eventDataList.length}`);

    const records = await Promise.all(eventDataList.map(async (eventData) => {
      const campaignId = await this.#getCampaignId(eventData.tokenName, eventData.tokenSymbol);

      return {
        participationId: uuidv4(),
        campaignId,
        wallet: eventData.participationAccount,
        solSpent: eventData.solAmount,
        tokenAllocation: eventData.tokenAmount,
        lastProcessedSlot: eventData.lastProcessedSlot
      };
    }));

    try {
      await this.#dataModel.insertMany(records, { ordered: false });
      this.#logger.info(`Inserted ${records.length} skipped participants`);
    } catch (err) {
      this.#logger.warn('Some skipped participants failed to insert:', err.message);
      if (err.code !== 11000) throw err;
    }
  }

  // eventData: {
  //   tokenName: String,
  //   tokenSymbol: String,
  //   solAmount: Decimal,
  //   tokenAmount: Decimal,
  // }
  async #saveParticipationRecord(eventData) {
    const campaignId = await this.#getCampaignId(eventData.tokenName, eventData.tokenSymbol);

    const record = {
      participationId: uuidv4(),
      campaignId,
      wallet: eventData.participationAccount,
      solSpent: eventData.solAmount,
      tokenAllocation: eventData.tokenAmount,
      lastProcessedSlot: eventData.lastProcessedSlot
    };

    try {
      await this.#dataModel.create(record);
    } catch (err) {
      if (err.code !== 11000) {
        throw err;
      }
    }
  }


  // eventData: {
  //   tokenName: String,
  //   tokenSymbol: String,
  // }
  async #handleCalculateDistributionEvent(eventData) {
    this.#logger.info('CalculateDistribution event: ', eventData);
    const { tokenName, tokenSymbol } = eventData;
    const { randomness, totalParticipants } = await this.#presaleContract.getCampaignVRFDescriptor(tokenName, tokenSymbol);

    this.#logger.info('VRFDescriptor retrieved: ', { tokenName, tokenSymbol });

    const campaignId = await this.#getCampaignId(tokenName, tokenSymbol);
    const pageQuery = {
      page: 1, // paginate use 1 as first page
      limit: 100,
      sort: { createdAt: -1 },// -1(DESC) | 1(ASC)
    }

    let hasNextPage = true;
    while (hasNextPage) {
      const participationPage = await this.#dataModel.paginate({ campaignId }, pageQuery);
      setImmediate(async () => {
        const updatePage = participationPage.docs.map((participation) => {
          const distributionPosition = this.#presaleContract.calculateUserGroup(randomness, participation.wallet, totalParticipants);
          return {
            updateOne: {
              filter: { wallet: participation.wallet, campaignId },
              update: { $set: { distributionPosition } }
            }
          }
        });
        await this.#dataModel.bulkWrite(updatePage);
        this.#logger.debug('Distribution position calculated: ',
          {
            tokenName,
            tokenSymbol,
            numberOfParticipants: participationPage.docs.length
          }
        );
      });

      hasNextPage = participationPage.hasNextPage;
      pageQuery.page++;
    }
  }
}