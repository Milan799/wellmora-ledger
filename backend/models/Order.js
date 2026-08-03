import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  description: { type: String, trim: true },
  fsnSku: { type: String, trim: true, default: '' },
  quantity: { type: Number, default: 1 },
  price: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  orderSource: {
    type: String,
    default: 'Flipkart'
  },
  orderNumber: {
    type: String, // e.g. OD328719203910283000
    trim: true,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  vendorCustomer: {
    type: String, // Buyer / Customer Name or Store
    trim: true,
    default: 'Flipkart Customer'
  },
  sellerName: {
    type: String, // e.g. RetailNet, SuperComNet, etc.
    trim: true,
    default: 'Flipkart Seller'
  },
  items: [orderItemSchema],
  amount: {
    type: Number, // Net Paid Total
    required: [true, 'Order net amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  subtotalAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number, // GST Amount
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  orderStatus: {
    type: String,
    enum: ['Ordered', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
    default: 'Delivered'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Refunded'],
    default: 'Paid'
  },
  paymentMode: {
    type: String,
    enum: ['Flipkart Pay Later', 'UPI / PhonePe', 'Cash on Delivery (COD)', 'Credit / Debit Card', 'Net Banking', 'Other'],
    default: 'UPI / PhonePe'
  },
  category: {
    type: String,
    default: 'Flipkart Purchase'
  },
  receiptImage: {
    type: String, // Base64 receipt / screenshot photo
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

orderSchema.index({ date: -1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
