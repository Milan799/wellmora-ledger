import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import transactionRouter from './routes/transactions.js';
import bankTransactionRouter from './routes/bankTransactions.js';
import partnerFlowRouter from './routes/partnerFlows.js';
import { createBackup } from './backupManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense_tracker';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/transactions', transactionRouter);
app.use('/api/bank-transactions', bankTransactionRouter);
app.use('/api/partner-flows', partnerFlowRouter);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Business Expense & Ledger Tracking System API is running...');
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully at:', MONGODB_URI);
    
    // Automatically capture a safety snapshot on startup
    createBackup()
      .then(filePath => console.log(`💾 Startup auto-backup snapshot created: ${filePath}`))
      .catch(err => console.error(`⚠️ Startup auto-backup failed: ${err.message}`));

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
