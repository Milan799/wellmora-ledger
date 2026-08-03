import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  orderNumber: {
    type: String, // OD338181136273805100
    trim: true,
    required: [true, 'Order ID (OD...) is required']
  },
  awbNumber: {
    type: String, // FMPP4174433835
    trim: true,
    default: ''
  },
  paymentType: {
    type: String, // PREPAID / COD
    enum: ['PREPAID', 'COD', 'OTHER'],
    default: 'PREPAID'
  },
  logistics: {
    type: String, // E-Kart Logistics
    trim: true,
    default: 'E-Kart Logistics'
  },
  sellerName: {
    type: String, // WELLMORA ENTERPRISE
    trim: true,
    default: 'WELLMORA ENTERPRISE'
  },
  sellerAddress: {
    type: String,
    trim: true,
    default: '281,Manisha Society,Old Kosad Road,Amroli,Surat , Manisha Society, SURAT - 394107'
  },
  sellerGstin: {
    type: String, // 24CNPPJ4144J1ZS
    trim: true,
    default: '24CNPPJ4144J1ZS'
  },
  customerName: {
    type: String, // Ranjeet
    trim: true,
    default: ''
  },
  shippingAddress: {
    type: String,
    trim: true,
    default: ''
  },
  pincode: {
    type: String, // 226020
    trim: true,
    default: ''
  },
  skuId: {
    type: String, // WE-SEALANT-126
    trim: true,
    default: ''
  },
  itemDescription: {
    type: String, // ZEBREOLINE Waterproof Silicone Sealant for Roof Leakage
    trim: true,
    default: ''
  },
  quantity: {
    type: Number, // QTY
    default: 1
  },
  hbdDate: {
    type: String, // 31 - 07
    default: ''
  },
  cpdDate: {
    type: String, // 05 - 08
    default: ''
  },
  printedDate: {
    type: String, // 29/07/26
    default: ''
  },
  receiptImage: {
    type: String, // Base64 label screenshot
    default: ''
  }
}, {
  timestamps: true
});

orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
