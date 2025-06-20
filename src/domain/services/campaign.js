
// TODO: когда будет создаваться компания, продумать вопрос измения статусов в бд. делаем интервал день
import { v4 as uuidv4 } from 'uuid';

export class CampaignService {
  #dataModel;
  #presaleContract;
  #composeDataPage;

  constructor(dataModel, presaleContract, pageDataComposer) {
    this.#dataModel = dataModel;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
  }

  async addCampaign(data) {
    data.campaignId = uuidv4();
    const startDateTimestamp = new Date(data.presaleStartUTC).getTime()
    data.presaleEndUTC = new Date(startDateTimestamp + 24 * 60 * 60 * 1000); // Presale ends 1 day after start
    data.presaleDrawStartUTC = new Date(startDateTimestamp + 48 * 60 * 60 * 1000); // Draw starts 2 days after start
    data.presaleDrawEndUTC = new Date(startDateTimestamp + 72 * 60 * 60 * 1000); // Draw ends 3 days after start
    const campaign = await this.#dataModel.create(data);
    try {
      await this.#presaleContract.createCampaign(data);
    } catch (err) {
      await this.#dataModel.deleteOne({ campaignId: data.campaignId });
      throw err;
    }
    return campaign;
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

  async addToken(data) {
    try {
      return await this.#presaleContract.createToken(data);
    } catch (err) {
      return null;
    }
  }

  async getSingleByCampaignId(campaignId) {
    return await this.#dataModel.findOne({ campaignId });
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