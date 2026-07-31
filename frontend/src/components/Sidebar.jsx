import React from 'react';
import { 
  BookOpen, 
  Building2, 
  Users2, 
  X, 
  BarChart3, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck, 
  LayoutDashboard, 
  BarChart2, 
  Menu,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({
  activePage,
  setActivePage,
  isOpen,
  onClose,
  theme,
  toggleTheme,
  authUser,
  onOpenAuth,
  onLogout
}) {
  const menuItems = [
    { id: 'central', label: 'Main Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, color: 'text-violet-500 bg-violet-500/10' },
    { id: 'ledger', label: 'Expenses & Cash', shortLabel: 'Expenses', icon: BookOpen, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'bank', label: 'Bank Accounts', shortLabel: 'Banks', icon: Building2, color: 'text-sky-500 bg-sky-500/10' },
    { id: 'partner', label: 'Partner Investments', shortLabel: 'Partners', icon: Users2, color: 'text-indigo-500 bg-indigo-500/10' },
    { id: 'summary', label: 'Financial Overview', shortLabel: 'Overview', icon: BarChart3, color: 'text-amber-500 bg-amber-500/10' },
    { id: 'report_builder', label: 'Custom Financial Reports', shortLabel: 'Reports', icon: BarChart2, color: 'text-rose-500 bg-rose-500/10' }
  ];

  return (
    <>
      {/* =========================================================
          1. DESKTOP PC SIDEBAR (hidden md:flex)
         ========================================================= */}
      <aside className="hidden md:flex w-72 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/85 flex-col p-5 shrink-0 space-y-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Wellmora</span>
            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950/40 text-[9px] font-bold text-violet-700 dark:text-violet-400 rounded-md tracking-wide uppercase">
              Enterprise
            </span>
          </div>
        </div>

        {/* PC Navigation Items */}
        <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
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

        {/* PC User & Appearance Controls */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/85 space-y-3 shrink-0">
          {authUser ? (
            <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {(authUser.username || authUser.name || 'W').charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {authUser.username || authUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Enterprise Administrator
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 cursor-pointer transition-all duration-200"
            >
              <ShieldCheck size={16} />
              Sign In / Register
            </button>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Appearance</span>
              <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
              <button
                onClick={(e) => theme !== 'light' && toggleTheme(e)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Sun size={14} className={theme === 'light' ? 'text-amber-500' : ''} />
                Light
              </button>
              <button
                onClick={(e) => theme !== 'dark' && toggleTheme(e)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-slate-100 shadow-sm border border-slate-800/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Moon size={14} className={theme === 'dark' ? 'text-violet-400' : ''} />
                Dark
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* =========================================================
          2. NATIVE MOBILE BOTTOM NAVIGATION BAR (md:hidden)
         ========================================================= */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/90 flex items-center justify-around py-2.5 px-2 md:hidden shadow-2xl">
        {[
          { id: 'central', label: 'Home', icon: LayoutDashboard },
          { id: 'ledger', label: 'Expenses', icon: BookOpen },
          { id: 'bank', label: 'Banks', icon: Building2 },
          { id: 'partner', label: 'Partners', icon: Users2 },
          { id: 'report_builder', label: 'Reports', icon: BarChart2 }
        ].map(nav => {
          const Icon = nav.icon;
          const isActive = activePage === nav.id;
          return (
            <button
              key={`bottom_nav_${nav.id}`}
              onClick={() => setActivePage(nav.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                isActive 
                  ? 'text-violet-600 dark:text-violet-400 font-extrabold scale-110' 
                  : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon size={22} className={isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[11px] font-bold mt-1 tracking-tight">{nav.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
