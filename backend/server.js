import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import authRouter from './routes/auth.js';
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense_tracker';

// 1. Security HTTP Headers
app.use(helmet());

// 2. NoSQL Query Injection Prevention
app.use(mongoSanitize());

// 3. Configured CORS with origin restrictions
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: Origin not allowed.'));
    }
  },
  credentials: true
}));

// 4. Rate Limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Stricter Rate Limiter for Authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// 5. Restrict JSON Payload Size (Prevent DoS via huge payload)
app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/bank-transactions', bankTransactionRouter);
app.use('/api/partner-flows', partnerFlowRouter);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Business Expense & Ledger Tracking System API is running...');
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

