import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Models
import Transaction from './models/Transaction.js';
import BankTransaction from './models/BankTransaction.js';
import PartnerFlow from './models/PartnerFlow.js';
import Order from './models/Order.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const BACKUPS_DIR = path.join(__dirname, 'backups');

// Helper to check mongoose connection
async function ensureDbConnection() {
  if (mongoose.connection.readyState === 1) return;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wellmora_ledger';
  await mongoose.connect(MONGODB_URI);
}

/**
 * Creates a complete JSON backup of all ledger tables (including Orders & Users)
 */
export async function createBackup() {
  try {
    await ensureDbConnection();
    
    // Ensure backups directory exists
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    console.log('📦 Starting database backup operation...');
    
    const [transactions, bankTransactions, partnerFlows, rawOrders, users] = await Promise.all([
      Transaction.find({}).lean(),
      BankTransaction.find({}).lean(),
      PartnerFlow.find({}).lean(),
      Order.find({}).lean(),
      User.find({}).select('-password').lean()
    ]);

    // Strip heavy base64 label images from backup to keep file size compact and manageable
    const cleanOrders = (rawOrders || []).map(order => {
      if (order && order.labelImage && order.labelImage.length > 300) {
        const { labelImage, ...rest } = order;
        return rest;
      }
      return order;
    });

    const backupPayload = {
      system: 'Wellmora Ledger Backup',
      version: '2.0',
      timestamp: new Date().toISOString(),
      counts: {
        transactions: transactions.length,
        bankTransactions: bankTransactions.length,
        partnerFlows: partnerFlows.length,
        orders: cleanOrders.length,
        users: users.length
      },
      data: {
        transactions,
        bankTransactions,
        partnerFlows,
        orders: cleanOrders,
        users
      }
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${dateStr}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');
    
    console.log(`✅ Backup successfully created at: ${filePath}`);
    console.log(`📊 Statistics: ${transactions.length} Ledger, ${bankTransactions.length} Bank, ${partnerFlows.length} Partner, ${cleanOrders.length} Orders saved.`);
    
    return filePath;
  } catch (error) {
    console.error('❌ Database backup operation failed:', error.message);
    throw error;
  }
}

/**
 * Restores all database collections from a JSON backup file path with pre-restore safety snapshot
 */
export async function restoreBackup(backupFilePath) {
  try {
    await ensureDbConnection();
    
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found at: ${backupFilePath}`);
    }

    console.log(`📂 Reading backup file: ${backupFilePath}...`);
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backupPayload = JSON.parse(backupContent);

    return await restoreFromData(backupPayload);
  } catch (error) {
    console.error('❌ Database restore operation failed:', error.message);
    throw error;
  }
}

/**
 * Lists all existing JSON backups in the backups directory
 */
export async function listBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
  const backupList = files.map(filename => {
    const filePath = path.join(BACKUPS_DIR, filename);
    const stats = fs.statSync(filePath);
    return {
      filename,
      sizeBytes: stats.size,
      createdAt: stats.birthtime || stats.mtime,
      filePath
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return backupList;
}

/**
 * Restores database from a parsed backup JSON object payload
 */
export async function restoreFromData(backupPayload) {
  try {
    await ensureDbConnection();

    if (!backupPayload || backupPayload.system !== 'Wellmora Ledger Backup') {
      throw new Error('Invalid backup data structure. Must be a valid Wellmora Ledger Backup.');
    }

    const { transactions, bankTransactions, partnerFlows, orders } = backupPayload.data || {};
    
    console.log('⚠️ Capturing safety snapshot before restore...');
    // Capture safety snapshot before clearing
    try {
      await createBackup();
    } catch (snapshotErr) {
      console.warn('Could not create pre-restore snapshot, proceeding with caution:', snapshotErr.message);
    }

    console.log('⚠️ Replacing existing database collections with backup snapshot...');

    await Promise.all([
      Transaction.deleteMany({}),
      BankTransaction.deleteMany({}),
      PartnerFlow.deleteMany({}),
      ...(orders && Array.isArray(orders) ? [Order.deleteMany({})] : [])
    ]);

    await Promise.all([
      transactions && transactions.length ? Transaction.insertMany(transactions) : Promise.resolve(),
      bankTransactions && bankTransactions.length ? BankTransaction.insertMany(bankTransactions) : Promise.resolve(),
      partnerFlows && partnerFlows.length ? PartnerFlow.insertMany(partnerFlows) : Promise.resolve(),
      orders && orders.length ? Order.insertMany(orders) : Promise.resolve()
    ]);

    console.log(`✅ Successfully restored: ${transactions?.length || 0} Ledger, ${bankTransactions?.length || 0} Bank, ${partnerFlows?.length || 0} Partner, ${orders?.length || 0} Orders.`);
    return {
      transactions: transactions?.length || 0,
      bankTransactions: bankTransactions?.length || 0,
      partnerFlows: partnerFlows?.length || 0,
      orders: orders?.length || 0
    };
  } catch (error) {
    console.error('❌ Restore from data failed:', error.message);
    throw error;
  }
}

/**
 * Prunes backups older than a specified max limit (keeps max count or max age)
 */
export async function pruneOldBackups(maxKeepCount = 30) {
  try {
    const list = await listBackups();
    if (list.length > maxKeepCount) {
      const toDelete = list.slice(maxKeepCount);
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(file.filePath);
          console.log(`🧹 Pruned old backup file: ${file.filename}`);
        } catch (e) {
          console.error(`Failed to prune backup file ${file.filename}:`, e.message);
        }
      });
    }
  } catch (err) {
    console.error('Error during backup pruning:', err.message);
  }
}

// Trigger script execution via CLI if executed directly
const runCli = async () => {
  const args = process.argv.slice(2);
  const isBackupCommand = args.includes('--backup') || args.includes('-b');
  const isRestoreCommand = args.includes('--restore') || args.includes('-r');

  if (isBackupCommand) {
    try {
      await createBackup();
      await pruneOldBackups();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  }

  if (isRestoreCommand) {
    const fileArg = args.find(arg => arg.startsWith('--file='));
    if (!fileArg) {
      console.error('❌ Error: Please specify a file to restore using --file=path/to/backup.json');
      process.exit(1);
    }
    const filePath = fileArg.split('=')[1];
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    try {
      await restoreBackup(absolutePath);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  }
};

// Check if run directly
if (process.argv[1] && process.argv[1].endsWith('backupManager.js')) {
  runCli();
}
