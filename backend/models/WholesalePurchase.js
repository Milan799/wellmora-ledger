import mongoose from 'mongoose';

const wholesalePurchaseSchema = new mongoose.Schema({
  sellerName: {
    type: String,
    required: [true, 'Seller name is required'],
    trim: true,
    default: 'Dev'
  },
  customSellerName: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    required: [true, 'Product / Goods description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity bought is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Price of product is required'],
    min: [0.01, 'Price must be greater than 0']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0.01, 'Total must be greater than 0']
  },
  date: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: {
      values: ['Done', 'Pending', 'Partial', 'Paid'],
      message: '{VALUE} must be Done, Pending, or Partial'
    },
    default: 'Pending'
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Pending amount cannot be negative']
  },
  paymentMode: {
    type: String,
    default: 'Cash',
    trim: true
  },
  billNumber: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  linkedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true
});

wholesalePurchaseSchema.index({ date: -1, createdAt: -1 });
wholesalePurchaseSchema.index({ sellerName: 1 });
wholesalePurchaseSchema.index({ paymentStatus: 1 });

const WholesalePurchase = mongoose.model('WholesalePurchase', wholesalePurchaseSchema);

export default WholesalePurchase;
