export class WalletController {
  #service;
  #composeError;

  constructor(service, errorComposer) {
    this.#service = service;
    this.#composeError = errorComposer;
  }


  registerRoutes(router) {
    router.post('/wallets', this.addSingle.bind(this));
    //FIXME:  router.get('/wallets/count', this.addSingle.bind(this)); ????????????
    router.get('/wallets/:walletId', this.getSingle.bind(this));
    router.put('/wallets/:walletId/invite-code', this.updateInviteCode.bind(this));
  }

  // POST: /wallet {referrerInviteCode: , wallet:}
  async addSingle(req, res, next) {
    try {
      if (req.auth.requester != req.body.wallet) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }

      const referrer = await this.#service.getSingleByInviteCode(req.body.referrerInviteCode);
      if (!referrer) {
        return res.status(400).send(this.#composeError(400, 'Invalid referrer'));
      }
      const data = await this.#service.addSingle({ referrer: referrer.wallet, wallet: req.body.wallet });
      return res.status(201).send(data);
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

  //  GET: /wallet/{ wallet_address }, wallet.inviteCode
  async getSingle(req, res, next) {
    try {
      if (req.auth.requester != req.params.walletId) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }
      const data = await this.#service.getSingle(req.params.walletId);
      if (data) {
        return res.status(200).send(data);
      }
      return res.status(404).send(this.#composeError(404, 'No wallets found'));
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }


  // PUT: /wallet/{ wallet_address }/invite-code, , with empty body{}
  async updateInviteCode(req, res, next) {
    try {
      if (req.auth.requester != req.params.walletId) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }
      const inviteCode = await this.#service.updateInviteCode(req.params.walletId);
      if (!inviteCode) {
        return res.status(404).send(this.#composeError(400, 'Invalid wallet address'));
      }
      return res.status(200).send(inviteCode);
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }
}
