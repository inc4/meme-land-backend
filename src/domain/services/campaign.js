
// TODO: когда будет создаваться компания, продумать вопрос измения статусов в бд. делаем интервал день
import { v4 as uuidv4 } from 'uuid';

export class CampaignService {
  #dataModel;
  #presaleContract;
  #composeDataPage;
  #settings;
  #logger;
  #statusDate;
  #isExistedCampaignsProcessed;

  constructor(dataModel, presaleContract, pageDataComposer, settings, logger) {
    this.#dataModel = dataModel;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
    this.#settings = settings;
    this.#logger = logger;

    this.#statusDate = {
      presaleOpened: 'presaleStartUTC',
      presaleFinished: 'presaleEndUTC',
      distributionOpened: 'presaleDrawStartUTC',
      distributionFinished: 'presaleDrawEndUTC',
    };
    this.#isExistedCampaignsProcessed = false; // indicate that timers for existed campaign was restored
    this.#setExistedCampaignsTimers(); // set timers after server was down
    this.#presaleContract.subscribe('setStatusEvent', this.#handleSetStatusEvent.bind(this))
  }

  async addCampaign(data) {
    // Wait while timers set after server was down
    await this.#waitUntilExistedCampaignProcessed();

    if (!CampaignService.#isValid(data, Date.now())) {
      this.#logger.debug('Invalid campaign input ts: ', data);
      return null;
    }

    this.#addDefaults(data);

    const tokenData = CampaignService.composeTokenData(data);
    const { mintPda } = await this.#presaleContract.createToken(tokenData);
    data.tokenMintPda = mintPda;
    this.#logger.info('Token created on-chain: ', tokenData);


    const campaignData = CampaignService.composeCampaignData(data);
    const { campaignPda, campaignStatsPda, tokenAccount } = await this.#presaleContract.createCampaign(
      campaignData
    );
    data.campaignPda = campaignPda;
    data.campaignStatsPda = campaignStatsPda;
    data.tokenDistributionAccount = tokenAccount;
    this.#logger.info('Campaign created on-chain: ', campaignData);

    const campaign = await this.#dataModel.create(data);

    this.#logger.info('Campaign created: ', { campaignId: campaign.campaignId });

    this.#scheduleCampaignEvents(campaign);

    return campaign;
  }

  async #waitUntilExistedCampaignProcessed(intervalMs = 100) {
    while (!this.#isExistedCampaignsProcessed) {
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }

  async #setExistedCampaignsTimers() {
    const conditions = { currentStatus: { $ne: 'distributionFinished' } };
    const pageQuery = {
      page: 1, // paginate use 1 as first page
      limit: 100,
      sort: { createdAt: -1 },// -1(DESC) | 1(ASC)
    }

    let hasNextPage = true;
    while (hasNextPage) {
      const campaignPage = await this.#dataModel.paginate(conditions, pageQuery);
      campaignPage.docs.forEach((campaign) => {
        this.#scheduleCampaignEvents(campaign);
      });

      hasNextPage = campaignPage.hasNextPage;
      pageQuery.page++;
    }
    this.#isExistedCampaignsProcessed = true;
  }

  #scheduleCampaignEvents(campaignData) {
    const currentTs = Date.now();
    Object.keys(this.#statusDate).forEach((status) => {
      this.#scheduleSetStatus(campaignData, status, currentTs);
    });
    this.#scheduleDistribution(campaignData, currentTs);
  }

  #scheduleDistribution(campaignData, currentTs) {
    if (currentTs > campaignData.distributionUTC) {
      return;
    }
    setTimeout(async () => {
      await this.#presaleContract.calculateDistribution(
        campaignData.tokenName,
        campaignData.tokenSymbol
      );
      this.#logger.info('CalculateDistribution timer executed: ',
        {
          tokenName: campaignData.tokenName,
          tokenSymbol: campaignData.tokenSymbol,
          date: campaignData.distributionUTC,
        }
      );
    }, CampaignService.ts(campaignData.distributionUTC) - currentTs);
    this.#logger.info('CalculateDistribution timer set: ',
      {
        tokenName: campaignData.tokenName,
        tokenSymbol: campaignData.tokenSymbol,
        date: campaignData.distributionUTC,
      }
    );
  }

  #scheduleSetStatus(campaignData, status, currentTs) {
    if (currentTs > CampaignService.ts(campaignData[this.#statusDate[status]])) {
      return;
    }
    setTimeout(async () => {
      await this.#presaleContract.setCampaignStatus(
        campaignData.tokenName,
        campaignData.tokenSymbol,
        status,
        status === 'distributionOpened' ? CampaignService.ts(campaignData.presaleDrawStartUTC) : undefined,
      );
      await this.#dataModel.updateOne({ campaignId: campaignData.campaignId }, { currentStatus: status });
      this.#logger.info('Set status timer exec: ',
        {
          tokenName: campaignData.tokenName,
          tokenSymbol: campaignData.tokenSymbol,
          status: status,
          date: campaignData[this.#statusDate[status]],
        }
      );
    }, CampaignService.ts(campaignData[this.#statusDate[status]]) - currentTs);
    this.#logger.info('Set status timer set: ',
      {
        tokenName: campaignData.tokenName,
        tokenSymbol: campaignData.tokenSymbol,
        status: status,
        date: campaignData[this.#statusDate[status]],
      }
    );
  }

  static #isValid(data, currentTs) {
    return CampaignService.ts(data.presaleStartUTC) > currentTs;
  }

  // eventData: {
  //   tokenName: String,
  //   tokenSymbol: String,
  //   status: String,
  // }
  async #handleSetStatusEvent(eventData) {
    this.#logger.info('SetStatus event: ', eventData);
    await this.#dataModel.updateOne(
      { tokenName: eventData.tokenName, eventData: eventData.tokenSymbol },
      { currentStatus: eventData.status }
    );
  }

  #addDefaults(data) {
    data.campaignId = uuidv4();
    data.tokenSupply = this.#settings.tokenSupply;
    data.tokenUnlockInterval = this.#settings.tokenUnlockInterval;

    data.presaleEndUTC = new Date(CampaignService.ts(data.presaleStartUTC) + this.#settings.presaleDuration);
    data.distributionUTC = new Date(CampaignService.ts(data.presaleEndUTC) + this.#settings.distributionDelay);
    data.presaleDrawStartUTC = new Date(CampaignService.ts(data.presaleEndUTC) + this.#settings.drawStartDelay);
    data.presaleDrawEndUTC = new Date(CampaignService.ts(data.presaleDrawStartUTC)
      + (data.amountOfWallet - 1) * data.tokenUnlockInterval
      + this.#settings.claimTokenMinInterval
    );
  }

  // get date timestamp
  static ts(date) {
    return new Date(date).getTime();
  }

  // request inputs
  static composeTokenData(data) {
    return {
      name: data.tokenName,
      symbol: data.tokenSymbol,
      uri: data.tokenMetadataUri,
      amount: data.tokenSupply,
      receiver: data.tokenMintAddress
    }
  }

  static composeCampaignData(data) {
    return {
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      step: data.tokenUnlockInterval,
      price: data.presalePrice,
      minAmount: data.minInvestmentSize,
      maxAmount: data.maxInvestmentSize,
      // FIXME: maybe use decimal math ?
      tokenSupply: data.tokenSupply * (100 - data.tokensSentToLP) / 100,
      listingPrice: data.listingPrice,
      numberOfWallets: data.amountOfWallet,
      solTreasury: data.walletAddress,
    }
  }

  async updateCampaign(campaignId, data) {
    try {
      const updated = await this.#dataModel.findOneAndUpdate(
        { campaignId },
        { $set: data },
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new Error(`Campaign with ID ${campaignId} not found.`);
      }

      this.#logger.info('Campaign updated: ', updated);

      return updated;

    } catch (err) {
      if (err.name === 'StrictModeError' || err.message.includes('immutable')) {
        throw new Error(`Attempted to update immutable field: ${err.message}`);
      }
      throw err;
    }
  }

  async getSingleByCampaignId(campaignId) {
    return await this.#dataModel.findOne({ campaignId });
  }

  async get(conditions, page = 0, limit = 10) {
    if (conditions.currentStatus) {
      const statusArray = conditions.currentStatus.split('|');
      conditions.currentStatus = { $in: statusArray };
    }
    const result = await this.#dataModel.paginate(conditions, {
      page: page + 1, // paginate use 1 as first page
      limit,
      sort: { createdAt: -1 },// -1(DESC) | 1(ASC)
    });
    return this.#composeDataPage(result);
  }

}