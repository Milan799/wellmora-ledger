import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Models
import Transaction from './models/Transaction.js';
import BankTransaction from './models/BankTransaction.js';
import PartnerFlow from './models/PartnerFlow.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.join(__dirname, 'backups');

// Helper to check mongoose connection
async function ensureDbConnection() {
  if (mongoose.connection.readyState === 1) return;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense_tracker';
  await mongoose.connect(MONGODB_URI);
}

/**
 * Creates a complete JSON backup of all ledger tables
 */
export async function createBackup() {
  try {
    await ensureDbConnection();
    
    // Ensure backups directory exists
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    console.log('📦 Starting database backup operation...');
    
    const [transactions, bankTransactions, partnerFlows] = await Promise.all([
      Transaction.find({}),
      BankTransaction.find({}),
      PartnerFlow.find({})
    ]);

    const backupPayload = {
      system: 'Wellmora Ledger Backup',
      version: '1.0',
      timestamp: new Date().toISOString(),
      counts: {
        transactions: transactions.length,
        bankTransactions: bankTransactions.length,
        partnerFlows: partnerFlows.length
      },
      data: {
        transactions,
        bankTransactions,
        partnerFlows
      }
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${dateStr}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');
    
    console.log(`✅ Backup successfully created at: ${filePath}`);
    console.log(`📊 Statistics: ${transactions.length} Ledger entries, ${bankTransactions.length} Bank items, ${partnerFlows.length} Partner flows saved.`);
    
    return filePath;
  } catch (error) {
    console.error('❌ Database backup operation failed:', error.message);
    throw error;
  }
}

/**
 * Restores all database collections from a JSON backup file path
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

    if (backupPayload.system !== 'Wellmora Ledger Backup') {
      throw new Error('Invalid backup file signature. Must be a Wellmora Ledger Backup file.');
    }

    const { transactions, bankTransactions, partnerFlows } = backupPayload.data;
    
    console.log('⚠️ Warning: Dropping existing collections to replace with backup data...');
    
    // Clear collections
    await Promise.all([
      Transaction.deleteMany({}),
      BankTransaction.deleteMany({}),
      PartnerFlow.deleteMany({})
    ]);

    // Insert backup data
    await Promise.all([
      transactions.length ? Transaction.insertMany(transactions) : Promise.resolve(),
      bankTransactions.length ? BankTransaction.insertMany(bankTransactions) : Promise.resolve(),
      partnerFlows.length ? PartnerFlow.insertMany(partnerFlows) : Promise.resolve()
    ]);

    console.log('✅ Database restore operation completed successfully!');
    console.log(`📊 Statistics restored: ${transactions.length} Ledger, ${bankTransactions.length} Bank, ${partnerFlows.length} Partner entries.`);
  } catch (error) {
    console.error('❌ Database restore operation failed:', error.message);
    throw error;
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
