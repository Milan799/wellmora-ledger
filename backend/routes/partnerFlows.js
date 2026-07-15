import express from 'express';
import PartnerFlow from '../models/PartnerFlow.js';

const router = express.Router();

// GET all partner flows (newest first)
router.get('/', async (req, res) => {
  try {
    const flows = await PartnerFlow.find().sort({ date: -1, createdAt: -1 });
    res.json(flows);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving partner flows', error: error.message });
  }
});

// POST a new partner flow
router.post('/', async (req, res) => {
  try {
    const { date, partnerName, type, amount, description } = req.body;
    
    // Server-side validation
    if (!partnerName || partnerName.trim() === '') {
      return res.status(400).json({ message: 'Partner name is required' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    
    const newFlow = new PartnerFlow({
      date: date || new Date(),
      partnerName,
      type,
      amount,
      description
    });
    
    const saved = await newFlow.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: 'Error saving partner flow', error: error.message });
  }
});

// PUT (update) an existing partner flow
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, partnerName, type, amount, description } = req.body;

    // Server-side validation
    if (partnerName !== undefined && partnerName.trim() === '') {
      return res.status(400).json({ message: 'Partner name cannot be empty' });
    }
    if (description !== undefined && description.trim() === '') {
      return res.status(400).json({ message: 'Description cannot be empty' });
    }
    if (amount !== undefined && (amount === null || Number(amount) <= 0)) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const updated = await PartnerFlow.findByIdAndUpdate(
      id,
      { date, partnerName, type, amount, description },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Partner flow not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating partner flow', error: error.message });
  }
});

// DELETE a partner flow
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PartnerFlow.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Partner flow not found' });
    }

    res.json({ message: 'Partner flow successfully deleted', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting partner flow', error: error.message });
  }
});

export default router;
