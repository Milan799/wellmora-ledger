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

// POST a new E-Kart shipping label order entry (Enforces Unique Order ID via Upsert)
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
    
    const filter = { orderNumber: orderNumber.trim() };
    const updateData = {
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
    };
    
    // Upsert guarantees unique order entries by Order ID
    const savedOrder = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true, runValidators: true });
    res.status(200).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error saving E-Kart order entry', error: error.message });
  }
});

// POST batch/multi-page E-Kart shipping label order entries
router.post('/batch', async (req, res) => {
  try {
    const { orders: batchOrders } = req.body;
    if (!Array.isArray(batchOrders) || batchOrders.length === 0) {
      return res.status(400).json({ message: 'No orders provided for batch save' });
    }

    const savedResults = [];
    for (const item of batchOrders) {
      if (!item.orderNumber || !item.orderNumber.trim()) continue;
      const filter = { orderNumber: item.orderNumber.trim() };
      const updateData = {
        orderNumber: item.orderNumber.trim(),
        awbNumber: item.awbNumber || '',
        paymentType: item.paymentType || 'PREPAID',
        logistics: item.logistics || 'E-Kart Logistics',
        sellerName: item.sellerName || 'WELLMORA ENTERPRISE',
        sellerAddress: item.sellerAddress || '',
        sellerGstin: item.sellerGstin || '24CNPPJ4144J1ZS',
        customerName: item.customerName || '',
        shippingAddress: item.shippingAddress || '',
        pincode: item.pincode || '',
        skuId: item.skuId || '',
        itemDescription: item.itemDescription || '',
        quantity: Number(item.quantity || 1),
        hbdDate: item.hbdDate || '',
        cpdDate: item.cpdDate || '',
        printedDate: item.printedDate || '',
        receiptImage: item.receiptImage || ''
      };
      const saved = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true });
      savedResults.push(saved);
    }

    res.status(200).json({ message: 'Batch orders saved successfully', savedCount: savedResults.length, orders: savedResults });
  } catch (error) {
    res.status(400).json({ message: 'Error processing batch order entries', error: error.message });
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
