import express from 'express';
import Transaction from '../models/Transaction.js';

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
    const { date, description, category, type, amount, isHandCash } = req.body;
    
    // Server-side validation
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    
    const newTransaction = new Transaction({
      date: date ? new Date(date) : new Date(),
      description: description.trim(),
      category: category || 'Others',
      type,
      amount: Number(amount),
      isHandCash: !!isHandCash
    });
    
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Error saving transaction', error: error.message });
  }
});

// PUT (update) an existing transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description, category, type, amount, isHandCash } = req.body;

    // Server-side validation
    if (description !== undefined && description.trim() === '') {
      return res.status(400).json({ message: 'Description cannot be empty' });
    }
    if (amount !== undefined && (amount === null || Number(amount) <= 0)) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const updatePayload = {};
    if (date !== undefined) updatePayload.date = new Date(date);
    if (description !== undefined) updatePayload.description = description.trim();
    if (category !== undefined) updatePayload.category = category;
    if (type !== undefined) updatePayload.type = type;
    if (amount !== undefined) updatePayload.amount = Number(amount);
    if (isHandCash !== undefined) updatePayload.isHandCash = !!isHandCash;

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
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

    res.json({ message: 'Transaction successfully deleted', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting transaction', error: error.message });
  }
});

export default router;
