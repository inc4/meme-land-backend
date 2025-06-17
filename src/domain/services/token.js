import { v4 as uuidv4 } from 'uuid';

export class TokenService {
  #dataModel;
  #tokenContractAdapter;

  constructor(dataModel, tokenContractAdapter) {
    this.#dataModel = dataModel;
    this.#tokenContractAdapter = tokenContractAdapter;
  }

  async addToken(data) {
    data.tokenId = uuidv4();
    const token = await this.#dataModel.create(data);
    try {
      await this.#tokenContractAdapter.createToken();
    } catch (err) {
      await this.#dataModel.delete({ "tokenId": data.tokenId });
      throw err;
    }
    return token;
  }

  async getSingleByTokenId(tokenId) {
    try {
      return await this.#dataModel.findOne({ tokenId });
    } catch (err) {
      throw err;
    }
  }

}