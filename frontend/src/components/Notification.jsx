import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export default function Notification({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-[0_6px_24px_rgba(16,185,129,0.08)]';
      case 'error':
        return 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-200/50 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 shadow-[0_6px_24px_rgba(244,63,94,0.08)]';
      default:
        return 'bg-slate-50/90 dark:bg-slate-900/90 border-slate-200/50 dark:border-slate-800 text-slate-700 dark:text-slate-350 shadow-md';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />;
      default:
        return <Info size={18} className="text-violet-600 dark:text-violet-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-toast-in">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-md ${getTypeStyles()}`}>
        {getIcon()}
        <span className="text-sm font-semibold tracking-tight">{message}</span>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-250 transition-colors ml-2 p-1 hover:bg-slate-200/40 dark:hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
