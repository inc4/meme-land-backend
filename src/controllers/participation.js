/**
 * @openapi
 * components:
 *   schemas:
 *     ParticipationOutput:
 *       type: object
 *       properties:
 *         participationId:
 *           type: string
 *           example: d3c6861a-062d-489a-9837-1fb84d0a7361
 *         campaignId:
 *           type: string
 *           example: d3c6861a-062d-489a-9837-1fb84d0a7361
 *         wallet:
 *           type: string
 *           example: A86EzVnP4VnHUKoK1w2DkZ1pYN17U7751YTMNEyGmEmp
 *         solSpent:
 *           type: double
 *           example: 0.001
 *         tokenAllocation:
 *           type: double
 *           example: 0.001
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-12T12:34:56.789Z"
 */
export class ParticipationController {
  #service;
  #composeError;
  #parseConditions;

  constructor(service, errorComposer, conditionsParser) {
    this.#service = service;
    this.#composeError = errorComposer;
    this.#parseConditions = conditionsParser;
  }


  registerRoutes(router) {
    router.get('/participations/', this.get.bind(this));
  }

  /**
   * @openapi
   * /participations:
   *   get:
   *     summary: get participations info paginated data
   *     parameters:
   *      - name: conditions
   *        in: query
   *        description: stringified and encoded query conditions, according to Participation schema, encodeURIComponent(JSON.stringify(conditions) 
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
   *         description: Specified by conditions, page and limit, data page with participation info list
   *         content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/ParticipationOutput"  
   *       500:
   *         $ref: "#/components/responses/InternalServerError"
   */
  async get(req, res, next) {
    try {
      if (!req.auth.isVerified) {
        return res.status(401).send(this.#composeError(401, 'Unauthorized'));
      }
      const dataPage = await this.#service.get(
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

}
