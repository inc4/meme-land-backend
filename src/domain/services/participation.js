import { v4 as uuidv4 } from 'uuid';

export class ParticipationService {
  #dataModel;
  #campaignService;
  #presaleContract;
  #composeDataPage;
  #campaignCache;

  constructor(dataModel, campaignService, presaleContract, pageDataComposer) {
    this.#dataModel = dataModel;
    this.#campaignService = campaignService;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
    this.#campaignCache = new Map();
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
    console.log('Participation event: ', eventData);

    const cacheKey = `${eventData.tokenName}_${eventData.tokenSymbol}`;
    let campaignId = this.#campaignCache.get(cacheKey);

    if (!campaignId) {
      const campaigns = await this.#campaignService.get(
        { tokenSymbol: eventData.tokenSymbol, tokenName: eventData.tokenName },
        0,
        1
      );
      campaignId = campaigns.page.data[0]?.campaignId;

      if (!campaignId) {
        throw new Error(`Campaign "${cacheKey}" not found`);
      }

      this.#campaignCache.set(cacheKey, campaignId);
    }

    const record = {
      participationId: uuidv4(),
      campaignId,
      wallet: eventData.participationAccount,
      solSpent: eventData.solAmount,
      tokenAllocation: eventData.tokenAmount,
    };

    await this.#dataModel.create(record);

    try {
      await this.#dataModel.create(record);
    } catch (err) {
      if (err.code !== 11000) {
        throw err;
      }
    }
  }
}