import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

export default function Filters({ 
  search, 
  setSearch, 
  filterType, 
  setFilterType, 
  filterCategory, 
  setFilterCategory 
}) {
  const categories = ['Sales', 'Purchase', 'Logistics', 'Marketing', 'Office Expense', 'Others'];
  const hasActiveFilters = search || filterType !== 'All' || filterCategory !== 'All';

  const handleClear = () => {
    setSearch('');
    setFilterType('All');
    setFilterCategory('All');
  };

  return (
    <div className="glass-panel rounded-xl p-4 mb-5 border border-slate-200 dark:border-slate-800/60 shadow-sm animate-fade-in">
      <div className="flex flex-col md:flex-row gap-3 items-end justify-between">
        
        {/* Search Input */}
        <div className="w-full md:flex-1">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Search Transactions</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, suppliers, parties..."
              className="block w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40"
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="w-full md:w-40">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40 appearance-none cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Types</option>
              <option value="Credit" className="bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-semibold">Credit Only</option>
              <option value="Debit" className="bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-semibold">Debit Only</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-450 dark:text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-48">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="block w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40 appearance-none cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{cat}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-450 dark:text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Reset Filters button */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="w-full md:w-auto px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-95"
            title="Reset filters"
          >
            <RefreshCw size={12} />
            Reset
          </button>
        )}

      </div>
    </div>
  );
}
