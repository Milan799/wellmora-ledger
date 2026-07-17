import React from 'react';
import { BookOpen, Building2, Users2, X, BarChart3 } from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  const menuItems = [
    { id: 'ledger', label: 'Ledger & Expenses', icon: BookOpen },
    { id: 'bank', label: 'Bank Transactions', icon: Building2 },
    { id: 'partner', label: 'Partner Money Flow', icon: Users2 },
    { id: 'summary', label: 'Financial Summary', icon: BarChart3 }
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={`fixed md:static inset-y-0 left-0 z-40 w-72 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/85 flex flex-col p-5 shrink-0 space-y-6 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="flex items-center justify-between">
          {/* Logo / Header */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-violet-500/10 rounded-xl">
              <Logo size={20} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Wellmora</span>
              <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950/40 text-[9px] font-bold text-violet-700 dark:text-violet-400 rounded-md tracking-wide uppercase">
                Enterprise
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          <button 
            onClick={onClose} 
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  onClose(); // Close mobile drawer
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer border-l-4 ${
                  isActive
                    ? 'border-violet-600 bg-violet-500/10 text-violet-700 dark:text-violet-400 shadow-[0_4px_12px_rgba(99,102,241,0.05)]'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
