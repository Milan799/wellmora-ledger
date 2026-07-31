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
          2. CUSTOM MOBILE NAVIGATION DRAWER & TILES (md:hidden)
         ========================================================= */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[320px] h-screen h-[100dvh] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 shrink-0 space-y-4 shadow-2xl md:hidden transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Mobile Header Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Wellmora</span>
                <span className="px-1.5 py-0.2 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[9px] font-bold rounded">Pro</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block">Mobile Financial Suite</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Navigation Card Grid (Visual Tiles) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
            Quick Navigation Tiles
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={`mobile_tile_${item.id}`}
                  onClick={() => {
                    setActivePage(item.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[95px] transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300 shadow-md ring-1 ring-violet-500/20'
                      : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`p-2 rounded-xl ${item.color}`}>
                      <Icon size={18} />
                    </div>
                    {isActive && <ChevronRight size={14} className="text-violet-600 dark:text-violet-400" />}
                  </div>

                  <span className="text-xs font-black tracking-tight leading-tight block mt-2">
                    {item.shortLabel || item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Drawer Footer: User & Appearance */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          {authUser && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {(authUser.username || authUser.name || 'W').charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 block truncate">
                    {authUser.username || authUser.name}
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-semibold block truncate">Admin Access</span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {/* Theme Toggle Bar */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={(e) => theme !== 'light' && toggleTheme(e)}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun size={14} className={theme === 'light' ? 'text-amber-500' : ''} /> Light
            </button>

            <button
              onClick={(e) => theme !== 'dark' && toggleTheme(e)}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${
                theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              <Moon size={14} className={theme === 'dark' ? 'text-violet-400' : ''} /> Dark
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================
          3. NATIVE MOBILE BOTTOM NAVIGATION BAR (md:hidden)
         ========================================================= */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/85 flex items-center justify-around py-2 px-1 md:hidden shadow-lg">
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
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-violet-600 dark:text-violet-400 font-black scale-105' : 'text-slate-400 dark:text-slate-500 font-semibold'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9.5px] mt-0.5">{nav.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => (isOpen ? onClose() : document.querySelector('button[title="Open navigation menu"]')?.click())}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 dark:text-slate-500 font-semibold"
        >
          <Menu size={18} />
          <span className="text-[9.5px] mt-0.5">Menu</span>
        </button>
      </div>
    </>
  );
}
