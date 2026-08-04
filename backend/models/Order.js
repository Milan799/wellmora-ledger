import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  orderNumber: {
    type: String,
    trim: true,
    required: [true, 'Order ID (OD...) is required']
  },
  awbNumber: {
    type: String,
    trim: true,
    default: ''
  },
  paymentType: {
    type: String,
    enum: ['PREPAID', 'COD', 'OTHER'],
    default: 'PREPAID'
  },
  productName: {
    type: String,
    trim: true,
    default: ''
  },
  skuId: {
    type: String,
    trim: true,
    default: ''
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  // Box 2: Financial Settlement & Cost Breakdown
  purchaseCost: {
    type: Number,
    default: 0,
    min: 0
  },
  packagingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  otherCost: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCost: {
    type: Number,
    default: 0,
    min: 0
  },
  sellerName: {
    type: String,
    trim: true,
    default: 'WELLMORA ENTERPRISE'
  },
  customerName: {
    type: String,
    trim: true,
    default: ''
  },
  shippingAddress: {
    type: String,
    trim: true,
    default: ''
  },
  pincode: {
    type: String,
    trim: true,
    default: ''
  },
  labelImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for fast query deduplication
orderSchema.index({ orderNumber: 1 });

export default mongoose.model('Order', orderSchema);
