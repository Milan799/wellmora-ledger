import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';

const router = express.Router();

// Helper to batch-sync SKU pricing using a single MongoDB updateMany aggregation operation
async function syncSkuPrices(skuId, excludeOrderId, pCost, pkgCost, oCost, bSettlement) {
  if (!skuId || !skuId.trim()) return;
  const cleanSku = skuId.trim();
  const unitCostSum = Number(pCost || 0) + Number(pkgCost || 0) + Number(oCost || 0);

  const filter = { skuId: cleanSku };
  if (excludeOrderId) {
    filter._id = { $ne: excludeOrderId };
  }

  await Order.updateMany(
    filter,
    [
      {
        $set: {
          purchaseCost: Number(pCost || 0),
          packagingCost: Number(pkgCost || 0),
          otherCost: Number(oCost || 0),
          bankSettlement: Number(bSettlement || 0),
          totalCost: {
            $multiply: [
              unitCostSum,
              { $ifNull: ["$quantity", 1] }
            ]
          }
        }
      }
    ]
  );
}

// GET all Order entries (supports optional date range, optional pagination, and projects out heavy label images by default)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, page, limit, includeImages } = req.query;
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

    let query = Order.find(filter).sort({ orderDate: -1, createdAt: -1 });

    // Exclude heavy base64 image strings unless explicitly requested
    if (includeImages !== 'true') {
      query = query.select('-labelImage');
    }

    // Optional server-side pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (!isNaN(pageNum) && !isNaN(limitNum) && limitNum > 0) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const orders = await query.lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order entries', error: error.message });
  }
});

// GET label image for a single order
router.get('/:id/label', async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id).select('labelImage orderNumber');
    }
    if (!order && id) {
      order = await Order.findOne({ orderNumber: id.trim() }).select('labelImage orderNumber');
    }
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ labelImage: order.labelImage || '', orderNumber: order.orderNumber });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order label', error: error.message });
  }
});

// POST a new Order entry (Enforces Unique Order ID & Auto-Syncs SKU Prices via single bulk update)
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
    
    const cleanOrderNumber = orderNumber.trim();
    const existing = await Order.findOne({ orderNumber: cleanOrderNumber });
    
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

    const filter = { orderNumber: cleanOrderNumber };
    const updateData = {
      orderNumber: cleanOrderNumber,
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

    // Single-query bulk auto-propagation for SKU prices (Eliminates N+1 loop)
    if (cleanSku) {
      await syncSkuPrices(cleanSku, savedOrder._id, pCost, pkgCost, oCost, bSettlement);
    }

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
    const updatedSkusMap = new Map();

    for (const item of batchOrders) {
      if (!item.orderNumber || !item.orderNumber.trim()) continue;
      const cleanOrderNumber = item.orderNumber.trim();
      
      const existing = await Order.findOne({ orderNumber: cleanOrderNumber });
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

      const filter = { orderNumber: cleanOrderNumber };
      const updateData = {
        orderNumber: cleanOrderNumber,
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
      savedResults.push(saved);

      if (cleanSku && (pCost > 0 || pkgCost > 0 || oCost > 0 || bSettlement > 0)) {
        updatedSkusMap.set(cleanSku, { pCost, pkgCost, oCost, bSettlement });
      }
    }

    // Sync prices for distinct SKUs updated during batch
    for (const [skuId, costs] of updatedSkusMap.entries()) {
      await syncSkuPrices(skuId, null, costs.pCost, costs.pkgCost, costs.oCost, costs.bSettlement);
    }

    res.status(200).json({ message: 'Batch orders saved successfully', savedCount: savedResults.length, orders: savedResults });
  } catch (error) {
    res.status(400).json({ message: 'Error processing batch order entries', error: error.message });
  }
});

// PUT (bulk update) all order entries for a specific SKU ID using single updateMany
router.put('/bulk-sku', async (req, res) => {
  try {
    const { skuId, purchaseCost, packagingCost, otherCost, bankSettlement } = req.body;
    if (!skuId || !skuId.trim()) {
      return res.status(400).json({ message: 'SKU ID is required for bulk SKU update' });
    }

    const cleanSku = skuId.trim();
    const pCost = Number(purchaseCost || 0);
    const pkgCost = Number(packagingCost || 0);
    const oCost = Number(otherCost || 0);
    const bSettlement = Number(bankSettlement || 0);
    const unitCostSum = pCost + pkgCost + oCost;

    const result = await Order.updateMany(
      { skuId: cleanSku },
      [
        {
          $set: {
            purchaseCost: pCost,
            packagingCost: pkgCost,
            otherCost: oCost,
            bankSettlement: bSettlement,
            totalCost: {
              $multiply: [
                unitCostSum,
                { $ifNull: ["$quantity", 1] }
              ]
            }
          }
        }
      ]
    );

    res.json({ message: `Successfully updated ${result.modifiedCount} orders for SKU ${cleanSku}`, count: result.modifiedCount });
  } catch (error) {
    res.status(400).json({ message: 'Error performing bulk SKU update', error: error.message });
  }
});

// PUT (bulk date-frame price adjustment)
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

    const pCost = Number(purchaseCost || 0);
    const pkgCost = Number(packagingCost || 0);
    const oCost = Number(otherCost || 0);
    const bSettlement = Number(bankSettlement || 0);
    const unitCostSum = pCost + pkgCost + oCost;

    const result = await Order.updateMany(
      queryCondition,
      [
        {
          $set: {
            purchaseCost: pCost,
            packagingCost: pkgCost,
            otherCost: oCost,
            bankSettlement: bSettlement,
            totalCost: {
              $multiply: [
                unitCostSum,
                { $ifNull: ["$quantity", 1] }
              ]
            }
          }
        }
      ]
    );

    res.json({
      message: `Successfully adjusted prices for ${result.modifiedCount} orders in date frame`,
      count: result.modifiedCount
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
      pincode: pincode || '' 
    };

    if (labelImage !== undefined) {
      updateData.labelImage = labelImage;
    }

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
        { new: true, runValidators: true }
      );
    }

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order entry not found' });
    }

    // Auto-propagate costs to other orders with the same SKU
    const cleanSku = updateData.skuId ? updateData.skuId.trim() : '';
    if (cleanSku) {
      await syncSkuPrices(cleanSku, updatedOrder._id, pCost, pkgCost, oCost, bSettlement);
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order entry', error: error.message });
  }
});

// POST (bulk delete) multiple Order entries by _id or orderNumber array
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No order IDs provided for bulk deletion' });
    }

    const validObjectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    const orderNumbers = ids.map(id => String(id).trim());

    const deleteFilter = {
      $or: [
        { _id: { $in: validObjectIds } },
        { orderNumber: { $in: orderNumbers } }
      ]
    };

    const deletedResult = await Order.deleteMany(deleteFilter);
    res.json({ message: `Successfully deleted ${deletedResult.deletedCount} order entries`, deletedCount: deletedResult.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Error performing bulk deletion of order entries', error: error.message });
  }
});

// DELETE an Order entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const trimmedId = id ? decodeURIComponent(id).trim() : '';

    if (!trimmedId) {
      return res.status(400).json({ message: 'Order ID parameter is required' });
    }

    let deleted = null;
    if (mongoose.Types.ObjectId.isValid(trimmedId)) {
      deleted = await Order.findByIdAndDelete(trimmedId);
    }
    if (!deleted) {
      deleted = await Order.findOneAndDelete({ orderNumber: trimmedId });
    }

    if (!deleted) {
      return res.status(404).json({ message: 'Order entry not found' });
    }

    res.json({ message: 'Order entry successfully deleted', id: trimmedId });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order entry', error: error.message });
  }
});

export default router;
