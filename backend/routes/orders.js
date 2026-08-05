import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';

const router = express.Router();

// GET all Order entries (newest first, with optional date range query)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = eDate;
      }
      filter.$or = [
        { orderDate: dateFilter },
        { orderDate: { $exists: false }, createdAt: dateFilter }
      ];
    }

    const orders = await Order.find(filter).sort({ orderDate: -1, createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order entries', error: error.message });
  }
});

// POST a new Order entry (Enforces Unique Order ID via Upsert & Auto-Syncs SKU Prices)
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
      labelImage,
      orderDate
    } = req.body;
    
    if (!orderNumber || !orderNumber.trim()) {
      return res.status(400).json({ message: 'Order ID (OD...) is required' });
    }
    
    const existing = await Order.findOne({ orderNumber: orderNumber.trim() });
    
    const cleanSku = skuId ? skuId.trim() : (existing ? existing.skuId : '');
    let existingSku = null;
    if (cleanSku) {
      existingSku = await Order.findOne({ skuId: cleanSku });
    }

    const qty = Number(quantity || (existing ? existing.quantity : 1));
    
    let pCost = purchaseCost !== undefined ? Number(purchaseCost) : (existing ? existing.purchaseCost : undefined);
    if ((pCost === undefined || pCost === 0) && existingSku && existingSku.purchaseCost) {
      pCost = existingSku.purchaseCost;
    }
    pCost = pCost || 0;

    let pkgCost = packagingCost !== undefined ? Number(packagingCost) : (existing ? existing.packagingCost : undefined);
    if ((pkgCost === undefined || pkgCost === 0) && existingSku && existingSku.packagingCost) {
      pkgCost = existingSku.packagingCost;
    }
    pkgCost = pkgCost || 0;

    let oCost = otherCost !== undefined ? Number(otherCost) : (existing ? existing.otherCost : undefined);
    if ((oCost === undefined || oCost === 0) && existingSku && existingSku.otherCost) {
      oCost = existingSku.otherCost;
    }
    oCost = oCost || 0;

    let bSettlement = bankSettlement !== undefined ? Number(bankSettlement) : (existing ? existing.bankSettlement : undefined);
    if ((bSettlement === undefined || bSettlement === 0) && existingSku && existingSku.bankSettlement) {
      bSettlement = existingSku.bankSettlement;
    }
    bSettlement = bSettlement || 0;

    const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

    let parsedOrderDate = existing ? existing.orderDate : new Date();
    if (orderDate) {
      const d = new Date(orderDate);
      if (!isNaN(d.getTime())) parsedOrderDate = d;
    }

    const filter = { orderNumber: orderNumber.trim() };
    const updateData = {
      orderNumber: orderNumber.trim(),
      awbNumber: awbNumber || (existing ? existing.awbNumber : ''),
      paymentType: paymentType || (existing ? existing.paymentType : 'PREPAID'),
      productName: productName || (existing ? existing.productName : ''),
      skuId: cleanSku,
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
      labelImage: labelImage || (existing ? existing.labelImage : ''),
      orderDate: parsedOrderDate
    };
    
    const savedOrder = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true, runValidators: true });

    // Auto-propagate costs to all other orders sharing the same SKU ID
    if (cleanSku) {
      const sameSkuOrders = await Order.find({ skuId: cleanSku, _id: { $ne: savedOrder._id } });
      if (sameSkuOrders.length > 0) {
        const autoSyncPromises = sameSkuOrders.map(ord => {
          const oQty = ord.quantity || 1;
          const oTotalCost = (pCost + pkgCost + oCost) * oQty;
          return Order.findByIdAndUpdate(ord._id, {
            purchaseCost: pCost,
            packagingCost: pkgCost,
            otherCost: oCost,
            bankSettlement: bSettlement,
            totalCost: oTotalCost
          });
        });
        await Promise.all(autoSyncPromises);
      }
    }

    res.status(200).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error saving order entry', error: error.message });
  }
});

// POST batch multi-file / multi-page Order entries (Preserves & Auto-Syncs SKU Prices)
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
      const cleanSku = item.skuId ? item.skuId.trim() : (existing ? existing.skuId : '');
      let existingSku = null;
      if (cleanSku) {
        existingSku = await Order.findOne({ skuId: cleanSku });
      }

      const qty = Number(item.quantity || (existing ? existing.quantity : 1));

      let pCost = item.purchaseCost !== undefined && Number(item.purchaseCost) !== 0 
        ? Number(item.purchaseCost) 
        : (existing ? existing.purchaseCost : (existingSku ? existingSku.purchaseCost : 0));
      let pkgCost = item.packagingCost !== undefined && Number(item.packagingCost) !== 0 
        ? Number(item.packagingCost) 
        : (existing ? existing.packagingCost : (existingSku ? existingSku.packagingCost : 0));
      let oCost = item.otherCost !== undefined && Number(item.otherCost) !== 0 
        ? Number(item.otherCost) 
        : (existing ? existing.otherCost : (existingSku ? existingSku.otherCost : 0));
      let bSettlement = item.bankSettlement !== undefined && Number(item.bankSettlement) !== 0 
        ? Number(item.bankSettlement) 
        : (existing ? existing.bankSettlement : (existingSku ? existingSku.bankSettlement : 0));

      const calculatedTotalCost = (pCost + pkgCost + oCost) * qty;

      let parsedOrderDate = existing ? existing.orderDate : new Date();
      if (item.orderDate) {
        const d = new Date(item.orderDate);
        if (!isNaN(d.getTime())) parsedOrderDate = d;
      }

      const filter = { orderNumber: item.orderNumber.trim() };
      const updateData = {
        orderNumber: item.orderNumber.trim(),
        awbNumber: item.awbNumber || (existing ? existing.awbNumber : ''),
        paymentType: item.paymentType || (existing ? existing.paymentType : 'PREPAID'),
        productName: item.productName || item.itemDescription || (existing ? existing.productName : ''),
        skuId: cleanSku,
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
        labelImage: item.labelImage || item.receiptImage || (existing ? existing.labelImage : ''),
        orderDate: parsedOrderDate
      };
      
      const saved = await Order.findOneAndUpdate(filter, updateData, { new: true, upsert: true });

      if (cleanSku) {
        const sameSkuOrders = await Order.find({ skuId: cleanSku, _id: { $ne: saved._id } });
        if (sameSkuOrders.length > 0) {
          const autoSyncPromises = sameSkuOrders.map(ord => {
            const oQty = ord.quantity || 1;
            const oTotalCost = (pCost + pkgCost + oCost) * oQty;
            return Order.findByIdAndUpdate(ord._id, {
              purchaseCost: pCost,
              packagingCost: pkgCost,
              otherCost: oCost,
              bankSettlement: bSettlement,
              totalCost: oTotalCost
            });
          });
          await Promise.all(autoSyncPromises);
        }
      }

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

// PUT (bulk date-frame price adjustment) update prices for all order entries within a date frame
router.put('/bulk-date-frame', async (req, res) => {
  try {
    const { startDate, endDate, skuId, purchaseCost, packagingCost, otherCost, bankSettlement } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and End date are required for Date Frame price adjustment' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateFilter = { $gte: start, $lte: end };

    const queryCondition = {
      $or: [
        { orderDate: dateFilter },
        { orderDate: { $exists: false }, createdAt: dateFilter }
      ]
    };

    if (skuId && skuId.trim() && skuId.trim().toUpperCase() !== 'ALL') {
      queryCondition.skuId = skuId.trim();
    }

    const targetOrders = await Order.find(queryCondition);
    
    if (targetOrders.length === 0) {
      return res.status(404).json({ message: 'No orders found within the specified date frame' });
    }

    const updatePromises = targetOrders.map(ord => {
      const qty = ord.quantity || 1;
      const pCost = purchaseCost !== undefined ? Number(purchaseCost) : ord.purchaseCost;
      const pkgCost = packagingCost !== undefined ? Number(packagingCost) : ord.packagingCost;
      const oCost = otherCost !== undefined ? Number(otherCost) : ord.otherCost;
      const bSettlement = bankSettlement !== undefined ? Number(bankSettlement) : ord.bankSettlement;
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
    res.json({
      message: `Successfully adjusted prices for ${updatedOrders.length} orders in date frame ${startDate} to ${endDate}`,
      count: updatedOrders.length,
      orders: updatedOrders
    });
  } catch (error) {
    res.status(400).json({ message: 'Error performing bulk date frame price adjustment', error: error.message });
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
      labelImage,
      orderDate
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

    if (orderDate) {
      const d = new Date(orderDate);
      if (!isNaN(d.getTime())) updateData.orderDate = d;
    }

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

    // Auto-propagate costs to all other orders sharing the same SKU ID
    const cleanSku = updateData.skuId ? updateData.skuId.trim() : '';
    if (cleanSku) {
      const sameSkuOrders = await Order.find({ skuId: cleanSku, _id: { $ne: updatedOrder._id } });
      if (sameSkuOrders.length > 0) {
        const autoSyncPromises = sameSkuOrders.map(ord => {
          const oQty = ord.quantity || 1;
          const oTotalCost = (pCost + pkgCost + oCost) * oQty;
          return Order.findByIdAndUpdate(ord._id, {
            purchaseCost: pCost,
            packagingCost: pkgCost,
            otherCost: oCost,
            bankSettlement: bSettlement,
            totalCost: oTotalCost
          });
        });
        await Promise.all(autoSyncPromises);
      }
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
