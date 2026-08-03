import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  description: { type: String, trim: true },
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
  orderNumber: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  vendorCustomer: {
    type: String,
    trim: true,
    default: 'General Order'
  },
  items: [orderItemSchema],
  amount: {
    type: Number,
    required: [true, 'Order total amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Refunded'],
    default: 'Paid'
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Other'],
    default: 'UPI'
  },
  category: {
    type: String,
    default: 'Purchase'
  },
  receiptImage: {
    type: String, // Base64 data URL or photo URL
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
