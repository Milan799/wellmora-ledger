import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// GET all E-Kart shipping label order entries (newest first)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving E-Kart order entries', error: error.message });
  }
});

// POST a new E-Kart shipping label order entry
router.post('/', async (req, res) => {
  try {
    const { 
      orderNumber, 
      awbNumber, 
      paymentType, 
      logistics, 
      sellerName, 
      sellerAddress, 
      sellerGstin, 
      customerName, 
      shippingAddress, 
      pincode, 
      skuId, 
      itemDescription, 
      quantity, 
      hbdDate, 
      cpdDate, 
      printedDate, 
      receiptImage 
    } = req.body;
    
    if (!orderNumber || orderNumber.trim() === '') {
      return res.status(400).json({ message: 'Order ID (OD...) is required' });
    }
    
    const newOrder = new Order({
      orderNumber: orderNumber.trim(),
      awbNumber: awbNumber || '',
      paymentType: paymentType || 'PREPAID',
      logistics: logistics || 'E-Kart Logistics',
      sellerName: sellerName || 'WELLMORA ENTERPRISE',
      sellerAddress: sellerAddress || '281,Manisha Society,Old Kosad Road,Amroli,Surat , Manisha Society, SURAT - 394107',
      sellerGstin: sellerGstin || '24CNPPJ4144J1ZS',
      customerName: customerName || '',
      shippingAddress: shippingAddress || '',
      pincode: pincode || '',
      skuId: skuId || '',
      itemDescription: itemDescription || '',
      quantity: Number(quantity || 1),
      hbdDate: hbdDate || '',
      cpdDate: cpdDate || '',
      printedDate: printedDate || '',
      receiptImage: receiptImage || ''
    });
    
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error saving E-Kart order entry', error: error.message });
  }
});

// PUT (update) an existing E-Kart shipping label order entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      orderNumber, 
      awbNumber, 
      paymentType, 
      logistics, 
      sellerName, 
      sellerAddress, 
      sellerGstin, 
      customerName, 
      shippingAddress, 
      pincode, 
      skuId, 
      itemDescription, 
      quantity, 
      hbdDate, 
      cpdDate, 
      printedDate, 
      receiptImage 
    } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { 
        orderNumber, 
        awbNumber, 
        paymentType, 
        logistics, 
        sellerName, 
        sellerAddress, 
        sellerGstin, 
        customerName, 
        shippingAddress, 
        pincode, 
        skuId, 
        itemDescription, 
        quantity: Number(quantity || 1), 
        hbdDate, 
        cpdDate, 
        printedDate, 
        receiptImage 
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'E-Kart order entry not found' });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating E-Kart order entry', error: error.message });
  }
});

// DELETE an E-Kart shipping label order entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({ message: 'E-Kart order entry not found' });
    }

    res.json({ message: 'E-Kart order entry successfully deleted', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting E-Kart order entry', error: error.message });
  }
});

export default router;
