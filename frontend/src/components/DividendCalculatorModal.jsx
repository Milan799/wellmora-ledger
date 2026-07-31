import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, AlertCircle, DollarSign, ArrowRight, Layers, Users, RefreshCw, PieChart, Sparkles } from 'lucide-react';

export default function DividendCalculatorModal({ 
  isOpen = true, 
  onClose, 
  transactions = [], 
  onPostShareDistribution,
  isEmbedded = false 
}) {
  const partnersList = ['Milan Javiya', 'Krushang Prajapati', 'Umang Prajapati', 'Moksh Shah'];

  const partnerColors = {
    'Milan Javiya': { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20', lightBg: 'bg-indigo-50 dark:bg-indigo-950/40' },
    'Krushang Prajapati': { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    'Umang Prajapati': { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', lightBg: 'bg-amber-50 dark:bg-amber-950/40' },
    'Moksh Shah': { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20', lightBg: 'bg-purple-50 dark:bg-purple-950/40' }
  };

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

  if (!isEmbedded && !isOpen) return null;

  const totalPct = Object.values(equityPcts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const isValidPct = Math.abs(totalPct - 100) < 0.1;

  const profitVal = parseFloat(netProfitInput) || 0;

  const handlePctChange = (partner, val) => {
    setEquityPcts(prev => ({
      ...prev,
      [partner]: val
    }));
  };

  const handleQuickPreset = (amount) => {
    setNetProfitInput(amount.toString());
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
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      alert('Error posting dividend entries: ' + err.message);
    } finally {
      setIsPosting(false);
    }
  };

  const mainContent = (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Calculator size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                Partner Profit Sharing & Dividend Calculator
                <Sparkles size={16} className="text-amber-300 animate-pulse" />
              </h2>
              <p className="text-violet-200 text-xs mt-0.5 font-medium">
                Compute partner equity profit distributions and post payouts directly to capital flows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-extrabold backdrop-blur-md border ${
              isValidPct 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
            }`}>
              Ownership Split: {totalPct.toFixed(1)}% {isValidPct ? '✓ Valid' : '⚠️ Must total 100%'}
            </span>
          </div>
        </div>

        {/* Quick Amount Presets */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-violet-200 uppercase tracking-wider">Quick Presets:</span>
          <button
            onClick={() => handleQuickPreset(100000)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            ₹1 Lakh
          </button>
          <button
            onClick={() => handleQuickPreset(500000)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            ₹5 Lakhs
          </button>
          <button
            onClick={() => handleQuickPreset(1000000)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            ₹10 Lakhs
          </button>
          <button
            onClick={() => handleQuickPreset(2500000)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            ₹25 Lakhs
          </button>
        </div>
      </div>

      {/* Main Form & Calculation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Controls: Inputs & Partner Ownership Sliders */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-violet-600 dark:text-violet-400" />
              1. Distribution Pool Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Total Net Profit Pool (INR)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-black text-sm">₹</span>
                  <input
                    type="number"
                    value={netProfitInput}
                    onChange={(e) => setNetProfitInput(e.target.value)}
                    placeholder="e.g. 1000000"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-sm font-black text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Fiscal Period / Distribution Notes
                </label>
                <input
                  type="text"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  placeholder="e.g. Q1 2026 Distribution"
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            {/* Equity Split Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
                  2. Partner Equity Ownership (%)
                </h4>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Must sum to 100%
                </span>
              </div>

              <div className="space-y-3">
                {partnersList.map(partner => {
                  const pct = parseFloat(equityPcts[partner]) || 0;
                  const colorConfig = partnerColors[partner] || partnerColors['Milan Javiya'];
                  return (
                    <div key={partner} className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${colorConfig.bg}`} />
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">{partner}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 w-28">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={equityPcts[partner] || ''}
                            onChange={(e) => handlePctChange(partner, e.target.value)}
                            className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100 text-right focus:ring-2 focus:ring-violet-500/20"
                          />
                          <span className="text-xs font-bold text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Visual Weight Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colorConfig.bg} transition-all duration-300`}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Output Card: Calculated Payout Summary & Live Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
              <PieChart size={16} className="text-emerald-600 dark:text-emerald-400" />
              3. Calculated Partner Payouts
            </h3>

            {/* Proportional Distribution Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {partnersList.map(partner => {
                  const pct = parseFloat(equityPcts[partner]) || 0;
                  const colorConfig = partnerColors[partner];
                  if (pct <= 0) return null;
                  return (
                    <div 
                      key={`bar_${partner}`}
                      className={`h-full ${colorConfig.bg} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                      title={`${partner}: ${pct}%`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                <span>0%</span>
                <span>Proportional Ownership Distribution</span>
                <span>100%</span>
              </div>
            </div>

            {/* Detailed Payout List */}
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
              {partnersList.map(partner => {
                const pct = parseFloat(equityPcts[partner]) || 0;
                const payout = (profitVal * pct) / 100;
                const colorConfig = partnerColors[partner];

                return (
                  <div key={`payout_card_${partner}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorConfig.bg}`} />
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">{partner}</div>
                        <div className="text-[10px] font-bold text-slate-400">Equity Share: {pct}%</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(payout)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Post Action Box */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <button
                disabled={!isValidPct || profitVal <= 0 || isPosting}
                onClick={handlePostAllToLedger}
                className={`w-full py-3.5 px-5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  postedSuccess 
                    ? 'bg-emerald-600 text-white' 
                    : (!isValidPct || profitVal <= 0 || isPosting)
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                      : 'bg-violet-600 hover:bg-violet-500 text-white active:scale-95 shadow-violet-500/20'
                }`}
              >
                {postedSuccess ? (
                  <>
                    <Check size={16} /> Posted Distributions to Partner Ledger!
                  </>
                ) : isPosting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Posting Payout Entries...
                  </span>
                ) : (
                  <>
                    Post All Payouts to Partner Capital Ledger
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400 font-medium">
                Clicking post will automatically add individual Share Distribution records for each partner into the Capital Flows ledger.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );

  if (isEmbedded) {
    return mainContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] my-auto flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Calculator size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
              Partner Profit Sharing & Dividend Calculator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 bg-white dark:bg-slate-900">
          {mainContent}
        </div>
      </div>
    </div>
  );
}
