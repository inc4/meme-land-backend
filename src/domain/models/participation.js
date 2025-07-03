import * as mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const participationSchema = new mongoose.Schema({
  participationId: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
  campaignId: {
    type: String,
    index: true,
    required: true,
  },
  wallet: {
    type: String,
    index: true,
    required: true,
  },
  distributionPosition: {
    type: Number,
    required: true,
    default: 100000,
    index: true,
  },
  solSpent: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  tokenAllocation: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  lastProcessedSlot: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
},
  {
    autoIndex: true
  }
);

participationSchema.index({ campaignId: 1, wallet: 1 }, { unique: true });
participationSchema.plugin(mongoosePaginate);

export const participationModel = mongoose.model('Participation', participationSchema);
