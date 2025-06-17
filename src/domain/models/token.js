import * as mongoose from "mongoose";

const TokenSchema = new mongoose.Schema(
  {
    /* === BASE TOKEN DATA  */
    tokenId: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
    tokenName: { type: String, required: true },
    shortDescription1: String,
    shortDescription2: String,

    /* === DESCRIPTION  */
    bigDescription: [
      {
        header: String,
        text:   String
      }
    ],

    /* === IMAGES  */
    images: {
      logo:      String,  
      bigImage1: String,  
      bigImage2: String   
    },

    /* === SOCIAL LINKS */
    socialLinks: {
      twitter:  String,
      website:  String,
      telegram: String
    },
    createdAt: {
    type: Date,
    default: Date.now,
    },
  },
);

export const tokenModel = mongoose.model('Token', TokenSchema);
