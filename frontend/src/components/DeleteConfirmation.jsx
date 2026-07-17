import React from 'react';
import { AlertOctagon, X } from 'lucide-react';

export default function DeleteConfirmation({ isOpen, onClose, onConfirm, transaction, type }) {
  if (!isOpen || !transaction) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Determine metadata based on transaction type
  const getTransactionDetails = () => {
    switch (type) {
      case 'bank':
        return {
          title: 'Bank Transaction',
          sourceLabel: 'Bank Name',
          sourceValue: `${transaction.bankName} (A/C: ${transaction.accountNumber})`,
          flowType: transaction.type,
          amount: transaction.amount,
          description: transaction.description || '—',
          status: transaction.status
        };
      case 'partner':
        return {
          title: 'Partner Money Flow',
          sourceLabel: 'Partner Name',
          sourceValue: transaction.partnerName,
          flowType: transaction.type,
          amount: transaction.amount,
          description: transaction.description || '—',
          status: null
        };
      case 'ledger':
      default:
        return {
          title: 'Ledger Expense / Credit',
          sourceLabel: 'Category',
          sourceValue: transaction.category,
          flowType: transaction.type,
          amount: transaction.amount,
          description: transaction.description || '—',
          status: null
        };
    }
  };

  const details = getTransactionDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/50 dark:bg-slate-955/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_24px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)] animate-modal relative max-h-[90vh] overflow-y-auto">
        
        {/* Header Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
        >
          <X size={16} />
        </button>
 
        <div className="p-5 sm:p-6">
          {/* Pulsing Warning Icon */}
          <div className="flex flex-col items-center text-center mt-1 mb-4">
            <div className="w-12 h-12 bg-rose-500/10 dark:bg-rose-500/15 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mb-2.5 border border-rose-500/20 relative">
              <span className="absolute inset-0 rounded-full bg-rose-500/10 dark:bg-rose-500/20 animate-ping"></span>
              <AlertOctagon size={22} className="relative z-10" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-50 tracking-tight">Delete Transaction</h3>
            <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1 max-w-[260px]">
              This operation is permanent. Are you sure you want to delete this record?
            </p>
          </div>
 
          {/* High Fidelity Receipt Details Panel */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4.5 mb-5 relative overflow-hidden">
            {/* Soft decorative background blurs */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-xl -mr-5 -mt-5"></div>
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-2.5">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{details.title}</span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{formatDate(transaction.date)}</span>
            </div>
 
            {/* Receipt Values */}
            <div className="space-y-2">
              {/* Description */}
              <div className="flex justify-between items-start gap-4">
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mt-0.5 shrink-0">Description</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-right break-words max-w-[200px]">{details.description}</span>
              </div>
 
              {/* Source (Category, Partner, or Bank Name) */}
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider shrink-0">{details.sourceLabel}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-50 text-right truncate max-w-[200px]">{details.sourceValue}</span>
              </div>
 
              {/* Flow Type */}
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Type</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  details.flowType === 'Credit' || details.flowType === 'Deposit' || details.flowType === 'Capital Contribution'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}>
                  {details.flowType}
                </span>
              </div>
 
              {/* Optional Status (Bank Transactions) */}
              {details.status && (
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Status</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    details.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : details.status === 'Pending'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}>
                    {details.status}
                  </span>
                </div>
              )}
 
              {/* Large Amount Display */}
              <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800/80 mt-2.5">
                <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Amount</span>
                <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(details.amount)}
                </span>
              </div>
            </div>
 
          </div>
 
          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-md shadow-rose-500/10 dark:shadow-rose-900/25 border border-rose-500/20 hover:border-rose-450/30 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 text-center"
            >
              Delete Record
            </button>
          </div>
 
        </div>
      </div>
    </div>
  );
}
