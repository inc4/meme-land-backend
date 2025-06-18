import { v4 as uuidv4 } from 'uuid';

export class WalletService {
  #dataModel;
  #presaleContract;

  constructor(dataModel, presaleContract) {
    this.#dataModel = dataModel;
    this.#presaleContract = presaleContract;
  }

  async addSingle(data) {
    data.inviteCode = uuidv4();
    const user = await this.#dataModel.create(data);
    try {
      await this.#presaleContract.addUser(user.wallet);
    } catch (err) {
      await this.#dataModel.delete({ wallet });
      throw err;
    }
    return user;
  }

  async getSingleByInviteCode(inviteCode) {
    return await this.#dataModel.findOne({ inviteCode });
  }

  async getSingle(wallet) {
    return await this.#dataModel.findOne({ wallet });
  }

  async updateInviteCode(wallet) {
    const inviteCode = uuidv4();
    const resp = await this.#dataModel.updateOne({ wallet }, { inviteCode });
    return (!!(resp && resp.modifiedCount)) ? { inviteCode } : null;
  }

}