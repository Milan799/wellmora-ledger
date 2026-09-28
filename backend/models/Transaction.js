import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  category: {
    type: String,
    default: 'Others',
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['Credit', 'Debit'],
      message: '{VALUE} must be either Credit or Debit'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  date: {
    type: Date,
    default: Date.now
  },
  isHandCash: {
    type: Boolean,
    default: false
  },
  // Wholesale purchase attributes (for seamless display in Expenses & Main Dashboard)
  isWholesalePurchase: {
    type: Boolean,
    default: false
  },
  sellerName: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number
  },
  unitPrice: {
    type: Number
  },
  totalAmount: {
    type: Number
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  pendingAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Done', 'Pending', 'Partial', 'Paid', 'Completed'],
    default: 'Done'
  },
  billNumber: {
    type: String,
    trim: true,
    default: ''
  },
  wholesalePurchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WholesalePurchase'
  }
}, {
  timestamps: true
});

transactionSchema.index({ date: -1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
