import React, { useState } from 'react';
import { Calendar, Search, RefreshCw, Trash2, Edit2, Users, Wallet, Landmark } from 'lucide-react';
import ExportDropdown from './ExportDropdown';

export default function PartnerLedger({ transactions, onEdit, onDelete, loading, onRefresh, onAddClick }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const getFlowTypeBadgeClass = (type) => {
    switch (type) {
      case 'Capital Contribution':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20';
      case 'Profit Withdrawal':
        return 'bg-orange-500/10 text-orange-605 dark:text-orange-400 border-orange-500/20';
      case 'Share Distribution':
        return 'bg-rose-500/10 text-rose-650 dark:text-rose-455 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    }
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = 
      t.partnerName.toLowerCase().includes(search.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'All' || t.type === filterType;
    if (!matchesSearch || !matchesType) return false;

    // Date filtering
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

  // Calculates stats for active date period
  const totalContribution = filtered
    .filter(t => t.type === 'Capital Contribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawal = filtered
    .filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const netEquity = totalContribution - totalWithdrawal;

  const hasActiveFilters = search || filterType !== 'All' || dateRange !== 'all' || startDate || endDate;

  const handleClearFilters = () => {
    setSearch('');
    setFilterType('All');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
  };

  // MS Excel HTML Table Exporter
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
                <x:Name>Partner Report</x:Name>
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
        <table border="1">
          <thead>
            <tr style="background-color: #10b981; color: white; font-weight: bold;">
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${String(cell)}</td>`).join('')}</tr>`).join('')}
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

  // Exporter for Partner
  const handleExport = (range, startDateParam, endDateParam) => {
    let toExport = [...transactions];
    const now = new Date();
    
    if (range === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      toExport = transactions.filter(t => new Date(t.date || t.createdAt) >= startOfMonth);
    } else if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      toExport = transactions.filter(t => new Date(t.date || t.createdAt) >= startOfQuarter);
    } else if (range === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      toExport = transactions.filter(t => new Date(t.date || t.createdAt) >= startOfYear);
    } else if (range === 'custom') {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      toExport = transactions.filter(t => {
        const d = new Date(t.date || t.createdAt);
        return d >= start && d <= end;
      });
    }

    if (toExport.length === 0) {
      alert(`No partner records found in the specified range.`);
      return;
    }

    const headers = ['Date', 'Partner Name', 'Flow Type', 'Amount (INR)', 'Description'];
    const rows = toExport.map(t => [
      new Date(t.date || t.createdAt).toLocaleDateString('en-IN'),
      t.partnerName,
      t.type,
      t.amount,
      t.description || ''
    ]);

    exportToExcel(headers, rows, `wellmora_partner_ledger_${range}.xls`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">Partner Capital Flows</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            Track business partner capital contributions, draws, and dividends.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-200/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Refresh partner ledger"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <div className="shrink-0">
            <ExportDropdown onExport={handleExport} />
          </div>

          <button
            onClick={onAddClick}
            className="flex-1 sm:flex-initial px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-violet-500/20 shadow-lg shadow-violet-500/10 cursor-pointer transition-all duration-200 whitespace-nowrap"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {/* Dashboard Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
        {/* Total Contribution */}
        <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-green relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Partner Capital</span>
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-650 dark:text-emerald-450">
              <Users size={16} />
            </div>
          </div>
          <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(totalContribution)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
            Net capital invested by partners
          </p>
        </div>

        {/* Total Withdrawals */}
        <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-rose relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Profit Drawings</span>
            <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-455">
              <Wallet size={16} />
            </div>
          </div>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(totalWithdrawal)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
            Total draws & dividends distributed
          </p>
        </div>

        {/* Net Partner Equity */}
        <div className={`glass-panel glass-panel-hover rounded-xl p-4.5 relative overflow-hidden transition-all duration-300 ${
          netEquity >= 0 ? 'glow-green' : 'glow-rose'
        }`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-6 -mt-6 blur-2xl ${
            netEquity >= 0 ? 'bg-emerald-500/5' : 'bg-rose-500/5'
          }`}></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Net Partner Equity</span>
            <div className={`p-2 rounded-lg ${
              netEquity >= 0 
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-450' 
                : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-455'
            }`}>
              <Landmark size={14} />
            </div>
          </div>
          <h3 className={`text-xl font-black tracking-tight ${
            netEquity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(netEquity)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
            {netEquity >= 0 ? 'Net positive partner value' : 'Deficit partner value'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-200 dark:border-slate-800/60 shadow-sm animate-fade-in">
        <div className="flex flex-col md:flex-row gap-3 items-end justify-between">
          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Search Partner / Description</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by partner name or description..."
                className="block w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40"
              />
            </div>
          </div>

          <div className="w-full md:w-56">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Flow Type</label>
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40 appearance-none cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Types</option>
                <option value="Capital Contribution" className="bg-white dark:bg-slate-900 text-emerald-600 font-semibold">Capital Contribution</option>
                <option value="Profit Withdrawal" className="bg-white dark:bg-slate-900 text-amber-600 font-semibold">Profit Withdrawal</option>
                <option value="Share Distribution" className="bg-white dark:bg-slate-900 text-rose-600 font-semibold">Share Distribution</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-450 dark:text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="w-full md:w-auto px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
            >
              <RefreshCw size={12} />
              Reset
            </button>
          )}
        </div>

        {/* Date Range Selector Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2.5 mt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
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
      </div>

      {/* Main Table view */}
      {loading ? (
        <div className="glass-panel rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-3"></div>
          <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Loading partner records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center border border-slate-200 dark:border-slate-800 animate-fade-in">
          <div className="mx-auto w-12 h-12 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center text-slate-450 dark:text-slate-550 border border-slate-200/50 dark:border-slate-800/50 mb-3">
            <Users size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">No partner flows found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
            Try adjusting your filters or add a new partner flow to populate the table.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/60 shadow-lg animate-fade-in">
          {/* Mobile Card Feed (block md:hidden) */}
          <div className="block md:hidden divide-y divide-slate-200/60 dark:divide-slate-800/60">
            {filtered.map((t) => (
              <div key={`mobile_${t._id}`} className="p-4 space-y-2.5 hover:bg-slate-100/40 dark:hover:bg-slate-900/40 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100 text-xs">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      {formatDate(t.date)}
                    </span>
                    <span className="px-2 py-0.5 bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-md text-[10px] font-bold border border-violet-500/20">
                      {t.partnerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-900 rounded-lg"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(t)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-900 rounded-lg"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {t.description || '—'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getFlowTypeBadgeClass(t.type)}`}>
                      {t.type}
                    </span>
                  </div>

                  <div className={`text-base font-black ${
                    t.type === 'Capital Contribution' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {t.type === 'Capital Contribution' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Data Table (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Partner Name</th>
                  <th className="px-4 py-3">Flow Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-xs text-slate-700 dark:text-slate-250">
                {filtered.map((t, idx) => (
                  <tr 
                    key={t._id} 
                    className="hover:bg-slate-100/30 dark:hover:bg-slate-900/20 transition-colors group"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                        <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                        {formatDate(t.date)}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-50 text-xs">
                      {t.partnerName}
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getFlowTypeBadgeClass(t.type)}`}>
                        {t.type}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-800 dark:text-slate-200 font-medium">
                      {t.description}
                    </td>
                    
                    <td className={`px-4 py-3.5 text-right whitespace-nowrap font-bold text-xs ${
                      t.type === 'Capital Contribution' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {t.type === 'Capital Contribution' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    
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
      )}
    </div>
  );
}
