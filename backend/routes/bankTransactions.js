import express from 'express';
import BankTransaction from '../models/BankTransaction.js';

const router = express.Router();

// GET all bank transactions (newest first)
router.get('/', async (req, res) => {
  try {
    const transactions = await BankTransaction.find().sort({ date: -1, createdAt: -1 });
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
      date: date || new Date(),
      bankName,
      accountNumber,
      type,
      amount,
      status: status || 'Completed',
      description
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

    const updated = await BankTransaction.findByIdAndUpdate(
      id,
      { date, bankName, accountNumber, type, amount, status, description },
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
