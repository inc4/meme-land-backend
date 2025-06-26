import { v4 as uuidv4 } from 'uuid';


export class ParticipationService {
  #dataModel;
  #campaignService;
  #presaleContract;
  #composeDataPage;
  #campaignCache = new Map();

  constructor(dataModel, campaignService, presaleContract, pageDataComposer) {
    this.#dataModel = dataModel;
    this.#campaignService = campaignService;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
    this.#presaleContract.readParticipationLogs(this.#handleParticipationEvent.bind(this))
  }

  async get(conditions, page = 0, limit = 10) {
    const result = await this.#dataModel.paginate(conditions, {
      page: page + 1, // paginate use 1 as first page
      limit,
      sort: { createdAt: -1 },// -1(DESC) | 1(ASC)
    });
    return this.#composeDataPage(result);
  }

  async #handleParticipationEvent(eventData) {
    console.log("Event received", eventData);

    const cacheKey = `${eventData.tokenName}_${eventData.tokenSymbol}`;
    let campaign = this.#campaignCache.get(cacheKey);

    if (!campaign) {
      const campaigns = await this.#campaignService.get(
        { tokenSymbol: eventData.tokenSymbol },
        0,
        1
      );

      if (!campaigns.data.length) {
        throw new Error(`Campaign with tokenSymbol "${eventData.tokenSymbol}" not found`);
      }

      campaign = campaigns.data[0];
      this.#campaignCache.set(cacheKey, campaign);
      console.log("🎯 Fetched and cached campaign:", campaign);
    } else {
      console.log("🧠 Campaign from cache:", campaign);
    }

    const record = {
      participationId: uuidv4(),
      campaignId: campaign.campaignId,
      wallet: eventData.participantPubkey,
      solSpent: eventData.solAmount,
      tokenAllocation: eventData.tokenAmount
    };

    await this.#dataModel.create(record);
  }
}