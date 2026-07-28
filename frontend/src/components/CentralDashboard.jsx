import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Building2, 
  Users2, 
  Search, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit2, 
  Trash2, 
  Filter, 
  Download, 
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import ExportDropdown from './ExportDropdown';

export default function CentralDashboard({
  transactions = [],
  bankTransactions = [],
  partnerTransactions = [],
  onEditLedger,
  onDeleteLedger,
  onEditBank,
  onDeleteBank,
  onEditPartner,
  onDeletePartner
}) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All'); // 'All' | 'ledger' | 'bank' | 'partner'
  const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'Inflow' | 'Outflow'
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Format currency helper (INR)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Format date helper (Indian locale)
  const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Normalize all transactions into unified data structure
  const allCombinedTransactions = useMemo(() => {
    const ledgerItems = (transactions || []).map(t => ({
      _id: t._id,
      raw: t,
      sourceModule: 'ledger',
      sourceLabel: 'Operating Ledger',
      date: t.date || t.createdAt || new Date().toISOString(),
      timestamp: new Date(t.date || t.createdAt || Date.now()).getTime(),
      description: t.description || 'Ledger Entry',
      entityInfo: t.category || 'General Expense',
      subCategory: t.isHandCash ? 'In Hand Cash' : 'Ledger Account',
      flowType: t.type === 'Credit' ? 'Inflow' : 'Outflow',
      originalType: t.type,
      paymentMode: t.isHandCash ? 'In Hand Cash' : 'Ledger Transfer',
      amount: Number(t.amount || 0),
      refNo: '',
      status: 'Completed'
    }));

    const bankItems = (bankTransactions || []).map(t => ({
      _id: t._id,
      raw: t,
      sourceModule: 'bank',
      sourceLabel: 'Bank Account',
      date: t.date || t.createdAt || new Date().toISOString(),
      timestamp: new Date(t.date || t.createdAt || Date.now()).getTime(),
      description: t.notes || `${t.type} - ${t.bankName || 'Bank'}`,
      entityInfo: `${t.bankName || 'Bank'}${t.accountNumber ? ` (A/C: ${t.accountNumber})` : ''}`,
      subCategory: t.paymentMethod || 'Bank Transfer',
      flowType: t.type === 'Deposit' ? 'Inflow' : 'Outflow',
      originalType: t.type,
      paymentMode: t.paymentMethod || 'Online / Cheque',
      amount: Number(t.amount || 0),
      refNo: t.referenceNumber || '',
      status: t.status || 'Completed'
    }));

    const partnerItems = (partnerTransactions || []).map(t => ({
      _id: t._id,
      raw: t,
      sourceModule: 'partner',
      sourceLabel: 'Partner Equity',
      date: t.date || t.createdAt || new Date().toISOString(),
      timestamp: new Date(t.date || t.createdAt || Date.now()).getTime(),
      description: t.notes || `${t.type} by ${t.partnerName || 'Partner'}`,
      entityInfo: `Partner: ${t.partnerName || 'N/A'}`,
      subCategory: t.type,
      flowType: t.type === 'Capital Contribution' ? 'Inflow' : 'Outflow',
      originalType: t.type,
      paymentMode: t.paymentMode || 'Capital Transfer',
      amount: Number(t.amount || 0),
      refNo: '',
      status: 'Completed'
    }));

    return [...ledgerItems, ...bankItems, ...partnerItems];
  }, [transactions, bankTransactions, partnerTransactions]);

  // Combined Inflow / Outflow KPI metrics across all modules
  const kpiData = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    let ledgerIn = 0, ledgerOut = 0;
    let bankIn = 0, bankOut = 0;
    let partnerIn = 0, partnerOut = 0;

    allCombinedTransactions.forEach(t => {
      if (t.status === 'Failed') return;
      if (t.flowType === 'Inflow') {
        totalInflow += t.amount;
        if (t.sourceModule === 'ledger') ledgerIn += t.amount;
        if (t.sourceModule === 'bank') bankIn += t.amount;
        if (t.sourceModule === 'partner') partnerIn += t.amount;
      } else {
        totalOutflow += t.amount;
        if (t.sourceModule === 'ledger') ledgerOut += t.amount;
        if (t.sourceModule === 'bank') bankOut += t.amount;
        if (t.sourceModule === 'partner') partnerOut += t.amount;
      }
    });

    return {
      totalInflow,
      totalOutflow,
      netBalance: totalInflow - totalOutflow,
      ledgerIn,
      ledgerOut,
      bankIn,
      bankOut,
      partnerIn,
      partnerOut,
      totalCount: allCombinedTransactions.length
    };
  }, [allCombinedTransactions]);

  // Filtering and sorting date-wise transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    
    return allCombinedTransactions.filter(t => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch = 
          t.description.toLowerCase().includes(q) ||
          t.entityInfo.toLowerCase().includes(q) ||
          t.sourceLabel.toLowerCase().includes(q) ||
          t.subCategory.toLowerCase().includes(q) ||
          t.paymentMode.toLowerCase().includes(q) ||
          t.refNo.toLowerCase().includes(q) ||
          t.amount.toString().includes(q);

        if (!matchesSearch) return false;
      }

      // 2. Source filter
      if (sourceFilter !== 'All' && t.sourceModule !== sourceFilter) {
        return false;
      }

      // 3. Type filter
      if (typeFilter !== 'All' && t.flowType !== typeFilter) {
        return false;
      }

      // 4. Date range filter
      const itemDate = new Date(t.date);
      if (isNaN(itemDate.getTime())) return true;

      if (dateRange === 'today') {
        const today = new Date();
        if (
          itemDate.getDate() !== today.getDate() ||
          itemDate.getMonth() !== today.getMonth() ||
          itemDate.getFullYear() !== today.getFullYear()
        ) return false;
      } else if (dateRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        if (itemDate < oneWeekAgo) return false;
      } else if (dateRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (itemDate < startOfMonth) return false;
      } else if (dateRange === 'quarter') {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
        if (itemDate < startOfQuarter) return false;
      } else if (dateRange === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        if (itemDate < startOfYear) return false;
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
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.timestamp - b.timestamp;
      } else {
        return b.timestamp - a.timestamp;
      }
    });
  }, [allCombinedTransactions, search, sourceFilter, typeFilter, dateRange, startDate, endDate, sortOrder]);

  // Export Combined Data to Excel (.xls)
  const exportCentralToExcel = (range = 'all', startDateParam = '', endDateParam = '') => {
    let toExport = [...allCombinedTransactions];
    const now = new Date();

    if (range === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      toExport = allCombinedTransactions.filter(t => new Date(t.date) >= startOfMonth);
    } else if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      toExport = allCombinedTransactions.filter(t => new Date(t.date) >= startOfQuarter);
    } else if (range === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      toExport = allCombinedTransactions.filter(t => new Date(t.date) >= startOfYear);
    } else if (range === 'custom') {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      toExport = allCombinedTransactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }

    if (toExport.length === 0) {
      alert('No combined transactions found in the specified range to export.');
      return;
    }

    const headers = ['Date', 'Source Module', 'Description', 'Category / Details', 'Payment Mode', 'Ref No.', 'Flow Type', 'Original Type', 'Amount (INR)'];
    const rows = toExport.map(t => [
      formatDate(t.date),
      t.sourceLabel,
      (t.description || '').replace(/"/g, '""'),
      (t.entityInfo || '').replace(/"/g, '""'),
      t.paymentMode,
      t.refNo || '-',
      t.flowType,
      t.originalType,
      t.amount
    ]);

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Central Consolidated Ledger</x:Name>
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
        <h2 style="font-family: Arial; color: #4f46e5;">Wellmora Enterprise - Central Date-Wise Consolidated Ledger</h2>
        <p style="font-family: Arial; font-size: 12px; color: #64748b;">Report Generated: ${new Date().toLocaleString('en-IN')}</p>
        <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
          <thead>
            <tr style="background-color: #6366f1; color: white; font-weight: bold; text-align: left;">
              ${headers.map(h => `<th style="padding: 8px;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td style="padding: 6px;">${String(cell)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wellmora_central_consolidated_ledger_${range}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for source badge UI
  const renderSourceBadge = (sourceModule) => {
    switch (sourceModule) {
      case 'ledger':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
            <BookOpen size={11} />
            Ledger
          </span>
        );
      case 'bank':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            <Building2 size={11} />
            Bank
          </span>
        );
      case 'partner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">
            <Users2 size={11} />
            Partner
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-slide-up">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-violet-600/10 text-violet-600 dark:text-violet-400 rounded-xl">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                Central Combined Dashboard
                <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 rounded-md">
                  Unified Date-Wise Feed
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
                Integrated real-time date-wise transaction ledger combining Operating Expenses, Bank Accounts, and Partner Capital.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportDropdown onExport={exportCentralToExcel} />
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Inflows */}
        <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-green relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Total Combined Inflows</span>
            <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(kpiData.totalInflow)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Ledger: {formatCurrency(kpiData.ledgerIn)}</span>
            <span>Bank: {formatCurrency(kpiData.bankIn)}</span>
            <span>Partner: {formatCurrency(kpiData.partnerIn)}</span>
          </div>
        </div>

        {/* Total Outflows */}
        <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-rose relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Total Combined Outflows</span>
            <div className="p-1.5 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
              <TrendingDown size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(kpiData.totalOutflow)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Ledger: {formatCurrency(kpiData.ledgerOut)}</span>
            <span>Bank: {formatCurrency(kpiData.bankOut)}</span>
            <span>Partner: {formatCurrency(kpiData.partnerOut)}</span>
          </div>
        </div>

        {/* Net Consolidated Position */}
        <div className={`glass-panel glass-panel-hover rounded-xl p-4.5 relative overflow-hidden transition-all duration-300 ${
          kpiData.netBalance >= 0 ? 'glow-indigo' : 'glow-rose'
        }`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-6 -mt-6 blur-2xl ${
            kpiData.netBalance >= 0 ? 'bg-indigo-500/5' : 'bg-rose-500/5'
          }`}></div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Net Consolidated Surplus</span>
            <div className={`p-1.5 rounded-lg ${
              kpiData.netBalance >= 0 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              <Layers size={16} />
            </div>
          </div>
          <h3 className={`text-2xl font-black tracking-tight ${
            kpiData.netBalance >= 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(kpiData.netBalance)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>{kpiData.totalCount} Total Transactions Recorded</span>
            <span>{filteredTransactions.length} Filtered</span>
          </div>
        </div>
      </div>

      {/* 3. Combined Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3.5">
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across all modules, descriptions, categories, banks..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
            />
          </div>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Source Module Filter */}
            <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 px-2 uppercase">Source</span>
              {[
                { id: 'All', label: 'All' },
                { id: 'ledger', label: 'Ledger' },
                { id: 'bank', label: 'Bank' },
                { id: 'partner', label: 'Partner' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSourceFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sourceFilter === opt.id
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 px-2 uppercase">Flow</span>
              {[
                { id: 'All', label: 'All' },
                { id: 'Inflow', label: 'Inflow (+)' },
                { id: 'Outflow', label: 'Outflow (-)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTypeFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    typeFilter === opt.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/70 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Toggle Sort Order"
            >
              <ArrowUpDown size={13} className="text-violet-500" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Date Range Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-xs">
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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
            <div className="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
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
      </div>

      {/* 4. Date-Wise Unified Transactions Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-xl">
        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Date-Wise Consolidated Transactions ({filteredTransactions.length})
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            Chronological Stream
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium text-xs">
            <Filter size={24} className="mx-auto mb-2 text-slate-400 opacity-60" />
            No combined transactions match your current search and date filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Module Source</th>
                  <th className="px-4 py-3.5">Description / Note</th>
                  <th className="px-4 py-3.5">Category / Account</th>
                  <th className="px-4 py-3.5">Payment Mode</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-xs text-slate-700 dark:text-slate-250">
                {filteredTransactions.map((t) => (
                  <tr 
                    key={`${t.sourceModule}_${t._id}`} 
                    className="hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    {/* Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                        <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        {formatDate(t.date)}
                      </div>
                    </td>

                    {/* Source Module */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderSourceBadge(t.sourceModule)}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 max-w-xs truncate font-medium text-slate-900 dark:text-slate-100 text-xs" title={t.description}>
                      {t.description}
                      {t.refNo && (
                        <span className="block text-[9.5px] font-normal text-slate-400 dark:text-slate-500">
                          Ref: {t.refNo}
                        </span>
                      )}
                    </td>

                    {/* Category / Entity */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-350 text-xs">
                      {t.entityInfo}
                    </td>

                    {/* Payment Mode */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-semibold border border-slate-200/60 dark:border-slate-800">
                        {t.paymentMode}
                      </span>
                    </td>

                    {/* Flow Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {t.flowType === 'Inflow' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <ArrowUpRight size={11} />
                          {t.originalType}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <ArrowDownRight size={11} />
                          {t.originalType}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className={`px-4 py-3.5 text-right whitespace-nowrap font-extrabold text-xs ${
                      t.flowType === 'Inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {t.flowType === 'Inflow' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            if (t.sourceModule === 'ledger') onEditLedger(t.raw);
                            else if (t.sourceModule === 'bank') onEditBank(t.raw);
                            else if (t.sourceModule === 'partner') onEditPartner(t.raw);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer transition-colors"
                          title="Edit transaction"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (t.sourceModule === 'ledger') onDeleteLedger(t.raw);
                            else if (t.sourceModule === 'bank') onDeleteBank(t.raw);
                            else if (t.sourceModule === 'partner') onDeletePartner(t.raw);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                          title="Delete transaction"
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
        )}
      </div>

    </div>
  );
}
