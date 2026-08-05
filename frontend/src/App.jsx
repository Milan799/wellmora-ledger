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
import CustomReportBuilder from './components/CustomReportBuilder';
import OrderEntry from './components/OrderEntry';

import DeleteConfirmation from './components/DeleteConfirmation';
import Notification from './components/Notification';
import ExportDropdown from './components/ExportDropdown';
import AuthModal from './components/AuthModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://wellmora-ledger-1.onrender.com/api';

const safeJsonFetch = async (response) => {
  if (!response) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
};

const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const token = localStorage.getItem('authToken');
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const response = await fetch(url, {
      ...options,
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
    return localStorage.getItem('activePage') || 'central';
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
    triggerNotification(`Welcome back, ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('cached_transactions');
    localStorage.removeItem('cached_bankTransactions');
    localStorage.removeItem('cached_partnerTransactions');
    setAuthUser(null);
    setAuthToken('');
    setTransactions([]);
    setBankTransactions([]);
    setPartnerTransactions([]);
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

  // Delete modal state
  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [deletingType, setDeletingType] = useState('ledger'); // 'ledger' | 'bank' | 'partner'

  // Notifications
  const [notification, setNotification] = useState(null);
  const [ledgerSubTab, setLedgerSubTab] = useState('all'); // 'all' | 'cash'

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch all categories on mount & run real-time auto-sync polling
  useEffect(() => {
    if (authUser && authToken) {
      fetchTransactions();
      fetchBankTransactions();
      fetchPartnerTransactions();
      fetchOrders();

      // Real-time cross-device auto-sync polling (every 15 seconds)
      const syncInterval = setInterval(() => {
        fetchOrders(true); // Silent background refresh without triggering loading spinner
        fetchTransactions();
        fetchBankTransactions();
        fetchPartnerTransactions();
      }, 15000);

      // Multi-tab storage sync listener
      const handleStorageChange = (e) => {
        if (e.key === 'cached_orders' && e.newValue) {
          try {
            setOrders(JSON.parse(e.newValue));
          } catch (err) {}
        }
      };
      window.addEventListener('storage', handleStorageChange);

      return () => {
        clearInterval(syncInterval);
        window.removeEventListener('storage', handleStorageChange);
      };
    } else {
      setTransactions([]);
      setBankTransactions([]);
      setPartnerTransactions([]);
      setOrders([]);
      setIsAuthModalOpen(true);
    }
  }, [authUser, authToken]);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const queueSyncOperation = (action, type, data) => {
    const queue = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
    queue.push({ action, type, data });
    localStorage.setItem('unsynced_ops', JSON.stringify(queue));
  };

  const syncOfflineOperations = async () => {
    const queue = JSON.parse(localStorage.getItem('unsynced_ops') || '[]');
    if (queue.length === 0) return;

    console.log(`🔄 Syncing ${queue.length} offline operations to server...`);
    let failedOps = [];

    for (const op of queue) {
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
          else if (op.type === 'orders') url = `${API_BASE_URL}/orders`;

          const response = await fetchWithTimeout(url, {
            method: 'POST',
            body: JSON.stringify(cleanData)
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const savedItem = await safeJsonFetch(response);
          if (savedItem) {
            if (op.type === 'ledger') {
              setTransactions(prev => prev.map(t => t._id === op.data._id ? savedItem : t));
            } else if (op.type === 'bank') {
              setBankTransactions(prev => prev.map(t => t._id === op.data._id ? savedItem : t));
            } else if (op.type === 'partner') {
              setPartnerTransactions(prev => prev.map(t => t._id === op.data._id ? savedItem : t));
            } else if (op.type === 'orders') {
              setOrders(prev => prev.map(o => o._id === op.data._id ? savedItem : o));
            }
          }
        } else if (op.action === 'EDIT') {
          let url = '';
          if (op.type === 'ledger') url = `${API_BASE_URL}/transactions/${op.data._id}`;
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions/${op.data._id}`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows/${op.data._id}`;
          else if (op.type === 'orders') url = `${API_BASE_URL}/orders/${op.data._id}`;

          if (op.data._id.startsWith('local_')) continue;

          const response = await fetchWithTimeout(url, {
            method: 'PUT',
            body: JSON.stringify(op.data)
          });
          if (!response.ok) throw new Error();
        } else if (op.action === 'DELETE') {
          let url = '';
          if (op.type === 'ledger') url = `${API_BASE_URL}/transactions/${op.data._id}`;
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions/${op.data._id}`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows/${op.data._id}`;
          else if (op.type === 'orders') url = `${API_BASE_URL}/orders/${op.data._id}`;

          if (op.data._id.startsWith('local_')) continue;

          const response = await fetchWithTimeout(url, { method: 'DELETE' });
          if (!response.ok) throw new Error();
        }
      } catch (err) {
        console.error('Failed to sync operation:', op, err);
        failedOps.push(op);
      }
    }

    localStorage.setItem('unsynced_ops', JSON.stringify(failedOps));
    if (failedOps.length === 0) {
      triggerNotification('Offline entries successfully synced to server!', 'success');
      // Quietly reload backend data
      const r1 = await fetchWithTimeout(`${API_BASE_URL}/transactions`).catch(() => null);
      const res1 = r1 ? await safeJsonFetch(r1) : null;
      if (res1) {
        setTransactions(res1);
        localStorage.setItem('cached_transactions', JSON.stringify(res1));
      }
      const r2 = await fetchWithTimeout(`${API_BASE_URL}/bank-transactions`).catch(() => null);
      const res2 = r2 ? await safeJsonFetch(r2) : null;
      if (res2) {
        setBankTransactions(res2);
        localStorage.setItem('cached_bankTransactions', JSON.stringify(res2));
      }
      const r3 = await fetchWithTimeout(`${API_BASE_URL}/partner-flows`).catch(() => null);
      const res3 = r3 ? await safeJsonFetch(r3) : null;
      if (res3) {
        setPartnerTransactions(res3);
        localStorage.setItem('cached_partnerTransactions', JSON.stringify(res3));
      }
    }
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
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await safeJsonFetch(response);
      if (!data) throw new Error('Invalid server response');
      setTransactions(data);
      localStorage.setItem('cached_transactions', JSON.stringify(data));
      syncOfflineOperations();
    } catch (err) {
      console.error(err);
      const cached = localStorage.getItem('cached_transactions');
      if (cached) {
        setTransactions(JSON.parse(cached));
        triggerNotification('Loaded ledger from cache (Offline)', 'info');
      } else {
        setErrorLedger('Backend connection offline.');
        triggerNotification('Ledger connection offline', 'error');
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
          if (!response.ok) throw new Error('Failed to update ledger');
          const updated = await safeJsonFetch(response);
          if (!updated) throw new Error('Invalid server response');
          setTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Ledger entry updated successfully!', 'success');
        } catch (err) {
          console.warn('Network submit failed, queuing offline:', err);
          const updatedLocally = { ...editingTransaction, ...formData, updatedAt: new Date().toISOString() };
          setTransactions(prev => {
            const newL = prev.map(t => t._id === editingTransaction._id ? updatedLocally : t);
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
          queueSyncOperation('EDIT', 'ledger', updatedLocally);
          triggerNotification('Ledger updated locally (Offline)', 'info');
        }
      } else {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to save ledger');
          const saved = await safeJsonFetch(response);
          if (!saved) throw new Error('Invalid server response');
          setTransactions(prev => {
            const newL = [saved, ...prev];
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Ledger entry added successfully!', 'success');
        } catch (err) {
          console.warn('Network submit failed, queuing offline:', err);
          const localNew = { ...formData, _id: `local_${Date.now()}`, date: formData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
          setTransactions(prev => {
            const newL = [localNew, ...prev];
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
          queueSyncOperation('ADD', 'ledger', localNew);
          triggerNotification('Ledger saved locally (Offline)', 'info');
        }
      }
      setIsFormOpen(false);
      setEditingTransaction(null);
    } catch (err) {
      console.error(err);
      triggerNotification(err.message, 'error');
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
      if (!response.ok) throw new Error('Failed to fetch bank transactions');
      const data = await safeJsonFetch(response);
      if (!data) throw new Error('Invalid server response');
      setBankTransactions(data);
      localStorage.setItem('cached_bankTransactions', JSON.stringify(data));
    } catch (err) {
      console.error(err);
      const cached = localStorage.getItem('cached_bankTransactions');
      if (cached) {
        setBankTransactions(JSON.parse(cached));
        triggerNotification('Loaded bank entries from cache (Offline)', 'info');
      } else {
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
          if (!response.ok) throw new Error('Failed to update bank entry');
          const updated = await safeJsonFetch(response);
          if (!updated) throw new Error('Invalid server response');
          setBankTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Bank record updated successfully!', 'success');
        } catch (err) {
          console.warn('Network bank submit failed, queuing offline:', err);
          const updatedLocally = { ...editingBankTransaction, ...formData, updatedAt: new Date().toISOString() };
          setBankTransactions(prev => {
            const newL = prev.map(t => t._id === editingBankTransaction._id ? updatedLocally : t);
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
          queueSyncOperation('EDIT', 'bank', updatedLocally);
          triggerNotification('Bank record updated locally (Offline)', 'info');
        }
      } else {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/bank-transactions`, {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to save bank entry');
          const saved = await safeJsonFetch(response);
          if (!saved) throw new Error('Invalid server response');
          setBankTransactions(prev => {
            const newL = [saved, ...prev];
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Bank record added successfully!', 'success');
        } catch (err) {
          console.warn('Network bank submit failed, queuing offline:', err);
          const localNew = { ...formData, _id: `local_${Date.now()}`, date: formData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
          setBankTransactions(prev => {
            const newL = [localNew, ...prev];
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
          queueSyncOperation('ADD', 'bank', localNew);
          triggerNotification('Bank record saved locally (Offline)', 'info');
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
      console.error(err);
      triggerNotification(err.message, 'error');
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
      if (!response.ok) throw new Error('Failed to fetch partner transactions');
      const data = await safeJsonFetch(response);
      if (!data) throw new Error('Invalid server response');
      setPartnerTransactions(data);
      localStorage.setItem('cached_partnerTransactions', JSON.stringify(data));
    } catch (err) {
      console.error(err);
      const cached = localStorage.getItem('cached_partnerTransactions');
      if (cached) {
        setPartnerTransactions(JSON.parse(cached));
        triggerNotification('Loaded partner capital from cache (Offline)', 'info');
      } else {
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
          if (!response.ok) throw new Error('Failed to update partner entry');
          const updated = await safeJsonFetch(response);
          if (!updated) throw new Error('Invalid server response');
          setPartnerTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Partner flow updated successfully!', 'success');
        } catch (err) {
          console.warn('Network partner submit failed, queuing offline:', err);
          const updatedLocally = { ...editingPartnerTransaction, ...formData, updatedAt: new Date().toISOString() };
          setPartnerTransactions(prev => {
            const newL = prev.map(t => t._id === editingPartnerTransaction._id ? updatedLocally : t);
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
          queueSyncOperation('EDIT', 'partner', updatedLocally);
          triggerNotification('Partner flow updated locally (Offline)', 'info');
        }
      } else {
        try {
          const response = await fetchWithTimeout(`${API_BASE_URL}/partner-flows`, {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to save partner entry');
          const saved = await safeJsonFetch(response);
          if (!saved) throw new Error('Invalid server response');
          setPartnerTransactions(prev => {
            const newL = [saved, ...prev];
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Partner flow added successfully!', 'success');
        } catch (err) {
          console.warn('Network partner submit failed, queuing offline:', err);
          const localNew = { ...formData, _id: `local_${Date.now()}`, date: formData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
          setPartnerTransactions(prev => {
            const newL = [localNew, ...prev];
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
          queueSyncOperation('ADD', 'partner', localNew);
          triggerNotification('Partner flow saved locally (Offline)', 'info');
        }
      }
      setIsPartnerFormOpen(false);
      setEditingPartnerTransaction(null);
    } catch (err) {
      console.error(err);
      triggerNotification(err.message, 'error');
    }
  };

  // ==========================================
  // API Operations: Orders & Settlement
  // ==========================================
  // API Operations: Orders & Settlement (Direct MongoDB Storage)
  // ==========================================
  const fetchOrders = async (isSilent = false) => {
    if (!isSilent) {
      setLoadingOrders(true);
    }
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/orders`);
      if (!response.ok) throw new Error("Failed to retrieve order entries");
      const data = await safeJsonFetch(response);
      if (data && Array.isArray(data)) {
        setOrders(data);
        localStorage.removeItem('cached_orders'); // Clear any legacy cache
      }
    } catch (err) {
      console.warn("Failed to fetch orders from MongoDB:", err);
    } finally {
      if (!isSilent) {
        setLoadingOrders(false);
      }
    }
  };

  const handleSaveOrder = async (orderData) => {
    const isEdit = !!orderData._id && !String(orderData._id).startsWith('local_');
    try {
      const endpoint = isEdit ? `${API_BASE_URL}/orders/${orderData._id}` : `${API_BASE_URL}/orders`;
      const method = isEdit ? 'PUT' : 'POST';
      const response = await fetchWithTimeout(endpoint, {
        method,
        body: JSON.stringify(orderData)
      });
      if (response.ok) {
        triggerNotification("Order entry saved directly to MongoDB!", "success");
        await fetchOrders();
      } else {
        const errorRes = await safeJsonFetch(response);
        triggerNotification(errorRes?.message || "Failed to save order to MongoDB", "error");
      }
    } catch (err) {
      triggerNotification("Error connecting to MongoDB database", "error");
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    try {
      if (orderId && !String(orderId).startsWith('local_')) {
        await fetchWithTimeout(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' }).catch(() => null);
      }
      if (orderNumber && orderNumber.trim()) {
        await fetchWithTimeout(`${API_BASE_URL}/orders/${encodeURIComponent(orderNumber.trim())}`, { method: 'DELETE' }).catch(() => null);
      }
      triggerNotification("Order entry deleted from MongoDB!", "info");
      await fetchOrders();
    } catch (err) {
      triggerNotification("Error deleting order from MongoDB", "error");
    }
  };

  const handleSaveBatchOrders = async (batchList) => {
    if (!Array.isArray(batchList) || batchList.length === 0) return;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/orders/batch`, {
        method: 'POST',
        body: JSON.stringify({ orders: batchList })
      });
      if (response.ok) {
        const resData = await safeJsonFetch(response);
        triggerNotification(`Saved ${resData?.savedCount || batchList.length} orders directly to MongoDB!`, 'success');
        await fetchOrders();
      } else {
        triggerNotification("Failed to save batch orders to MongoDB", "error");
      }
    } catch (err) {
      triggerNotification("Error saving batch orders to MongoDB database", "error");
    }
  };

  const handleSaveBulkSkuOrders = async (bulkData) => {
    const { skuId } = bulkData;
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/orders/bulk-sku`, {
        method: 'PUT',
        body: JSON.stringify(bulkData)
      });
      if (response.ok) {
        triggerNotification(`Updated settlement & costs for SKU ${skuId} in MongoDB!`, 'success');
        await fetchOrders();
      } else {
        triggerNotification("Failed to update SKU orders in MongoDB", "error");
      }
    } catch (err) {
      triggerNotification("Error updating SKU orders in MongoDB database", "error");
    }
  };

  const handleSaveBulkDateFrameOrders = async (bulkDateFrameData) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/orders/bulk-date-frame`, {
        method: 'PUT',
        body: JSON.stringify(bulkDateFrameData)
      });
      if (response.ok) {
        const resData = await safeJsonFetch(response);
        triggerNotification(`Successfully adjusted prices for ${resData?.count || 0} orders in selected Date Frame!`, 'success');
        await fetchOrders();
      } else {
        const errRes = await safeJsonFetch(response);
        triggerNotification(errRes?.message || "Failed to adjust prices for date frame", "error");
      }
    } catch (err) {
      triggerNotification("Error adjusting date frame order prices in MongoDB", "error");
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
        : 'partner-flows';

    try {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/${urlSegment}/${deletingTransaction._id}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to remove entry');

        if (deletingType === 'ledger') {
          setTransactions(prev => {
            const newL = prev.filter(t => t._id !== deletingTransaction._id);
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
        } else if (deletingType === 'bank') {
          setBankTransactions(prev => {
            const newL = prev.filter(t => t._id !== deletingTransaction._id);
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
        } else {
          setPartnerTransactions(prev => {
            const newL = prev.filter(t => t._id !== deletingTransaction._id);
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
        }
        triggerNotification('Record deleted successfully!', 'success');
      } catch (err) {
        console.warn('Network delete failed, deleting locally:', err);
        // Delete locally
        if (deletingType === 'ledger') {
          setTransactions(prev => {
            const newL = prev.filter(t => t._id !== deletingTransaction._id);
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
        } else if (deletingType === 'bank') {
          setBankTransactions(prev => {
            const newL = prev.filter(t => t._id !== deletingTransaction._id);
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
        } else {
          setPartnerTransactions(prev => {
            const newL = prev.filter(t => t._id !== deletingTransaction._id);
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
        }
        queueSyncOperation('DELETE', deletingType, deletingTransaction);
        triggerNotification('Record deleted locally (Offline)', 'info');
      }
      setDeletingTransaction(null);
    } catch (err) {
      console.error(err);
      triggerNotification(err.message, 'error');
    }
  };

  // Filter main ledger locally by sub-tab (all vs hand cash)
  const ledgerTransactionsToDisplay = ledgerSubTab === 'cash'
    ? transactions.filter(t => t.isHandCash)
    : transactions;

  const filteredLedger = ledgerTransactionsToDisplay.filter(t => {
    const matchesSearch = (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || t.type === filterType;
    const matchesCategory = filterCategory === 'All' || t.category === filterCategory;

    if (!matchesSearch || !matchesType || !matchesCategory) return false;

    // Date filtering
    const itemDate = new Date(t.date || t.createdAt);
    if (isNaN(itemDate.getTime())) return true;
    const now = new Date();

    if (ledgerDateRange === 'today') {
      return itemDate.getDate() === now.getDate() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear();
    } else if (ledgerDateRange === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return itemDate >= oneWeekAgo;
    } else if (ledgerDateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth;
    } else if (ledgerDateRange === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      return itemDate >= startOfQuarter;
    } else if (ledgerDateRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return itemDate >= startOfYear;
    } else if (ledgerDateRange === 'custom') {
      if (ledgerStartDate) {
        const s = new Date(ledgerStartDate);
        s.setHours(0, 0, 0, 0);
        if (itemDate < s) return false;
      }
      if (ledgerEndDate) {
        const e = new Date(ledgerEndDate);
        e.setHours(23, 59, 59, 999);
        if (itemDate > e) return false;
      }
      return true;
    }

    return true;
  });

  const isOnline = !errorLedger;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">

      {/* 1. Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer mr-0.5"
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
                partnerTransactions={partnerTransactions}
                onEditLedger={(t) => { setEditingTransaction(t); setIsFormOpen(true); }}
                onDeleteLedger={(t) => handleDeleteTrigger(t, 'ledger')}
                onEditBank={(t) => { setEditingBankTransaction(t); setIsBankFormOpen(true); }}
                onDeleteBank={(t) => handleDeleteTrigger(t, 'bank')}
                onEditPartner={(t) => { setEditingPartnerTransaction(t); setIsPartnerFormOpen(true); }}
                onDeletePartner={(t) => handleDeleteTrigger(t, 'partner')}
              />
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
                      onClick={fetchTransactions}
                      className="p-2 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-200/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Refresh ledger"
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
                    onEdit={(t) => { setEditingTransaction(t); setIsFormOpen(true); }}
                    onDelete={(t) => handleDeleteTrigger(t, 'ledger')}
                  />
                )}
              </div>
            )}

            {/* Render PAGE: ORDER ENTRY & SETTLEMENT */}
            {activePage === 'orders' && (
              <OrderEntry
                orders={orders}
                loading={loadingOrders}
                onRefresh={fetchOrders}
                onSaveOrder={handleSaveOrder}
                onSaveBatchOrders={handleSaveBatchOrders}
                onDeleteOrder={handleDeleteOrder}
                onSaveBulkSku={handleSaveBulkSkuOrders}
                onSaveBulkDateFrame={handleSaveBulkDateFrameOrders}
              />
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

            {/* Render PAGE 5: CUSTOM FINANCIAL REPORT BUILDER */}
            {activePage === 'report_builder' && (
              <div className="animate-slide-up">
                <CustomReportBuilder
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
      />

      {/* 4. Global Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDeleteConfirm}
        transaction={deletingTransaction}
        type={deletingType}
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
