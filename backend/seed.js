import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import BankTransaction from './models/BankTransaction.js';
import PartnerFlow from './models/PartnerFlow.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense_tracker';

const mockTransactions = [
  {
    description: 'Acme Corp - Q2 Sales Revenue',
    category: 'Sales',
    type: 'Credit',
    amount: 15450.00,
    date: new Date('2026-07-10T10:00:00')
  },
  {
    description: 'Server Hosting & Cloud Infrastructure',
    category: 'Office Expense',
    type: 'Debit',
    amount: 320.00,
    date: new Date('2026-07-11T09:15:00')
  },
  {
    description: 'Google Ads - Summer Campaign',
    category: 'Marketing',
    type: 'Debit',
    amount: 1200.00,
    date: new Date('2026-07-11T14:30:00')
  },
  {
    description: 'Retail Logistics Inc - Bulk Shipment',
    category: 'Logistics',
    type: 'Debit',
    amount: 850.00,
    date: new Date('2026-07-12T11:00:00')
  },
  {
    description: 'Global Tech Suppliers - Laptops Purchase',
    category: 'Purchase',
    type: 'Debit',
    amount: 4500.00,
    date: new Date('2026-07-12T16:45:00')
  },
  {
    description: 'Direct Sales - Client Consulting Fee',
    category: 'Sales',
    type: 'Credit',
    amount: 3500.00,
    date: new Date('2026-07-13T09:00:00')
  },
  {
    description: 'Office Snacks & Coffee Subscription',
    category: 'Office Expense',
    type: 'Debit',
    amount: 125.50,
    date: new Date('2026-07-13T12:00:00')
  },
  {
    description: 'Facebook Ads - Lead Generation',
    category: 'Marketing',
    type: 'Debit',
    amount: 600.00,
    date: new Date('2026-07-13T15:20:00')
  },
  {
    description: 'Delta Logistics - Shipping Fees',
    category: 'Logistics',
    type: 'Debit',
    amount: 240.00,
    date: new Date('2026-07-14T08:30:00')
  },
  {
    description: 'Product Sale - Online Customer Order',
    category: 'Sales',
    type: 'Credit',
    amount: 1250.00,
    date: new Date('2026-07-14T10:15:00')
  },
  {
    description: 'Annual Software License Renewal',
    category: 'Others',
    type: 'Debit',
    amount: 950.00,
    date: new Date('2026-07-14T14:00:00')
  }
];

const mockBankTransactions = [
  {
    bankName: 'HDFC Bank',
    accountNumber: '50100987654321',
    type: 'Deposit',
    amount: 50000.00,
    status: 'Completed',
    description: 'Direct cash deposit at branch',
    date: new Date('2026-07-11T10:30:00')
  },
  {
    bankName: 'SBI Bank',
    accountNumber: '32109876543',
    type: 'Deposit',
    amount: 25000.00,
    status: 'Completed',
    description: 'NEFT transfer from client',
    date: new Date('2026-07-12T11:00:00')
  },
  {
    bankName: 'HDFC Bank',
    accountNumber: '50100987654321',
    type: 'Withdrawal',
    amount: 12000.00,
    status: 'Completed',
    description: 'ATM cash withdrawal for office petty expenses',
    date: new Date('2026-07-12T15:45:00')
  },
  {
    bankName: 'ICICI Bank',
    accountNumber: '000401234567',
    type: 'Deposit',
    amount: 100000.00,
    status: 'Completed',
    description: 'Online IMPS transfer - Q2 sales settlement',
    date: new Date('2026-07-13T09:15:00')
  },
  {
    bankName: 'HDFC Bank',
    accountNumber: '50100987654321',
    type: 'Withdrawal',
    amount: 8000.00,
    status: 'Pending',
    description: 'Scheduled office rent payment payout',
    date: new Date('2026-07-14T10:00:00')
  },
  {
    bankName: 'SBI Bank',
    accountNumber: '32109876543',
    type: 'Withdrawal',
    amount: 15000.00,
    status: 'Completed',
    description: 'Vendor RTGS payout - Global Tech Suppliers',
    date: new Date('2026-07-14T14:30:00')
  }
];

const mockPartnerFlows = [
  {
    partnerName: 'Milan Javiya',
    type: 'Capital Contribution',
    amount: 250000.00,
    description: 'Initial equity contribution for business launch',
    date: new Date('2026-07-10T09:00:00')
  },
  {
    partnerName: 'Jinal Javiya',
    type: 'Capital Contribution',
    amount: 150000.00,
    description: 'Strategic partnership investment capital',
    date: new Date('2026-07-11T14:00:00')
  },
  {
    partnerName: 'Milan Javiya',
    type: 'Profit Withdrawal',
    amount: 15000.00,
    description: 'Bi-weekly business profit drawing',
    date: new Date('2026-07-13T12:00:00')
  },
  {
    partnerName: 'Jinal Javiya',
    type: 'Share Distribution',
    amount: 10000.00,
    description: 'Dividend payout distribution',
    date: new Date('2026-07-14T15:00:00')
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Seeding standard transactions
    await Transaction.deleteMany({});
    console.log('Cleared existing transactions.');
    const tInserted = await Transaction.insertMany(mockTransactions);
    console.log(`Successfully seeded ${tInserted.length} standard transactions.`);

    // Seeding bank transactions
    await BankTransaction.deleteMany({});
    console.log('Cleared existing bank transactions.');
    const bInserted = await BankTransaction.insertMany(mockBankTransactions);
    console.log(`Successfully seeded ${bInserted.length} bank transactions.`);

    // Seeding partner flows
    await PartnerFlow.deleteMany({});
    console.log('Cleared existing partner flows.');
    const pInserted = await PartnerFlow.insertMany(mockPartnerFlows);
    console.log(`Successfully seeded ${pInserted.length} partner capital flows.`);
    
    mongoose.connection.close();
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
