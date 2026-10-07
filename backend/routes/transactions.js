import express from 'express';
import Transaction from '../models/Transaction.js';
import WholesalePurchase from '../models/WholesalePurchase.js';

const router = express.Router();

// GET transactions (with optional date filtering and pagination)
router.get('/', async (req, res) => {
  try {
    const { page, limit, startDate, endDate, category, type, withMeta } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        filter.date.$gte = sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.date.$lte = eDate;
      }
    }
    if (category) filter.category = category;
    if (type) filter.type = type;

    let query = Transaction.find(filter).sort({ date: -1, createdAt: -1 });

    if (limit !== undefined && Number(limit) > 0) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;
      
      if (withMeta === 'true') {
        const [transactions, totalCount] = await Promise.all([
          query.skip(skip).limit(limitNum),
          Transaction.countDocuments(filter)
        ]);
        return res.json({
          transactions,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          currentPage: pageNum
        });
      }

      query = query.skip(skip).limit(limitNum);
    }

    const transactions = await query;
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving transactions', error: error.message });
  }
});

// POST a new transaction
router.post('/', async (req, res) => {
  try {
    const {
      date,
      description,
      category,
      type,
      amount,
      isHandCash,
      isWholesalePurchase,
      sellerName,
      quantity,
      unitPrice,
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
      billNumber,
      notes,
      wholesalePurchaseId
    } = req.body;
    
    const isWholesale = !!isWholesalePurchase || category === 'Wholesale Purchase' || !!sellerName;
    
    // Server-side validation
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }
    const numAmount = Number(amount);
    if (amount === undefined || amount === null || (isWholesale ? numAmount < 0 : numAmount <= 0)) {
      return res.status(400).json({ message: isWholesale ? 'Amount cannot be negative' : 'Amount must be greater than 0' });
    }
    
    const finalTotal = totalAmount !== undefined ? Number(totalAmount) : Number(amount);
    const finalPaid = paidAmount !== undefined ? Number(paidAmount) : (paymentStatus === 'Pending' ? 0 : Number(amount));
    const finalPending = pendingAmount !== undefined ? Number(pendingAmount) : Math.max(0, finalTotal - finalPaid);

    const newTransaction = new Transaction({
      date: date ? new Date(date) : new Date(),
      description: description.trim(),
      category: category || (isWholesale ? 'Purchase' : 'Others'),
      type: type || 'Debit',
      amount: isWholesale ? finalPaid : Number(amount),
      isHandCash: !!isHandCash,
      isWholesalePurchase: isWholesale,
      sellerName: sellerName ? sellerName.trim() : undefined,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
      totalAmount: isWholesale ? finalTotal : undefined,
      paidAmount: isWholesale ? finalPaid : undefined,
      pendingAmount: isWholesale ? finalPending : undefined,
      paymentStatus: paymentStatus || (isWholesale ? (finalPending > 0 ? 'Pending' : 'Done') : 'Done'),
      billNumber: billNumber ? billNumber.trim() : '',
      wholesalePurchaseId: wholesalePurchaseId || undefined
    });
    
    const savedTransaction = await newTransaction.save();

    // If this is a wholesale purchase submitted via transactions route and not yet linked to WholesalePurchase
    if (isWholesale && !wholesalePurchaseId) {
      try {
        const cleanDesc = description
          .replace(/^\[Wholesale:\s*[^\]]+\]\s*/gi, '')
          .replace(/\s*\(\d+(?:\.\d+)?\s*pcs\s*@\s*₹?\d+(?:\.\d+)?\)$/gi, '')
          .trim();

        const isDev = (sellerName || '').toLowerCase() === 'dev';
        const isSneh = (sellerName || '').toLowerCase() === 'sneh';
        const canonicalSeller = isDev ? 'Dev' : (isSneh ? 'Sneh' : 'Other');
        const customSeller = isDev || isSneh ? '' : (sellerName !== 'Other' ? (sellerName || '') : '');

        const wp = new WholesalePurchase({
          sellerName: canonicalSeller,
          customSellerName: customSeller,
          description: cleanDesc || description.trim(),
          quantity: Number(quantity) || 1,
          unitPrice: unitPrice !== undefined ? Number(unitPrice) : finalTotal,
          totalAmount: finalTotal,
          date: savedTransaction.date,
          paymentStatus: savedTransaction.paymentStatus || 'Done',
          paidAmount: finalPaid,
          pendingAmount: finalPending,
          paymentMode: isHandCash ? 'Cash' : 'Bank',
          billNumber: billNumber ? billNumber.trim() : '',
          notes: notes ? notes.trim() : '',
          linkedTransactionId: savedTransaction._id
        });
        const savedWp = await wp.save();
        savedTransaction.wholesalePurchaseId = savedWp._id;
        await savedTransaction.save();
      } catch (wpErr) {
        console.warn('Could not auto-create WholesalePurchase in fallback route:', wpErr.message);
      }
    }

    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Error saving transaction', error: error.message });
  }
});

// PUT (update) an existing transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      description,
      category,
      type,
      amount,
      isHandCash,
      isWholesalePurchase,
      sellerName,
      quantity,
      unitPrice,
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
      billNumber,
      notes,
      wholesalePurchaseId
    } = req.body;

    // Server-side validation
    if (description !== undefined && description.trim() === '') {
      return res.status(400).json({ message: 'Description cannot be empty' });
    }
    if (amount !== undefined && (amount === null || Number(amount) < 0)) {
      return res.status(400).json({ message: 'Amount cannot be negative' });
    }

    const updatePayload = {};
    if (date !== undefined) updatePayload.date = new Date(date);
    if (description !== undefined) updatePayload.description = description.trim();
    if (category !== undefined) updatePayload.category = category;
    if (type !== undefined) updatePayload.type = type;
    if (amount !== undefined) updatePayload.amount = Number(amount);
    if (paidAmount !== undefined && (isWholesalePurchase || category === 'Purchase')) {
      updatePayload.amount = Number(paidAmount);
    }
    if (isHandCash !== undefined) updatePayload.isHandCash = !!isHandCash;
    if (isWholesalePurchase !== undefined) updatePayload.isWholesalePurchase = !!isWholesalePurchase;
    if (sellerName !== undefined) updatePayload.sellerName = sellerName.trim();
    if (quantity !== undefined) updatePayload.quantity = Number(quantity);
    if (unitPrice !== undefined) updatePayload.unitPrice = Number(unitPrice);
    if (totalAmount !== undefined) updatePayload.totalAmount = Number(totalAmount);
    if (paidAmount !== undefined) updatePayload.paidAmount = Number(paidAmount);
    if (pendingAmount !== undefined) updatePayload.pendingAmount = Number(pendingAmount);
    if (paymentStatus !== undefined) updatePayload.paymentStatus = paymentStatus;
    if (billNumber !== undefined) updatePayload.billNumber = billNumber.trim();
    if (wholesalePurchaseId !== undefined) updatePayload.wholesalePurchaseId = wholesalePurchaseId;

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Synchronize linked WholesalePurchase if present
    const targetWpId = updatedTransaction.wholesalePurchaseId;
    if (targetWpId) {
      try {
        const wpUpdate = {};
        if (date !== undefined) wpUpdate.date = new Date(date);
        if (description !== undefined) {
          wpUpdate.description = description
            .replace(/^\[Wholesale:\s*[^\]]+\]\s*/gi, '')
            .replace(/\s*\(\d+(?:\.\d+)?\s*pcs\s*@\s*₹?\d+(?:\.\d+)?\)$/gi, '')
            .trim();
        }
        if (sellerName !== undefined) {
          const s = sellerName.trim();
          const isDev = s.toLowerCase() === 'dev';
          const isSneh = s.toLowerCase() === 'sneh';
          wpUpdate.sellerName = isDev ? 'Dev' : (isSneh ? 'Sneh' : 'Other');
          if (!isDev && !isSneh && s !== 'Other') {
            wpUpdate.customSellerName = s;
          }
        }
        if (quantity !== undefined) wpUpdate.quantity = Number(quantity);
        if (unitPrice !== undefined) wpUpdate.unitPrice = Number(unitPrice);
        if (totalAmount !== undefined) wpUpdate.totalAmount = Number(totalAmount);
        if (paidAmount !== undefined) wpUpdate.paidAmount = Number(paidAmount);
        if (pendingAmount !== undefined) wpUpdate.pendingAmount = Number(pendingAmount);
        if (paymentStatus !== undefined) wpUpdate.paymentStatus = paymentStatus;
        if (billNumber !== undefined) wpUpdate.billNumber = billNumber.trim();
        if (isHandCash !== undefined) wpUpdate.paymentMode = isHandCash ? 'Cash' : 'Bank';
        if (notes !== undefined) wpUpdate.notes = notes.trim();

        if (Object.keys(wpUpdate).length > 0) {
          await WholesalePurchase.findByIdAndUpdate(targetWpId, { $set: wpUpdate });
        }
      } catch (syncErr) {
        console.warn('Could not sync update to WholesalePurchase:', syncErr.message);
      }
    }

    res.json(updatedTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Error updating transaction', error: error.message });
  }
});

// DELETE a transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Synchronize: Delete linked WholesalePurchase if exists
    try {
      if (deletedTransaction.wholesalePurchaseId) {
        await WholesalePurchase.findByIdAndDelete(deletedTransaction.wholesalePurchaseId);
      }
      await WholesalePurchase.deleteMany({ linkedTransactionId: id });
    } catch (wpErr) {
      console.warn('Could not delete linked WholesalePurchase on transaction delete:', wpErr.message);
    }

    res.json({ message: 'Transaction successfully deleted', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting transaction', error: error.message });
  }
});

export default router;
