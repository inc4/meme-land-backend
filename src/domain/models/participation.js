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
  solSpent: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  tokenAllocation: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

participationSchema.plugin(mongoosePaginate);

export const participationModel = mongoose.model('Participation', participationSchema);
