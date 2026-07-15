import React from 'react';
import { Edit2, Trash2, Calendar, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TransactionTable({ transactions, onEdit, onDelete }) {
  // Format Date (Indian format, e.g. 14 Jul 2026)
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  // Format Currency (Indian format with Rupees)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Get warm colors for categories
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Sales':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Purchase':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20';
      case 'Logistics':
        return 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20';
      case 'Marketing':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'Office Expense':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 animate-fade-in">
        <div className="mx-auto w-12 h-12 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center text-slate-450 dark:text-slate-550 border border-slate-200/50 dark:border-slate-800/50 mb-3">
          <FileText size={22} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-1">No transactions found</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
          Try adjusting your filters or search terms, or create a new entry to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/60 shadow-lg animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-xs text-slate-700 dark:text-slate-250">
            {transactions.map((t, idx) => (
              <tr 
                key={t._id} 
                className="hover:bg-slate-100/30 dark:hover:bg-slate-900/20 transition-colors group"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Date */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                    <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                    {formatDate(t.date)}
                  </div>
                </td>
                
                {/* Description */}
                <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-50 max-w-xs truncate text-xs">
                  {t.description}
                </td>
                
                {/* Category */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getCategoryBadgeClass(t.category)}`}>
                    {t.category}
                  </span>
                </td>
                
                {/* Type Badge */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {t.type === 'Credit' ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ArrowUpRight size={10} />
                      Credit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      <ArrowDownRight size={10} />
                      Debit
                    </span>
                  )}
                </td>
                
                {/* Amount */}
                <td className={`px-4 py-3.5 text-right whitespace-nowrap font-bold text-xs ${
                  t.type === 'Credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {t.type === 'Credit' ? '+' : '-'}{formatCurrency(t.amount)}
                </td>
                
                {/* Actions */}
                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer transition-colors"
                      title="Edit entry"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(t)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
