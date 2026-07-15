import mongoose from 'mongoose';

const bankTransactionSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: ['Deposit', 'Withdrawal'],
      message: '{VALUE} must be either Deposit or Withdrawal'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Pending', 'Completed', 'Failed'],
      message: '{VALUE} must be Pending, Completed, or Failed'
    },
    default: 'Completed'
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const BankTransaction = mongoose.model('BankTransaction', bankTransactionSchema);

export default BankTransaction;
