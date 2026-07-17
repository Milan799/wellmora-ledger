import mongoose from 'mongoose';

const partnerFlowSchema = new mongoose.Schema({
  partnerName: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Flow type is required'],
    enum: {
      values: ['Capital Contribution', 'Profit Withdrawal', 'Share Distribution'],
      message: '{VALUE} is not a valid flow type'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

partnerFlowSchema.index({ date: -1, createdAt: -1 });

const PartnerFlow = mongoose.model('PartnerFlow', partnerFlowSchema);

export default PartnerFlow;
