
// TODO: когда будет создаваться компания, продумать вопрос измения статусов в бд. делаем интервал день
import { v4 as uuidv4 } from 'uuid';

export class CampaignService {
  #dataModel;
  #presaleContract;

  constructor(dataModel, presaleContract) {
    this.#dataModel = dataModel;
    this.#presaleContract = presaleContract;
  }

  async addCampaign(data) {
    data.campaignId = uuidv4();
    const startDateTimestamp = new Date(data.presaleStartUTC).getTime()
    data.presaleEndUTC = new Date(startDateTimestamp + 24 * 60 * 60 * 1000); // Presale ends 1 day after start
    data.presaleDrawStartUTC = new Date(startDateTimestamp + 48 * 60 * 60 * 1000); // Draw starts 2 days after start
    data.onChainTokenDescriptor = data.onChainTokenDescriptor || "Default Token Descriptor";
    data.onChainCampaignDescriptor = data.onChainCampaignDescriptor || "Default Campaign Descriptor";
    const campaign = await this.#dataModel.create(data);
    try {
      await this.#presaleContract.createCampaign();
    } catch (err) {
      await this.#dataModel.deleteOne({ "campaignId": data.campaignId });
      throw err;
    }
    return campaign;
  }

  async addToken(data) {
    try {
      await this.#presaleContract.createToken(data);
    } catch (err) {
      throw err;
    }
    return true;
  }

  async getSingleByCampaignId(campaignId) {
    try {
      return await this.#dataModel.findOne({ campaignId });
    } catch (err) {
      throw err
    }
  }

}