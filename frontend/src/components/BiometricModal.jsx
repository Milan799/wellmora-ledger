import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  ScanFace, 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  Smartphone, 
  Sparkles, 
  LogOut
} from 'lucide-react';
import { 
  isBiometricsSupported, 
  getBiometricConfig, 
  saveBiometricConfig, 
  registerBiometricCredential, 
  authenticateBiometrics, 
  triggerHapticFeedback 
} from '../utils/biometrics';

export default function BiometricModal({
  isOpen,
  mode = 'unlock', // 'unlock' | 'login' | 'settings'
  onClose,
  onSuccess,
  onLogout,
  authUser,
  apiBaseUrl
}) {
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [bioType, setBioType] = useState('fingerprint'); // 'fingerprint' | 'face'
  const [isSupported, setIsSupported] = useState(true);
  const [config, setConfig] = useState(getBiometricConfig());
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScanState('idle');
      setErrorMessage('');
      setConfig(getBiometricConfig());
      
      isBiometricsSupported().then(supported => {
        setIsSupported(supported);
      });

      // Auto-trigger scan on unlock or login mode if biometrics enabled
      if (mode === 'unlock' || mode === 'login') {
        const timer = setTimeout(() => {
          handleScan();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleScan = async () => {
    setScanState('scanning');
    setErrorMessage('');
    triggerHapticFeedback('light');

    try {
      // Small artificial scan delay for realistic UI feedback
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await authenticateBiometrics();
      if (res.success) {
        setScanState('success');
        triggerHapticFeedback('success');

        // If backend verification is needed, request biometric token
        if (mode === 'login' && apiBaseUrl) {
          try {
            const response = await fetch(`${apiBaseUrl}/auth/biometric/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                username: config.username || authUser?.username || 'WellmoraEnterprise'
              })
            });

            if (response.ok) {
              const data = await response.json();
              localStorage.setItem('authToken', data.token);
              localStorage.setItem('authUser', JSON.stringify(data.user));
              setTimeout(() => {
                onSuccess?.(data.user, data.token);
              }, 500);
              return;
            }
          } catch (err) {
            console.warn('Backend biometric auth failed, proceeding with client verification:', err);
          }
        }

        setTimeout(() => {
          onSuccess?.(authUser || { username: config.username || 'Mobile User' });
        }, 600);
      }
    } catch (err) {
      setScanState('error');
      setErrorMessage(err.message || 'Biometric scan failed. Please try again.');
      triggerHapticFeedback('error');
    }
  };

  const handleToggleEnable = async (enable) => {
    if (enable) {
      setRegistering(true);
      try {
        await registerBiometricCredential(authUser);
        const updated = saveBiometricConfig({ enabled: true });
        setConfig(updated);
        triggerHapticFeedback('success');
      } catch (err) {
        setErrorMessage(err.message || 'Failed to register biometric credential');
        triggerHapticFeedback('error');
      } finally {
        setRegistering(false);
      }
    } else {
      const updated = saveBiometricConfig({ enabled: false });
      setConfig(updated);
    }
  };

  const handleToggleAutoLock = (autoLock) => {
    const updated = saveBiometricConfig({ autoLock });
    setConfig(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center">
        
        {/* Top Close Button (for settings or login mode) */}
        {mode !== 'unlock' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          >
            <X size={18} />
          </button>
        )}

        {/* Dynamic Mode Header */}
        <div className="w-full pt-8 pb-4 px-6 text-center bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-transparent dark:from-violet-500/15 dark:via-purple-500/5 dark:to-transparent flex flex-col items-center">
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-violet-500/20">
              <Smartphone size={12} />
              Mobile Biometric Guard
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {mode === 'unlock' && 'App Locked'}
            {mode === 'login' && 'Biometric Sign In'}
            {mode === 'settings' && 'Biometric Security Settings'}
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[260px]">
            {mode === 'unlock' && 'Authenticate using Face ID or Touch ID to access enterprise data'}
            {mode === 'login' && 'Use your mobile device scanner for instant 1-tap authorization'}
            {mode === 'settings' && 'Manage mobile biometrics, Touch ID, Face ID, and auto-lock options'}
          </p>
        </div>

        {/* SCANNER INTERFACE (Unlock or Login Mode) */}
        {(mode === 'unlock' || mode === 'login') && (
          <div className="p-6 w-full flex flex-col items-center space-y-6">
            
            {/* Sensor Type Selector Switch */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setBioType('fingerprint')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bioType === 'fingerprint'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Fingerprint size={14} />
                Touch ID
              </button>
              <button
                onClick={() => setBioType('face')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bioType === 'face'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ScanFace size={14} />
                Face ID
              </button>
            </div>

            {/* SCANNER VISUALIZATION RING */}
            <div className="relative flex items-center justify-center my-4">
              
              {/* Outer pulsing aura */}
              <div 
                className={`absolute w-32 h-32 rounded-full transition-all duration-700 ${
                  scanState === 'scanning'
                    ? 'bg-violet-500/20 dark:bg-violet-500/30 animate-ping'
                    : scanState === 'success'
                    ? 'bg-emerald-500/20 animate-pulse'
                    : scanState === 'error'
                    ? 'bg-rose-500/20'
                    : 'bg-slate-200/50 dark:bg-slate-800/40'
                }`}
              />

              {/* Main Ring Container */}
              <button
                onClick={handleScan}
                disabled={scanState === 'scanning'}
                className={`relative w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer group active:scale-95 ${
                  scanState === 'scanning'
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow-violet-500/30'
                    : scanState === 'success'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-emerald-500/30'
                    : scanState === 'error'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 shadow-rose-500/30'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-violet-500'
                }`}
              >
                {/* Face ID Scanner Laser Beam Effect */}
                {bioType === 'face' && scanState === 'scanning' && (
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent shadow-[0_0_12px_#8b5cf6] animate-bounce z-10" />
                )}

                {/* Fingerprint Ripple Effect */}
                {bioType === 'fingerprint' && scanState === 'scanning' && (
                  <div className="absolute inset-4 rounded-full border border-violet-500/60 animate-spin" />
                )}

                {/* Icon rendering */}
                {scanState === 'scanning' && (
                  <Loader2 className="w-12 h-12 text-violet-600 dark:text-violet-400 animate-spin" />
                )}

                {scanState === 'success' && (
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-in zoom-in-75 duration-300" />
                )}

                {scanState === 'error' && (
                  <ShieldAlert className="w-12 h-12 text-rose-500 animate-in shake duration-300" />
                )}

                {scanState === 'idle' && (
                  bioType === 'fingerprint' ? (
                    <Fingerprint className="w-12 h-12 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-200" />
                  ) : (
                    <ScanFace className="w-12 h-12 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-200" />
                  )
                )}
              </button>

            </div>

            {/* STATUS MESSAGE */}
            <div className="text-center min-h-[36px] flex flex-col items-center justify-center">
              {scanState === 'scanning' && (
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 animate-pulse">
                  Scanning {bioType === 'fingerprint' ? 'Fingerprint' : 'Facial Features'}...
                </p>
              )}
              {scanState === 'success' && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Biometric Access Granted!
                </p>
              )}
              {scanState === 'error' && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {errorMessage || 'Verification Failed'}
                </p>
              )}
              {scanState === 'idle' && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tap sensor to verify identity
                </p>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="w-full space-y-2 pt-2">
              <button
                onClick={handleScan}
                disabled={scanState === 'scanning'}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {bioType === 'fingerprint' ? <Fingerprint size={16} /> : <ScanFace size={16} />}
                <span>Scan {bioType === 'fingerprint' ? 'Touch ID' : 'Face ID'}</span>
              </button>

              {mode === 'unlock' && onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <LogOut size={14} />
                  Sign Out of Account
                </button>
              )}
            </div>

          </div>
        )}

        {/* SETTINGS INTERFACE (Settings Mode) */}
        {mode === 'settings' && (
          <div className="p-6 w-full space-y-5">
            
            {/* Device Support Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Hardware Authenticator
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {isSupported ? 'WebAuthn / Biometrics Supported' : 'Simulated Biometric Mode'}
                </div>
              </div>
            </div>

            {/* Toggle Enable Biometrics */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Fingerprint size={14} className="text-violet-500" />
                  Enable Mobile Biometrics
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Allow Touch ID / Face ID sign in
                </div>
              </div>

              <button
                onClick={() => handleToggleEnable(!config.enabled)}
                disabled={registering}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.enabled ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    config.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Auto Lock on Mobile */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock size={14} className="text-violet-500" />
                  Auto-Lock Mobile App
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Lock when app goes to background
                </div>
              </div>

              <button
                onClick={() => handleToggleAutoLock(!config.autoLock)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.autoLock ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    config.autoLock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Test Sensor Action */}
            <button
              onClick={handleScan}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Sparkles size={14} className="text-violet-500" />
              Test Device Biometric Sensor
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              Save & Close
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
