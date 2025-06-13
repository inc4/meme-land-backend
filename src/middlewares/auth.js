// isOwner(){
//   // add to request EXTRA HEADER with wallet address/pubKey 
//   // req.header('X-Wallet');
// }

export class Authentication {
  #composeError;
  constructor(errorComposer) {
    this.#composeError = errorComposer;
  }

  retrieveRequesterWallet(req, res, next) {
    const wallet = req.header('X-Wallet');

    if (!wallet) {
      return res.status(401).send(this.#composeError(401, 'Unauthorized'));
    }

    req.auth = {
      requester: wallet
    };

    return next();
  }
}