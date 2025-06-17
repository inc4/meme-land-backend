/**
 * @openapi
 * components:
 *   schemas:
 *     CampaignInput:
 *       type: object
 *       properties:
 *         projectName:
 *           type: string
 *           description: Human-readable campaign title
 *           example: "Mango Presale"
 *         projectDescription:
 *           type: string
 *           description: Brief description of the project
 *         socials:
 *           type: object
 *           properties:
 *             twitter:
 *               type: string
 *             website:
 *               type: string
 *             telegram:
 *               type: string
 *         presaleData:
 *           type: object
 *           properties:
 *             presalePrice:
 *               type: number
 *               format: float
 *               description: Token price during presale (in SOL)
 *               example: 0.001
 *             listingPrice:
 *               type: number
 *               format: float
 *               description: Token listing price after presale (in SOL)
 *               example: 0.002
 *             profitChance:
 *               type: number
 *               format: float
 *               description: Chance of profit in percentage (0-100)
 *             listingMultiplier:
 *               type: number
 *               format: float
 *               description: Convenient multiplier = listingPrice / presalePrice
 *               example: 2
 *             maxWalletsAllowed:
 *               type: integer
 *               description: How many unique wallets may participate
 *               example: 1500
 *             minInvestment:
 *               type: number
 *               format: float
 *               description: Minimum investment size in USD
 *               example: 50
 *             maxInvestmentSize:
 *               type: number
 *               format: float
 *               description: Maximum investment size in USD
 *               example: 1000
 *             solCollectionWallet:
 *               type: string
 *               description: SOL address that receives presale funds
 *               example: 6xbBfC7pL5oSW7bKgT4hvFGAkdapM2iELyP3QwXsu4wm
 *         presaleTime:
 *           type: object
 *           properties:
 *             startUTC:
 *               type: string
 *               format: date-time
 *               description: Presale start time in UTC (ISO 8601 format)
 *               example: "123123172931283721"
 *             endUTC:
 *               type: string
 *               format: date-time
 *               description: Presale end time in UTC (ISO 8601 format)
 *               example: "123123172931283721"
 *             drawStartUTC:
 *               type: string
 *               format: date-time
 *               description: Presale draw start time in UTC (ISO 8601 format)
 *               example: "123123172931283721"
 *         fundsDistribution:
 *           type: object
 *           description: Distribution of raised funds
 *           properties:
 *             fundsToLP:
 *               type: number
 *               format: float
 *               description: Amount allocated to liquidity pool
 *               example: 5000
 *             buybackReserve:
 *               type: number
 *               format: float
 *               description: Amount reserved for buybacks
 *               example: 2000
 *             team:
 *               type: number
 *               format: float
 *               description: Amount allocated to the team
 *               example: 1500
 *             liquidityAtListing:
 *               type: number
 *               format: float
 *               description: Liquidity provided at listing
 *               example: 3000
 *             priceLevelSupport:
 *               type: number
 *               format: float
 *               description: Funds reserved for price support
 *               example: 1000
 *         tokenomics:
 *           type: object
 *           description: Tokenomics details
 *           properties:
 *             details:
 *               type: string
 *               description: Additional tokenomics details
 *               example: "Vesting: 12 months, unlock: 10 % at TGE"
 *             pieChart:
 *               type: object
 *               description: Tokenomics pie chart breakdown
 *               properties:
 *                 publicProvision:
 *                   type: number
 *                   format: float
 *                   description: Percentage allocated to public provision
 *                   example: 40
 *                 liquidity:
 *                   type: number
 *                   format: float
 *                   description: Percentage allocated to liquidity
 *                   example: 30
 *                 team:
 *                   type: number
 *                   format: float
 *                   description: Percentage allocated to team
 *                   example: 20
 *                 marketing:
 *                   type: number
 *                   format: float
 *                   description: Percentage allocated to marketing
 *                   example: 10
 *
 *     CampaignOutput:
 *       allOf:
 *         - $ref: "#/components/schemas/CampaignInput"
 *         - type: object
 *           properties:
 *             campaignId:
 *               type: string
 *               description: Unique campaign identifier
 *               example: "abc123"
 *             createdAt:
 *               type: string
 *               format: date-time
 *               description: Campaign creation timestamp
 *               example: "2024-06-01T12:00:00Z"
 */


export class CampaignController {
  #tokenService;
  #campaignService;
  #composeError;

  constructor(tokenService, campaignService, errorComposer) {
    this.#tokenService   = tokenService;
    this.#campaignService = campaignService;
    this.#composeError   = errorComposer;
  }

  registerRoutes(router) {
    router.post('/campaign', this.addCampaign.bind(this));
    router.get('/campaign/:campaignId', this.getSingleByCampaignId.bind(this));
    // TODO: router.put('/campaign/:campaignId', this.updateCampaign.bind(this));
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
      console.log('Authorized');

      const tokenAddress = await this.#tokenService.addToken();
      if (!tokenAddress) {
        return res
          .status(400)
          .send(this.#composeError(400, 'Token creation failed'));
      }

      const campaign = await this.#campaignService.addCampaign(
        req.body,
        tokenAddress,
      );
      if (!campaign) {
        return res
          .status(400)
          .send(this.#composeError(400, 'Campaign creation failed'));
      }

      return res.status(201).send(campaign);
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
      console.log('Authorized');

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
}
