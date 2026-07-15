import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Calendar, X } from 'lucide-react';

export default function ExportDropdown({ onExport }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (range) => {
    if (range === 'custom') {
      setIsCustomModalOpen(true);
    } else {
      onExport(range);
    }
    setIsOpen(false);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    onExport('custom', startDate, endDate);
    setIsCustomModalOpen(false);
  };

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-xl text-violet-650 dark:text-violet-400 hover:text-violet-750 dark:hover:text-violet-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-200"
        >
          <Download size={14} />
          Export Excel
          <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xl z-20 animate-fade-in py-1">
            <button
              onClick={() => handleSelect('monthly')}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
            >
              📅 Export This Month
            </button>
            <button
              onClick={() => handleSelect('quarterly')}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
            >
              📊 Export This Quarter
            </button>
            <button
              onClick={() => handleSelect('yearly')}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
            >
              📈 Export This Year
            </button>
            <button
              onClick={() => handleSelect('custom')}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
            >
              🗓️ Custom Date Range...
            </button>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
            <button
              onClick={() => handleSelect('all')}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 cursor-pointer transition-colors"
            >
              🌐 Export All Records
            </button>
          </div>
        )}
      </div>

      {/* Custom Date Range Picker Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-955/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-modal">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-55 dark:bg-slate-850">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Calendar size={16} className="text-violet-650 dark:text-violet-400" />
                Custom Date Export
              </h2>
              <button 
                onClick={() => setIsCustomModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500/40"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs rounded-xl border border-violet-500/20 shadow-lg shadow-violet-500/10 cursor-pointer transition-colors"
                >
                  Download Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
