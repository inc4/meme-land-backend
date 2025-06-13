import * as mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  referrer: {
    type: String,
    index: true,
    required: true,
  },
  wallet: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
  inviteCode: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const walletModel = mongoose.model('Wallet', walletSchema);
