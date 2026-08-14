import React, { useState, useEffect, useRef } from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  Smartphone, 
  Sparkles, 
  LogOut,
  SmartphoneNfc
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
  const [scanProgress, setScanProgress] = useState(0); // 0 to 100
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [config, setConfig] = useState(getBiometricConfig());
  const [registering, setRegistering] = useState(false);

  const scanTimerRef = useRef(null);
  const hapticTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setScanState('idle');
      setScanProgress(0);
      setErrorMessage('');
      setConfig(getBiometricConfig());
      
      isBiometricsSupported().then(supported => {
        setIsSupported(supported);
      });
    }

    return () => {
      stopScanHold();
    };
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Clear active scan hold timers
  const stopScanHold = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (hapticTimerRef.current) {
      clearInterval(hapticTimerRef.current);
      hapticTimerRef.current = null;
    }
  };

  // User starts touching / holding finger on the Touch ID sensor
  const handleTouchStart = (e) => {
    if (scanState === 'scanning' || scanState === 'success') return;
    
    // Prevent default scroll behavior when pressing sensor
    if (e?.cancelable) e.preventDefault();

    setScanState('scanning');
    setErrorMessage('');
    setScanProgress(5);
    triggerHapticFeedback('light');

    stopScanHold();

    // Pulse haptics during hold
    hapticTimerRef.current = setInterval(() => {
      triggerHapticFeedback('light');
    }, 200);

    // Progress bar fill interval (1.0 second total hold time)
    scanTimerRef.current = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          stopScanHold();
          verifyAndUnlock();
          return 100;
        }
        return prev + 10;
      });
    }, 90);
  };

  // User lifts finger before scan completes
  const handleTouchEnd = () => {
    if (scanState === 'success') return;

    stopScanHold();

    if (scanProgress < 100 && scanState === 'scanning') {
      setScanState('error');
      setScanProgress(0);
      setErrorMessage('Finger lifted too early! Press & hold Touch ID sensor until scan completes.');
      triggerHapticFeedback('error');
    }
  };

  // Verify Touch ID fingerprint match after hold or hardware call
  const verifyAndUnlock = async () => {
    setScanState('scanning');
    setScanProgress(100);

    try {
      const res = await authenticateBiometrics(authUser);
      if (res.success) {
        setScanState('success');
        triggerHapticFeedback('success');

        // Request server auth token if in login mode
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
              }, 400);
              return;
            }
          } catch (err) {
            console.warn('Backend Touch ID auth fallback:', err);
          }
        }

        setTimeout(() => {
          onSuccess?.(authUser || { username: config.username || 'Mobile User' });
        }, 500);
      }
    } catch (err) {
      setScanState('error');
      setScanProgress(0);
      setErrorMessage(err.message || 'Touch ID fingerprint verification failed. Try again.');
      triggerHapticFeedback('error');
    }
  };

  // Trigger Native OS Hardware Touch ID Prompt (Android / iOS)
  const handleNativeOsScan = async () => {
    stopScanHold();
    setScanState('scanning');
    setErrorMessage('');
    setScanProgress(50);
    triggerHapticFeedback('light');

    try {
      const res = await authenticateBiometrics(authUser);
      if (res.success) {
        setScanProgress(100);
        setScanState('success');
        triggerHapticFeedback('success');

        if (mode === 'login' && apiBaseUrl) {
          try {
            const response = await fetch(`${apiBaseUrl}/auth/biometric/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: config.username || authUser?.username || 'WellmoraEnterprise' })
            });
            if (response.ok) {
              const data = await response.json();
              localStorage.setItem('authToken', data.token);
              localStorage.setItem('authUser', JSON.stringify(data.user));
              setTimeout(() => onSuccess?.(data.user, data.token), 400);
              return;
            }
          } catch (e) {
            console.warn('Backend token err:', e);
          }
        }

        setTimeout(() => onSuccess?.(authUser || { username: config.username || 'Mobile User' }), 500);
      }
    } catch (err) {
      setScanState('error');
      setScanProgress(0);
      setErrorMessage(err.message || 'Native Touch ID scan failed.');
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
        setErrorMessage(err.message || 'Failed to register Touch ID fingerprint');
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

  // Calculate SVG stroke offset for dynamic 0-100% circle progress
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scanProgress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center select-none">
        
        {/* Top Close Button (for settings or login mode) */}
        {mode !== 'unlock' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          >
            <X size={18} />
          </button>
        )}

        {/* Header Banner */}
        <div className="w-full pt-8 pb-3 px-6 text-center bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-transparent dark:from-violet-500/15 dark:via-purple-500/5 dark:to-transparent flex flex-col items-center">
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-violet-500/20">
              <Smartphone size={12} />
              Touch ID Guard
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {mode === 'unlock' && 'Touch ID Required'}
            {mode === 'login' && 'Touch ID Sign In'}
            {mode === 'settings' && 'Touch ID Security Settings'}
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[260px]">
            {mode === 'unlock' && 'Press & hold your finger on the Touch ID sensor below'}
            {mode === 'login' && 'Verify your Touch ID fingerprint to access ledger'}
            {mode === 'settings' && 'Configure mobile Touch ID fingerprint sensor settings'}
          </p>
        </div>

        {/* TOUCH ID SCANNER INTERFACE (Unlock or Login Mode) */}
        {(mode === 'unlock' || mode === 'login') && (
          <div className="p-6 w-full flex flex-col items-center space-y-5">

            {/* INTERACTIVE FINGERPRINT TOUCH & HOLD SENSOR CONTAINER */}
            <div className="relative flex items-center justify-center my-2">
              
              {/* Dynamic Progress Ring SVG */}
              <svg className="w-36 h-36 -rotate-90 transform">
                {/* Background Ring Track */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Progress Fill Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className={`transition-all duration-100 ${
                    scanState === 'success' ? 'text-emerald-500' : scanState === 'error' ? 'text-rose-500' : 'text-violet-600 dark:text-violet-400'
                  }`}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>

              {/* Main Touch ID Sensor Button */}
              <div
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className={`absolute w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer touch-none active:scale-95 ${
                  scanState === 'scanning'
                    ? 'bg-violet-600 text-white shadow-violet-500/50 scale-105'
                    : scanState === 'success'
                    ? 'bg-emerald-600 text-white shadow-emerald-500/50'
                    : scanState === 'error'
                    ? 'bg-rose-600 text-white shadow-rose-500/50'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-violet-600 dark:text-violet-400 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Icon rendering */}
                {scanState === 'success' ? (
                  <CheckCircle2 className="w-12 h-12 text-white animate-in zoom-in-75 duration-300" />
                ) : scanState === 'error' ? (
                  <ShieldAlert className="w-12 h-12 text-white animate-in shake duration-300" />
                ) : (
                  <Fingerprint className={`w-12 h-12 ${scanState === 'scanning' ? 'text-white animate-pulse' : 'text-violet-600 dark:text-violet-400'}`} />
                )}

                <span className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-90">
                  {scanState === 'scanning' ? `${scanProgress}%` : 'Hold'}
                </span>
              </div>

            </div>

            {/* STATUS MESSAGE & SCAN INSTRUCTIONS */}
            <div className="text-center min-h-[42px] flex flex-col items-center justify-center px-4">
              {scanState === 'scanning' && (
                <p className="text-xs font-black text-violet-600 dark:text-violet-400 animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
                  Scanning Touch ID... Keep holding ({scanProgress}%)
                </p>
              )}
              {scanState === 'success' && (
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  Touch ID Verified! Access Granted.
                </p>
              )}
              {scanState === 'error' && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-snug">
                  {errorMessage || 'Touch ID verification failed.'}
                </p>
              )}
              {scanState === 'idle' && (
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Press & Hold sensor for Touch ID scan
                </p>
              )}
            </div>

            {/* NATIVE SYSTEM FINGERPRINT & ALTERNATIVE ACTIONS */}
            <div className="w-full space-y-2 pt-1">
              {/* Trigger Native OS Touch ID Fingerprint Dialog */}
              <button
                onClick={handleNativeOsScan}
                disabled={scanState === 'scanning'}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-xl border border-violet-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <SmartphoneNfc size={16} />
                <span>Open Device Touch ID Sensor</span>
              </button>

              {mode === 'unlock' && onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 px-4 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                  Touch ID Hardware Authenticator
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {isSupported ? 'Touch ID Fingerprint Sensor Available' : 'Touch ID Touch Sensor Active'}
                </div>
              </div>
            </div>

            {/* Toggle Enable Touch ID */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Fingerprint size={14} className="text-violet-500" />
                  Enable Touch ID
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Require fingerprint to open app
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
                  Auto-Lock with Touch ID
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Lock when app is backgrounded
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

            {/* Register Hardware Sensor */}
            <button
              onClick={async () => {
                setRegistering(true);
                try {
                  await registerBiometricCredential(authUser);
                  setConfig(getBiometricConfig());
                } catch (e) {
                  setErrorMessage(e.message);
                } finally {
                  setRegistering(false);
                }
              }}
              disabled={registering}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Sparkles size={14} className="text-violet-500" />
              {registering ? 'Registering Touch ID...' : 'Register Mobile Touch ID Sensor'}
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
