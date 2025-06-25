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
 *         - tokenMetadataUri
 *         - tokenMintAddress
 *         - projectName
 *         - projectLogoImage
 *         - projectCoverImage
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
 *           example: "https://ipfs.io/ipfs/QmAnotherImageCID"
 *         tokenMetadataUri:
 *           type: string
 *           format: uri
 *           example: "https://ipfs.io/ipfs/QmAnotherImageCID"
 *         tokenMintAddress:
 *           type: string
 *           example: "6xbBfC7pL5oSW7bKgT4hvFGAkdapM2iELyP3QwXsu4wm"
 *         projectName:
 *           type: string
 *           example: "Mango Presale"
 *         shortDescription1:
 *           type: string
 *         shortDescription2:
 *           type: string
 *         bigDescriptionHeader1:
 *           type: string
 *           example: "Welcome to Mango"
 *         bigDescriptionHeader2:
 *           type: string
 *           example: "Join the Presale"
 *         bigDescriptionText1:
 *           type: string
 *           example: "Mango is a revolutionary project..."
 *         bigDescriptionText2:
 *           type: string
 *           example: "Participate in our presale to get early access..."
 *         projectLogoImage:
 *           type: string
 *           format: uri
 *           example: "ipfs://QmXYZ.../logo.jpg"
 *         projectCoverImage:
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
 *              enum: ['upcoming','presaleOpened','presaleFinished','distributionOpened','distributionFinished']
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
 *             presaleDrawEndUTC:
 *               type: string
 *               format: date-time
 *               example: "2025-07-02T14:00:00Z"
 *             tokenUnlockInterval:
 *               description: interval in MS
 *               type: number
 *               example: 60000
 *             campaignPda:
 *               type: string
 *               example: "6xbBfC7pL5oSW7bKgT4hvFGAkdapM2iELyP3QwXsu4wm"
 *             campaignStatsPda:
 *               type: string
 *               example: "6xbBfC7pL5oSW7bKgT4hvFGAkdapM2iELyP3QwXsu4wm"
 *             tokenSupply:
 *               type: number
 *               example: 1000000000
 *             tokenMintPda:
 *               type: string
 *               example: "6xbBfC7pL5oSW7bKgT4hvFGAkdapM2iELyP3QwXsu4wm"
 */


export class CampaignController {
  #campaignService;
  #composeError;
  #parseConditions;

  constructor(campaignService, errorComposer, conditionsParser) {
    this.#campaignService = campaignService;
    this.#composeError = errorComposer;
    this.#parseConditions = conditionsParser;
  }

  registerRoutes(router) {
    router.post('/campaigns', this.addCampaign.bind(this));
    router.get('/campaigns/:campaignId', this.getSingleByCampaignId.bind(this));
    router.get('/campaigns', this.get.bind(this));
    router.put('/campaigns/:campaignId', this.updateCampaign.bind(this));
  }

  /**
   * @openapi
   * /campaigns:
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
      if (!req.auth.isAdmin) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }
      const campaignData = await this.#campaignService.addCampaign(req.body);
      return res.status(201).send(campaignData);
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

  /**
   * @openapi
   * /campaigns/{campaignId}:
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
      if (!req.auth.isVerified) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }

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
     * /campaigns:
     *   get:
     *     summary: get campaigns info paginated data
     *     parameters:
     *      - name: conditions
     *        in: query
     *        description: stringified and encoded query conditions, according to Campaign schema, encodeURIComponent(JSON.stringify(conditions). In case of multiple conditions, use '|' as a separator, e.g. currentStatus="upcoming|presaleOpened". Now only for status field.
     *        example: '{"currentStatus":"upcoming|presaleOpened"}'
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
     *         description: Specified by conditions, page and limit, data page with campaign info list
     *         content:
     *          application/json:
     *            schema:
     *              $ref: "#/components/schemas/CampaignOutput"  
     *       500:
     *         $ref: "#/components/responses/InternalServerError"
     */
  async get(req, res, next) {
    try {
      if (!req.auth.isVerified) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }
      const dataPage = await this.#campaignService.get(
        this.#parseConditions(req.query.conditions),
        Number(req.query.page),
        Number(req.query.limit)
      );
      return res.status(200).send(dataPage);
    } catch (err) {
      res.status(500).send(this.#composeError(500, err.message));
      return next(err);
    }
  }

  /**
    * @openapi
    * /campaigns/{campaignId}:
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

      if (!req.auth.isAdmin) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }

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

}
