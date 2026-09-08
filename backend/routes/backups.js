import express from 'express';
import path from 'path';
import fs from 'fs';
import { createBackup, listBackups, restoreBackup, restoreFromData, pruneOldBackups, BACKUPS_DIR } from '../backupManager.js';

const router = express.Router();

// Memory store for backup settings
let backupSettings = {
  schedule: 'daily', // 'daily', 'weekly', 'disabled'
  cloudWebhookUrl: '',
  autoCloudUpload: false,
  lastRun: new Date().toISOString()
};

/**
 * SSRF Protection: Validate target webhook URL against loopback, private ranges, and metadata IPs
 */
export const isSafeWebhookUrl = (urlString) => {
  try {
    if (!urlString || typeof urlString !== 'string') return false;
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    // Block localhost, metadata services, and local loopback
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Block private RFC 1918 IP addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [_, o1, o2] = match.map(Number);
      if (o1 === 10) return false;
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return false;
      if (o1 === 192 && o2 === 168) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
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
router.post('/create', async (req, res, next) => {
  try {
    const filePath = await createBackup();
    await pruneOldBackups(30);
    const fileName = path.basename(filePath);

    // If cloud webhook configured and auto sync enabled
    if (backupSettings.autoCloudUpload && backupSettings.cloudWebhookUrl) {
      if (!isSafeWebhookUrl(backupSettings.cloudWebhookUrl)) {
        console.warn('⚠️ Cloud webhook blocked due to invalid/unsafe URL:', backupSettings.cloudWebhookUrl);
      } else {
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
    }

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
    const filePath = path.join(BACKUPS_DIR, safeFilename);

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
      const filePath = path.join(BACKUPS_DIR, safeFilename);
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
  if (cloudWebhookUrl !== undefined) {
    if (cloudWebhookUrl && !isSafeWebhookUrl(cloudWebhookUrl)) {
      return res.status(400).json({ message: 'Invalid or forbidden webhook URL (must be public HTTP/HTTPS URL)' });
    }
    backupSettings.cloudWebhookUrl = cloudWebhookUrl;
  }
  if (autoCloudUpload !== undefined) backupSettings.autoCloudUpload = autoCloudUpload;

  res.json({ message: 'Backup settings updated successfully', settings: backupSettings });
});

export default router;
