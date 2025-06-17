// TODO: все урлы картинок иследовать формат с фронтами 
// TODO: разобрать с фронтами создание 
// TODO: https://inc4net.atlassian.net/wiki/spaces/ML/pages/1319600129/The+data+and+where+we+download+it+from тут будут апдейтебл филдс и обьязательные полня и вся схема данных по сущностям
import * as mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
  {
    /* === General info */
    campaignId: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
    projectName: { type: String, required: true },
    projectDescription: String,

    socials: {
      twitter: String,
      website: String,
      telegram: String
    },

    /* === PRESALE DATA (Mandatory) */
    presaleData: {
      presalePrice:      { type: mongoose.Types.Decimal128, required: true },
      listingMultiplier: { type: mongoose.Types.Decimal128, required: true },
      listingPrice:      { type: mongoose.Types.Decimal128, required: true },
      profitChance:      { type: mongoose.Types.Decimal128, required: true},
      maxWalletsAllowed:    { type: Number, required: true, immutable: true },
      minInvestmentSize: { type: mongoose.Types.Decimal128, required: true, immutable: true },
      maxInvestmentSize: { type: mongoose.Types.Decimal128, required: true, immutable: true },
      solCollectionWallet:  { type: String, required: true, immutable: true }
    },

    /* === FUNDS DISTRIBUTION  */
    fundsDistribution: {
      fundsToLP:          { type: mongoose.Types.Decimal128, required: true },
      buybackReserve:     { type: mongoose.Types.Decimal128, required: true },
      team:               { type: mongoose.Types.Decimal128, required: true },
      liquidityAtListing: { type: mongoose.Types.Decimal128, required: true },
      priceLevelSupport:  { type: mongoose.Types.Decimal128, required: true }
    },

    /* === TOKENOMICS  */
    tokenomics: {
      details: { type: String, default: '' },
      pieChart: {
        publicProvision: { type: mongoose.Types.Decimal128, required: true },
        liquidity:       { type: mongoose.Types.Decimal128, required: true },
        team:            { type: mongoose.Types.Decimal128, required: true },
        marketing:       { type: mongoose.Types.Decimal128, required: true }
      }
    },

    /* === PRESALE TIME (Mandatory, string-timestamp) */
    presaleTime: {
      startUTC:     { type: String, required: true }, 
      endUTC:       { type: String, required: true },
      drawStartUTC: { type: String, required: true }
    },

    /* === TOKEN INFO LINKS  */
    tokenInfoLinks: {
      solscan:     String,
      dexscreener: String,
      raydium:     String,
      jupiter:     String
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
);

export const campaignModel  = mongoose.model('Campaign', CampaignSchema);
