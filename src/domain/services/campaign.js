
// TODO: когда будет создаваться компания, продумать вопрос измения статусов в бд. делаем интервал день
import { v4 as uuidv4 } from 'uuid';

export class CampaignService {
  #dataModel;
  #presaleContract;
  #composeDataPage;
  #settings;

  constructor(dataModel, presaleContract, pageDataComposer, settings) {
    this.#dataModel = dataModel;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
    this.#settings = settings;
  }

  async addCampaign(data) {
    if (!CampaignService.#isValid(data)) {
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

    this.#scheduleCampaignEvents(campaignData);

    return campaignData;
  }

  #scheduleCampaignEvents(campaignData) {
    const { campaignId } = campaignData;

    // presaleStartUTC
    setTimeout(async () => {
      await this.#presaleContract.setCampaignStatus(
        campaignData.tokenName,
        campaignData.tokenSymbol,
        'presaleOpened'
      );
      await this.#dataModel.updateOne({ campaignId }, { currentStatus: 'presaleOpened' })
      console.log(`TIMER EXECUTED: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'presaleOpened'`);
    }, new Date(campaignData.presaleStartUTC).getTime() - Date.now());
    console.log(`TIMER SET: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'presaleOpened'`);

    // presaleEndUTC
    setTimeout(async () => {
      await this.#presaleContract.setCampaignStatus(
        campaignData.tokenName,
        campaignData.tokenSymbol,
        'presaleFinished'
      );
      await this.#dataModel.updateOne({ campaignId }, { currentStatus: 'presaleFinished' })
      console.log(`TIMER EXECUTED: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'presaleFinished'`);
    }, new Date(campaignData.presaleEndUTC).getTime() - Date.now());
    console.log(`TIMER SET: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'presaleFinished'`);

    // distributionUTC
    setTimeout(async () => {
      await this.#presaleContract.calculateDistribution(
        campaignData.tokenName,
        campaignData.tokenSymbol
      );
      console.log(`TIMER EXECUTED: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'calculateDistribution'`);
    }, new Date(campaignData.distributionUTC).getTime() - Date.now());
    console.log(`TIMER SET: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'calculateDistribution'`);


    // presaleDrawStartUTC
    setTimeout(async () => {
      await this.#presaleContract.setCampaignStatus(
        campaignData.tokenName,
        campaignData.tokenSymbol,
        'distributionOpened',
        CampaignService.ts(campaignData.presaleDrawStartUTC)
      );
      await this.#dataModel.updateOne({ campaignId }, { currentStatus: 'distributionOpened' })
      console.log(`TIMER EXECUTED: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'distributionOpened'`);
    }, new Date(campaignData.presaleDrawStartUTC).getTime() - Date.now());
    console.log(`TIMER SET: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'distributionOpened'`);


    // presaleDrawEndUTC
    setTimeout(async () => {
      await this.#presaleContract.setCampaignStatus(
        campaignData.tokenName,
        campaignData.tokenSymbol,
        'distributionFinished'
      );
      await this.#dataModel.updateOne({ campaignId }, { currentStatus: 'distributionFinished' })
      console.log(`TIMER EXECUTED: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'distributionFinished'`);
    }, new Date(campaignData.presaleDrawEndUTC).getTime() - Date.now());
    console.log(`TIMER SET: ${campaignData.tokenName} | ${campaignData.tokenSymbol}: 'distributionFinished'`);
  }

  static #isValid(data) {
    return CampaignService.ts(data.presaleStartUTC) > Date.now();
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