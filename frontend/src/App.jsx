import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { AlertCircle, RefreshCw, Menu, Sun, Moon, ShieldCheck, LogOut } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Filters from './components/Filters';
import TransactionTable from './components/TransactionTable';
import TransactionForm from './components/TransactionForm';
import Logo from './components/Logo';

import BankLedger from './components/BankLedger';
import BankForm from './components/BankForm';

import PartnerLedger from './components/PartnerLedger';
import PartnerForm from './components/PartnerForm';
import FinancialSummary from './components/FinancialSummary';
import CentralDashboard from './components/CentralDashboard';
import WholesaleLedger from './components/WholesaleLedger';
import WholesaleForm from './components/WholesaleForm';
import WholesalePaymentModal from './components/WholesalePaymentModal';

import DeleteConfirmation from './components/DeleteConfirmation';
import Notification from './components/Notification';
import ExportDropdown from './components/ExportDropdown';
import AuthModal from './components/AuthModal';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (import.meta.env.DEV ? '/api' : 'https://wellmora-ledger-1.onrender.com/api');

const safeJsonFetch = async (response) => {
  if (!response) return null;
  try {
    return await response.json();
  } catch (err) {
    console.warn("Failed to parse JSON response:", err);
    return null;
  }
};

const safeSetLocalStorage = (key, data) => {
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn(`⚠️ localStorage quota warning for "${key}":`, err.message);
    try {
      if (Array.isArray(data)) {
        // Compact fallback: keep most recent 50 entries
        const compact = data.slice(0, 50).map(item => {
          if (item && typeof item === 'object') {
            const { receiptImage, ...rest } = item;
            return rest;
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(compact));
      }
    } catch (fallbackErr) {
      console.warn(`⚠️ Storage fallback error for "${key}":`, fallbackErr.message);
    }
  }
};

const fetchWithTimeout = async (url, options = {}, timeout = 60000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    let requestUrl = url;
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET') {
      const separator = requestUrl.includes('?') ? '&' : '?';
      requestUrl = `${requestUrl}${separator}_t=${Date.now()}`;
    }

    const response = await fetch(requestUrl, {
      ...options,
      cache: 'no-store',
      headers,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    const saved = localStorage.getItem('activePage');
    if (!saved || saved === 'orders' || saved === 'report_builder') {
      localStorage.removeItem('cached_orders');
      if (saved === 'orders' || saved === 'report_builder') localStorage.setItem('activePage', 'central');
      return 'central';
    }
    return saved;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer state

  // Auth State
  const [authUser, setAuthUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('authUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAuthSuccess = (user, token) => {
    setAuthUser(user);
    setAuthToken(token);
    setIsAuthModalOpen(false);
    triggerNotification(`Welcome back, ${user.name || user.username}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('cached_transactions');
    localStorage.removeItem('cached_bankTransactions');
    localStorage.removeItem('cached_partnerTransactions');
    localStorage.removeItem('cached_wholesalePurchases');
    setAuthUser(null);
    setAuthToken('');
    setTransactions([]);
    setBankTransactions([]);
    setPartnerTransactions([]);
    setWholesalePurchases([]);
    setIsAuthModalOpen(true);
    triggerNotification('You have been signed out.', 'info');
  };

  // Theme State
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Smooth, lag-free theme toggle using View Transitions API
  const toggleTheme = (event) => {
    // Check if transition support is available or if user prefers reduced motion
    if (
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
      return;
    }

    const x = event.clientX ?? window.innerWidth / 2;
    const y = event.clientY ?? window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Set custom coordinates for clipPath keyframes
    const root = document.documentElement;
    root.style.setProperty('--ripple-x', `${x}px`);
    root.style.setProperty('--ripple-y', `${y}px`);
    root.style.setProperty('--ripple-r', `${endRadius}px`);

    // Add temporary class to disable other CSS transitions during capturing
    root.classList.add('no-transitions');

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        if (nextTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      });
    });

    transition.ready.then(() => {
      // Remove temporary class so transitions are re-enabled
      root.classList.remove('no-transitions');
    });
  };

  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

  // 1. Ledger State
  const [transactions, setTransactions] = useState(() => {
    if (!localStorage.getItem('authUser')) return [];
    try {
      const cached = localStorage.getItem('cached_transactions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [errorLedger, setErrorLedger] = useState(null);

  // 2. Bank State
  const [bankTransactions, setBankTransactions] = useState(() => {
    if (!localStorage.getItem('authUser')) return [];
    try {
      const cached = localStorage.getItem('cached_bankTransactions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingBank, setLoadingBank] = useState(false);
  const [errorBank, setErrorBank] = useState(null);

  // 3. Partner State
  const [partnerTransactions, setPartnerTransactions] = useState(() => {
    if (!localStorage.getItem('authUser')) return [];
    try {
      const cached = localStorage.getItem('cached_partnerTransactions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingPartner, setLoadingPartner] = useState(false);
  const [errorPartner, setErrorPartner] = useState(null);

  // 4. Wholesale Purchases State
  const [wholesalePurchases, setWholesalePurchases] = useState(() => {
    if (!localStorage.getItem('authUser')) return [];
    try {
      const cached = localStorage.getItem('cached_wholesalePurchases');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingWholesale, setLoadingWholesale] = useState(false);
  const [errorWholesale, setErrorWholesale] = useState(null);

  // General Search / Filter for main ledger
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [ledgerDateRange, setLedgerDateRange] = useState('all');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Form modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [editingBankTransaction, setEditingBankTransaction] = useState(null);

  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false);
  const [editingPartnerTransaction, setEditingPartnerTransaction] = useState(null);

  const [isWholesaleFormOpen, setIsWholesaleFormOpen] = useState(false);
  const [editingWholesalePurchase, setEditingWholesalePurchase] = useState(null);
  const [payingWholesalePurchase, setPayingWholesalePurchase] = useState(null);

  // Delete modal state
  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [deletingType, setDeletingType] = useState('ledger'); // 'ledger' | 'bank' | 'partner' | 'wholesale'

  // Notifications
  const [notification, setNotification] = useState(null);
  const [ledgerSubTab, setLedgerSubTab] = useState('all'); // 'all' | 'cash'

  const refreshAllData = async (isSilent = false) => {
    try {
      await Promise.allSettled([
        fetchTransactions(),
        fetchBankTransactions(),
        fetchPartnerTransactions(),
        fetchWholesalePurchases()
      ]);
    } catch (err) {
      console.error("Auto-sync refresh error:", err);
    }
  };

  const forceHardRefresh = async () => {
    localStorage.removeItem('cached_transactions');
    localStorage.removeItem('cached_bankTransactions');
    localStorage.removeItem('cached_partnerTransactions');
    localStorage.removeItem('cached_wholesalePurchases');
    localStorage.removeItem('cached_orders');

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (e) {}
    }

    triggerNotification('Clearing cache and loading live database records...', 'info');
    await refreshAllData(false);
    triggerNotification('Database re-synced successfully!', 'success');
  };

  // Fetch all modules on mount & run real-time auto-sync polling + focus/visibility listeners
  useEffect(() => {
    if (authUser && authToken) {
      refreshAllData();

      // Real-time cross-device auto-sync polling (every 30 seconds when tab is active)
      const syncInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshAllData(true);
        }
      }, 30000);

      // Auto-sync on window/tab focus, visibility change, and network reconnection
      const handleFocusOrVisible = () => {
        if (document.visibilityState === 'visible') {
          refreshAllData(true);
          syncOfflineOperations();
        }
      };

      const handleOnline = () => {
        refreshAllData(true);
        syncOfflineOperations();
      };

      // Multi-tab storage sync listener across all data modules
      const handleStorageChange = (e) => {
        if (e.key === 'cached_transactions' && e.newValue) {
          try { setTransactions(JSON.parse(e.newValue)); } catch (err) {}
        } else if (e.key === 'cached_bankTransactions' && e.newValue) {
          try { setBankTransactions(JSON.parse(e.newValue)); } catch (err) {}
        } else if (e.key === 'cached_partnerTransactions' && e.newValue) {
          try { setPartnerTransactions(JSON.parse(e.newValue)); } catch (err) {}
        } else if (e.key === 'cached_wholesalePurchases' && e.newValue) {
          try { setWholesalePurchases(JSON.parse(e.newValue)); } catch (err) {}
        }
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('visibilitychange', handleFocusOrVisible);
      window.addEventListener('focus', handleFocusOrVisible);
      window.addEventListener('pageshow', handleFocusOrVisible);
      window.addEventListener('online', handleOnline);

      return () => {
        clearInterval(syncInterval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('visibilitychange', handleFocusOrVisible);
        window.removeEventListener('focus', handleFocusOrVisible);
        window.removeEventListener('pageshow', handleFocusOrVisible);
        window.removeEventListener('online', handleOnline);
      };
    } else {
      setTransactions([]);
      setBankTransactions([]);
      setPartnerTransactions([]);
      setIsAuthModalOpen(true);
    }
  }, [authUser, authToken]);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const queueSyncOperation = (action, type, data) => {
    try {
      const queue = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
      queue.push({ action, type, data });
      safeSetLocalStorage('unsynced_ops', queue);
    } catch (e) {
      console.warn("Failed to queue sync operation:", e);
    }
  };

  const syncOfflineOperations = async () => {
    const queue = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
    if (queue.length === 0) return;

    console.log(`🔄 Syncing ${queue.length} offline operations to MongoDB server...`);
    let failedOps = [];
    const workingQueue = [...queue];

    for (let i = 0; i < workingQueue.length; i++) {
      const op = workingQueue[i];
      try {
        if (op.action === 'ADD') {
          // Remove local temporary ID
          const { _id, ...cleanData } = op.data;
          let url = '';
          if (op.type === 'ledger') {
            url = `${API_BASE_URL}/transactions`;
            if (!cleanData.category || typeof cleanData.category !== 'string') {
              cleanData.category = 'Others';
            }
          }
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows`;
          else if (op.type === 'wholesale') url = `${API_BASE_URL}/wholesale-purchases`;

          const response = await fetchWithTimeout(url, {
            method: 'POST',
            body: JSON.stringify(cleanData)
          });

          if (response.status === 401) {
            console.warn("Session expired during offline sync.");
            handleLogout();
            triggerNotification('Session expired. Please log in again to sync changes.', 'error');
            return;
          }

          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `HTTP ${response.status}`);
          }

          const savedItem = await safeJsonFetch(response);
          if (savedItem && savedItem._id) {
            const oldLocalId = op.data._id;
            const newServerId = savedItem._id;

            if (op.type === 'ledger') {
              setTransactions(prev => {
                const exists = prev.some(t => t._id === oldLocalId || t._id === newServerId);
                const newL = exists 
                  ? prev.map(t => (t._id === oldLocalId || t._id === newServerId) ? savedItem : t)
                  : [savedItem, ...prev];
                safeSetLocalStorage('cached_transactions', newL);
                return newL;
              });
            } else if (op.type === 'bank') {
              setBankTransactions(prev => {
                const exists = prev.some(t => t._id === oldLocalId || t._id === newServerId);
                const newL = exists
                  ? prev.map(t => (t._id === oldLocalId || t._id === newServerId) ? savedItem : t)
                  : [savedItem, ...prev];
                safeSetLocalStorage('cached_bankTransactions', newL);
                return newL;
              });
            } else if (op.type === 'partner') {
              setPartnerTransactions(prev => {
                const exists = prev.some(t => t._id === oldLocalId || t._id === newServerId);
                const newL = exists
                  ? prev.map(t => (t._id === oldLocalId || t._id === newServerId) ? savedItem : t)
                  : [savedItem, ...prev];
                safeSetLocalStorage('cached_partnerTransactions', newL);
                return newL;
              });
            } else if (op.type === 'wholesale') {
              setWholesalePurchases(prev => {
                const exists = prev.some(t => t._id === oldLocalId || t._id === newServerId);
                const newL = exists
                  ? prev.map(t => (t._id === oldLocalId || t._id === newServerId) ? savedItem : t)
                  : [savedItem, ...prev];
                safeSetLocalStorage('cached_wholesalePurchases', newL);
                return newL;
              });
            }

            // Map old local ID to permanent server ID for subsequent queued operations
            for (let j = i + 1; j < workingQueue.length; j++) {
              if (workingQueue[j].data && workingQueue[j].data._id === oldLocalId) {
                workingQueue[j].data._id = newServerId;
              }
            }
          }
        } else if (op.action === 'EDIT') {
          if (op.data && op.data._id && op.data._id.startsWith('local_')) {
            // Associated local ADD hasn't completed yet; keep EDIT queued for next retry
            failedOps.push(op);
            continue;
          }

          let url = '';
          if (op.type === 'ledger') url = `${API_BASE_URL}/transactions/${op.data._id}`;
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions/${op.data._id}`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows/${op.data._id}`;
          else if (op.type === 'wholesale') url = `${API_BASE_URL}/wholesale-purchases/${op.data._id}`;

          const response = await fetchWithTimeout(url, {
            method: 'PUT',
            body: JSON.stringify(op.data)
          });

          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }

          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `HTTP ${response.status}`);
          }
        } else if (op.action === 'DELETE') {
          if (op.data && op.data._id && op.data._id.startsWith('local_')) {
            // Local item was added and deleted entirely offline; prune any queued ADD for this local item
            failedOps = failedOps.filter(f => !(f.action === 'ADD' && f.data && f.data._id === op.data._id));
            continue;
          }

          let url = '';
          if (op.type === 'ledger') url = `${API_BASE_URL}/transactions/${op.data._id}`;
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions/${op.data._id}`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows/${op.data._id}`;
          else if (op.type === 'wholesale') url = `${API_BASE_URL}/wholesale-purchases/${op.data._id}`;

          const response = await fetchWithTimeout(url, { method: 'DELETE' });

          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }

          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `HTTP ${response.status}`);
          }
        }
      } catch (err) {
        console.error('Failed to sync operation:', op, err);
        failedOps.push(op);
      }
    }

    safeSetLocalStorage('unsynced_ops', failedOps);
  };

  // ==========================================
  // API Operations: Standard Ledger
  // ==========================================
  const fetchTransactions = async () => {
    if (!localStorage.getItem('cached_transactions')) {
      setLoadingLedger(true);
    }
    setErrorLedger(null);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions`);
      if (response.status === 401) {
        handleLogout();
        triggerNotification('Session expired. Please log in again.', 'error');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await safeJsonFetch(response);
      if (!data) throw new Error('Invalid server response');

      // Preserve any pending local unsynced additions in state
      const unsyncedOps = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
      const localAddOps = unsyncedOps.filter(o => o.action === 'ADD' && o.type === 'ledger' && o.data && o.data._id);
      const localIds = new Set(localAddOps.map(o => o.data._id));

      setTransactions(prev => {
        const remainingLocal = prev.filter(t => localIds.has(t._id));
        const merged = [...remainingLocal, ...data.filter(d => !remainingLocal.some(l => l._id === d._id))];
        safeSetLocalStorage('cached_transactions', merged);
        return merged;
      });
      syncOfflineOperations();
    } catch (err) {
      console.warn("fetchTransactions error:", err.message);
      const cached = localStorage.getItem('cached_transactions');
      if (cached) {
        try { setTransactions(JSON.parse(cached)); } catch (e) {}
      }
      if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
        setErrorLedger('Backend connection offline.');
      }
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleLedgerSubmit = async (formData) => {
    try {
      if (editingTransaction) {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/${editingTransaction._id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to update ledger (HTTP ${response.status})`);
          }
          const updated = await safeJsonFetch(response);
          if (!updated) throw new Error('Invalid server response');
          setTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            safeSetLocalStorage('cached_transactions', newL);
            return newL;
          });
          triggerNotification('Ledger entry updated successfully in MongoDB!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            console.warn('Network submit failed, queuing offline:', err);
            const updatedLocally = { ...editingTransaction, ...formData, updatedAt: new Date().toISOString() };
            setTransactions(prev => {
              const newL = prev.map(t => t._id === editingTransaction._id ? updatedLocally : t);
              safeSetLocalStorage('cached_transactions', newL);
              return newL;
            });
            queueSyncOperation('EDIT', 'ledger', updatedLocally);
            triggerNotification('Saved locally offline. Will sync to MongoDB when connected.', 'info');
          } else {
            throw err;
          }
        }
      } else {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to save ledger (HTTP ${response.status})`);
          }
          const saved = await safeJsonFetch(response);
          if (!saved || !saved._id) throw new Error('Invalid server response');
          setTransactions(prev => {
            const newL = [saved, ...prev];
            safeSetLocalStorage('cached_transactions', newL);
            return newL;
          });
          triggerNotification('Ledger entry saved directly to MongoDB!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            console.warn('Network submit failed, queuing offline:', err);
            const localNew = { ...formData, _id: `local_${Date.now()}`, date: formData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
            setTransactions(prev => {
              const newL = [localNew, ...prev];
              safeSetLocalStorage('cached_transactions', newL);
              return newL;
            });
            queueSyncOperation('ADD', 'ledger', localNew);
            triggerNotification('Saved locally offline. Will sync to MongoDB when connected.', 'info');
          } else {
            throw err;
          }
        }
      }
      setIsFormOpen(false);
      setEditingTransaction(null);
    } catch (err) {
      console.error('Ledger error:', err);
      triggerNotification(err.message || 'Error saving ledger record', 'error');
    }
  };

  // MS Excel HTML Table Exporter
  const exportToExcel = (headers, rows, filename) => {
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Ledger Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #10b981; color: white; font-weight: bold;">
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${String(cell)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exporter for Standard Ledger
  const handleLedgerExport = (range, startDate, endDate) => {
    let toExport = [...ledgerTransactionsToDisplay];
    const now = new Date();

    if (range === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      toExport = toExport.filter(t => new Date(t.date) >= startOfMonth);
    } else if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      toExport = toExport.filter(t => new Date(t.date) >= startOfQuarter);
    } else if (range === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      toExport = toExport.filter(t => new Date(t.date) >= startOfYear);
    } else if (range === 'custom') {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      toExport = toExport.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }

    if (toExport.length === 0) {
      alert(`No ledger records found in the specified range.`);
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount (INR)'];
    const rows = toExport.map(t => [
      new Date(t.date).toLocaleDateString('en-IN'),
      t.description,
      t.category,
      t.type,
      t.amount
    ]);

    exportToExcel(headers, rows, `wellmora_ledger_${range}.xls`);
  };

  // ==========================================
  // API Operations: Bank Ledger
  // ==========================================
  const fetchBankTransactions = async () => {
    if (!localStorage.getItem('cached_bankTransactions')) {
      setLoadingBank(true);
    }
    setErrorBank(null);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/bank-transactions`);
      if (response.status === 401) {
        handleLogout();
        triggerNotification('Session expired. Please log in again.', 'error');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch bank transactions');
      const data = await safeJsonFetch(response);
      if (!data) throw new Error('Invalid server response');

      // Preserve any pending local unsynced additions in state
      const unsyncedOps = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
      const localAddOps = unsyncedOps.filter(o => o.action === 'ADD' && o.type === 'bank' && o.data && o.data._id);
      const localIds = new Set(localAddOps.map(o => o.data._id));

      setBankTransactions(prev => {
        const remainingLocal = prev.filter(t => localIds.has(t._id));
        const merged = [...remainingLocal, ...data.filter(d => !remainingLocal.some(l => l._id === d._id))];
        safeSetLocalStorage('cached_bankTransactions', merged);
        return merged;
      });
    } catch (err) {
      console.warn("fetchBankTransactions error:", err.message);
      const cached = localStorage.getItem('cached_bankTransactions');
      if (cached) {
        try { setBankTransactions(JSON.parse(cached)); } catch (e) {}
      }
      if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
        setErrorBank('Bank API offline.');
      }
    } finally {
      setLoadingBank(false);
    }
  };

  const handleBankSubmit = async (formData) => {
    try {
      if (editingBankTransaction) {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/bank-transactions/${editingBankTransaction._id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to update bank entry (HTTP ${response.status})`);
          }
          const updated = await safeJsonFetch(response);
          if (!updated) throw new Error('Invalid server response');
          setBankTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            safeSetLocalStorage('cached_bankTransactions', newL);
            return newL;
          });
          triggerNotification('Bank record updated successfully in MongoDB!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            console.warn('Network bank submit failed, queuing offline:', err);
            const updatedLocally = { ...editingBankTransaction, ...formData, updatedAt: new Date().toISOString() };
            setBankTransactions(prev => {
              const newL = prev.map(t => t._id === editingBankTransaction._id ? updatedLocally : t);
              safeSetLocalStorage('cached_bankTransactions', newL);
              return newL;
            });
            queueSyncOperation('EDIT', 'bank', updatedLocally);
            triggerNotification('Saved locally offline. Will sync to MongoDB when connected.', 'info');
          } else {
            throw err;
          }
        }
      } else {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/bank-transactions`, {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to save bank entry (HTTP ${response.status})`);
          }
          const saved = await safeJsonFetch(response);
          if (!saved || !saved._id) throw new Error('Invalid server response');
          setBankTransactions(prev => {
            const newL = [saved, ...prev];
            safeSetLocalStorage('cached_bankTransactions', newL);
            return newL;
          });
          triggerNotification('Bank record saved directly to MongoDB!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            console.warn('Network bank submit failed, queuing offline:', err);
            const localNew = { ...formData, _id: `local_${Date.now()}`, date: formData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
            setBankTransactions(prev => {
              const newL = [localNew, ...prev];
              safeSetLocalStorage('cached_bankTransactions', newL);
              return newL;
            });
            queueSyncOperation('ADD', 'bank', localNew);
            triggerNotification('Saved locally offline. Will sync to MongoDB when connected.', 'info');
          } else {
            throw err;
          }
        }
      }

      // Auto-Sync to Cash Ledger (Cash-in-Hand Credit) if syncToCash is active
      const isAtmOrSync = formData.syncToCash || formData.type === 'ATM Withdrawal' || (formData.type === 'Withdrawal' && formData.syncToCash);
      if (isAtmOrSync && !editingBankTransaction && Number(formData.amount) > 0) {
        const cashTransactionData = {
          date: formData.date || new Date().toISOString().split('T')[0],
          description: formData.description 
            ? `ATM Cash Withdrawal (${formData.description}) - ${formData.bankName}`
            : `ATM Cash Withdrawal from ${formData.bankName} (${formData.accountNumber || 'Bank'})`,
          category: 'ATM Cash Withdrawal',
          type: 'Credit', // Cash Credit (Cash In)
          amount: Number(formData.amount),
          isHandCash: true
        };

        handleLedgerSubmit(cashTransactionData);
        triggerNotification(`Bank entry saved & ₹${formData.amount} auto-synced to Cash Ledger!`, 'success');
      }

      setIsBankFormOpen(false);
      setEditingBankTransaction(null);
    } catch (err) {
      console.error('Bank error:', err);
      triggerNotification(err.message || 'Error saving bank record', 'error');
    }
  };

  // ==========================================
  // API Operations: Partner Flow
  // ==========================================
  const fetchPartnerTransactions = async () => {
    if (!localStorage.getItem('cached_partnerTransactions')) {
      setLoadingPartner(true);
    }
    setErrorPartner(null);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/partner-flows`);
      if (response.status === 401) {
        handleLogout();
        triggerNotification('Session expired. Please log in again.', 'error');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch partner transactions');
      const data = await safeJsonFetch(response);
      if (!data) throw new Error('Invalid server response');

      // Preserve any pending local unsynced additions in state
      const unsyncedOps = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
      const localAddOps = unsyncedOps.filter(o => o.action === 'ADD' && o.type === 'partner' && o.data && o.data._id);
      const localIds = new Set(localAddOps.map(o => o.data._id));

      setPartnerTransactions(prev => {
        const remainingLocal = prev.filter(t => localIds.has(t._id));
        const merged = [...remainingLocal, ...data.filter(d => !remainingLocal.some(l => l._id === d._id))];
        safeSetLocalStorage('cached_partnerTransactions', merged);
        return merged;
      });
    } catch (err) {
      console.warn("fetchPartnerTransactions error:", err.message);
      const cached = localStorage.getItem('cached_partnerTransactions');
      if (cached) {
        try { setPartnerTransactions(JSON.parse(cached)); } catch (e) {}
      }
      if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
        setErrorPartner('Partner API offline.');
      }
    } finally {
      setLoadingPartner(false);
    }
  };

  const handlePartnerSubmit = async (formData) => {
    try {
      if (editingPartnerTransaction) {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/partner-flows/${editingPartnerTransaction._id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to update partner entry (HTTP ${response.status})`);
          }
          const updated = await safeJsonFetch(response);
          if (!updated) throw new Error('Invalid server response');
          setPartnerTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            safeSetLocalStorage('cached_partnerTransactions', newL);
            return newL;
          });
          triggerNotification('Partner flow updated successfully in MongoDB!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            console.warn('Network partner submit failed, queuing offline:', err);
            const updatedLocally = { ...editingPartnerTransaction, ...formData, updatedAt: new Date().toISOString() };
            setPartnerTransactions(prev => {
              const newL = prev.map(t => t._id === editingPartnerTransaction._id ? updatedLocally : t);
              safeSetLocalStorage('cached_partnerTransactions', newL);
              return newL;
            });
            queueSyncOperation('EDIT', 'partner', updatedLocally);
            triggerNotification('Saved locally offline. Will sync to MongoDB when connected.', 'info');
          } else {
            throw err;
          }
        }
      } else {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/partner-flows`, {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to save partner entry (HTTP ${response.status})`);
          }
          const saved = await safeJsonFetch(response);
          if (!saved || !saved._id) throw new Error('Invalid server response');
          setPartnerTransactions(prev => {
            const newL = [saved, ...prev];
            safeSetLocalStorage('cached_partnerTransactions', newL);
            return newL;
          });
          triggerNotification('Partner flow saved directly to MongoDB!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            console.warn('Network partner submit failed, queuing offline:', err);
            const localNew = { ...formData, _id: `local_${Date.now()}`, date: formData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
            setPartnerTransactions(prev => {
              const newL = [localNew, ...prev];
              safeSetLocalStorage('cached_partnerTransactions', newL);
              return newL;
            });
            queueSyncOperation('ADD', 'partner', localNew);
            triggerNotification('Saved locally offline. Will sync to MongoDB when connected.', 'info');
          } else {
            throw err;
          }
        }
      }
      setIsPartnerFormOpen(false);
      setEditingPartnerTransaction(null);
    } catch (err) {
      console.error('Partner error:', err);
      triggerNotification(err.message || 'Error saving partner record', 'error');
    }
  };

  // ==========================================
  // API Operations: Wholesale Purchases
  // ==========================================
  const fetchWholesalePurchases = async () => {
    if (!localStorage.getItem('cached_wholesalePurchases')) {
      setLoadingWholesale(true);
    }
    setErrorWholesale(null);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/wholesale-purchases`);
      if (response.status === 401) {
        handleLogout();
        triggerNotification('Session expired. Please log in again.', 'error');
        return;
      }
      if (response.status === 404) {
        // Graceful extraction from transactions if route is not yet on server
        const cachedTx = localStorage.getItem('cached_transactions');
        if (cachedTx) {
          try {
            const parsed = JSON.parse(cachedTx);
            const derived = parsed
              .filter(t => t.isWholesalePurchase || (t.category === 'Purchase' && t.sellerName))
              .map(t => ({
                _id: t.wholesalePurchaseId || t._id,
                sellerName: t.sellerName || 'Dev',
                description: t.description || '',
                quantity: t.quantity || 1,
                unitPrice: t.unitPrice || t.amount || 0,
                totalAmount: t.totalAmount || t.amount || 0,
                paidAmount: t.paidAmount !== undefined ? t.paidAmount : (t.paymentStatus === 'Done' ? t.amount : 0),
                pendingAmount: t.pendingAmount || 0,
                paymentStatus: t.paymentStatus || 'Done',
                date: t.date,
                paymentMode: t.isHandCash ? 'Cash' : 'Bank Transfer',
                billNumber: t.billNumber || '',
                notes: ''
              }));
            setWholesalePurchases(derived);
            safeSetLocalStorage('cached_wholesalePurchases', derived);
          } catch (e) {}
        }
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch wholesale purchases');
      const data = await safeJsonFetch(response);
      if (!data) throw new Error('Invalid server response');

      const unsyncedOps = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
      const localAddOps = unsyncedOps.filter(o => o.action === 'ADD' && o.type === 'wholesale' && o.data && o.data._id);
      const localIds = new Set(localAddOps.map(o => o.data._id));

      setWholesalePurchases(prev => {
        const remainingLocal = prev.filter(p => localIds.has(p._id));
        const merged = [...remainingLocal, ...data.filter(d => !remainingLocal.some(l => l._id === d._id))];
        safeSetLocalStorage('cached_wholesalePurchases', merged);
        return merged;
      });
      syncOfflineOperations();
    } catch (err) {
      console.warn('fetchWholesalePurchases error:', err.message);
      const cached = localStorage.getItem('cached_wholesalePurchases');
      if (cached) {
        try { setWholesalePurchases(JSON.parse(cached)); } catch (e) {}
      }
      if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
        setErrorWholesale('Backend connection offline.');
      }
    } finally {
      setLoadingWholesale(false);
    }
  };

  const handleWholesaleSubmit = async (formData) => {
    try {
      if (editingWholesalePurchase) {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/wholesale-purchases/${editingWholesalePurchase._id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to update wholesale purchase (HTTP ${response.status})`);
          }
          const updated = await safeJsonFetch(response);
          if (!updated) throw new Error('Invalid server response');

          setWholesalePurchases(prev => {
            const newL = prev.map(p => p._id === updated._id ? updated : p);
            safeSetLocalStorage('cached_wholesalePurchases', newL);
            return newL;
          });

          // Sync into transactions state for Expenses & Main Dashboard
          setTransactions(prev => {
            const txDesc = `[Wholesale: ${updated.sellerName}] ${updated.description} (${updated.quantity} pcs @ ₹${updated.unitPrice})`;
            const exists = prev.find(t => t.wholesalePurchaseId === updated._id || (updated.linkedTransactionId && t._id === updated.linkedTransactionId));
            if (exists) {
              const newT = prev.map(t => (t._id === exists._id) ? {
                ...t,
                date: updated.date,
                description: txDesc,
                amount: updated.totalAmount,
                totalAmount: updated.totalAmount,
                paidAmount: updated.paidAmount,
                pendingAmount: updated.pendingAmount,
                paymentStatus: updated.paymentStatus,
                sellerName: updated.sellerName,
                quantity: updated.quantity,
                unitPrice: updated.unitPrice,
                billNumber: updated.billNumber
              } : t);
              safeSetLocalStorage('cached_transactions', newT);
              return newT;
            }
            return prev;
          });

          triggerNotification('Wholesale purchase updated successfully!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            const updatedLocally = { ...editingWholesalePurchase, ...formData, updatedAt: new Date().toISOString() };
            setWholesalePurchases(prev => {
              const newL = prev.map(p => p._id === editingWholesalePurchase._id ? updatedLocally : p);
              safeSetLocalStorage('cached_wholesalePurchases', newL);
              return newL;
            });
            queueSyncOperation('EDIT', 'wholesale', updatedLocally);
            triggerNotification('Saved locally offline. Will auto-sync when online.', 'info');
          } else {
            throw err;
          }
        }
      } else {
        // ADD
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/wholesale-purchases`, {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          if (response.status === 401) {
            handleLogout();
            triggerNotification('Session expired. Please log in again.', 'error');
            return;
          }
          if (!response.ok) {
            const errData = await safeJsonFetch(response);
            throw new Error(errData?.message || `Failed to save wholesale purchase (HTTP ${response.status})`);
          }
          const saved = await safeJsonFetch(response);
          if (!saved) throw new Error('Invalid server response');

          setWholesalePurchases(prev => {
            const newL = [saved, ...prev];
            safeSetLocalStorage('cached_wholesalePurchases', newL);
            return newL;
          });

          // Insert into transactions state for Expenses & Main Dashboard
          const newTx = {
            _id: saved.linkedTransactionId || `local_tx_${Date.now()}`,
            date: saved.date,
            description: `[Wholesale: ${saved.sellerName}] ${saved.description} (${saved.quantity} pcs @ ₹${saved.unitPrice})`,
            category: 'Purchase',
            type: 'Debit',
            amount: saved.totalAmount,
            isHandCash: (saved.paymentMode || '').toLowerCase().includes('cash'),
            isWholesalePurchase: true,
            sellerName: saved.sellerName,
            quantity: saved.quantity,
            unitPrice: saved.unitPrice,
            totalAmount: saved.totalAmount,
            paidAmount: saved.paidAmount,
            pendingAmount: saved.pendingAmount,
            paymentStatus: saved.paymentStatus,
            billNumber: saved.billNumber || '',
            wholesalePurchaseId: saved._id
          };
          setTransactions(prev => {
            const newT = [newTx, ...prev];
            safeSetLocalStorage('cached_transactions', newT);
            return newT;
          });

          triggerNotification('Wholesale purchase entry saved successfully!', 'success');
        } catch (err) {
          if (!navigator.onLine || err.name === 'AbortError' || (err.message && err.message.includes('Failed to fetch'))) {
            const tempId = `local_wp_${Date.now()}`;
            const localItem = {
              ...formData,
              _id: tempId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setWholesalePurchases(prev => {
              const newL = [localItem, ...prev];
              safeSetLocalStorage('cached_wholesalePurchases', newL);
              return newL;
            });
            queueSyncOperation('ADD', 'wholesale', localItem);
            triggerNotification('Saved locally offline. Will auto-sync when online.', 'info');
          } else {
            throw err;
          }
        }
      }
      setIsWholesaleFormOpen(false);
      setEditingWholesalePurchase(null);
    } catch (err) {
      console.error('Wholesale submit error:', err);
      triggerNotification(err.message || 'Error saving wholesale entry', 'error');
    }
  };

  const handleWholesalePay = async (purchaseId, payData) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/wholesale-purchases/${purchaseId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify(payData)
      });
      if (response.status === 401) {
        handleLogout();
        triggerNotification('Session expired. Please log in again.', 'error');
        return;
      }
      if (!response.ok) {
        const errData = await safeJsonFetch(response);
        throw new Error(errData?.message || 'Failed to record payment');
      }
      const updated = await safeJsonFetch(response);
      if (!updated) throw new Error('Invalid server response');

      setWholesalePurchases(prev => {
        const newL = prev.map(p => p._id === updated._id ? updated : p);
        safeSetLocalStorage('cached_wholesalePurchases', newL);
        return newL;
      });

      // Update in transactions state
      setTransactions(prev => {
        const newT = prev.map(t => {
          if (t.wholesalePurchaseId === updated._id || (updated.linkedTransactionId && t._id === updated.linkedTransactionId)) {
            return {
              ...t,
              paidAmount: updated.paidAmount,
              pendingAmount: updated.pendingAmount,
              paymentStatus: updated.paymentStatus
            };
          }
          return t;
        });
        safeSetLocalStorage('cached_transactions', newT);
        return newT;
      });

      triggerNotification(`Payment of ₹${payData.paymentAmount} recorded successfully!`, 'success');
      setPayingWholesalePurchase(null);
    } catch (err) {
      console.error('Record payment error:', err);
      triggerNotification(err.message || 'Error recording payment', 'error');
    }
  };

  // ==========================================
  // Global Delete Handlers
  // ==========================================
  const handleDeleteTrigger = (transaction, type) => {
    setDeletingTransaction(transaction);
    setDeletingType(type);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    const urlSegment = deletingType === 'ledger'
      ? 'transactions'
      : deletingType === 'bank'
        ? 'bank-transactions'
        : deletingType === 'wholesale'
          ? 'wholesale-purchases'
          : 'partner-flows';

    try {
      if (deletingTransaction._id && !deletingTransaction._id.startsWith('local_')) {
        const response = await fetchWithTimeout(`${API_BASE_URL}/${urlSegment}/${deletingTransaction._id}`, {
          method: 'DELETE'
        });
        if (response.status === 401) {
          handleLogout();
          triggerNotification('Session expired. Please log in again.', 'error');
          return;
        }
        if (!response.ok) {
          const errData = await safeJsonFetch(response);
          throw new Error(errData?.message || `Failed to remove entry (HTTP ${response.status})`);
        }
      } else {
        // Local temporary item: remove from offline queue if queued
        try {
          const queue = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
          const filtered = queue.filter(op => !(op.data && op.data._id === deletingTransaction._id));
          safeSetLocalStorage('unsynced_ops', filtered);
        } catch (e) {}
      }

      if (deletingType === 'ledger') {
        setTransactions(prev => {
          const newL = prev.filter(t => t._id !== deletingTransaction._id);
          safeSetLocalStorage('cached_transactions', newL);
          return newL;
        });
      } else if (deletingType === 'bank') {
        setBankTransactions(prev => {
          const newL = prev.filter(t => t._id !== deletingTransaction._id);
          safeSetLocalStorage('cached_bankTransactions', newL);
          return newL;
        });
      } else if (deletingType === 'wholesale') {
        setWholesalePurchases(prev => {
          const newL = prev.filter(p => p._id !== deletingTransaction._id);
          safeSetLocalStorage('cached_wholesalePurchases', newL);
          return newL;
        });
        // Also remove linked transaction in ledger
        setTransactions(prev => {
          const newL = prev.filter(t => t.wholesalePurchaseId !== deletingTransaction._id && t._id !== deletingTransaction.linkedTransactionId);
          safeSetLocalStorage('cached_transactions', newL);
          return newL;
        });
      } else {
        setPartnerTransactions(prev => {
          const newL = prev.filter(t => t._id !== deletingTransaction._id);
          safeSetLocalStorage('cached_partnerTransactions', newL);
          return newL;
        });
      }
      triggerNotification('Record deleted successfully from MongoDB!', 'success');
      setDeletingTransaction(null);
    } catch (err) {
      console.error('Delete error:', err);
      triggerNotification(err.message || 'Error deleting record', 'error');
      setDeletingTransaction(null);
    }
  };

  // Merge wholesale purchases into transactions for display in Expenses page if not already linked
  const combinedExpensesTransactions = React.useMemo(() => {
    const existingTxIds = new Set(transactions.map(t => String(t.wholesalePurchaseId || t._id)));
    const unlinkedWholesale = (wholesalePurchases || [])
      .filter(p => !existingTxIds.has(String(p._id)) && !existingTxIds.has(String(p.linkedTransactionId)))
      .map(p => ({
        _id: p.linkedTransactionId || `wp_display_${p._id}`,
        date: p.date,
        description: `[Wholesale: ${p.sellerName}] ${p.description} (${p.quantity} pcs @ ₹${p.unitPrice})`,
        category: 'Purchase',
        type: 'Debit',
        amount: Number(p.totalAmount || 0),
        isHandCash: (p.paymentMode || '').toLowerCase().includes('cash'),
        isWholesalePurchase: true,
        sellerName: p.sellerName,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalAmount: p.totalAmount,
        paidAmount: p.paidAmount,
        pendingAmount: p.pendingAmount,
        paymentStatus: p.paymentStatus,
        billNumber: p.billNumber || '',
        wholesalePurchaseId: p._id
      }));

    return [...transactions, ...unlinkedWholesale];
  }, [transactions, wholesalePurchases]);

  // Filter main ledger locally by sub-tab (all vs hand cash)
  const ledgerTransactionsToDisplay = ledgerSubTab === 'cash'
    ? combinedExpensesTransactions.filter(t => t.isHandCash)
    : combinedExpensesTransactions;

  const handleEditLedgerItem = (t) => {
    if (t.isWholesalePurchase || t.wholesalePurchaseId) {
      const match = wholesalePurchases.find(p => p._id === t.wholesalePurchaseId || p._id === t._id || (t.wholesalePurchaseId && String(p._id) === String(t.wholesalePurchaseId)));
      if (match) {
        setEditingWholesalePurchase(match);
        setIsWholesaleFormOpen(true);
        return;
      }
    }
    setEditingTransaction(t);
    setIsFormOpen(true);
  };

  const handleDeleteLedgerItem = (t) => {
    if (t.isWholesalePurchase || t.wholesalePurchaseId) {
      const match = wholesalePurchases.find(p => p._id === t.wholesalePurchaseId || p._id === t._id || (t.wholesalePurchaseId && String(p._id) === String(t.wholesalePurchaseId)));
      if (match) {
        handleDeleteTrigger(match, 'wholesale');
        return;
      }
    }
    handleDeleteTrigger(t, 'ledger');
  };

  const filteredLedger = React.useMemo(() => {
    const sorted = [...ledgerTransactionsToDisplay].sort((a, b) => {
      const tA = new Date(a.date || a.createdAt || 0).getTime();
      const tB = new Date(b.date || b.createdAt || 0).getTime();
      return tB - tA;
    });

    return sorted.filter(t => {
      const matchesSearch = (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'All' || t.type === filterType;
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;

      if (!matchesSearch || !matchesType || !matchesCategory) return false;

      const rawDate = t.date || t.createdAt;
      if (!rawDate) return true;

      const dateStr = String(rawDate).split('T')[0];
      const itemDate = new Date(dateStr + 'T12:00:00Z');
      if (isNaN(itemDate.getTime())) return true;

      const now = new Date();
      const todayNoon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));

      if (ledgerDateRange === 'today') {
        return itemDate.getUTCFullYear() === todayNoon.getUTCFullYear() &&
          itemDate.getUTCMonth() === todayNoon.getUTCMonth() &&
          itemDate.getUTCDate() === todayNoon.getUTCDate();
      } else if (ledgerDateRange === 'week') {
        const oneWeekAgo = new Date(todayNoon);
        oneWeekAgo.setUTCDate(todayNoon.getUTCDate() - 7);
        return itemDate >= oneWeekAgo;
      } else if (ledgerDateRange === 'month') {
        const startOfMonth = new Date(Date.UTC(todayNoon.getUTCFullYear(), todayNoon.getUTCMonth(), 1));
        return itemDate >= startOfMonth;
      } else if (ledgerDateRange === 'quarter') {
        const quarterStartMonth = Math.floor(todayNoon.getUTCMonth() / 3) * 3;
        const startOfQuarter = new Date(Date.UTC(todayNoon.getUTCFullYear(), quarterStartMonth, 1));
        return itemDate >= startOfQuarter;
      } else if (ledgerDateRange === 'year') {
        const startOfYear = new Date(Date.UTC(todayNoon.getUTCFullYear(), 0, 1));
        return itemDate >= startOfYear;
      } else if (ledgerDateRange === 'custom') {
        if (ledgerStartDate) {
          const s = new Date(ledgerStartDate + 'T00:00:00Z');
          if (itemDate < s) return false;
        }
        if (ledgerEndDate) {
          const e = new Date(ledgerEndDate + 'T23:59:59Z');
          if (itemDate > e) return false;
        }
        return true;
      }

      return true;
    });
  }, [ledgerTransactionsToDisplay, search, filterType, filterCategory, ledgerDateRange, ledgerStartDate, ledgerEndDate]);

  const isOnline = !errorLedger;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">

      {/* 1. Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            title="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
          <Logo size={24} />
          <span className="font-black text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">Wellmora</span>
          <span className="px-1.5 py-0.5 bg-violet-500/10 dark:bg-violet-950/45 text-[9px] font-bold text-violet-600 dark:text-violet-400 rounded tracking-wide uppercase">
            Enterprise
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={forceHardRefresh}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors active:scale-95"
            title="Clear Cache & Force Refresh Live Data"
          >
            <RefreshCw size={17} className={loadingLedger || loadingBank || loadingPartner ? 'animate-spin text-emerald-500' : 'text-slate-600 dark:text-slate-300'} />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-slate-600" />}
          </button>

          {authUser ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl cursor-pointer transition-colors active:scale-95"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* 2. Responsive Sidebar Panel */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
        authUser={authUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 3. Main Content Scrollable Pane */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">

        {!authUser ? (
          <div className="h-full min-h-[450px] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl space-y-5 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Authentication Required
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                Your business expense and financial ledger data is strictly protected. Please sign in or create an account to view company transactions, bank entries, and financial reports.
              </p>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck size={16} />
              Sign In / Register Account
            </button>
          </div>
        ) : (
          <>
            {/* Render PAGE 0: CENTRAL COMBINED DASHBOARD */}
            {activePage === 'central' && (
              <CentralDashboard
                transactions={transactions}
                bankTransactions={bankTransactions}
                wholesalePurchases={wholesalePurchases}
                onEditLedger={(t) => { setEditingTransaction(t); setIsFormOpen(true); }}
                onDeleteLedger={(t) => handleDeleteTrigger(t, 'ledger')}
                onEditBank={(t) => { setEditingBankTransaction(t); setIsBankFormOpen(true); }}
                onDeleteBank={(t) => handleDeleteTrigger(t, 'bank')}
                onEditWholesale={(p) => { setEditingWholesalePurchase(p); setIsWholesaleFormOpen(true); }}
                onDeleteWholesale={(p) => handleDeleteTrigger(p, 'wholesale')}
                onRefresh={() => refreshAllData(false)}
                loading={loadingLedger || loadingBank || loadingWholesale}
              />
            )}

            {/* Render PAGE: WHOLESALE PURCHASES (Dev & Sneh) */}
            {activePage === 'wholesale' && (
              <div className="animate-slide-up">
                <WholesaleLedger
                  purchases={wholesalePurchases}
                  loading={loadingWholesale}
                  error={errorWholesale}
                  onRefresh={fetchWholesalePurchases}
                  onAddClick={() => { setEditingWholesalePurchase(null); setIsWholesaleFormOpen(true); }}
                  onEditClick={(p) => { setEditingWholesalePurchase(p); setIsWholesaleFormOpen(true); }}
                  onDeleteClick={(p) => handleDeleteTrigger(p, 'wholesale')}
                  onQuickPayClick={(p) => setPayingWholesalePurchase(p)}
                />
              </div>
            )}

            {/* Render PAGE 1: LEDGER */}
            {activePage === 'ledger' && (
              <div className="space-y-5 animate-slide-up">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">Expenses & Cash</h2>
                      <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800" title={isOnline ? "Server Connected" : "Connection Offline"}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-rose-500'}`} />
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                    <button
                      onClick={forceHardRefresh}
                      className="p-2 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-200/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Clear local cache & force refresh live database records"
                    >
                      <RefreshCw size={14} className={loadingLedger ? 'animate-spin' : ''} />
                    </button>

                    <div className="shrink-0">
                      <ExportDropdown onExport={handleLedgerExport} />
                    </div>

                    <button
                      onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-violet-500/20 shadow-lg shadow-violet-500/10 cursor-pointer transition-all duration-200 whitespace-nowrap"
                    >
                      Add Entry
                    </button>
                  </div>
                </div>

                {errorLedger && (
                  <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-3 animate-slide-up">
                    <AlertCircle size={16} className="shrink-0" />
                    <div className="flex-1">{errorLedger}</div>
                    <button onClick={fetchTransactions} className="px-3 py-1 bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer">
                      Retry
                    </button>
                  </div>
                )}

                {/* Sub Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 mb-2">
                  <button
                    onClick={() => setLedgerSubTab('all')}
                    className={`py-2 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                      ledgerSubTab === 'all'
                        ? 'border-violet-600 text-violet-700 dark:text-violet-400'
                        : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    All Transactions
                  </button>
                  <button
                    onClick={() => setLedgerSubTab('cash')}
                    className={`py-2 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      ledgerSubTab === 'cash'
                        ? 'border-violet-600 text-violet-700 dark:text-violet-400'
                        : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>💵</span> In Hand Cash Only
                  </button>
                </div>

                {/* Metrics cards */}
                <Dashboard transactions={filteredLedger} />

                {/* Filter toolbar */}
                <Filters
                  search={search}
                  setSearch={setSearch}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  dateRange={ledgerDateRange}
                  setDateRange={setLedgerDateRange}
                  startDate={ledgerStartDate}
                  setStartDate={setLedgerStartDate}
                  endDate={ledgerEndDate}
                  setEndDate={setLedgerEndDate}
                />

                {/* Table */}
                {loadingLedger ? (
                  <div className="glass-panel rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-3"></div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Loading ledger records...</span>
                  </div>
                ) : (
                  <TransactionTable
                    transactions={filteredLedger}
                    onEdit={handleEditLedgerItem}
                    onDelete={handleDeleteLedgerItem}
                  />
                )}
              </div>
            )}

            {/* Render PAGE 2: BANK */}
            {activePage === 'bank' && (
              <div className="animate-slide-up">
                <BankLedger
                  transactions={bankTransactions}
                  loading={loadingBank}
                  onRefresh={fetchBankTransactions}
                  onAddClick={() => { setEditingBankTransaction(null); setIsBankFormOpen(true); }}
                  onEdit={(t) => { setEditingBankTransaction(t); setIsBankFormOpen(true); }}
                  onDelete={(t) => handleDeleteTrigger(t, 'bank')}
                />
              </div>
            )}

            {/* Render PAGE 3: PARTNER */}
            {activePage === 'partner' && (
              <div className="animate-slide-up">
                <PartnerLedger
                  transactions={partnerTransactions}
                  operatingTransactions={transactions}
                  loading={loadingPartner}
                  onRefresh={fetchPartnerTransactions}
                  onAddClick={() => { setEditingPartnerTransaction(null); setIsPartnerFormOpen(true); }}
                  onEdit={(t) => { setEditingPartnerTransaction(t); setIsPartnerFormOpen(true); }}
                  onDelete={(t) => handleDeleteTrigger(t, 'partner')}
                  onAddPartnerFlow={handlePartnerSubmit}
                />
              </div>
            )}

            {/* Render PAGE 4: SUMMARY */}
            {activePage === 'summary' && (
              <div className="animate-slide-up">
                <FinancialSummary
                  transactions={transactions}
                  bankTransactions={bankTransactions}
                  partnerTransactions={partnerTransactions}
                />
              </div>
            )}


          </>
        )}

      </main>

      {/* ==========================================
          MODALS & DIALOG OVERLAYS
      ========================================== */}
      {/* 1. Standard Ledger Form Modal */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTransaction(null); }}
        onSubmit={handleLedgerSubmit}
        transaction={editingTransaction}
      />

      {/* 2. Bank Ledger Form Modal */}
      <BankForm
        isOpen={isBankFormOpen}
        onClose={() => { setIsBankFormOpen(false); setEditingBankTransaction(null); }}
        onSubmit={handleBankSubmit}
        transaction={editingBankTransaction}
      />

      {/* 3. Partner Ledger Form Modal */}
      <PartnerForm
        isOpen={isPartnerFormOpen}
        onClose={() => { setIsPartnerFormOpen(false); setEditingPartnerTransaction(null); }}
        onSubmit={handlePartnerSubmit}
        transaction={editingPartnerTransaction}
        existingPartners={partnerTransactions.map(p => p.partnerName)}
      />

      {/* 4. Global Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDeleteConfirm}
        transaction={deletingTransaction}
        type={deletingType}
      />

      {/* 5. Wholesale Purchase Form Modal */}
      <WholesaleForm
        isOpen={isWholesaleFormOpen}
        onClose={() => { setIsWholesaleFormOpen(false); setEditingWholesalePurchase(null); }}
        onSubmit={handleWholesaleSubmit}
        purchase={editingWholesalePurchase}
      />

      {/* 6. Wholesale Quick Payment Modal */}
      <WholesalePaymentModal
        isOpen={!!payingWholesalePurchase}
        onClose={() => setPayingWholesalePurchase(null)}
        onRecordPayment={handleWholesalePay}
        purchase={payingWholesalePurchase}
      />



      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Toast Notifications */}
      <Notification
        message={notification?.message}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
