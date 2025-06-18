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
      immutable: true
    },

    /* === TOKEN DATA */
    tokenName: { type: String, required: true },
    tokenSymbol: { type: String, required: true },
    tokenImage: { type: String, required: true },

    /* === PROJECT INFO */
    projectName: { type: String, required: true },
    shortDescription1: { type: String },
    shortDescription2: { type: String },
    bigDescription: [
      {
        header: { type: String },
        text: { type: String }
      }
    ],
    coverImage: { type: String, required: true },
    currentStatus: { type: String, required: true, default: "waiting", enum: ["waiting", "live", "closed", "etc"] },
    presaleProgress: { type: mongoose.Types.Decimal128, required: true, default: 0 },

    walletAddress: { type: String, required: true, immutable: true },

    /* === ON-CHAIN DATA */
    onChainTokenDescriptor: { type: String, required: true },
    onChainCampaignDescriptor: { type: String, required: true },

    /* === PRESALE DATA */
    presalePrice: { type: mongoose.Types.Decimal128, required: true },
    listingMultiplier: { type: mongoose.Types.Decimal128, required: true },
    listingPrice: { type: mongoose.Types.Decimal128, required: true },
    profitChance: { type: mongoose.Types.Decimal128, required: true },
    amountOfWallet: { type: Number, required: true, immutable: true },
    minInvestmentSize: { type: mongoose.Types.Decimal128, required: true, immutable: true },
    maxInvestmentSize: { type: mongoose.Types.Decimal128, required: true, immutable: true },

    /* === PRESALE DATES */
    presaleStartUTC: { type: Date, required: true },
    presaleEndUTC: { type: Date, required: true },
    presaleDrawStartUTC: { type: Date, required: true },

    /* === TOKEN INFO LINKS  */
    solscan: { type: String },
    dexscreener: { type: String },
    raydium: { type: String },
    jupiter: { type: String },

    /* === FUNDS DISTRIBUTION  */
    fundsToLP: { type: mongoose.Types.Decimal128, required: true },
    buybackReserve: { type: mongoose.Types.Decimal128, required: true },
    team: { type: mongoose.Types.Decimal128, required: true },
    liquidityAtListing: { type: mongoose.Types.Decimal128, required: true },
    tokensSentToLP: { type: mongoose.Types.Decimal128, required: true },
    priceLevelSupport: { type: mongoose.Types.Decimal128, required: true },

    /* === PIE CHART */
    publicProvision: { type: mongoose.Types.Decimal128, required: true },
    liquidity: { type: mongoose.Types.Decimal128, required: true },
    pieChartTeam: { type: mongoose.Types.Decimal128, required: true },
    marketing: { type: mongoose.Types.Decimal128, required: true },

    /* === TOKENOMICS  */
    tokenomics: [
      {
        item: { type: String },
        percent: { type: mongoose.Types.Decimal128, required: true },
      }
    ],

    /* === SOCIAL LINKS  */
    twitter: { type: String },
    website: { type: String },
    telegram: { type: String },

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },
  },
);

export const campaignModel = mongoose.model('Campaign', CampaignSchema);
