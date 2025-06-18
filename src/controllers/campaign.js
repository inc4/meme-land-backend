/**
 * @openapi
 * components:
 *   schemas:
 *     CampaignInput:
 *       type: object
 *       required:
 *         - tokenName
 *         - tokenSymbol
 *         - tokenImage
 *         - projectName
 *         - coverImage
 *         - walletAddress
 *         - presalePrice
 *         - listingMultiplier
 *         - listingPrice
 *         - profitChance
 *         - amountOfWallet
 *         - minInvestmentSize
 *         - maxInvestmentSize
 *         - presaleStartUTC
 *         - fundsToLP
 *         - buybackReserve
 *         - team
 *         - liquidityAtListing
 *         - tokensSentToLP
 *         - priceLevelSupport
 *         - publicProvision
 *         - liquidity
 *         - pieChartTeam
 *         - marketing
 *       properties:
 *         tokenName:
 *           type: string
 *           example: "Mango Token"
 *         tokenSymbol:
 *           type: string
 *           example: "MNGO"
 *         tokenImage:
 *           type: string
 *           format: uri
 *           example: "ipfs://QmXYZ.../mango.png"
 *         projectName:
 *           type: string
 *           example: "Mango Presale"
 *         shortDescription1:
 *           type: string
 *         shortDescription2:
 *           type: string
 *         bigDescription:
 *           type: array
 *           description:     Extended HTML / Markdown sections. ⚠️ This array is **fully overwritten** during update — send the complete array, not partial changes.
 *           items:
 *             type: object
 *             properties:
 *               header:
 *                 type: string
 *               text:
 *                 type: string
 *         coverImage:
 *           type: string
 *           format: uri
 *           example: "ipfs://QmXYZ.../cover.jpg"
 *         walletAddress:
 *           description: SOL address controlling the campaign. IMMUTABLE
 *           type: string
 *           example: "6xbBfC7pL5oSW7bKgT4hvFGAkdapM2iELyP3QwXsu4wm"
 *         presalePrice:
 *           type: number
 *           format: double
 *           example: 0.001
 *         listingMultiplier:
 *           type: number
 *           format: double
 *           example: 2
 *         listingPrice:
 *           type: number
 *           format: double
 *           example: 0.002
 *         profitChance:
 *           type: number
 *           format: double
 *           description: Chance of profit in percentage
 *           example: 75
 *         amountOfWallet:
 *           description: Maximum number of wallets allowed to participate in the presale. IMMUTABLE
 *           type: integer
 *           example: 1500
 *         minInvestmentSize:
 *           description: Minimum investment size in SOL. IMMUTABLE
 *           type: number
 *           format: double
 *           example: 50
 *         maxInvestmentSize:
 *           description: Maximum investment size in SOL. IMMUTABLE
 *           type: number
 *           format: double
 *           example: 1000
 *         presaleStartUTC:
 *           type: string
 *           format: date-time
 *           example: "2025-07-01T12:00:00Z"
 *         solscan:
 *           type: string
 *           format: uri
 *           example: "https://solscan.io/token/..."
 *         dexscreener:
 *           type: string
 *           format: uri
 *         raydium:
 *           type: string
 *           format: uri
 *         jupiter:
 *           type: string
 *           format: uri
 *         fundsToLP:
 *           type: number
 *           format: double
 *           example: 5000
 *         buybackReserve:
 *           type: number
 *           format: double
 *           example: 2000
 *         team:
 *           type: number
 *           format: double
 *           example: 1500
 *         liquidityAtListing:
 *           type: number
 *           format: double
 *           example: 3000
 *         tokensSentToLP:
 *           type: number
 *           format: double
 *           example: 1000000
 *         priceLevelSupport:
 *           type: number
 *           format: double
 *           example: 1000
 *         publicProvision:
 *           type: number
 *           format: double
 *           example: 40
 *         liquidity:
 *           type: number
 *           format: double
 *           example: 30
 *         pieChartTeam:
 *           type: number
 *           format: double
 *           example: 20
 *         marketing:
 *           type: number
 *           format: double
 *           example: 10
 *         tokenomics:
 *           type: array
 *           description: Tokenomics breakdown. ⚠️ This array is **fully overwritten** during update — send the complete array, not partial changes.
 *           items:
 *             type: object
 *             properties:
 *               item:
 *                 type: string
 *                 example: "Advisors"
 *               percent:
 *                 type: number
 *                 format: double
 *                 example: 5
 *         twitter:
 *           type: string
 *           format: uri
 *           example: "https://twitter.com/mango"
 *         website:
 *           type: string
 *           format: uri
 *           example: "https://mango.io"
 *         telegram:
 *           type: string
 *           format: uri
 *           example: "https://t.me/mango_chat"
 *
 *     CampaignOutput:
 *       allOf:
 *         - $ref: "#/components/schemas/CampaignInput"
 *         - type: object
 *           properties:
 *             currentStatus: 
 *              type: string
 *              description: Current status of the campaign
 *              enum: ["waiting", "live", "closed", "etc"]
 *             presaleProgress: 
 *               type: double
 *               description: Progress of the presale in sol,
 *             campaignId:
 *               description: Unique campaign identifier. IMMUTABLE
 *               type: string
 *               example: "d89c1234-fb77-4ed3-88e1-52c71db8c0b6"
 *             createdAt:
 *               description: Campaign creation timestamp. IMMUTABLE
 *               type: string
 *               format: date-time
 *               example: "2025-06-17T12:34:56Z"
 *             presaleEndUTC:
 *               type: string
 *               format: date-time
 *               example: "2025-07-02T12:00:00Z"
 *             presaleDrawStartUTC:
 *               type: string
 *               format: date-time
 *               example: "2025-07-02T14:00:00Z"
 */


export class CampaignController {
  #campaignService;
  #composeError;

  constructor(campaignService, errorComposer) {
    this.#campaignService = campaignService;
    this.#composeError = errorComposer;
  }

  registerRoutes(router) {
    router.post('/campaign', this.addCampaign.bind(this));
    router.get('/campaign/:campaignId', this.getSingleByCampaignId.bind(this));
    router.put('/campaign/:campaignId', this.updateCampaign.bind(this));
    // TODO: router.get('campaign', th)
  }

  /**
   * @openapi
   * /campaign:
   *   post:
   *     summary: Create new campaign and its underlying SPL token
   *     requestBody:
   *       required: true
   *       description: Campaign parameters
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/CampaignInput"
   *     responses:
   *       201:
   *         description: Newly created campaign
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/CampaignOutput"
   *       400:
   *         $ref: "#/components/responses/InvalidInputs"
   *       401:
   *         $ref: "#/components/responses/Unauthorized"
   *       500:
   *         $ref: "#/components/responses/InternalServerError"
   */
  async addCampaign(req, res, next) {
    try {

      const tokenRawData = this.#composeTokenRawData(req.body)

      const tokenData = await this.#campaignService.addToken(tokenRawData);
      if (!tokenData) {
        return res
          .status(400)
          .send(this.#composeError(400, 'Token creation failed'));
      }

      const campaignData = await this.#campaignService.addCampaign(
        req.body,
      );
      if (!campaignData) {
        return res
          .status(400)
          .send(this.#composeError(400, 'Campaign creation failed'));
      }
      return res.status(201).send(campaignData);
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }

  }

  /**
   * @openapi
   * /campaign/{campaignId}:
   *   get:
   *     summary: Get campaign details by ID
   *     parameters:
   *       - in: path
   *         name: campaignId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Campaign info
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/CampaignOutput"
   *       404:
   *         $ref: "#/components/responses/NotFound"
   *       401:
   *         $ref: "#/components/responses/Unauthorized"
   *       500:
   *         $ref: "#/components/responses/InternalServerError"
   */
  async getSingleByCampaignId(req, res, next) {
    try {
      const data = await this.#campaignService.getSingleByCampaignId(
        req.params.campaignId,
      );

      if (data) {
        return res.status(200).send(data);
      }

      return res
        .status(404)
        .send(this.#composeError(404, 'No campaign found'));
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }

  }

  /**
    * @openapi
    * /campaign/{campaignId}:
    *   put:
    *     summary: Update existing campaign
    *     parameters:
    *       - in: path
    *         name: campaignId
    *         required: true
    *         schema:
    *           type: string
    *     requestBody:
    *       required: true
    *       description: Campaign parameters to update
    *       content:
    *         application/json:
    *           schema:
    *             $ref: "#/components/schemas/CampaignInput"
    *     responses:
    *       200:
    *         description: Updated campaign info
    *         content:
    *           application/json:
    *             schema:
    *               $ref: "#/components/schemas/CampaignOutput"
    *       400:
    *         $ref: "#/components/responses/InvalidInputs"
    *       404:
    *         $ref: "#/components/responses/NotFound"
    *       401:
    *         $ref: "#/components/responses/Unauthorized"
    *       500:
    *         $ref: "#/components/responses/InternalServerError"   
   */
  async updateCampaign(req, res, next) {
    try {
      const updated = await this.#campaignService.updateCampaign(
        req.params.campaignId,
        req.body,
      );

      if (updated) {
        return res.status(200).send(updated);
      }

      return res
        .status(404)
        .send(this.#composeError(404, 'No campaign found'));
    } catch (err) {
      if (err.message.includes('immutable')) {
        return res
          .status(400)
          .send(this.#composeError(400, 'Attempted to update immutable field'));
      }
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

  #composeTokenRawData(data) {
    return {
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol
    }
  }
}
