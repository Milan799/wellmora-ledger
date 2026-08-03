import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// GET all orders (sorted newest first)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1, createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving orders', error: error.message });
  }
});

// POST a new order entry
router.post('/', async (req, res) => {
  try {
    const { 
      orderNumber, 
      date, 
      vendorCustomer, 
      items, 
      amount, 
      taxAmount, 
      paymentStatus, 
      paymentMode, 
      category, 
      receiptImage, 
      notes 
    } = req.body;
    
    if (amount === undefined || amount === null || Number(amount) < 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    const newOrder = new Order({
      orderNumber: orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
      date: date || new Date(),
      vendorCustomer: vendorCustomer || 'General Order',
      items: Array.isArray(items) ? items : [],
      amount: Number(amount),
      taxAmount: Number(taxAmount || 0),
      paymentStatus: paymentStatus || 'Paid',
      paymentMode: paymentMode || 'UPI',
      category: category || 'Purchase',
      receiptImage: receiptImage || '',
      notes: notes || ''
    });
    
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error saving order entry', error: error.message });
  }
});

// PUT (update) an existing order entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      orderNumber, 
      date, 
      vendorCustomer, 
      items, 
      amount, 
      taxAmount, 
      paymentStatus, 
      paymentMode, 
      category, 
      receiptImage, 
      notes 
    } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { 
        orderNumber, 
        date, 
        vendorCustomer, 
        items, 
        amount: Number(amount), 
        taxAmount: Number(taxAmount || 0), 
        paymentStatus, 
        paymentMode, 
        category, 
        receiptImage, 
        notes 
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order entry not found' });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order entry', error: error.message });
  }
});

// DELETE an order entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order entry not found' });
    }

    res.json({ message: 'Order entry successfully deleted', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order entry', error: error.message });
  }
});

export default router;
