
// TODO: когда будет создаваться компания, продумать вопрос измения статусов в бд. делаем интервал день
import { v4 as uuidv4 } from 'uuid';

export class CampaignService {
  #dataModel;
  #presaleContract;
  #composeDataPage;
  #settings;
  #statusDate;
  #isExistedCampaignsProcessed;

  constructor(dataModel, presaleContract, pageDataComposer, settings) {
    this.#dataModel = dataModel;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
    this.#settings = settings;
    this.#statusDate = {
      presaleOpened: 'presaleStartUTC',
      presaleFinished: 'presaleEndUTC',
      distributionOpened: 'presaleDrawStartUTC',
      distributionFinished: 'presaleDrawEndUTC',
    };
    this.#isExistedCampaignsProcessed = false; // indicate that timers for existed campaign was restored
    this.#setExistedCampaignsTimers(); // set timers after server was down
    this.#presaleContract.readSetStatusLogs(this.#handleSetStatusEvent.bind(this))
  }

  async addCampaign(data) {
    // Wait while timers set after server was down
    await this.#waitUntilExistedCampaignProcessed();

    const currentTs = Date.now();

    if (!CampaignService.#isValid(data, currentTs)) {
      return null;
    }

    this.#addDefaults(data);

    const { mintPda } = await this.#presaleContract.createToken(
      CampaignService.composeTokenData(data)
    );
    data.tokenMintPda = mintPda;

    const { campaignPda, campaignStatsPda, tokenAccount } = await this.#presaleContract.createCampaign(
      CampaignService.composeCampaignData(data)
    );
    data.campaignPda = campaignPda;
    data.campaignStatsPda = campaignStatsPda;
    data.tokenDistributionAccount = tokenAccount;

    const campaignData = await this.#dataModel.create(data);

    this.#scheduleCampaignEvents(campaignData, currentTs);

    return campaignData;
  }

  async #waitUntilExistedCampaignProcessed(intervalMs = 100) {
    while (!this.#isExistedCampaignsProcessed) {
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }

  async #setExistedCampaignsTimers() {
    const currentTs = Date.now();

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
        this.#scheduleCampaignEvents(campaign, currentTs);
      });

      hasNextPage = campaignPage.hasNextPage;
      pageQuery.page++;
    }
    this.#isExistedCampaignsProcessed = true;
  }

  #scheduleCampaignEvents(campaignData, currentTs) {
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
    }, CampaignService.ts(campaignData.distributionUTC) - currentTs);
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
      await this.#dataModel.updateOne({ campaignId: campaignData.campaignId }, { currentStatus: status })
    }, CampaignService.ts(campaignData[this.#statusDate[status]]) - currentTs);
  }

  static #isValid(data, currentTs) {
    return CampaignService.ts(data.presaleStartUTC) > currentTs;
  }

  // eventData: {
  //   tokenName: event.token_name,
  //   tokenSymbol: event.token_symbol,
  //   status: event.status,
  // }
  async #handleSetStatusEvent(eventData) {
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