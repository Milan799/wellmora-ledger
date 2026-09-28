import React, { useState, useEffect } from 'react';
import { X, IndianRupee, CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cleanWholesaleDescription } from '../utils/helpers';

export default function WholesalePaymentModal({ isOpen, onClose, onRecordPayment, purchase }) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (purchase) {
      setPaymentAmount(purchase.pendingAmount ? purchase.pendingAmount.toString() : '');
      setPaymentMode('Cash');
      setNotes('');
      setError('');
    }
  }, [purchase, isOpen]);

  if (!isOpen || !purchase) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const handlePayFull = () => {
    setPaymentAmount((purchase.pendingAmount || 0).toString());
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(paymentAmount);
    if (isNaN(val) || val <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (val > (purchase.pendingAmount || 0) + 0.01) {
      setError(`Payment amount cannot exceed pending balance of ${formatCurrency(purchase.pendingAmount)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onRecordPayment(purchase._id, {
        paymentAmount: val,
        paymentMode,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Record Wholesaler Payment</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pay pending balance to <span className="font-bold text-violet-600 dark:text-violet-400">{purchase.sellerName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Purchase Summary Pill */}
          <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="truncate max-w-[200px]">{cleanWholesaleDescription(purchase.description) || 'Wholesale Goods'}</span>
              <span className="text-[10px] px-2 py-0.5 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 rounded-md">
                {purchase.sellerName}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Total Bill</span>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {formatCurrency(purchase.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Paid So Far</span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(purchase.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Remaining</span>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(purchase.pendingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Payment Amount to Settle Now <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Pay Full Balance ({formatCurrency(purchase.pendingAmount)})
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={purchase.pendingAmount}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setError('');
                }}
                placeholder="Enter amount to pay..."
                className={`w-full pl-8 pr-3 py-2.5 rounded-xl text-sm font-black bg-slate-50 dark:bg-slate-950 border ${
                  error ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/30'
                } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all`}
              />
            </div>
            {error && (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle size={12} /> {error}
              </p>
            )}
          </div>

          {/* Payment Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Payment Outflow Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'Bank Transfer', 'UPI'].map(mode => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    paymentMode === mode
                      ? 'border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Note / Reference */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Payment Reference / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. GPay ref #9824, Cleared via cash"
              className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? 'Recording...' : 'Confirm Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
