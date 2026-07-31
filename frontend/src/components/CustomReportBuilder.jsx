import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Calendar, 
  Download, 
  ArrowRightLeft,
  FileSpreadsheet,
  Building2,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import ExportDropdown from './ExportDropdown';

export default function CustomReportBuilder({ transactions = [], bankTransactions = [], partnerTransactions = [] }) {
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl', 'balance_sheet', 'cash_flow'
  
  // Primary Period Date Range
  const [primaryRange, setPrimaryRange] = useState('month');
  const [primaryStart, setPrimaryStart] = useState('');
  const [primaryEnd, setPrimaryEnd] = useState('');

  // Comparison Period Toggle & Range
  const [enableComparison, setEnableComparison] = useState(false);
  const [compareRange, setCompareRange] = useState('prev_month');
  const [compareStart, setCompareStart] = useState('');
  const [compareEnd, setCompareEnd] = useState('');

  // Filtering Helper
  const filterListByRange = (list, rangeType, startDate, endDate) => {
    return list.filter(t => {
      const itemDate = new Date(t.date || t.createdAt);
      if (isNaN(itemDate.getTime())) return true;
      const now = new Date();

      if (rangeType === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return itemDate >= startOfMonth;
      } else if (rangeType === 'quarter') {
        const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
        return itemDate >= new Date(now.getFullYear(), qStartMonth, 1);
      } else if (rangeType === 'year') {
        return itemDate >= new Date(now.getFullYear(), 0, 1);
      } else if (rangeType === 'prev_month') {
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return itemDate >= prevMonthStart && itemDate <= prevMonthEnd;
      } else if (rangeType === 'custom') {
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0,0,0,0);
          if (itemDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23,59,59,999);
          if (itemDate > e) return false;
        }
        return true;
      }
      return true;
    });
  };

  // Compute metrics for a set of filtered arrays
  const computeMetrics = (tList, bList, pList) => {
    const revenue = tList.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
    const purchases = tList.filter(t => t.type === 'Debit' && (t.category === 'Purchase' || t.category === 'Stock')).reduce((s, t) => s + t.amount, 0);
    const expenses = tList.filter(t => t.type === 'Debit' && t.category !== 'Purchase' && t.category !== 'Stock').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = purchases + expenses;
    const grossProfit = revenue - purchases;
    const netIncome = revenue - totalExpenses;

    const cashIn = tList.filter(t => t.isHandCash && t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
    const cashOut = tList.filter(t => t.isHandCash && t.type === 'Debit').reduce((s, t) => s + t.amount, 0);
    const inHandCashNet = cashIn - cashOut;

    const bankDeposits = bList.filter(t => t.type === 'Deposit' && t.status === 'Completed').reduce((s, t) => s + t.amount, 0);
    const bankWithdrawals = bList.filter(t => t.type === 'Withdrawal' && t.status === 'Completed').reduce((s, t) => s + t.amount, 0);
    const bankNet = bankDeposits - bankWithdrawals;
    const totalAssets = inHandCashNet + bankNet;

    const partnerContrib = pList.filter(t => t.type === 'Capital Contribution').reduce((s, t) => s + t.amount, 0);
    const partnerDraw = pList.filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution').reduce((s, t) => s + t.amount, 0);
    const netPartnerEquity = partnerContrib - partnerDraw;

    const operatingCashFlow = revenue - totalExpenses;
    const financingCashFlow = partnerContrib - partnerDraw;
    const netCashFlow = operatingCashFlow + financingCashFlow;

    return {
      revenue,
      purchases,
      grossProfit,
      expenses,
      totalExpenses,
      netIncome,
      inHandCashNet,
      bankNet,
      totalAssets,
      partnerContrib,
      partnerDraw,
      netPartnerEquity,
      totalEquity: netPartnerEquity + netIncome,
      operatingCashFlow,
      financingCashFlow,
      netCashFlow
    };
  };

  const primaryT = filterListByRange(transactions, primaryRange, primaryStart, primaryEnd);
  const primaryB = filterListByRange(bankTransactions, primaryRange, primaryStart, primaryEnd);
  const primaryP = filterListByRange(partnerTransactions, primaryRange, primaryStart, primaryEnd);
  const pMetrics = computeMetrics(primaryT, primaryB, primaryP);

  const compareT = filterListByRange(transactions, compareRange, compareStart, compareEnd);
  const compareB = filterListByRange(bankTransactions, compareRange, compareStart, compareEnd);
  const compareP = filterListByRange(partnerTransactions, compareRange, compareStart, compareEnd);
  const cMetrics = computeMetrics(compareT, compareB, compareP);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const calcVariance = (val1, val2) => {
    const diff = val1 - val2;
    const pct = val2 !== 0 ? ((diff / Math.abs(val2)) * 100).toFixed(1) : (val1 > 0 ? 100 : 0);
    return { diff, pct: Number(pct) };
  };

  const renderVarianceBadge = (val1, val2, isCost = false) => {
    if (!enableComparison) return null;
    const { diff, pct } = calcVariance(val1, val2);
    const isPositive = diff >= 0;
    const isGood = isCost ? !isPositive : isPositive;

    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
        isGood 
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      }`}>
        {isPositive ? '+' : ''}{formatCurrency(diff)} ({isPositive ? '+' : ''}{pct}%)
      </span>
    );
  };

  // Excel Exporter for Financial Reports
  const exportReportToExcel = () => {
    const headers = enableComparison 
      ? ['Metric / Line Item', 'Primary Period (INR)', 'Comparison Period (INR)', 'Variance (Diff)', 'Variance (%)']
      : ['Metric / Line Item', 'Amount (INR)'];

    let rows = [];

    if (activeTab === 'pnl') {
      rows = [
        ['Operating Revenue / Credits', pMetrics.revenue, cMetrics.revenue, pMetrics.revenue - cMetrics.revenue],
        ['Cost of Sales / Purchases', pMetrics.purchases, cMetrics.purchases, pMetrics.purchases - cMetrics.purchases],
        ['Gross Operating Profit', pMetrics.grossProfit, cMetrics.grossProfit, pMetrics.grossProfit - cMetrics.grossProfit],
        ['Operating Expenses (Debits)', pMetrics.expenses, cMetrics.expenses, pMetrics.expenses - cMetrics.expenses],
        ['Total Operating Costs', pMetrics.totalExpenses, cMetrics.totalExpenses, pMetrics.totalExpenses - cMetrics.totalExpenses],
        ['NET OPERATING INCOME', pMetrics.netIncome, cMetrics.netIncome, pMetrics.netIncome - cMetrics.netIncome]
      ];
    } else if (activeTab === 'balance_sheet') {
      rows = [
        ['ASSETS: In-Hand Cash Balance', pMetrics.inHandCashNet, cMetrics.inHandCashNet, pMetrics.inHandCashNet - cMetrics.inHandCashNet],
        ['ASSETS: Total Bank Balance', pMetrics.bankNet, cMetrics.bankNet, pMetrics.bankNet - cMetrics.bankNet],
        ['TOTAL LIQUID ASSETS', pMetrics.totalAssets, cMetrics.totalAssets, pMetrics.totalAssets - cMetrics.totalAssets],
        ['EQUITY: Partner Capital Contributed', pMetrics.partnerContrib, cMetrics.partnerContrib],
        ['EQUITY: Partner Drawings / Dividends', pMetrics.partnerDraw, cMetrics.partnerDraw],
        ['EQUITY: Net Partner Equity', pMetrics.netPartnerEquity, cMetrics.netPartnerEquity],
        ['TOTAL EQUITY & SURPLUS', pMetrics.totalEquity, cMetrics.totalEquity]
      ];
    } else {
      rows = [
        ['Operating Cash Flow', pMetrics.operatingCashFlow, cMetrics.operatingCashFlow],
        ['Financing Cash Flow (Partner)', pMetrics.financingCashFlow, cMetrics.financingCashFlow],
        ['Bank Liquidity Flow', pMetrics.bankNet, cMetrics.bankNet],
        ['NET COMBINED CASH MOVEMENT', pMetrics.netCashFlow, cMetrics.netCashFlow]
      ];
    }

    const htmlContent = `
      <html>
      <head><meta charset="utf-8"></head>
      <body>
        <h2>Wellmora Enterprise - Custom Financial Statement (${activeTab.toUpperCase()})</h2>
        <table border="1">
          <thead>
            <tr style="background:#6366f1; color:white;">
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellmora_financial_report_${activeTab}.xls`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <BarChart2 className="text-violet-600 dark:text-violet-400" size={20} />
            Custom Financial Report Builder
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            Generate Profit & Loss (P&L), Balance Sheets, and Cash Flow Statements with side-by-side period comparisons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportReportToExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <FileSpreadsheet size={14} /> Export to Excel
          </button>
        </div>
      </div>

      {/* Controls & Range Selectors */}
      <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl max-w-md">
          {[
            { id: 'pnl', label: 'Profit & Loss (P&L)' },
            { id: 'balance_sheet', label: 'Balance Sheet' },
            { id: 'cash_flow', label: 'Cash Flow Statement' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
          
          {/* Primary Period */}
          <div className="space-y-2">
            <span className="font-extrabold uppercase text-[10px] text-violet-600 dark:text-violet-400 tracking-wider flex items-center gap-1">
              <Calendar size={12} /> Primary Date Period:
            </span>
            <div className="flex items-center gap-2">
              <select
                value={primaryRange}
                onChange={(e) => setPrimaryRange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
              >
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {primaryRange === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={primaryStart}
                    onChange={(e) => setPrimaryStart(e.target.value)}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                  <input
                    type="date"
                    value={primaryEnd}
                    onChange={(e) => setPrimaryEnd(e.target.value)}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Comparison Period */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase text-[10px] text-slate-500 tracking-wider flex items-center gap-1">
                <ArrowRightLeft size={12} /> Side-by-Side Comparison:
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableComparison}
                  onChange={(e) => setEnableComparison(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable Comparison</span>
              </label>
            </div>

            {enableComparison && (
              <div className="flex items-center gap-2">
                <select
                  value={compareRange}
                  onChange={(e) => setCompareRange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                >
                  <option value="prev_month">Previous Month</option>
                  <option value="custom">Custom Range</option>
                </select>

                {compareRange === 'custom' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={compareStart}
                      onChange={(e) => setCompareStart(e.target.value)}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                    <input
                      type="date"
                      value={compareEnd}
                      onChange={(e) => setCompareEnd(e.target.value)}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Statement Display Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 font-bold uppercase text-[9.5px] tracking-wider">
              <th className="py-3.5 px-6">Financial Line Item</th>
              <th className="py-3.5 px-6 text-right">Primary Period</th>
              {enableComparison && <th className="py-3.5 px-6 text-right">Comparison Period</th>}
              {enableComparison && <th className="py-3.5 px-6 text-right">Variance Analysis</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 font-medium">

            {/* Profit & Loss View */}
            {activeTab === 'pnl' && (
              <>
                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">Operating Revenue (Credit Ledger)</td>
                  <td className="py-3.5 px-6 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(pMetrics.revenue)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right font-bold text-slate-600 dark:text-slate-400">{formatCurrency(cMetrics.revenue)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.revenue, cMetrics.revenue)}</td>}
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">Cost of Goods / Purchases</td>
                  <td className="py-3.5 px-6 text-right font-black text-rose-600 dark:text-rose-450">-{formatCurrency(pMetrics.purchases)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right font-bold text-slate-600 dark:text-slate-400">-{formatCurrency(cMetrics.purchases)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.purchases, cMetrics.purchases, true)}</td>}
                </tr>

                <tr className="bg-slate-100/50 dark:bg-slate-900/50 font-black">
                  <td className="py-3.5 px-6 text-indigo-700 dark:text-indigo-400 uppercase text-[10px] tracking-wider">Gross Operating Profit</td>
                  <td className="py-3.5 px-6 text-right font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(pMetrics.grossProfit)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right text-slate-700 dark:text-slate-300">{formatCurrency(cMetrics.grossProfit)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.grossProfit, cMetrics.grossProfit)}</td>}
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">Operating Expenses & Overheads</td>
                  <td className="py-3.5 px-6 text-right font-black text-rose-600 dark:text-rose-450">-{formatCurrency(pMetrics.expenses)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right font-bold text-slate-600 dark:text-slate-400">-{formatCurrency(cMetrics.expenses)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.expenses, cMetrics.expenses, true)}</td>}
                </tr>

                <tr className="bg-violet-500/10 dark:bg-violet-950/40 font-black text-sm">
                  <td className="py-4 px-6 text-violet-700 dark:text-violet-300 uppercase tracking-wider">NET OPERATING INCOME</td>
                  <td className={`py-4 px-6 text-right font-black ${pMetrics.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {formatCurrency(pMetrics.netIncome)}
                  </td>
                  {enableComparison && <td className="py-4 px-6 text-right text-slate-700 dark:text-slate-300">{formatCurrency(cMetrics.netIncome)}</td>}
                  {enableComparison && <td className="py-4 px-6 text-right">{renderVarianceBadge(pMetrics.netIncome, cMetrics.netIncome)}</td>}
                </tr>
              </>
            )}

            {/* Balance Sheet View */}
            {activeTab === 'balance_sheet' && (
              <>
                <tr className="bg-slate-100/40 dark:bg-slate-900/40 uppercase text-[9px] font-extrabold text-slate-400 tracking-wider">
                  <td colSpan={enableComparison ? 4 : 2} className="py-2 px-6">ASSETS</td>
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3 px-6 font-bold text-slate-900 dark:text-slate-100 pl-8">In-Hand Cash Net Balance</td>
                  <td className="py-3 px-6 text-right font-black text-slate-900 dark:text-slate-100">{formatCurrency(pMetrics.inHandCashNet)}</td>
                  {enableComparison && <td className="py-3 px-6 text-right text-slate-600 dark:text-slate-400">{formatCurrency(cMetrics.inHandCashNet)}</td>}
                  {enableComparison && <td className="py-3 px-6 text-right">{renderVarianceBadge(pMetrics.inHandCashNet, cMetrics.inHandCashNet)}</td>}
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3 px-6 font-bold text-slate-900 dark:text-slate-100 pl-8">Bank Accounts Net Balance</td>
                  <td className="py-3 px-6 text-right font-black text-sky-600 dark:text-sky-400">{formatCurrency(pMetrics.bankNet)}</td>
                  {enableComparison && <td className="py-3 px-6 text-right text-slate-600 dark:text-slate-400">{formatCurrency(cMetrics.bankNet)}</td>}
                  {enableComparison && <td className="py-3 px-6 text-right">{renderVarianceBadge(pMetrics.bankNet, cMetrics.bankNet)}</td>}
                </tr>

                <tr className="bg-emerald-500/10 dark:bg-emerald-950/40 font-black">
                  <td className="py-3.5 px-6 text-emerald-700 dark:text-emerald-300">TOTAL LIQUID ASSETS</td>
                  <td className="py-3.5 px-6 text-right text-emerald-600 dark:text-emerald-400 font-black text-sm">{formatCurrency(pMetrics.totalAssets)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right">{formatCurrency(cMetrics.totalAssets)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.totalAssets, cMetrics.totalAssets)}</td>}
                </tr>

                <tr className="bg-slate-100/40 dark:bg-slate-900/40 uppercase text-[9px] font-extrabold text-slate-400 tracking-wider">
                  <td colSpan={enableComparison ? 4 : 2} className="py-2 px-6">EQUITY & SURPLUS</td>
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3 px-6 font-bold text-slate-900 dark:text-slate-100 pl-8">Partner Capital Contributed</td>
                  <td className="py-3 px-6 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(pMetrics.partnerContrib)}</td>
                  {enableComparison && <td className="py-3 px-6 text-right">{formatCurrency(cMetrics.partnerContrib)}</td>}
                  {enableComparison && <td className="py-3 px-6 text-right">{renderVarianceBadge(pMetrics.partnerContrib, cMetrics.partnerContrib)}</td>}
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3 px-6 font-bold text-slate-900 dark:text-slate-100 pl-8">Partner Profit Drawings</td>
                  <td className="py-3 px-6 text-right font-black text-rose-600 dark:text-rose-400">-{formatCurrency(pMetrics.partnerDraw)}</td>
                  {enableComparison && <td className="py-3 px-6 text-right">-{formatCurrency(cMetrics.partnerDraw)}</td>}
                  {enableComparison && <td className="py-3 px-6 text-right">{renderVarianceBadge(pMetrics.partnerDraw, cMetrics.partnerDraw, true)}</td>}
                </tr>

                <tr className="bg-violet-500/10 dark:bg-violet-950/40 font-black text-sm">
                  <td className="py-3.5 px-6 text-violet-700 dark:text-violet-300">TOTAL CAPITAL & SURPLUS EQUITIES</td>
                  <td className="py-3.5 px-6 text-right text-violet-700 dark:text-violet-300 font-black">{formatCurrency(pMetrics.totalEquity)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right">{formatCurrency(cMetrics.totalEquity)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.totalEquity, cMetrics.totalEquity)}</td>}
                </tr>
              </>
            )}

            {/* Cash Flow View */}
            {activeTab === 'cash_flow' && (
              <>
                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">Operating Net Cash Flow (Revenue - Expenses)</td>
                  <td className="py-3.5 px-6 text-right font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(pMetrics.operatingCashFlow)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right">{formatCurrency(cMetrics.operatingCashFlow)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.operatingCashFlow, cMetrics.operatingCashFlow)}</td>}
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">Financing Cash Flow (Partner Flows)</td>
                  <td className="py-3.5 px-6 text-right font-black text-violet-600 dark:text-violet-400">{formatCurrency(pMetrics.financingCashFlow)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right">{formatCurrency(cMetrics.financingCashFlow)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.financingCashFlow, cMetrics.financingCashFlow)}</td>}
                </tr>

                <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                  <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">Bank Liquidity Movement</td>
                  <td className="py-3.5 px-6 text-right font-black text-sky-600 dark:text-sky-400">{formatCurrency(pMetrics.bankNet)}</td>
                  {enableComparison && <td className="py-3.5 px-6 text-right">{formatCurrency(cMetrics.bankNet)}</td>}
                  {enableComparison && <td className="py-3.5 px-6 text-right">{renderVarianceBadge(pMetrics.bankNet, cMetrics.bankNet)}</td>}
                </tr>

                <tr className="bg-emerald-500/10 dark:bg-emerald-950/40 font-black text-sm">
                  <td className="py-4 px-6 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">NET CASH MOVEMENT</td>
                  <td className="py-4 px-6 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(pMetrics.netCashFlow)}</td>
                  {enableComparison && <td className="py-4 px-6 text-right">{formatCurrency(cMetrics.netCashFlow)}</td>}
                  {enableComparison && <td className="py-4 px-6 text-right">{renderVarianceBadge(pMetrics.netCashFlow, cMetrics.netCashFlow)}</td>}
                </tr>
              </>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}
