import { v4 as uuidv4 } from 'uuid';


export class ParticipationService {
  #dataModel;
  #campaignService;
  #composeDataPage;

  constructor(dataModel, campaignService, pageDataComposer) {
    this.#dataModel = dataModel;
    this.#campaignService = campaignService;
    this.#composeDataPage = pageDataComposer;
    // FIXME: read all events (since last read time)??? and save using addBatch
  }

  async addBatch(dataBatch) {
    // FIXME: implement
    // read all campaigns(this.#campaignService) ??? 
    // retrieve campaignId for each  participation from retrieved campaigns from db
    // gen participationId for each participation in batch = uuidv4()
    // save all participation from batch using saveMany, splitted by size-controlled batches
  }

  async get(conditions, page = 0, limit = 10) {
    const result = await this.#dataModel.paginate(conditions, {
      page: page + 1, // paginate use 1 as first page
      limit,
      sort: { createdAt: -1 },// -1(DESC) | 1(ASC)
    });
    return this.#composeDataPage(result);
  }


}