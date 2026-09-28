import express from 'express';
import PartnerFlow from '../models/PartnerFlow.js';

const router = express.Router();

// GET partner flows (with optional date filtering and pagination)
router.get('/', async (req, res) => {
  try {
    const { page, limit, startDate, endDate, partnerName, type, withMeta } = req.query;
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
    if (partnerName) filter.partnerName = partnerName;
    if (type) filter.type = type;

    let query = PartnerFlow.find(filter).sort({ date: -1, createdAt: -1 });

    if (limit !== undefined && Number(limit) > 0) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      if (withMeta === 'true') {
        const [flows, totalCount] = await Promise.all([
          query.skip(skip).limit(limitNum),
          PartnerFlow.countDocuments(filter)
        ]);
        return res.json({
          flows,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          currentPage: pageNum
        });
      }

      query = query.skip(skip).limit(limitNum);
    }

    const flows = await query;
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
      date: date ? new Date(date) : new Date(),
      partnerName: partnerName.trim(),
      type,
      amount: Number(amount),
      description: description.trim()
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

    const updatePayload = {};
    if (date !== undefined) updatePayload.date = new Date(date);
    if (partnerName !== undefined) updatePayload.partnerName = partnerName.trim();
    if (type !== undefined) updatePayload.type = type;
    if (amount !== undefined) updatePayload.amount = Number(amount);
    if (description !== undefined) updatePayload.description = description.trim();

    const updated = await PartnerFlow.findByIdAndUpdate(
      id,
      { $set: updatePayload },
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
