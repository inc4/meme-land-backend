import { v4 as uuidv4 } from 'uuid';

export class WalletService {
  #dataModel;
  #presaleContract;
  #composeDataPage;
  #logger;

  constructor(dataModel, presaleContract, pageDataComposer, logger) {
    this.#dataModel = dataModel;
    this.#presaleContract = presaleContract;
    this.#composeDataPage = pageDataComposer;
    this.#logger = logger;
  }

  async addSingle(data) {
    await this.#presaleContract.addUser(data.wallet);
    data.inviteCode = uuidv4();
    const userData = await this.#dataModel.create(data);

    this.#logger.debug('User created: ', {
      referrer: this.#walletToSaveView(userData.referrer),
      wallet: this.#walletToSaveView(userData.wallet),
      isAdmin: userData.isAdmin,
      createdAt: userData.createdAt
    });
    return userData;
  }

  async getSingleByInviteCode(inviteCode) {
    return await this.#dataModel.findOne({ inviteCode });
  }

  async getSingle(wallet) {
    return await this.#dataModel.findOne({ wallet });
  }

  async get(conditions, page = 0, limit = 10) {
    const result = await this.#dataModel.paginate(conditions, {
      page: page + 1, // paginate use 1 as first page
      limit,
      sort: { createdAt: -1 },// -1(DESC) | 1(ASC)
    });
    return this.#composeDataPage(result);
  }

  async updateInviteCode(wallet) {
    const inviteCode = uuidv4();
    const resp = await this.#dataModel.updateOne({ wallet }, { inviteCode });
    this.#logger.debug('Invite code updated: ', { wallet, inviteCode });
    return (!!(resp && resp.modifiedCount)) ? { inviteCode } : null;
  }

  #walletToSaveView(wallet) {
    return wallet.substring(0, 4);
  }
}