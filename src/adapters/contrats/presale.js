export class PresaleContract {
  constructor() {

  }

  async addUser(wallet) {
    // FIXME: implement
    console.log(`Attempt to add wallet(${wallet}) to presale contract user pool`);
  }

  async createToken(tokeData) {
    // FIXME: implement
    console.log(`Attempt to create token(${tokeData}) to presale contract`);
    return {toke: 'token'};
  }

  async createCampaign(campaignData) {
    // FIXME: implement
    console.log(`Attempt to create campaign(${campaignData}) to presale contract`);
    return {campaign: 'campaign'};
  }
}