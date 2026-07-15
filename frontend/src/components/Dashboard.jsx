import React from 'react';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';

export default function Dashboard({ transactions }) {
  // Calculate totals
  const totalCredit = transactions
    .filter(t => t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebit = transactions
    .filter(t => t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredit - totalDebit;

  // Currency formatting helper (Rupees, Indian standard format)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const totalFlow = totalCredit + totalDebit;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
      {/* Total Credit Card */}
      <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-green relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Total Credit</span>
          <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={16} />
          </div>
        </div>
        <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
          {formatCurrency(totalCredit)}
        </h3>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
          Total business cash inflows
        </p>
      </div>

      {/* Total Debit / Expense Card */}
      <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-rose relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Total Debit / Expenses</span>
          <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
            <TrendingDown size={16} />
          </div>
        </div>
        <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
          {formatCurrency(totalDebit)}
        </h3>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
          Total business expenses & outflows
        </p>
      </div>

      {/* Net Balance Card */}
      <div className={`glass-panel glass-panel-hover rounded-xl p-4.5 relative overflow-hidden transition-all duration-300 ${
        netBalance >= 0 ? 'glow-green' : 'glow-rose'
      }`}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-6 -mt-6 blur-2xl ${
          netBalance >= 0 ? 'bg-emerald-500/5' : 'bg-rose-500/5'
        }`}></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Net Balance</span>
          <div className={`p-2 rounded-lg ${
            netBalance >= 0 
              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
            <IndianRupee size={14} />
          </div>
        </div>
        <h3 className={`text-xl font-black tracking-tight ${
          netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {formatCurrency(netBalance)}
        </h3>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
          {netBalance >= 0 ? 'Operating in positive surplus' : 'Operating in net deficit'}
        </p>
      </div>

      {/* Expense Turnover Ratio */}
      {totalFlow > 0 && (
        <div className="md:col-span-3 glass-panel rounded-xl p-4.5 glow-indigo relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs tracking-tight">Expense Turnover Ratio</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-650 dark:text-indigo-400 rounded border border-indigo-500/10 font-bold uppercase tracking-wider">Analytics</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-450">
              {((totalDebit / totalFlow) * 100).toFixed(1)}% Debit / {((totalCredit / totalFlow) * 100).toFixed(1)}% Credit
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-900/60 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${(totalCredit / totalFlow) * 100}%` }} 
              className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
              title="Credit Ratio"
            />
            <div 
              style={{ width: `${(totalDebit / totalFlow) * 100}%` }} 
              className="h-full bg-rose-500 transition-all duration-1000 ease-out" 
              title="Debit Ratio"
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Cash Inflow</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Cash Outflow</span>
          </div>
        </div>
      )}
    </div>
  );
}
