import express from 'express';
import path from 'path';
import fs from 'fs';
import { createBackup, listBackups, restoreBackup, restoreFromData, pruneOldBackups } from '../backupManager.js';

const router = express.Router();

// Memory store for backup settings
let backupSettings = {
  schedule: 'daily', // 'daily', 'weekly', 'disabled'
  cloudWebhookUrl: '',
  autoCloudUpload: false,
  lastRun: new Date().toISOString()
};

// GET /api/backups - List backups & current settings
router.get('/', async (req, res, next) => {
  try {
    const list = await listBackups();
    res.json({
      settings: backupSettings,
      backups: list.map(item => ({
        filename: item.filename,
        sizeBytes: item.sizeBytes,
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/backups/create - Trigger instant backup creation
router.get('/create', async (req, res, next) => {
  try {
    const filePath = await createBackup();
    await pruneOldBackups(30);
    const fileName = path.basename(filePath);

    // If cloud webhook configured and auto sync enabled
    if (backupSettings.autoCloudUpload && backupSettings.cloudWebhookUrl) {
      try {
        const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        await fetch(backupSettings.cloudWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('Cloud webhook backup upload failed:', err.message);
      }
    }

    backupSettings.lastRun = new Date().toISOString();
    res.json({ message: 'Backup created successfully', filename: fileName, createdAt: backupSettings.lastRun });
  } catch (error) {
    next(error);
  }
});

router.post('/create', async (req, res, next) => {
  try {
    const filePath = await createBackup();
    await pruneOldBackups(30);
    const fileName = path.basename(filePath);
    backupSettings.lastRun = new Date().toISOString();
    res.json({ message: 'Backup created successfully', filename: fileName, createdAt: backupSettings.lastRun });
  } catch (error) {
    next(error);
  }
});

// GET /api/backups/download/:filename - Download backup file
router.get('/download/:filename', (req, res, next) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'backups', safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    res.download(filePath, safeFilename);
  } catch (error) {
    next(error);
  }
});

// POST /api/backups/restore - Restore from uploaded json body or filename
router.post('/restore', async (req, res, next) => {
  try {
    const { filename, backupPayload } = req.body;

    if (backupPayload) {
      const counts = await restoreFromData(backupPayload);
      return res.json({ message: 'Database restored successfully from uploaded data payload', counts });
    }

    if (filename) {
      const safeFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), 'backups', safeFilename);
      await restoreBackup(filePath);
      return res.json({ message: `Database restored successfully from ${safeFilename}` });
    }

    res.status(400).json({ message: 'Either filename or backupPayload must be provided' });
  } catch (error) {
    next(error);
  }
});

// POST /api/backups/settings - Save settings
router.post('/settings', (req, res) => {
  const { schedule, cloudWebhookUrl, autoCloudUpload } = req.body;
  if (schedule !== undefined) backupSettings.schedule = schedule;
  if (cloudWebhookUrl !== undefined) backupSettings.cloudWebhookUrl = cloudWebhookUrl;
  if (autoCloudUpload !== undefined) backupSettings.autoCloudUpload = autoCloudUpload;

  res.json({ message: 'Backup settings updated successfully', settings: backupSettings });
});

export default router;
