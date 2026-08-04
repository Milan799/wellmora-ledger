import express from 'express';
import mongoose from 'mongoose';
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

// POST a new Order entry (Enforces Unique Order ID via Upsert & Preserves Existing Prices)
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
      bankSettlement,
      sellerName, 
      customerName, 
      shippingAddress, 
      pincode, 
      labelImage 
    } = req.body;
    
    if (!orderNumber || !orderNumber.trim()) {
      return res.status(400).json({ message: 'Order ID (OD...) is required' });
    }
    
    const existing = await Order.findOne({ orderNumber: orderNumber.trim() });

    const qty = Number(quantity || (existing ? existing.quantity : 1));
    const pCost = purchaseCost !== undefined ? Number(purchaseCost) : (existing ? existing.purchaseCost : 0);
    const pkgCost = packagingCost !== undefined ? Number(packagingCost) : (existing ? existing.packagingCost : 0);
    const oCost = otherCost !== undefined ? Number(otherCost) : (existing ? existing.otherCost : 0);
    const bSettlement = bankSettlement !== undefined ? Number(bankSettlement) : (existing ? existing.bankSettlement : 0);
    const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

    const filter = { orderNumber: orderNumber.trim() };
    const updateData = {
      orderNumber: orderNumber.trim(),
      awbNumber: awbNumber || (existing ? existing.awbNumber : ''),
      paymentType: paymentType || (existing ? existing.paymentType : 'PREPAID'),
      productName: productName || (existing ? existing.productName : ''),
      skuId: skuId || (existing ? existing.skuId : ''),
      quantity: qty,
      purchaseCost: pCost,
      packagingCost: pkgCost,
      otherCost: oCost,
      bankSettlement: bSettlement,
      totalCost: calculatedTotalCost,
      sellerName: sellerName || 'WELLMORA ENTERPRISE',
      customerName: customerName || (existing ? existing.customerName : ''),
      shippingAddress: shippingAddress || (existing ? existing.shippingAddress : ''),
      pincode: pincode || (existing ? existing.pincode : ''),
      labelImage: labelImage || (existing ? existing.labelImage : '')
    };
    
    const savedOrder = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true, runValidators: true });
    res.status(200).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error saving order entry', error: error.message });
  }
});

// POST batch multi-file / multi-page Order entries (Preserves Existing Non-Zero Costs)
router.post('/batch', async (req, res) => {
  try {
    const { orders: batchOrders } = req.body;
    if (!Array.isArray(batchOrders) || batchOrders.length === 0) {
      return res.status(400).json({ message: 'No orders provided for batch save' });
    }

    const savedResults = [];
    for (const item of batchOrders) {
      if (!item.orderNumber || !item.orderNumber.trim()) continue;
      
      const existing = await Order.findOne({ orderNumber: item.orderNumber.trim() });

      const qty = Number(item.quantity || (existing ? existing.quantity : 1));
      const pCost = item.purchaseCost !== undefined && Number(item.purchaseCost) !== 0 ? Number(item.purchaseCost) : (existing ? existing.purchaseCost : 0);
      const pkgCost = item.packagingCost !== undefined && Number(item.packagingCost) !== 0 ? Number(item.packagingCost) : (existing ? existing.packagingCost : 0);
      const oCost = item.otherCost !== undefined && Number(item.otherCost) !== 0 ? Number(item.otherCost) : (existing ? existing.otherCost : 0);
      const bSettlement = item.bankSettlement !== undefined && Number(item.bankSettlement) !== 0 ? Number(item.bankSettlement) : (existing ? existing.bankSettlement : 0);
      const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

      const filter = { orderNumber: item.orderNumber.trim() };
      const updateData = {
        orderNumber: item.orderNumber.trim(),
        awbNumber: item.awbNumber || (existing ? existing.awbNumber : ''),
        paymentType: item.paymentType || (existing ? existing.paymentType : 'PREPAID'),
        productName: item.productName || item.itemDescription || (existing ? existing.productName : ''),
        skuId: item.skuId || (existing ? existing.skuId : ''),
        quantity: qty,
        purchaseCost: pCost,
        packagingCost: pkgCost,
        otherCost: oCost,
        bankSettlement: bSettlement,
        totalCost: calculatedTotalCost,
        sellerName: item.sellerName || 'WELLMORA ENTERPRISE',
        customerName: item.customerName || (existing ? existing.customerName : ''),
        shippingAddress: item.shippingAddress || (existing ? existing.shippingAddress : ''),
        pincode: item.pincode || (existing ? existing.pincode : ''),
        labelImage: item.labelImage || item.receiptImage || (existing ? existing.labelImage : '')
      };
      
      const saved = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true });
      savedResults.push(saved);
    }

    res.status(200).json({ message: 'Batch orders saved successfully', savedCount: savedResults.length, orders: savedResults });
  } catch (error) {
    res.status(400).json({ message: 'Error processing batch order entries', error: error.message });
  }
});

// PUT (bulk update) all order entries for a specific SKU ID
router.put('/bulk-sku', async (req, res) => {
  try {
    const { skuId, purchaseCost, packagingCost, otherCost, bankSettlement } = req.body;
    if (!skuId || !skuId.trim()) {
      return res.status(400).json({ message: 'SKU ID is required for bulk SKU update' });
    }

    const pCost = Number(purchaseCost || 0);
    const pkgCost = Number(packagingCost || 0);
    const oCost = Number(otherCost || 0);
    const bSettlement = Number(bankSettlement || 0);

    const targetOrders = await Order.find({ skuId: skuId.trim() });
    const updatePromises = targetOrders.map(ord => {
      const qty = ord.quantity || 1;
      const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;
      return Order.findByIdAndUpdate(
        ord._id,
        {
          purchaseCost: pCost,
          packagingCost: pkgCost,
          otherCost: oCost,
          bankSettlement: bSettlement,
          totalCost: calculatedTotalCost
        },
        { new: true }
      );
    });

    const updatedOrders = await Promise.all(updatePromises);
    res.json({ message: `Successfully updated ${updatedOrders.length} orders for SKU ${skuId}`, count: updatedOrders.length, orders: updatedOrders });
  } catch (error) {
    res.status(400).json({ message: 'Error performing bulk SKU update', error: error.message });
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
      bankSettlement,
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
    const bSettlement = Number(bankSettlement || 0);
    const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

    const updateData = { 
      orderNumber: orderNumber ? orderNumber.trim() : '', 
      awbNumber: awbNumber || '', 
      paymentType: paymentType || 'PREPAID', 
      productName: productName || '', 
      skuId: skuId || '', 
      quantity: qty, 
      purchaseCost: pCost, 
      packagingCost: pkgCost, 
      otherCost: oCost, 
      bankSettlement: bSettlement,
      totalCost: calculatedTotalCost, 
      sellerName: sellerName || 'WELLMORA ENTERPRISE', 
      customerName: customerName || '', 
      shippingAddress: shippingAddress || '', 
      pincode: pincode || '', 
      labelImage: labelImage || '' 
    };

    let updatedOrder = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }

    if (!updatedOrder && orderNumber && orderNumber.trim()) {
      updatedOrder = await Order.findOneAndUpdate(
        { orderNumber: orderNumber.trim() },
        updateData,
        { new: true, upsert: true, runValidators: true }
      );
    }

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order entry not found' });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order entry', error: error.message });
  }
});

// DELETE an Order entry (by ObjectId or orderNumber)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const trimmedId = id ? decodeURIComponent(id).trim() : '';

    if (!trimmedId) {
      return res.status(400).json({ message: 'Order ID parameter is required' });
    }

    const query = [];
    if (mongoose.Types.ObjectId.isValid(trimmedId)) {
      query.push({ _id: trimmedId });
    }
    query.push({ orderNumber: trimmedId });
    const escapedStr = trimmedId.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    query.push({ orderNumber: new RegExp(`^${escapedStr}$`, 'i') });

    const deletedResult = await Order.deleteMany({ $or: query });

    if (deletedResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Order entry not found' });
    }

    res.json({ message: 'Order entry successfully deleted', deletedCount: deletedResult.deletedCount, id: trimmedId });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order entry', error: error.message });
  }
});

export default router;
