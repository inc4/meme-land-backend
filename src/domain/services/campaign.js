
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
    data.tokenSupply = this.#settings.tokenSupply;
    data.tokenUnlockInterval = this.#settings.tokenUnlockInterval;
    const { mintPda } = await this.#presaleContract.createToken(CampaignService.composeTokenData(data));
    data.tokenMintPda = mintPda;

    const { campaignPda, campaignStatsPda } = await this.#presaleContract.createCampaign(CampaignService.composeCampaignData(data));
    data.campaignPda = campaignPda;
    data.campaignStatsPda = campaignStatsPda;

    data.campaignId = uuidv4();
    const startDateTimestamp = new Date(data.presaleStartUTC).getTime()
    data.presaleEndUTC = new Date(startDateTimestamp + this.#settings.changeStatusInterval);
    data.presaleDrawStartUTC = new Date(startDateTimestamp + 2 * this.#settings.changeStatusInterval);
    data.presaleDrawEndUTC = new Date(startDateTimestamp + 3 * this.#settings.changeStatusInterval);
    return await this.#dataModel.create(data);
  }

  // request inputs
  static composeTokenData(data) {
    return {
      name: data.tokenName,
      symbol: data.tokenSymbol,
      uri: data.tokenImage, // FIXME: uri for metadata ?? format of metadata ???
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
      tokenSupply: data.tokenSupply,
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