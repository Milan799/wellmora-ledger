import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import authRouter, { ensureDefaultAdmin } from './routes/auth.js';
import { verifyToken } from './middleware/auth.js';
import transactionRouter from './routes/transactions.js';
import bankTransactionRouter from './routes/bankTransactions.js';
import partnerFlowRouter from './routes/partnerFlows.js';
import { createBackup } from './backupManager.js';
import Transaction from './models/Transaction.js';
import BankTransaction from './models/BankTransaction.js';
import PartnerFlow from './models/PartnerFlow.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://trymilan971_db_user:milan123@cluster0.emzxezj.mongodb.net/?appName=Cluster0';

// 1. Security HTTP Headers
app.use(helmet());

// 2. NoSQL Query Injection Prevention
app.use(mongoSanitize());

// 3. Body Parsing Middleware (Must be registered BEFORE routes)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Configured CORS with flexible domain support
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS !== '*') {
      const allowedList = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
      if (allowedList.includes(origin)) return callback(null, true);
    }

    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.github.io')
    ) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true
}));

// 5. Rate Limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/auth', authLimiter);

// 6. Public Authentication Routes (Support both /api/auth and /auth prefixes)
app.use('/api/auth', authRouter);
app.use('/auth', authRouter);

// 7. Protected Financial Data Routes (Requires authentication token)
app.use('/api/transactions', verifyToken, transactionRouter);
app.use('/api/bank-transactions', verifyToken, bankTransactionRouter);
app.use('/api/partner-flows', verifyToken, partnerFlowRouter);

// Also mount data routes on root level fallback for convenience
app.use('/transactions', verifyToken, transactionRouter);
app.use('/bank-transactions', verifyToken, bankTransactionRouter);
app.use('/partner-flows', verifyToken, partnerFlowRouter);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Business Expense & Ledger Tracking System API is running...');
});

// 404 Not Found Fallback Handler
app.use((req, res) => {
  res.status(404).json({ message: `API Endpoint Not Found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('⚠️ Express Error:', err.message);
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Global process error handlers for production stability
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception thrown:', err);
});

// Register index error event handlers on models to prevent startup crashes
User.on('index', err => {
  if (err) console.error('⚠️ User model auto-indexing failed:', err.message);
});
Transaction.on('index', err => {
  if (err) console.error('⚠️ Transaction model auto-indexing failed:', err.message);
});
BankTransaction.on('index', err => {
  if (err) console.error('⚠️ BankTransaction model auto-indexing failed:', err.message);
});
PartnerFlow.on('index', err => {
  if (err) console.error('⚠️ PartnerFlow model auto-indexing failed:', err.message);
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully at:', MONGODB_URI);
    
    // Ensure default secure admin credentials exist
    await ensureDefaultAdmin();

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

