/**
 * @openapi
 * components:
 *   schemas:
 *     WalletInput:
 *       type: object
 *       required:
 *         - wallet
 *         - referrerInviteCode
 *       properties:
 *         wallet:
 *           type: string
 *           example: A86EzVnP4VnHUKoK1w2DkZ1pYN17U7751YTMNEyGmEmp
 *         referrerInviteCode:
 *           type: string
 *           example: d3c6861a-062d-489a-9837-1fb84d0a7361
 *     WalletOutput:
 *       type: object
 *       properties:
 *         referrer:
 *           type: string
 *           example: A86EzVnP4VnHUKoK1w2DkZ1pYN17U7751YTMNEyGmEmp
 *         wallet:
 *           type: string
 *           example: A86EzVnP4VnHUKoK1w2DkZ1pYN17U7751YTMNEyGmEmp
 *         inviteCode:
 *           type: string
 *           example: d3c6861a-062d-489a-9837-1fb84d0a7361
 *         isAdmin:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-12T12:34:56.789Z"
 *     SafeWalletOutput:
 *       type: object
 *       properties:
 *         referrer:
 *           type: string
 *           example: A86EzVnP4VnHUKoK1w2DkZ1pYN17U7751YTMNEyGmEmp
 *         wallet:
 *           type: string
 *           example: A86EzVnP4VnHUKoK1w2DkZ1pYN17U7751YTMNEyGmEmp
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-12T12:34:56.789Z"
 *     InviteCode:
 *       type: object
 *       properties:
 *         inviteCode:
 *           type: string
 *           example: d3c6861a-062d-489a-9837-1fb84d0a7361
 */
export class WalletController {
  #service;
  #composeError;
  #parseConditions;

  constructor(service, errorComposer, conditionsParser) {
    this.#service = service;
    this.#composeError = errorComposer;
    this.#parseConditions = conditionsParser;
  }


  registerRoutes(router) {
    router.post('/wallets', this.addSingle.bind(this));
    router.get('/wallets/:walletId', this.getSingle.bind(this));
    router.get('/wallets/', this.get.bind(this));
    router.put('/wallets/:walletId/invite-code', this.updateInviteCode.bind(this));
  }

  /**
   * @openapi
   * /wallets:
   *   post:
   *     summary: Add provided wallet address to user pool, previously verify referrerInviteCode
   *     requestBody: 
   *      required: true
   *      description: Properties required to add wallet
   *      content:
   *       application/json:
   *        schema:
   *          $ref: "#/components/schemas/WalletInput"
   *     responses:
   *       201:
   *         description: Added wallet info
   *         content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/WalletOutput"
   *          
   *       400:
   *         $ref: "#/components/responses/InvalidInputs"
   *       401:
   *         $ref: "#/components/responses/Unauthorized"
   *       500:
   *         $ref: "#/components/responses/InternalServerError"
   */
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


  /**
   * @openapi
   * /wallets/{walletId}:
   *   get:
   *     summary: get wallet by wallet address
   *     responses:
   *       200:
   *         description: Specified by walletId wallet info
   *         content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/WalletOutput"
   *          
   *       404:
   *         $ref: "#/components/responses/NotFound"
   *       401:
   *         $ref: "#/components/responses/Unauthorized"
   *       500:
   *         $ref: "#/components/responses/InternalServerError"
   */
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


  /**
   * @openapi
   * /wallets:
   *   get:
   *     summary: get wallets safe info paginated data
   *     parameters:
   *      - name: conditions
   *        in: query
   *        description: stringified and encoded query conditions, according to Wallet schema, encodeURIComponent(JSON.stringify(conditions) 
   *        schema:
   *         type: string
   *      - name: page
   *        in: query
   *        description: data page number starts from 0
   *        schema:
   *          type: number
   *      - name: limit
   *        in: query
   *        description: data page size
   *        schema:
   *          type: number
   *     responses:
   *       200:
   *         description: Specified by conditions, page and limit, data page with wallet info list
   *         content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/SafeWalletOutput"  
   *       500:
   *         $ref: "#/components/responses/InternalServerError"
   */
  async get(req, res, next) {
    try {
      // FIXME: how to authorize ????
      // if (req.auth.requester != req.params.walletId) {
      //   return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      // }
      const dataPage = await this.#service.get(
        this.#parseConditions(req.query.conditions),
        req.query.page,
        req.query.limit
      );
      return res.status(200).send(dataPage);
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }


  // PUT: /wallet/{ wallet_address }/invite-code, , with empty body{}
  /**
   * @openapi
   * /wallets:
   *   put:
   *     summary: Regenerate wallet invite code 
   *     requestBody: 
   *      description: Empty body
   *      content:
   *       application/json:
   *        schema:
   *          $ref: "#/components/schemas/EmptyBody"
   *     responses:
   *       200:
   *         description: Newly generated invite code
   *         content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/InviteCode"
   *          
   *       400:
   *         $ref: "#/components/responses/InvalidInputs"
   *       401:
   *         $ref: "#/components/responses/Unauthorized"
   *       500:
   *         $ref: "#/components/responses/InternalServerError"
   */
  async updateInviteCode(req, res, next) {
    try {
      if (req.auth.requester != req.params.walletId) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }
      const inviteCode = await this.#service.updateInviteCode(req.params.walletId);
      if (!inviteCode) {
        return res.status(400).send(this.#composeError(400, 'Invalid wallet address'));
      }
      return res.status(200).send(inviteCode);
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

}
