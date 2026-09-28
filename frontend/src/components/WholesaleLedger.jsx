import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  TrendingDown, 
  Calendar, 
  Search, 
  Plus, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  ArrowUpDown,
  ShoppingBag,
  User,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Receipt
} from 'lucide-react';
import ExportDropdown from './ExportDropdown';
import Pagination from './Pagination';

export default function WholesaleLedger({
  purchases = [],
  loading = false,
  error = null,
  onRefresh,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onQuickPayClick
}) {
  const [search, setSearch] = useState('');
  const [sellerFilter, setSellerFilter] = useState('All'); // 'All' | 'Dev' | 'Sneh'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Done' | 'Pending' | 'Partial'
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'pending'

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Format currency helper (INR)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Format date helper
  const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
      const str = String(dateInput).trim();
      if (str.includes('T')) {
        const [datePart] = str.split('T');
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          const [y, m, d] = datePart.split('-').map(Number);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${d} ${months[m - 1]} ${y}`;
        }
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d} ${months[m - 1]} ${y}`;
      }
      const dt = new Date(dateInput);
      if (isNaN(dt.getTime())) return 'N/A';
      return dt.toLocaleDateString('en-IN', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  // 1. Date Filtered Purchases
  const dateFilteredPurchases = useMemo(() => {
    const now = new Date();
    const todayNoon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));

    return purchases.filter(p => {
      const rawDate = p.date || p.createdAt;
      if (!rawDate) return true;

      const dateStr = String(rawDate).split('T')[0];
      const itemDate = new Date(dateStr + 'T12:00:00Z');
      if (isNaN(itemDate.getTime())) return true;

      if (dateRange === 'today') {
        return itemDate.getUTCFullYear() === todayNoon.getUTCFullYear() &&
          itemDate.getUTCMonth() === todayNoon.getUTCMonth() &&
          itemDate.getUTCDate() === todayNoon.getUTCDate();
      } else if (dateRange === 'week') {
        const oneWeekAgo = new Date(todayNoon);
        oneWeekAgo.setUTCDate(todayNoon.getUTCDate() - 7);
        return itemDate >= oneWeekAgo;
      } else if (dateRange === 'month') {
        const startOfMonth = new Date(Date.UTC(todayNoon.getUTCFullYear(), todayNoon.getUTCMonth(), 1));
        return itemDate >= startOfMonth;
      } else if (dateRange === 'quarter') {
        const quarterStartMonth = Math.floor(todayNoon.getUTCMonth() / 3) * 3;
        const startOfQuarter = new Date(Date.UTC(todayNoon.getUTCFullYear(), quarterStartMonth, 1));
        return itemDate >= startOfQuarter;
      } else if (dateRange === 'year') {
        const startOfYear = new Date(Date.UTC(todayNoon.getUTCFullYear(), 0, 1));
        return itemDate >= startOfYear;
      } else if (dateRange === 'custom') {
        if (startDate) {
          const s = new Date(startDate + 'T00:00:00Z');
          if (itemDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate + 'T23:59:59Z');
          if (itemDate > e) return false;
        }
        return true;
      }
      return true;
    });
  }, [purchases, dateRange, startDate, endDate]);

  // 2. Metrics & Analytics Calculations (Date-Filtered)
  const metrics = useMemo(() => {
    let totalPurchased = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalQuantity = 0;

    const sellerMap = {
      Dev: { total: 0, paid: 0, pending: 0, count: 0, qty: 0 },
      Sneh: { total: 0, paid: 0, pending: 0, count: 0, qty: 0 },
      Other: { total: 0, paid: 0, pending: 0, count: 0, qty: 0 }
    };

    dateFilteredPurchases.forEach(p => {
      const tot = Number(p.totalAmount || 0);
      const pd = Number(p.paidAmount || 0);
      const pend = Number(p.pendingAmount !== undefined ? p.pendingAmount : Math.max(0, tot - pd));
      const q = Number(p.quantity || 0);

      totalPurchased += tot;
      totalPaid += pd;
      totalPending += pend;
      totalQuantity += q;

      const sKey = (p.sellerName === 'Dev' || p.sellerName === 'dev') ? 'Dev' 
        : (p.sellerName === 'Sneh' || p.sellerName === 'sneh') ? 'Sneh' : 'Other';

      sellerMap[sKey].total += tot;
      sellerMap[sKey].paid += pd;
      sellerMap[sKey].pending += pend;
      sellerMap[sKey].count += 1;
      sellerMap[sKey].qty += q;
    });

    return {
      totalPurchased,
      totalPaid,
      totalPending,
      totalQuantity,
      count: dateFilteredPurchases.length,
      sellerMap
    };
  }, [dateFilteredPurchases]);

  // 3. Search and Filter Matching
  const filteredPurchases = useMemo(() => {
    return dateFilteredPurchases.filter(p => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches = 
          (p.description || '').toLowerCase().includes(q) ||
          (p.sellerName || '').toLowerCase().includes(q) ||
          (p.billNumber || '').toLowerCase().includes(q) ||
          (p.paymentMode || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q) ||
          String(p.totalAmount || '').includes(q);

        if (!matches) return false;
      }

      // Seller filter
      if (sellerFilter !== 'All') {
        const sName = (p.sellerName || '').toLowerCase();
        if (sName !== sellerFilter.toLowerCase()) return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        let pStat = p.paymentStatus || 'Pending';
        if (pStat === 'Paid') pStat = 'Done';
        if (statusFilter === 'Done' && pStat !== 'Done') return false;
        if (statusFilter === 'Pending' && pStat !== 'Pending') return false;
        if (statusFilter === 'Partial' && pStat !== 'Partial') return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      } else if (sortBy === 'highest') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      } else if (sortBy === 'pending') {
        return (b.pendingAmount || 0) - (a.pendingAmount || 0);
      } else {
        // 'newest'
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
    });
  }, [dateFilteredPurchases, search, sellerFilter, statusFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sellerFilter, statusFilter, dateRange, startDate, endDate, sortBy]);

  const effectiveItemsPerPage = itemsPerPage === 'all' ? filteredPurchases.length : Number(itemsPerPage);
  const paginatedPurchases = useMemo(() => {
    if (itemsPerPage === 'all') return filteredPurchases;
    return filteredPurchases.slice((currentPage - 1) * effectiveItemsPerPage, currentPage * effectiveItemsPerPage);
  }, [filteredPurchases, currentPage, effectiveItemsPerPage, itemsPerPage]);

  // Export wholesale purchases to Excel
  const handleExport = (range = 'all', sDate = '', eDate = '') => {
    let toExport = [...purchases];
    const now = new Date();

    if (range === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      toExport = purchases.filter(p => new Date(p.date) >= startOfMonth);
    } else if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      toExport = purchases.filter(p => new Date(p.date) >= startOfQuarter);
    } else if (range === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      toExport = purchases.filter(p => new Date(p.date) >= startOfYear);
    } else if (range === 'custom' && (sDate || eDate)) {
      toExport = purchases.filter(p => {
        const d = new Date(p.date);
        if (sDate && d < new Date(sDate)) return false;
        if (eDate && d > new Date(eDate + 'T23:59:59Z')) return false;
        return true;
      });
    }

    const headers = ['Date', 'Wholesaler', 'Description', 'Quantity', 'Price/Unit', 'Total Amount', 'Paid Amount', 'Pending Balance', 'Status', 'Payment Mode', 'Bill No', 'Notes'];
    const rows = toExport.map(p => [
      formatDate(p.date),
      p.sellerName || '',
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.quantity || 0,
      p.unitPrice || 0,
      p.totalAmount || 0,
      p.paidAmount || 0,
      p.pendingAmount || 0,
      p.paymentStatus || 'Pending',
      p.paymentMode || 'Cash',
      `"${(p.billNumber || '').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wellmora_wholesale_purchases_${range}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSellerBadge = (sellerName) => {
    const s = (sellerName || '').toLowerCase();
    if (s === 'dev') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
          Dev
        </span>
      );
    } else if (s === 'sneh') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
          Sneh
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
        {sellerName || 'Wholesaler'}
      </span>
    );
  };

  const getStatusBadge = (p) => {
    let status = p.paymentStatus || 'Pending';
    if (status === 'Paid') status = 'Done';

    if (status === 'Done') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={11} />
          Done / Paid
        </span>
      );
    } else if (status === 'Partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <AlertCircle size={11} />
          Partial (Pending {formatCurrency(p.pendingAmount)})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <Clock size={11} />
          Pending Payment
        </span>
      );
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-slide-up">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
              <Package size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Wholesale Purchases
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md">
                  Dev & Sneh Ledger
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Buy goods, auto-calculate total price, track done & pending payments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Refresh live wholesale records"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-amber-500' : ''} />
            </button>
          )}

          <ExportDropdown onExport={handleExport} />

          <button
            onClick={onAddClick}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Buy Goods / Add Purchase</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-3 animate-slide-up">
          <AlertCircle size={16} className="shrink-0" />
          <div className="flex-1">{error}</div>
          {onRefresh && (
            <button onClick={onRefresh} className="px-3 py-1 bg-red-500/10 rounded-lg text-xs font-bold cursor-pointer">
              Retry
            </button>
          )}
        </div>
      )}

      {/* 2. Top Analytics Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Goods Purchased */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-4.5 glow-indigo relative overflow-hidden transition-all duration-300 border border-indigo-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-indigo-500" />
              Total Goods Bought
            </span>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {metrics.totalQuantity} Units
            </span>
          </div>
          <h3 className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight">
            {formatCurrency(metrics.totalPurchased)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-medium">
            Total purchase orders: {metrics.count} entries
          </p>
        </div>

        {/* Done Payment (Paid Amount) */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-4.5 glow-green relative overflow-hidden transition-all duration-300 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Done Payment (Paid)
            </span>
            <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600">
              <ArrowDownRight size={13} />
            </span>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(metrics.totalPaid)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-medium">
            Settled cash & bank outflows to sellers
          </p>
        </div>

        {/* Pending Payment (Outstanding Balance) */}
        <div className={`glass-panel glass-panel-hover rounded-2xl p-4.5 relative overflow-hidden transition-all duration-300 border ${
          metrics.totalPending > 0 ? 'glow-rose border-rose-500/20' : 'glow-green border-emerald-500/15'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
              <Clock size={14} className={metrics.totalPending > 0 ? 'text-rose-500' : 'text-emerald-500'} />
              Pending Payment
            </span>
            {metrics.totalPending > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse">
                Payable
              </span>
            )}
          </div>
          <h3 className={`text-2xl font-black tracking-tight ${
            metrics.totalPending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {formatCurrency(metrics.totalPending)}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-medium">
            {metrics.totalPending > 0 ? 'Total remaining liability to clear' : 'Zero pending liability! All clear'}
          </p>
        </div>

        {/* Wholesaler Breakdown Card (Dev vs Sneh) */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User size={12} className="text-violet-500" />
              Dev & Sneh Status
            </span>
            <span className="text-[9px] font-bold text-slate-400">Balance</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Dev */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Dev</span>
                <span className="text-[10px] text-slate-400">({metrics.sellerMap.Dev.count})</span>
              </div>
              <div className="text-right">
                <span className={`font-black text-xs ${metrics.sellerMap.Dev.pending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                  {metrics.sellerMap.Dev.pending > 0 ? `Pend: ${formatCurrency(metrics.sellerMap.Dev.pending)}` : 'Cleared'}
                </span>
              </div>
            </div>

            {/* Sneh */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Sneh</span>
                <span className="text-[10px] text-slate-400">({metrics.sellerMap.Sneh.count})</span>
              </div>
              <div className="text-right">
                <span className={`font-black text-xs ${metrics.sellerMap.Sneh.pending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                  {metrics.sellerMap.Sneh.pending > 0 ? `Pend: ${formatCurrency(metrics.sellerMap.Sneh.pending)}` : 'Cleared'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Combined Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        
        {/* Row 1: Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 shrink-0" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product goods, seller (Dev, Sneh), bill #..."
              className="w-full pl-8.5 pr-3 py-2 bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all truncate"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer shrink-0"
          >
            <option value="newest">Newest Date</option>
            <option value="oldest">Oldest Date</option>
            <option value="highest">Highest Amount</option>
            <option value="pending">Highest Pending</option>
          </select>
        </div>

        {/* Row 2: Filter Pills (Seller & Status) */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 pt-0.5 no-scrollbar">
          
          {/* Seller Filter */}
          <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shrink-0">
            <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 px-1.5 uppercase shrink-0">Seller</span>
            {[
              { id: 'All', label: 'All Wholesalers' },
              { id: 'Dev', label: 'Dev' },
              { id: 'Sneh', label: 'Sneh' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSellerFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  sellerFilter === opt.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shrink-0">
            <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 px-1.5 uppercase shrink-0">Status</span>
            {[
              { id: 'All', label: 'All Status' },
              { id: 'Done', label: 'Done / Paid' },
              { id: 'Pending', label: 'Pending Payment' },
              { id: 'Partial', label: 'Partial' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setStatusFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  statusFilter === opt.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 w-full sm:w-auto">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Calendar size={13} />
              Date:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'quarter', label: 'Quarter' },
              { id: 'year', label: 'Year' },
              { id: 'custom', label: 'Custom' }
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
            <div className="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
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

      {/* 4. Wholesale Purchases List & Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-xl">
        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Goods Purchase Entries ({filteredPurchases.length})
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest hidden sm:inline">
            Purchases & Settlement
          </span>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium text-xs space-y-3">
            <ShoppingBag size={28} className="mx-auto text-slate-400 opacity-60" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              No wholesale purchases found
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Start recording goods bought from Dev or Sneh with auto-calculated totals and done/pending payments.
            </p>
            <button
              onClick={onAddClick}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
            >
              + Buy Goods Now
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card Feed (block md:hidden) */}
            <div className="block md:hidden divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {paginatedPurchases.map((p) => {
                const pend = p.pendingAmount !== undefined ? p.pendingAmount : Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0));
                return (
                  <div key={`m_${p._id}`} className="p-4 space-y-2.5 hover:bg-slate-100/40 dark:hover:bg-slate-900/40 transition-colors">
                    
                    {/* Header Row: Date & Seller Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100 text-xs">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          {formatDate(p.date)}
                        </span>
                        {getSellerBadge(p.sellerName)}
                      </div>

                      <div className="flex items-center gap-1">
                        {pend > 0 && onQuickPayClick && (
                          <button
                            onClick={() => onQuickPayClick(p)}
                            className="px-2 py-1 text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                            title="Settle payment"
                          >
                            <CreditCard size={11} />
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => onEditClick(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-900 rounded-lg cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteClick(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-900 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Description & Qty / Unit Price */}
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {p.description}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {p.quantity} pcs @ ₹{p.unitPrice}/pc
                        </span>
                        {p.billNumber && (
                          <span className="text-[10px] text-slate-400">
                            • Bill: {p.billNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Financial Breakdown (Total, Paid, Pending) */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-100/60 dark:bg-slate-950/60 rounded-xl text-center">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Total Price</span>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(p.totalAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Paid (Done)</span>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.paidAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Pending</span>
                        <span className={`text-xs font-black ${pend > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                          {pend > 0 ? formatCurrency(pend) : 'Nil'}
                        </span>
                      </div>
                    </div>

                    {/* Status and Mode */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {getStatusBadge(p)}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {p.paymentMode || 'Cash'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Data Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Wholesaler</th>
                    <th className="px-4 py-3.5">Product / Goods Detail</th>
                    <th className="px-4 py-3.5 text-center">Qty Buy</th>
                    <th className="px-4 py-3.5 text-right">Price / Unit</th>
                    <th className="px-4 py-3.5 text-right">Total Price</th>
                    <th className="px-4 py-3.5 text-right">Done Payment</th>
                    <th className="px-4 py-3.5 text-right">Pending Payment</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-xs text-slate-700 dark:text-slate-200">
                  {paginatedPurchases.map((p) => {
                    const pend = p.pendingAmount !== undefined ? p.pendingAmount : Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0));
                    return (
                      <tr key={`dt_${p._id}`} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            {formatDate(p.date)}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getSellerBadge(p.sellerName)}
                        </td>

                        <td className="px-4 py-3.5 max-w-xs truncate font-medium text-slate-900 dark:text-slate-100 text-xs" title={p.description}>
                          <div className="font-bold truncate">{p.description}</div>
                          {p.billNumber && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              Bill: {p.billNumber}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          {p.quantity} pcs
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300">
                          {formatCurrency(p.unitPrice)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(p.totalAmount)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.paidAmount)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-black">
                          <span className={pend > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {pend > 0 ? formatCurrency(pend) : '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {getStatusBadge(p)}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {pend > 0 && onQuickPayClick && (
                              <button
                                onClick={() => onQuickPayClick(p)}
                                className="px-2 py-1 text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                                title="Record payment towards pending balance"
                              >
                                <CreditCard size={11} />
                                Pay
                              </button>
                            )}
                            <button
                              onClick={() => onEditClick(p)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-900 rounded-lg cursor-pointer"
                              title="Edit purchase entry"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => onDeleteClick(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-900 rounded-lg cursor-pointer"
                              title="Delete purchase entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
              <Pagination
                totalItems={filteredPurchases.length}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

    </div>
  );
}
