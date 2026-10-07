import express from 'express';
import WholesalePurchase from '../models/WholesalePurchase.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// GET all wholesale purchases with optional filtering
router.get('/', async (req, res) => {
  try {
    const { sellerName, paymentStatus, startDate, endDate, search } = req.query;
    const filter = {};

    if (sellerName && sellerName !== 'All') {
      filter.sellerName = new RegExp(`^${sellerName}$`, 'i');
    }

    if (paymentStatus && paymentStatus !== 'All') {
      if (paymentStatus === 'Done' || paymentStatus === 'Paid') {
        filter.paymentStatus = { $in: ['Done', 'Paid'] };
      } else {
        filter.paymentStatus = paymentStatus;
      }
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        filter.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.date.$lte = e;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { description: { $regex: q, $options: 'i' } },
        { sellerName: { $regex: q, $options: 'i' } },
        { billNumber: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } }
      ];
    }

    const purchases = await WholesalePurchase.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving wholesale purchases', error: error.message });
  }
});

// GET single wholesale purchase by ID
router.get('/:id', async (req, res) => {
  try {
    const purchase = await WholesalePurchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Wholesale purchase not found' });
    }
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving purchase', error: error.message });
  }
});

// POST a new wholesale purchase
router.post('/', async (req, res) => {
  try {
    const {
      sellerName,
      customSellerName,
      description,
      quantity,
      unitPrice,
      totalAmount,
      date,
      paymentStatus,
      paidAmount,
      paymentMode,
      billNumber,
      notes
    } = req.body;

    let effectiveSeller = (sellerName || '').trim();
    if (!effectiveSeller) {
      return res.status(400).json({ message: 'Seller name is required' });
    }

    let canonicalSeller = 'Other';
    let canonicalCustomSeller = customSellerName ? customSellerName.trim() : '';

    if (effectiveSeller.toLowerCase() === 'dev') {
      canonicalSeller = 'Dev';
      canonicalCustomSeller = '';
    } else if (effectiveSeller.toLowerCase() === 'sneh') {
      canonicalSeller = 'Sneh';
      canonicalCustomSeller = '';
    } else if (effectiveSeller.toLowerCase() === 'other') {
      canonicalSeller = 'Other';
      if (!canonicalCustomSeller && customSellerName) {
        canonicalCustomSeller = customSellerName.trim();
      }
    } else {
      canonicalSeller = 'Other';
      if (!canonicalCustomSeller) {
        canonicalCustomSeller = effectiveSeller;
      }
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Product / Goods description is required' });
    }

    const parsedQty = Number(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ message: 'Quantity bought must be a valid number greater than 0' });
    }

    const parsedPrice = Number(unitPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ message: 'Price of product must be a valid number greater than 0' });
    }

    // Automatically calculate/verify total: qty * unitPrice
    const calculatedTotal = Math.round(parsedQty * parsedPrice * 100) / 100;
    const finalTotal = totalAmount ? Number(totalAmount) : calculatedTotal;
    if (isNaN(finalTotal) || finalTotal <= 0) {
      return res.status(400).json({ message: 'Total amount must be greater than 0' });
    }

    // Normalized payment status
    let normalizedStatus = (paymentStatus || 'Pending').trim();
    if (normalizedStatus === 'Paid') normalizedStatus = 'Done';
    if (!['Done', 'Pending', 'Partial'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Payment status must be Done, Pending, or Partial' });
    }

    // Payment validation
    let finalPaid = Number(paidAmount || 0);
    if (isNaN(finalPaid) || finalPaid < 0) {
      return res.status(400).json({ message: 'Paid amount cannot be negative' });
    }

    if (normalizedStatus === 'Done') {
      finalPaid = finalTotal;
    } else if (normalizedStatus === 'Pending') {
      finalPaid = 0;
    } else if (normalizedStatus === 'Partial') {
      if (finalPaid <= 0) {
        return res.status(400).json({ message: 'For partial payment, paid amount must be greater than 0' });
      }
      if (finalPaid >= finalTotal) {
        normalizedStatus = 'Done';
        finalPaid = finalTotal;
      }
    }

    if (finalPaid > finalTotal) {
      return res.status(400).json({
        message: `Paid amount (₹${finalPaid}) cannot exceed total product cost (₹${finalTotal})`
      });
    }

    const finalPending = Math.max(0, Math.round((finalTotal - finalPaid) * 100) / 100);

    const purchaseDate = date ? new Date(date) : new Date();

    // 2. Create and Save WholesalePurchase
    const newPurchase = new WholesalePurchase({
      sellerName: canonicalSeller,
      customSellerName: canonicalCustomSeller,
      description: description.trim(),
      quantity: parsedQty,
      unitPrice: parsedPrice,
      totalAmount: finalTotal,
      date: purchaseDate,
      paymentStatus: normalizedStatus,
      paidAmount: finalPaid,
      pendingAmount: finalPending,
      paymentMode: paymentMode || 'Cash',
      billNumber: billNumber ? billNumber.trim() : '',
      notes: notes ? notes.trim() : ''
    });

    const savedPurchase = await newPurchase.save();

    // 3. Automatically Create Linked Transaction in Expenses & Cash Ledger
    // Ensures this entry immediately shows up in Expenses page & Main Dashboard!
    try {
      const displaySeller = (canonicalSeller === 'Other' && canonicalCustomSeller) ? canonicalCustomSeller : canonicalSeller;
      const linkedTx = new Transaction({
        date: purchaseDate,
        description: `[Wholesale: ${displaySeller}] ${description.trim()} (${parsedQty} pcs @ ₹${parsedPrice})`,
        category: 'Purchase',
        type: 'Debit',
        amount: finalPaid,
        isHandCash: (paymentMode || '').toLowerCase().includes('cash'),
        isWholesalePurchase: true,
        sellerName: displaySeller,
        quantity: parsedQty,
        unitPrice: parsedPrice,
        totalAmount: finalTotal,
        paidAmount: finalPaid,
        pendingAmount: finalPending,
        paymentStatus: normalizedStatus,
        billNumber: billNumber ? billNumber.trim() : '',
        wholesalePurchaseId: savedPurchase._id
      });

      const savedTx = await linkedTx.save();
      savedPurchase.linkedTransactionId = savedTx._id;
      await savedPurchase.save();
    } catch (txErr) {
      console.warn('Could not auto-link Transaction for wholesale purchase:', txErr.message);
    }

    res.status(201).json(savedPurchase);
  } catch (error) {
    res.status(400).json({ message: 'Error saving wholesale purchase', error: error.message });
  }
});

// PUT (update) an existing wholesale purchase
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sellerName,
      customSellerName,
      description,
      quantity,
      unitPrice,
      totalAmount,
      date,
      paymentStatus,
      paidAmount,
      paymentMode,
      billNumber,
      notes
    } = req.body;

    const existing = await WholesalePurchase.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Wholesale purchase not found' });
    }

    // Validation
    if (sellerName !== undefined) {
      let s = sellerName.trim();
      if (!s) return res.status(400).json({ message: 'Seller name cannot be empty' });
      if (s.toLowerCase() === 'dev') {
        existing.sellerName = 'Dev';
        existing.customSellerName = '';
      } else if (s.toLowerCase() === 'sneh') {
        existing.sellerName = 'Sneh';
        existing.customSellerName = '';
      } else if (s.toLowerCase() === 'other') {
        existing.sellerName = 'Other';
        if (customSellerName !== undefined) {
          existing.customSellerName = customSellerName.trim();
        }
      } else {
        existing.sellerName = 'Other';
        existing.customSellerName = (customSellerName !== undefined && customSellerName.trim()) ? customSellerName.trim() : s;
      }
    } else if (customSellerName !== undefined) {
      existing.customSellerName = customSellerName.trim();
    }
    if (description !== undefined) {
      if (!description.trim()) return res.status(400).json({ message: 'Description cannot be empty' });
      existing.description = description.trim();
    }
    if (quantity !== undefined) {
      const q = Number(quantity);
      if (isNaN(q) || q <= 0) return res.status(400).json({ message: 'Quantity must be greater than 0' });
      existing.quantity = q;
    }
    if (unitPrice !== undefined) {
      const p = Number(unitPrice);
      if (isNaN(p) || p <= 0) return res.status(400).json({ message: 'Price of product must be greater than 0' });
      existing.unitPrice = p;
    }

    // Auto calculate total
    const computedTotal = Math.round(existing.quantity * existing.unitPrice * 100) / 100;
    existing.totalAmount = totalAmount ? Number(totalAmount) : computedTotal;

    if (date !== undefined) existing.date = new Date(date);
    if (paymentMode !== undefined) existing.paymentMode = paymentMode;
    if (billNumber !== undefined) existing.billNumber = billNumber.trim();
    if (notes !== undefined) existing.notes = notes.trim();

    let status = paymentStatus ? paymentStatus.trim() : existing.paymentStatus;
    if (status === 'Paid') status = 'Done';

    let paid = paidAmount !== undefined ? Number(paidAmount) : existing.paidAmount;
    if (isNaN(paid) || paid < 0) return res.status(400).json({ message: 'Paid amount cannot be negative' });

    if (status === 'Done') {
      paid = existing.totalAmount;
    } else if (status === 'Pending') {
      paid = 0;
    } else if (status === 'Partial') {
      if (paid <= 0) return res.status(400).json({ message: 'Paid amount must be > 0 for partial payment' });
      if (paid >= existing.totalAmount) {
        status = 'Done';
        paid = existing.totalAmount;
      }
    }

    if (paid > existing.totalAmount) {
      return res.status(400).json({
        message: `Paid amount (₹${paid}) cannot exceed total product cost (₹${existing.totalAmount})`
      });
    }

    existing.paymentStatus = status;
    existing.paidAmount = paid;
    existing.pendingAmount = Math.max(0, Math.round((existing.totalAmount - paid) * 100) / 100);

    const updatedPurchase = await existing.save();

    // Synchronize linked Transaction in Expenses
    try {
      const displaySeller = existing.sellerName === 'Other' && existing.customSellerName 
        ? existing.customSellerName 
        : existing.sellerName;

      const txPayload = {
        date: existing.date,
        description: `[Wholesale: ${displaySeller}] ${existing.description} (${existing.quantity} pcs @ ₹${existing.unitPrice})`,
        category: 'Purchase',
        type: 'Debit',
        amount: existing.paidAmount,
        isHandCash: (existing.paymentMode || '').toLowerCase().includes('cash'),
        isWholesalePurchase: true,
        sellerName: displaySeller,
        quantity: existing.quantity,
        unitPrice: existing.unitPrice,
        totalAmount: existing.totalAmount,
        paidAmount: existing.paidAmount,
        pendingAmount: existing.pendingAmount,
        paymentStatus: existing.paymentStatus,
        billNumber: existing.billNumber || '',
        wholesalePurchaseId: existing._id
      };

      if (existing.linkedTransactionId) {
        await Transaction.findByIdAndUpdate(existing.linkedTransactionId, { $set: txPayload });
      } else {
        const newTx = new Transaction(txPayload);
        const savedTx = await newTx.save();
        existing.linkedTransactionId = savedTx._id;
        await existing.save();
      }
    } catch (txErr) {
      console.warn('Could not sync linked Transaction on update:', txErr.message);
    }

    res.json(updatedPurchase);
  } catch (error) {
    res.status(400).json({ message: 'Error updating wholesale purchase', error: error.message });
  }
});

// PATCH pay: Record a quick payment towards an existing pending wholesale purchase
router.patch('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentAmount, paymentMode, notes } = req.body;

    const purchase = await WholesalePurchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: 'Wholesale purchase not found' });
    }

    const payVal = Number(paymentAmount);
    if (isNaN(payVal) || payVal <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    const newPaid = Math.round((purchase.paidAmount + payVal) * 100) / 100;
    if (newPaid > purchase.totalAmount) {
      return res.status(400).json({
        message: `Payment of ₹${payVal} exceeds remaining pending balance of ₹${purchase.pendingAmount}`
      });
    }

    purchase.paidAmount = newPaid;
    purchase.pendingAmount = Math.max(0, Math.round((purchase.totalAmount - newPaid) * 100) / 100);
    purchase.paymentStatus = purchase.pendingAmount <= 0 ? 'Done' : 'Partial';

    if (paymentMode) purchase.paymentMode = paymentMode;
    if (notes) {
      purchase.notes = purchase.notes ? `${purchase.notes} | Paid ₹${payVal}: ${notes}` : `Paid ₹${payVal}: ${notes}`;
    }

    const updatedPurchase = await purchase.save();

    // Update linked Transaction
    try {
      if (purchase.linkedTransactionId) {
        await Transaction.findByIdAndUpdate(purchase.linkedTransactionId, {
          $set: {
            amount: purchase.paidAmount,
            paidAmount: purchase.paidAmount,
            pendingAmount: purchase.pendingAmount,
            paymentStatus: purchase.paymentStatus
          }
        });
      }
    } catch (txErr) {
      console.warn('Could not update linked transaction on payment:', txErr.message);
    }

    res.json(updatedPurchase);
  } catch (error) {
    res.status(400).json({ message: 'Error recording payment', error: error.message });
  }
});

// DELETE a wholesale purchase
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await WholesalePurchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: 'Wholesale purchase not found' });
    }

    // Delete linked transaction in Expenses
    try {
      if (purchase.linkedTransactionId) {
        await Transaction.findByIdAndDelete(purchase.linkedTransactionId);
      }
      await Transaction.deleteMany({ wholesalePurchaseId: id });
    } catch (txErr) {
      console.warn('Could not delete linked transaction:', txErr.message);
    }

    await WholesalePurchase.findByIdAndDelete(id);
    res.json({ message: 'Wholesale purchase and linked ledger entry deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting wholesale purchase', error: error.message });
  }
});

export default router;
