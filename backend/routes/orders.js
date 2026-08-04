import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// GET all Order entries (newest first)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order entries', error: error.message });
  }
});

// POST a new Order entry (Enforces Unique Order ID via Upsert)
router.post('/', async (req, res) => {
  try {
    const { 
      orderNumber, 
      awbNumber, 
      paymentType, 
      productName, 
      skuId, 
      quantity, 
      purchaseCost, 
      packagingCost, 
      otherCost, 
      sellerName, 
      customerName, 
      shippingAddress, 
      pincode, 
      labelImage 
    } = req.body;
    
    if (!orderNumber || !orderNumber.trim()) {
      return res.status(400).json({ message: 'Order ID (OD...) is required' });
    }
    
    const qty = Number(quantity || 1);
    const pCost = Number(purchaseCost || 0);
    const pkgCost = Number(packagingCost || 0);
    const oCost = Number(otherCost || 0);
    const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

    const filter = { orderNumber: orderNumber.trim() };
    const updateData = {
      orderNumber: orderNumber.trim(),
      awbNumber: awbNumber || '',
      paymentType: paymentType || 'PREPAID',
      productName: productName || '',
      skuId: skuId || '',
      quantity: qty,
      purchaseCost: pCost,
      packagingCost: pkgCost,
      otherCost: oCost,
      totalCost: calculatedTotalCost,
      sellerName: sellerName || 'WELLMORA ENTERPRISE',
      customerName: customerName || '',
      shippingAddress: shippingAddress || '',
      pincode: pincode || '',
      labelImage: labelImage || ''
    };
    
    const savedOrder = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true, runValidators: true });
    res.status(200).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error saving order entry', error: error.message });
  }
});

// POST batch multi-file / multi-page Order entries
router.post('/batch', async (req, res) => {
  try {
    const { orders: batchOrders } = req.body;
    if (!Array.isArray(batchOrders) || batchOrders.length === 0) {
      return res.status(400).json({ message: 'No orders provided for batch save' });
    }

    const savedResults = [];
    for (const item of batchOrders) {
      if (!item.orderNumber || !item.orderNumber.trim()) continue;
      
      const qty = Number(item.quantity || 1);
      const pCost = Number(item.purchaseCost || 0);
      const pkgCost = Number(item.packagingCost || 0);
      const oCost = Number(item.otherCost || 0);
      const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

      const filter = { orderNumber: item.orderNumber.trim() };
      const updateData = {
        orderNumber: item.orderNumber.trim(),
        awbNumber: item.awbNumber || '',
        paymentType: item.paymentType || 'PREPAID',
        productName: item.productName || item.itemDescription || '',
        skuId: item.skuId || '',
        quantity: qty,
        purchaseCost: pCost,
        packagingCost: pkgCost,
        otherCost: oCost,
        totalCost: calculatedTotalCost,
        sellerName: item.sellerName || 'WELLMORA ENTERPRISE',
        customerName: item.customerName || '',
        shippingAddress: item.shippingAddress || '',
        pincode: item.pincode || '',
        labelImage: item.labelImage || item.receiptImage || ''
      };
      
      const saved = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true });
      savedResults.push(saved);
    }

    res.status(200).json({ message: 'Batch orders saved successfully', savedCount: savedResults.length, orders: savedResults });
  } catch (error) {
    res.status(400).json({ message: 'Error processing batch order entries', error: error.message });
  }
});

// PUT (update) an existing Order entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      orderNumber, 
      awbNumber, 
      paymentType, 
      productName, 
      skuId, 
      quantity, 
      purchaseCost, 
      packagingCost, 
      otherCost, 
      sellerName, 
      customerName, 
      shippingAddress, 
      pincode, 
      labelImage 
    } = req.body;

    const qty = Number(quantity || 1);
    const pCost = Number(purchaseCost || 0);
    const pkgCost = Number(packagingCost || 0);
    const oCost = Number(otherCost || 0);
    const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { 
        orderNumber, 
        awbNumber, 
        paymentType, 
        productName, 
        skuId, 
        quantity: qty, 
        purchaseCost: pCost, 
        packagingCost: pkgCost, 
        otherCost: oCost, 
        totalCost: calculatedTotalCost, 
        sellerName, 
        customerName, 
        shippingAddress, 
        pincode, 
        labelImage 
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

// DELETE an Order entry
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
