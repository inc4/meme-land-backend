import { v4 as uuidv4 } from 'uuid';

export class ParticipationService {
  #dataModel;
  #campaignService;
  #presaleContract;
  #eventBus;
  #composeDataPage;
  #logger;
  #campaignCache;

  constructor(dataModel, campaignService, presaleContract, eventBus, pageDataComposer, logger) {
    this.#dataModel = dataModel;
    this.#campaignService = campaignService;
    this.#presaleContract = presaleContract;
    this.#eventBus = eventBus;
    this.#composeDataPage = pageDataComposer;
    this.#logger = logger;
    this.#campaignCache = new Map();
    this.#presaleContract.readParticipationLogs(this.#handleParticipationEvent.bind(this));
    this.#eventBus.on('CalculateDistributionEvent', this.#handleCalculateDistributionEvent.bind(this));
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

  async #handleParticipationEvent(eventData) {
    this.#logger.info('Participation event: ', eventData);

    const campaignId = await this.#getCampaignId(eventData.tokenName, eventData.tokenSymbol);

    const record = {
      participationId: uuidv4(),
      campaignId,
      wallet: eventData.participationAccount,
      solSpent: eventData.solAmount,
      tokenAllocation: eventData.tokenAmount,
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