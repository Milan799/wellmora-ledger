import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, AlertCircle, DollarSign, ArrowRight, Layers } from 'lucide-react';

export default function DividendCalculatorModal({ isOpen, onClose, transactions = [], onPostShareDistribution }) {
  const partnersList = ['Milan Javiya', 'Krushang Prajapati', 'Umang Prajapati', 'Moksh Shah'];

  // Default equity split
  const [equityPcts, setEquityPcts] = useState({
    'Milan Javiya': 35,
    'Krushang Prajapati': 25,
    'Umang Prajapati': 20,
    'Moksh Shah': 20
  });

  const [netProfitInput, setNetProfitInput] = useState('1000000');
  const [periodName, setPeriodName] = useState('FY 2025-26 Q1');
  const [isPosting, setIsPosting] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);

  // Calculate default net profit from operating ledger if available
  useEffect(() => {
    if (transactions.length > 0) {
      const revenue = transactions.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
      const expenses = transactions.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
      const calculatedProfit = Math.max(0, revenue - expenses);
      if (calculatedProfit > 0) {
        setNetProfitInput(calculatedProfit.toString());
      }
    }
  }, [transactions]);

  if (!isOpen) return null;

  const totalPct = Object.values(equityPcts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const isValidPct = Math.abs(totalPct - 100) < 0.1;

  const profitVal = parseFloat(netProfitInput) || 0;

  const handlePctChange = (partner, val) => {
    setEquityPcts(prev => ({
      ...prev,
      [partner]: val
    }));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const handlePostAllToLedger = async () => {
    if (!isValidPct || profitVal <= 0) return;
    setIsPosting(true);
    try {
      for (const partner of partnersList) {
        const pct = parseFloat(equityPcts[partner]) || 0;
        const amount = (profitVal * pct) / 100;
        if (amount > 0) {
          await onPostShareDistribution({
            partnerName: partner,
            type: 'Share Distribution',
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            description: `Dividend Distribution - ${periodName} (${pct}% equity share)`
          });
        }
      }
      setPostedSuccess(true);
      setTimeout(() => {
        setPostedSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      alert('Error posting dividend entries: ' + err.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="glass-panel max-w-2xl w-full max-h-[90vh] my-auto flex flex-col rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight">Partner Profit Sharing & Dividend Calculator</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Compute profit distribution based on partner equity ownership.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Top Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Total Net Profit to Distribute (INR)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  value={netProfitInput}
                  onChange={(e) => setNetProfitInput(e.target.value)}
                  placeholder="e.g. 1000000"
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Fiscal Period Name / Notes
              </label>
              <input
                type="text"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="e.g. Q1 2026 Distribution"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Equity Weight Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                Partner Equity Ownership Split (%)
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                isValidPct 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}>
                Total: {totalPct.toFixed(1)}% {isValidPct ? '✓' : '(Must total 100%)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {partnersList.map(partner => (
                <div key={partner} className="p-3 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{partner}</span>
                  <div className="flex items-center gap-1 shrink-0 w-24">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={equityPcts[partner] || ''}
                      onChange={(e) => handlePctChange(partner, e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-right"
                    />
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Computed Dividend Breakdown Card */}
          <div className="glass-panel p-4 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 space-y-3">
            <h4 className="text-xs font-black uppercase text-violet-600 dark:text-violet-400 tracking-wider flex items-center gap-1.5">
              <Layers size={14} />
              Calculated Payout Summary
            </h4>

            <div className="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-xs">
              {partnersList.map(partner => {
                const pct = parseFloat(equityPcts[partner]) || 0;
                const payout = (profitVal * pct) / 100;
                return (
                  <div key={`payout_${partner}`} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{partner}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({pct}%)</span>
                    </div>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(payout)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cancel
          </button>

          <button
            disabled={!isValidPct || profitVal <= 0 || isPosting}
            onClick={handlePostAllToLedger}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              postedSuccess 
                ? 'bg-emerald-600 text-white' 
                : (!isValidPct || profitVal <= 0 || isPosting)
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-violet-600 hover:bg-violet-500 text-white active:scale-95 shadow-violet-500/20'
            }`}
          >
            {postedSuccess ? (
              <>
                <Check size={14} /> Posted to Partner Ledger!
              </>
            ) : isPosting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Posting...
              </span>
            ) : (
              <>
                Post Payouts to Partner Ledger
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
