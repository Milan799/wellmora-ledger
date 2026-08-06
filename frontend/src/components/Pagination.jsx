import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange
}) {
  if (totalItems <= 10 && itemsPerPage === 10) {
    return null;
  }

  const effectiveItemsPerPage = itemsPerPage === 'all' ? totalItems : Number(itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectiveItemsPerPage || 1)));

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * effectiveItemsPerPage + 1;
  const endItem = Math.min(currentPage * effectiveItemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-bold text-slate-900 dark:text-white">{startItem}</span> to{' '}
          <span className="font-bold text-slate-900 dark:text-white">{endItem}</span> of{' '}
          <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> entries
        </span>

        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[11px] text-slate-400 font-bold">Per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              if (onItemsPerPageChange) onItemsPerPageChange(val);
            }}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {itemsPerPage !== 'all' && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
          >
            <ChevronLeft size={15} />
            <span className="hidden sm:inline text-[11px]">Prev</span>
          </button>

          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => onPageChange(pg)}
                className={`w-7 h-7 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  currentPage === pg
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {pg}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
          >
            <span className="hidden sm:inline text-[11px]">Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
