import React, { useState } from 'react';
import { Calendar, Search, RefreshCw, Trash2, Edit2, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from 'lucide-react';
import ExportDropdown from './ExportDropdown';

export default function BankLedger({ transactions, onEdit, onDelete, loading, onRefresh, onAddClick }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Calculates stats
  const totalDeposit = transactions
    .filter(t => t.type === 'Deposit' && t.status !== 'Failed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawal = transactions
    .filter(t => t.type === 'Withdrawal' && t.status !== 'Failed')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalDeposit - totalWithdrawal;

  const formatDate = (dateString) => {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20';
      case 'Failed':
        return 'bg-rose-500/10 text-rose-655 dark:text-rose-455 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600';
    }
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = 
      t.bankName.toLowerCase().includes(search.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'All' || t.type === filterType;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const hasActiveFilters = search || filterType !== 'All' || filterStatus !== 'All';

  const handleClearFilters = () => {
    setSearch('');
    setFilterType('All');
    setFilterStatus('All');
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
                <x:Name>Bank Report</x:Name>
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

  // Exporter for Bank
  const handleExport = (range, startDate, endDate) => {
    let toExport = [...filtered];
    const now = new Date();
    
    if (range === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      toExport = filtered.filter(t => new Date(t.date) >= startOfMonth);
    } else if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      toExport = filtered.filter(t => new Date(t.date) >= startOfQuarter);
    } else if (range === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      toExport = filtered.filter(t => new Date(t.date) >= startOfYear);
    } else if (range === 'custom') {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      toExport = filtered.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }

    if (toExport.length === 0) {
      alert(`No bank records found in the specified range.`);
      return;
    }

    const headers = ['Date', 'Bank Name', 'Account Number', 'Type', 'Amount (INR)', 'Status', 'Description'];
    const rows = toExport.map(t => [
      new Date(t.date).toLocaleDateString('en-IN'),
      t.bankName,
      t.accountNumber,
      t.type,
      t.amount,
      t.status,
      t.description || ''
    ]);

    exportToExcel(headers, rows, `wellmora_bank_ledger_${range}.xls`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">Appliance Bank Ledger</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            Manage deposit settlements, payment payouts, and bank balances.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-200/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Refresh bank ledger"
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
        {/* Total Deposit */}
        <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-green relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Total Deposits</span>
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(totalDeposit)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
            Net cash settled in accounts
          </p>
        </div>

        {/* Total Withdrawal */}
        <div className="glass-panel glass-panel-hover rounded-xl p-4.5 glow-rose relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-6 -mt-6 blur-2xl"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Total Withdrawals</span>
            <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(totalWithdrawal)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
            Total payouts & cash drawdowns
          </p>
        </div>

        {/* Net Bank Balance */}
        <div className={`glass-panel glass-panel-hover rounded-xl p-4.5 relative overflow-hidden transition-all duration-300 ${
          netBalance >= 0 ? 'glow-green' : 'glow-rose'
        }`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-6 -mt-6 blur-2xl ${
            netBalance >= 0 ? 'bg-emerald-500/5' : 'bg-rose-500/5'
          }`}></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase">Net Bank Balance</span>
            <div className={`p-2 rounded-lg ${
              netBalance >= 0 
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-455'
            }`}>
              <Wallet size={14} />
            </div>
          </div>
          <h3 className={`text-xl font-black tracking-tight ${
            netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(netBalance)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1.5">
            {netBalance >= 0 ? 'Liquid bank positive surplus' : 'Negative liquid overdraft'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-200 dark:border-slate-800/60 shadow-sm animate-fade-in">
        <div className="flex flex-col md:flex-row gap-3 items-end justify-between">
          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Search Bank / Description</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by bank name or description..."
                className="block w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40"
              />
            </div>
          </div>

          <div className="w-full md:w-40">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40 appearance-none cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Types</option>
                <option value="Deposit" className="bg-white dark:bg-slate-900 text-emerald-600 font-semibold">Deposit</option>
                <option value="Withdrawal" className="bg-white dark:bg-slate-900 text-rose-600 font-semibold">Withdrawal</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-450 dark:text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="w-full md:w-40">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40 appearance-none cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Statuses</option>
                <option value="Completed" className="bg-white dark:bg-slate-900 text-emerald-600 font-semibold">Completed</option>
                <option value="Pending" className="bg-white dark:bg-slate-900 text-amber-600 font-semibold">Pending</option>
                <option value="Failed" className="bg-white dark:bg-slate-900 text-rose-600 font-semibold">Failed</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-450 dark:text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="w-full md:w-auto px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-95"
            >
              <RefreshCw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table view */}
      {loading ? (
        <div className="glass-panel rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-3"></div>
          <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Loading bank records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center border border-slate-200 dark:border-slate-800 animate-fade-in">
          <div className="mx-auto w-12 h-12 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center text-slate-450 dark:text-slate-550 border border-slate-200/50 dark:border-slate-800/50 mb-3">
            <CreditCard size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-1">No bank records found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
            Try adjusting your filters or add a new transaction to populate the table.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/60 shadow-lg animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Bank / Account</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
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
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{t.bankName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">A/C: {t.accountNumber}</div>
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {t.type === 'Deposit' ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <ArrowUpRight size={10} />
                          Deposit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <ArrowDownRight size={10} />
                          Withdrawal
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-800 dark:text-slate-200 font-medium">
                      {t.description || '—'}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    
                    <td className={`px-4 py-3.5 text-right whitespace-nowrap font-bold text-xs ${
                      t.type === 'Deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {t.type === 'Deposit' ? '+' : '-'}{formatCurrency(t.amount)}
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
