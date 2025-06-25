// isOwner(){
//   // add to request EXTRA HEADER with wallet address/pubKey 
//   // req.header('X-Wallet');
// }

export class Authentication {
  #composeError;
  #walletModel;

  constructor(walletModel, errorComposer) {
    this.#walletModel = walletModel;
    this.#composeError = errorComposer;
  }

  async retrieveRequester(req, res, next) {
    const wallet = req.header('X-Wallet');

    if (!wallet) {
      return res.status(401).send(this.#composeError(401, 'Unauthorized'));
    }

    const walletData = await this.#walletModel.findOne({ wallet });

    req.auth = {
      wallet: wallet,
      isVerified: walletData ? true : false,
      isAdmin: walletData ? walletData.isAdmin : false,
    };

    return next();
  }
}