import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// GET all Flipkart orders (newest first)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1, createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving Flipkart orders', error: error.message });
  }
});

// POST a new Flipkart order entry
router.post('/', async (req, res) => {
  try {
    const { 
      orderSource,
      orderNumber, 
      date, 
      deliveryDate,
      vendorCustomer, 
      sellerName,
      items, 
      amount, 
      subtotalAmount,
      taxAmount, 
      discountAmount,
      deliveryFee,
      orderStatus,
      paymentStatus, 
      paymentMode, 
      category, 
      receiptImage, 
      notes 
    } = req.body;
    
    if (amount === undefined || amount === null || Number(amount) < 0) {
      return res.status(400).json({ message: 'Valid net order amount is required' });
    }
    
    const newOrder = new Order({
      orderSource: orderSource || 'Flipkart',
      orderNumber: orderNumber || `OD${Date.now()}000`,
      date: date || new Date(),
      deliveryDate: deliveryDate || null,
      vendorCustomer: vendorCustomer || 'Flipkart Customer',
      sellerName: sellerName || 'Flipkart Seller',
      items: Array.isArray(items) ? items : [],
      amount: Number(amount),
      subtotalAmount: Number(subtotalAmount || amount),
      taxAmount: Number(taxAmount || 0),
      discountAmount: Number(discountAmount || 0),
      deliveryFee: Number(deliveryFee || 0),
      orderStatus: orderStatus || 'Delivered',
      paymentStatus: paymentStatus || 'Paid',
      paymentMode: paymentMode || 'UPI / PhonePe',
      category: category || 'Flipkart Purchase',
      receiptImage: receiptImage || '',
      notes: notes || ''
    });
    
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error saving Flipkart order entry', error: error.message });
  }
});

// PUT (update) an existing Flipkart order entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      orderSource,
      orderNumber, 
      date, 
      deliveryDate,
      vendorCustomer, 
      sellerName,
      items, 
      amount, 
      subtotalAmount,
      taxAmount, 
      discountAmount,
      deliveryFee,
      orderStatus,
      paymentStatus, 
      paymentMode, 
      category, 
      receiptImage, 
      notes 
    } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { 
        orderSource,
        orderNumber, 
        date, 
        deliveryDate,
        vendorCustomer, 
        sellerName,
        items, 
        amount: Number(amount), 
        subtotalAmount: Number(subtotalAmount || amount),
        taxAmount: Number(taxAmount || 0), 
        discountAmount: Number(discountAmount || 0),
        deliveryFee: Number(deliveryFee || 0),
        orderStatus,
        paymentStatus, 
        paymentMode, 
        category, 
        receiptImage, 
        notes 
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Flipkart order entry not found' });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating Flipkart order entry', error: error.message });
  }
});

// DELETE a Flipkart order entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({ message: 'Flipkart order entry not found' });
    }

    res.json({ message: 'Flipkart order entry successfully deleted', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting Flipkart order entry', error: error.message });
  }
});

export default router;
