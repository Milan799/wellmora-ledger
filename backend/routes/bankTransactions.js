import express from 'express';
import BankTransaction from '../models/BankTransaction.js';

const router = express.Router();

// GET bank transactions (with optional date filtering and pagination)
router.get('/', async (req, res) => {
  try {
    const { page, limit, startDate, endDate, bankName, type, status, withMeta } = req.query;
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
    if (bankName) filter.bankName = bankName;
    if (type) filter.type = type;
    if (status) filter.status = status;

    let query = BankTransaction.find(filter).sort({ date: -1, createdAt: -1 });

    if (limit !== undefined && Number(limit) > 0) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      if (withMeta === 'true') {
        const [transactions, totalCount] = await Promise.all([
          query.skip(skip).limit(limitNum),
          BankTransaction.countDocuments(filter)
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
    res.status(500).json({ message: 'Error retrieving bank transactions', error: error.message });
  }
});

// POST a new bank transaction
router.post('/', async (req, res) => {
  try {
    const { date, bankName, accountNumber, type, amount, status, description } = req.body;
    
    // Server-side validation
    if (!bankName || bankName.trim() === '') {
      return res.status(400).json({ message: 'Bank name is required' });
    }
    if (!accountNumber || accountNumber.trim() === '') {
      return res.status(400).json({ message: 'Account number is required' });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    
    const newTransaction = new BankTransaction({
      date: date ? new Date(date) : new Date(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      type,
      amount: Number(amount),
      status: status || 'Completed',
      description: description ? description.trim() : ''
    });
    
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Error saving bank transaction', error: error.message });
  }
});

// PUT (update) an existing bank transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, bankName, accountNumber, type, amount, status, description } = req.body;

    // Server-side validation
    if (bankName !== undefined && bankName.trim() === '') {
      return res.status(400).json({ message: 'Bank name cannot be empty' });
    }
    if (accountNumber !== undefined && accountNumber.trim() === '') {
      return res.status(400).json({ message: 'Account number cannot be empty' });
    }
    if (amount !== undefined && (amount === null || Number(amount) <= 0)) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const updatePayload = {};
    if (date !== undefined) updatePayload.date = new Date(date);
    if (bankName !== undefined) updatePayload.bankName = bankName.trim();
    if (accountNumber !== undefined) updatePayload.accountNumber = accountNumber.trim();
    if (type !== undefined) updatePayload.type = type;
    if (amount !== undefined) updatePayload.amount = Number(amount);
    if (status !== undefined) updatePayload.status = status;
    if (description !== undefined) updatePayload.description = description.trim();

    const updated = await BankTransaction.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Bank transaction not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating bank transaction', error: error.message });
  }
});

// DELETE a bank transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BankTransaction.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Bank transaction not found' });
    }

    res.json({ message: 'Bank transaction successfully deleted', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bank transaction', error: error.message });
  }
});

export default router;
