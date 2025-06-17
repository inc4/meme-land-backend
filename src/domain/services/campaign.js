
// TODO: когда будет создаваться компания, продумать вопрос измения статусов в бд. делаем интервал день
import { v4 as uuidv4 } from 'uuid';

export class CampaignService {
  #dataModel;
  #presaleContractAdapter;

  constructor(dataModel, presaleContractAdapter) {
    this.#dataModel = dataModel;
    this.#presaleContractAdapter = presaleContractAdapter;
  }

  async addCampaign(data) {
    data.campaignId = uuidv4();
    const campaign = await this.#dataModel.create(data);
    try {
      await this.#presaleContractAdapter.createToken();
    } catch (err) {
      await this.#dataModel.delete({ "campaignId": data.campaignId });
      throw err;
    }
    return campaign;
  }


  async getSingleByCampagneId(tokenId) {
    try{
      return await this.#dataModel.findOne({ inviteCode });
    } catch(err) {
      throw err
    }
  }

}