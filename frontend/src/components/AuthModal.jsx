import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Fingerprint } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, apiBaseUrl, onOpenBiometric }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const contentType = response.headers.get('content-type') || '';
      let data = {};

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const rawText = await response.text();
        console.error('⚠️ Received non-JSON response from server:', rawText);
        throw new Error(`Server returned invalid response status (${response.status}). Please check your backend connection.`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Invalid username or password.');
      }

      // Save token and user info
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
        >
          ✕
        </button>

        {/* Header decoration */}
        <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-950/20 dark:to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Authentication
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter authorized enterprise credentials to access the ledger
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          {error && (
            <div className="p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {/* Quick Mobile Biometric Button */}
          {onOpenBiometric && (
            <div className="p-3 rounded-2xl bg-violet-500/10 dark:bg-violet-950/30 border border-violet-500/20 text-center space-y-2">
              <div className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                Mobile Quick Sign In
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBiometric('login');
                }}
                className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Fingerprint size={16} />
                <span>Sign in with Touch ID / Face ID</span>
              </button>
            </div>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Or use password</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="WellmoraEnterprise"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

