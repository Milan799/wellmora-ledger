import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Users2, 
  Wallet, 
  BarChart3,
  Calendar
} from 'lucide-react';
import InteractiveDonutChart from './InteractiveDonutChart';
import ExportDropdown from './ExportDropdown';

export default function FinancialSummary({ transactions = [], bankTransactions = [], partnerTransactions = [] }) {
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Date filtering helper
  const filterByDate = (list) => {
    return list.filter(t => {
      const itemDate = new Date(t.date || t.createdAt);
      if (isNaN(itemDate.getTime())) return true;
      const now = new Date();

      if (dateRange === 'today') {
        return itemDate.getDate() === now.getDate() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear();
      } else if (dateRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return itemDate >= oneWeekAgo;
      } else if (dateRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return itemDate >= startOfMonth;
      } else if (dateRange === 'quarter') {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
        return itemDate >= startOfQuarter;
      } else if (dateRange === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return itemDate >= startOfYear;
      } else if (dateRange === 'custom') {
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (itemDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (itemDate > e) return false;
        }
        return true;
      }
      return true;
    });
  };

  const activeLedger = filterByDate(transactions);
  const activeBank = filterByDate(bankTransactions);
  const activePartner = filterByDate(partnerTransactions);

  // 1. General Ledger & In Hand Cash Calculations
  const ledgerInflow = activeLedger
    .filter(t => t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const ledgerOutflow = activeLedger
    .filter(t => t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const ledgerNet = ledgerInflow - ledgerOutflow;

  const inHandCashInflow = activeLedger
    .filter(t => t.isHandCash && t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const inHandCashOutflow = activeLedger
    .filter(t => t.isHandCash && t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const inHandCashNet = inHandCashInflow - inHandCashOutflow;

  // 2. Bank Transactions Calculations
  const bankDeposits = activeBank
    .filter(t => t.type === 'Deposit' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const bankWithdrawals = activeBank
    .filter(t => t.type === 'Withdrawal' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const bankNet = bankDeposits - bankWithdrawals;

  // Group by Bank Account Name/Number
  const bankAccountsMap = {};
  activeBank.forEach(t => {
    if (t.status !== 'Completed') return;
    const key = `${t.bankName} (A/C: ${t.accountNumber || 'N/A'})`;
    if (!bankAccountsMap[key]) {
      bankAccountsMap[key] = { bankName: t.bankName, accountNumber: t.accountNumber, deposits: 0, withdrawals: 0 };
    }
    if (t.type === 'Deposit') {
      bankAccountsMap[key].deposits += t.amount;
    } else {
      bankAccountsMap[key].withdrawals += t.amount;
    }
  });

  const bankAccountsList = Object.keys(bankAccountsMap).map(key => ({
    name: key,
    net: bankAccountsMap[key].deposits - bankAccountsMap[key].withdrawals,
    deposits: bankAccountsMap[key].deposits,
    withdrawals: bankAccountsMap[key].withdrawals
  }));

  // 3. Partner Money Flow Calculations
  const partnerContribution = activePartner
    .filter(t => t.type === 'Capital Contribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerWithdrawal = activePartner
    .filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerNet = partnerContribution - partnerWithdrawal;

  // Predefined partners list
  const partners = ['Milan Javiya', 'Krushang Prajapati', 'Umang Prajapati', 'Moksh Shah'];
  
  const partnerBreakdown = partners.map(name => {
    const flows = activePartner.filter(t => t.partnerName === name);
    const contributions = flows
      .filter(t => t.type === 'Capital Contribution')
      .reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = flows
      .filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      name,
      contributions,
      withdrawals,
      net: contributions - withdrawals
    };
  });

  // 4. Combined calculations
  const totalCombinedInflows = ledgerInflow + bankDeposits + partnerContribution;
  const totalCombinedOutflows = ledgerOutflow + bankWithdrawals + partnerWithdrawal;
  const totalNetLiquidAssets = inHandCashNet + bankNet;

  // 5. Category-wise Spending (Ledger Debits)
  const categoryTotals = {};
  activeLedger
    .filter(t => t.type === 'Debit')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const totalExpense = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const categoriesList = Object.keys(categoryTotals).map(cat => ({
    category: cat,
    amount: categoryTotals[cat],
    percentage: totalExpense > 0 ? (categoryTotals[cat] / totalExpense) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Sales': return '#10b981'; // emerald-500
      case 'Purchase': return '#f59e0b'; // amber-500
      case 'Logistics': return '#6366f1'; // indigo-500
      case 'Marketing': return '#f43f5e'; // rose-500
      case 'Office Expense': return '#0ea5e9'; // sky-500
      default: return '#64748b'; // slate-500
    }
  };

  const categoryChartData = categoriesList.map(item => ({
    label: item.category,
    value: item.amount,
    color: getCategoryColor(item.category)
  }));

  const getPartnerColor = (name) => {
    switch (name) {
      case 'Milan Javiya': return '#6366f1'; // Indigo
      case 'Krushang Prajapati': return '#10b981'; // Emerald
      case 'Umang Prajapati': return '#f59e0b'; // Amber
      case 'Moksh Shah': return '#a855f7'; // Purple
      default: return '#64748b';
    }
  };

  const partnerChartData = partnerBreakdown
    .map(row => ({
      label: row.name,
      value: Math.max(0, row.net),
      color: getPartnerColor(row.name)
    }))
    .filter(item => item.value > 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // MS Excel HTML Table Exporter for Summary
  const exportToExcel = (headers, rows, filename) => {
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Financial Summary</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2 style="font-family: Arial; color: #4f46e5;">Wellmora Enterprise - Financial Summary Report</h2>
        <table border="1" style="border-collapse: collapse; font-family: Arial; font-size: 12px;">
          <thead>
            <tr style="background-color: #6366f1; color: white; font-weight: bold;">
              ${headers.map(h => `<th style="padding: 8px;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td style="padding: 6px;">${String(cell)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFinancialSummaryExport = (range, startDateParam, endDateParam) => {
    let activeL = [...transactions];
    let activeB = [...bankTransactions];
    let activeP = [...partnerTransactions];
    const now = new Date();

    if (range === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      activeL = transactions.filter(t => new Date(t.date || t.createdAt) >= startOfMonth);
      activeB = bankTransactions.filter(t => new Date(t.date || t.createdAt) >= startOfMonth);
      activeP = partnerTransactions.filter(t => new Date(t.date || t.createdAt) >= startOfMonth);
    } else if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      activeL = transactions.filter(t => new Date(t.date || t.createdAt) >= startOfQuarter);
      activeB = bankTransactions.filter(t => new Date(t.date || t.createdAt) >= startOfQuarter);
      activeP = partnerTransactions.filter(t => new Date(t.date || t.createdAt) >= startOfQuarter);
    } else if (range === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      activeL = transactions.filter(t => new Date(t.date || t.createdAt) >= startOfYear);
      activeB = bankTransactions.filter(t => new Date(t.date || t.createdAt) >= startOfYear);
      activeP = partnerTransactions.filter(t => new Date(t.date || t.createdAt) >= startOfYear);
    } else if (range === 'custom') {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      activeL = transactions.filter(t => { const d = new Date(t.date || t.createdAt); return d >= start && d <= end; });
      activeB = bankTransactions.filter(t => { const d = new Date(t.date || t.createdAt); return d >= start && d <= end; });
      activeP = partnerTransactions.filter(t => { const d = new Date(t.date || t.createdAt); return d >= start && d <= end; });
    }

    const headers = ['Financial Metric', 'Value (INR)'];
    const lIn = activeL.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
    const lOut = activeL.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
    const bIn = activeB.filter(t => t.type === 'Deposit' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const bOut = activeB.filter(t => t.type === 'Withdrawal' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const pIn = activeP.filter(t => t.type === 'Capital Contribution').reduce((sum, t) => sum + t.amount, 0);
    const pOut = activeP.filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution').reduce((sum, t) => sum + t.amount, 0);

    const rows = [
      ['Total Combined Inflows', lIn + bIn + pIn],
      ['Total Combined Outflows', lOut + bOut + pOut],
      ['Operating Ledger Inflows', lIn],
      ['Operating Ledger Outflows', lOut],
      ['Operating Ledger Net Balance', lIn - lOut],
      ['Bank Accounts Deposits', bIn],
      ['Bank Accounts Withdrawals', bOut],
      ['Bank Accounts Net Balance', bIn - bOut],
      ['Partner Capital Contributions', pIn],
      ['Partner Profit Withdrawals', pOut],
      ['Partner Net Equity', pIn - pOut],
    ];

    exportToExcel(headers, rows, `wellmora_financial_summary_${range}.xls`);
  };

  return (
    <div className="space-y-6 pb-8 animate-slide-up">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-violet-600 dark:text-violet-400" size={20} />
            Financial Overview
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            Simple summary of your money, bank balances, and partner shares.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportDropdown onExport={handleFinancialSummaryExport} />
        </div>
      </div>

      {/* Date Range Selector Toolbar */}
      <div className="glass-panel rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 w-full sm:w-auto">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Calendar size={13} />
            Date Period:
          </span>

          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Past 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'quarter', label: 'This Quarter' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom Range' }
          ].map(range => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                dateRange === range.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto justify-between sm:justify-start">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400 font-bold text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-slate-200"
            />
          </div>
        )}
      </div>

      {/* Combined Positions Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 glow-violet relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-violet-650/10 to-indigo-650/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Money Available</span>
            <span className="px-2 py-0.5 bg-violet-500/10 dark:bg-violet-950/45 text-[9px] font-bold text-violet-600 dark:text-violet-400 rounded-md tracking-wide uppercase border border-violet-500/10">
              Total Cash & Bank
            </span>
          </div>
          <div className="my-4 z-10">
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${totalNetLiquidAssets >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
              {formatCurrency(totalNetLiquidAssets)}
            </h1>
            <p className="text-slate-450 dark:text-slate-400 text-[10.5px] mt-1 font-medium">
              In-Hand Cash ({formatCurrency(inHandCashNet)}) + Bank Balance ({formatCurrency(bankNet)}).
            </p>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider border-t border-slate-200/50 dark:border-slate-800/50 pt-3 z-10">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Cash: {formatCurrency(inHandCashNet)}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Bank: {formatCurrency(bankNet)}</span>
          </div>
        </div>

        {/* Combined Turnover Statistics */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Total Money In & Out</span>
          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400"><TrendingUp size={14} /></div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-450">Money In</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCombinedInflows)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-450"><TrendingDown size={14} /></div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-450">Money Out</span>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalCombinedOutflows)}</span>
            </div>
          </div>
          <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5 mt-2.5 text-[9px] font-medium text-slate-400 dark:text-slate-500 italic text-center">
            Includes all Ledgers, Bank and Partner activities.
          </div>
        </div>
      </div>

      {/* Segment Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
        {/* Ledger */}
        <div className="glass-panel rounded-xl p-4.5 glow-indigo relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[9.5px] tracking-wider uppercase">Operating Ledger</span>
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400"><Wallet size={14} /></div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">{formatCurrency(ledgerNet)}</h3>
          <div className="flex items-center justify-between mt-2.5 text-[9.5px] font-semibold text-slate-500 dark:text-slate-450">
            <span>Inflows: {formatCurrency(ledgerInflow)}</span>
            <span>Outflows: {formatCurrency(ledgerOutflow)}</span>
          </div>
        </div>

        {/* Bank */}
        <div className="glass-panel rounded-xl p-4.5 glow-green relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[9.5px] tracking-wider uppercase">Bank Assets</span>
            <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-600 dark:text-sky-400"><Building2 size={14} /></div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">{formatCurrency(bankNet)}</h3>
          <div className="flex items-center justify-between mt-2.5 text-[9.5px] font-semibold text-slate-500 dark:text-slate-450">
            <span>Deposits: {formatCurrency(bankDeposits)}</span>
            <span>Withdrawals: {formatCurrency(bankWithdrawals)}</span>
          </div>
        </div>

        {/* Partner Flow */}
        <div className="glass-panel rounded-xl p-4.5 glow-rose relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[9.5px] tracking-wider uppercase">Partner Capital</span>
            <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-600 dark:text-violet-400"><Users2 size={14} /></div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">{formatCurrency(partnerNet)}</h3>
          <div className="flex items-center justify-between mt-2.5 text-[9.5px] font-semibold text-slate-500 dark:text-slate-450">
            <span>Contributions: {formatCurrency(partnerContribution)}</span>
            <span>Withdrawn: {formatCurrency(partnerWithdrawal)}</span>
          </div>
        </div>
      </div>

      {/* 1. Partner Balances & Equity Share Sheet */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
            <Users2 size={15} className="text-violet-600 dark:text-violet-400" />
            Partner Equity & Capital Accounts
          </h3>
          <span className="text-[9px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded border border-violet-500/10">Equity Split</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
          <div className="lg:col-span-3 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                  <th className="py-2">Partner</th>
                  <th className="py-2 text-right">Contributed</th>
                  <th className="py-2 text-right">Withdrawn</th>
                  <th className="py-2 text-right">Net Equity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-medium text-slate-750 dark:text-slate-300">
                {partnerBreakdown.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-450">{formatCurrency(row.contributions)}</td>
                    <td className="py-2.5 text-right text-rose-500 dark:text-rose-450">{formatCurrency(row.withdrawals)}</td>
                    <td className={`py-2.5 text-right font-black ${row.net >= 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-450'}`}>
                      {formatCurrency(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:col-span-2">
            <InteractiveDonutChart 
              data={partnerChartData} 
              centerLabel="Net Equity" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Bank Accounts Balance Sheet */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
              <Building2 size={15} className="text-sky-600 dark:text-sky-400" />
              Bank Account Positions
            </h3>
            <span className="text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded border border-sky-500/10">Cash at Bank</span>
          </div>
          {bankAccountsList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic">No completed bank transactions available to aggregate.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                    <th className="py-2">Account</th>
                    <th className="py-2 text-right">Deposited</th>
                    <th className="py-2 text-right">Withdrawn</th>
                    <th className="py-2 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-medium text-slate-750 dark:text-slate-300">
                  {bankAccountsList.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-450">{formatCurrency(row.deposits)}</td>
                      <td className="py-2.5 text-right text-slate-500 dark:text-slate-400">{formatCurrency(row.withdrawals)}</td>
                      <td className={`py-2.5 text-right font-black ${row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {formatCurrency(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Category Expenses Distribution */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
            <BarChart3 size={15} className="text-emerald-600 dark:text-emerald-400" />
            Operating Expense Categories Distribution
          </h3>
          <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/10">Expenses Breakdown</span>
        </div>
        {categoriesList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic">No debit/expense items recorded in the ledger.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-2">
              <InteractiveDonutChart 
                data={categoryChartData} 
                centerLabel="Expenses" 
              />
            </div>
            <div className="lg:col-span-3 space-y-4">
              {categoriesList.map((item) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.category}</span>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-150 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${item.percentage}%` }} 
                      className="h-full bg-gradient-to-r from-violet-650 to-indigo-500 rounded-full transition-all duration-1000 ease-out" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
