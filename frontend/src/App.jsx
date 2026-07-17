import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Menu } from 'lucide-react';

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

import DeleteConfirmation from './components/DeleteConfirmation';
import Notification from './components/Notification';
import ExportDropdown from './components/ExportDropdown';

const API_BASE_URL = 'https://wellmora-ledger-1.onrender.com/api';

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('activePage') || 'ledger';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer state

  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

  // 1. Ledger State
  const [transactions, setTransactions] = useState(() => {
    const cached = localStorage.getItem('cached_transactions');
    return cached ? JSON.parse(cached) : [];
  });
  const [loadingLedger, setLoadingLedger] = useState(() => {
    return !localStorage.getItem('cached_transactions');
  });
  const [errorLedger, setErrorLedger] = useState(null);

  // 2. Bank State
  const [bankTransactions, setBankTransactions] = useState(() => {
    const cached = localStorage.getItem('cached_bankTransactions');
    return cached ? JSON.parse(cached) : [];
  });
  const [loadingBank, setLoadingBank] = useState(() => {
    return !localStorage.getItem('cached_bankTransactions');
  });

  // 3. Partner State
  const [partnerTransactions, setPartnerTransactions] = useState(() => {
    const cached = localStorage.getItem('cached_partnerTransactions');
    return cached ? JSON.parse(cached) : [];
  });
  const [loadingPartner, setLoadingPartner] = useState(() => {
    return !localStorage.getItem('cached_partnerTransactions');
  });

  // General Search / Filter for main ledger
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

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

  // Fetch all categories on mount
  useEffect(() => {
    fetchTransactions();
    fetchBankTransactions();
    fetchPartnerTransactions();
  }, []);

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
          if (op.type === 'ledger') url = `${API_BASE_URL}/transactions`;
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows`;

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanData)
          });
          if (!response.ok) throw new Error();

          const savedItem = await response.json();
          if (op.type === 'ledger') {
            setTransactions(prev => prev.map(t => t._id === op.data._id ? savedItem : t));
          } else if (op.type === 'bank') {
            setBankTransactions(prev => prev.map(t => t._id === op.data._id ? savedItem : t));
          } else if (op.type === 'partner') {
            setPartnerTransactions(prev => prev.map(t => t._id === op.data._id ? savedItem : t));
          }
        } else if (op.action === 'EDIT') {
          let url = '';
          if (op.type === 'ledger') url = `${API_BASE_URL}/transactions/${op.data._id}`;
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions/${op.data._id}`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows/${op.data._id}`;

          if (op.data._id.startsWith('local_')) continue;

          const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.data)
          });
          if (!response.ok) throw new Error();
        } else if (op.action === 'DELETE') {
          let url = '';
          if (op.type === 'ledger') url = `${API_BASE_URL}/transactions/${op.data._id}`;
          else if (op.type === 'bank') url = `${API_BASE_URL}/bank-transactions/${op.data._id}`;
          else if (op.type === 'partner') url = `${API_BASE_URL}/partner-flows/${op.data._id}`;

          if (op.data._id.startsWith('local_')) continue;

          const response = await fetch(url, { method: 'DELETE' });
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
      const res1 = await fetch(`${API_BASE_URL}/transactions`).then(r => r.json()).catch(() => null);
      if (res1) {
        setTransactions(res1);
        localStorage.setItem('cached_transactions', JSON.stringify(res1));
      }
      const res2 = await fetch(`${API_BASE_URL}/bank-transactions`).then(r => r.json()).catch(() => null);
      if (res2) {
        setBankTransactions(res2);
        localStorage.setItem('cached_bankTransactions', JSON.stringify(res2));
      }
      const res3 = await fetch(`${API_BASE_URL}/partner-flows`).then(r => r.json()).catch(() => null);
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
      const response = await fetch(`${API_BASE_URL}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
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
          const response = await fetch(`${API_BASE_URL}/transactions/${editingTransaction._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to update ledger');
          const updated = await response.json();
          setTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Ledger entry updated successfully!', 'success');
        } catch {
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
          const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to save ledger');
          const saved = await response.json();
          setTransactions(prev => {
            const newL = [saved, ...prev];
            localStorage.setItem('cached_transactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Ledger entry added successfully!', 'success');
        } catch {
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
    let toExport = [...filteredLedger];
    const now = new Date();

    if (range === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      toExport = filteredLedger.filter(t => new Date(t.date) >= startOfMonth);
    } else if (range === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
      toExport = filteredLedger.filter(t => new Date(t.date) >= startOfQuarter);
    } else if (range === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      toExport = filteredLedger.filter(t => new Date(t.date) >= startOfYear);
    } else if (range === 'custom') {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      toExport = filteredLedger.filter(t => {
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
      const response = await fetch(`${API_BASE_URL}/bank-transactions`);
      if (!response.ok) throw new Error('Failed to fetch bank transactions');
      const data = await response.json();
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
          const response = await fetch(`${API_BASE_URL}/bank-transactions/${editingBankTransaction._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to update bank entry');
          const updated = await response.json();
          setBankTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Bank record updated successfully!', 'success');
        } catch {
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
          const response = await fetch(`${API_BASE_URL}/bank-transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to save bank entry');
          const saved = await response.json();
          setBankTransactions(prev => {
            const newL = [saved, ...prev];
            localStorage.setItem('cached_bankTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Bank record added successfully!', 'success');
        } catch {
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
      const response = await fetch(`${API_BASE_URL}/partner-flows`);
      if (!response.ok) throw new Error('Failed to fetch partner transactions');
      const data = await response.json();
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
          const response = await fetch(`${API_BASE_URL}/partner-flows/${editingPartnerTransaction._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to update partner entry');
          const updated = await response.json();
          setPartnerTransactions(prev => {
            const newL = prev.map(t => t._id === updated._id ? updated : t);
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Partner flow updated successfully!', 'success');
        } catch {
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
          const response = await fetch(`${API_BASE_URL}/partner-flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error('Failed to save partner entry');
          const saved = await response.json();
          setPartnerTransactions(prev => {
            const newL = [saved, ...prev];
            localStorage.setItem('cached_partnerTransactions', JSON.stringify(newL));
            return newL;
          });
          triggerNotification('Partner flow added successfully!', 'success');
        } catch {
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
        const response = await fetch(`${API_BASE_URL}/${urlSegment}/${deletingTransaction._id}`, {
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
      } catch {
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
    const matchesSearch = (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || t.type === filterType;
    const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const isOnline = !errorLedger;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">

      {/* 1. Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-1.5">
            <Logo size={14} />
            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">Wellmora</span>
            <span className="px-1.5 py-0.5 bg-violet-500/10 dark:bg-violet-950/45 text-[9px] font-bold text-violet-600 dark:text-violet-400 rounded tracking-wide uppercase">
              Enterprise
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl" title={isOnline ? "Server Connected" : "Connection Offline"}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-rose-500'}`} />
          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* 2. Responsive Sidebar Panel */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 3. Main Content Scrollable Pane */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">

        {/* Render PAGE 1: LEDGER */}
        {activePage === 'ledger' && (
          <div className="space-y-5 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">Ledger & Expenses</h2>
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800" title={isOnline ? "Server Connected" : "Connection Offline"}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-rose-500'}`} />
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
                  Track company operating credits, purchases, logistics, and office expenses.
                </p>
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
            <Dashboard transactions={ledgerTransactionsToDisplay} />

            {/* Filter toolbar */}
            <Filters
              search={search}
              setSearch={setSearch}
              filterType={filterType}
              setFilterType={setFilterType}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
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
              loading={loadingPartner}
              onRefresh={fetchPartnerTransactions}
              onAddClick={() => { setEditingPartnerTransaction(null); setIsPartnerFormOpen(true); }}
              onEdit={(t) => { setEditingPartnerTransaction(t); setIsPartnerFormOpen(true); }}
              onDelete={(t) => handleDeleteTrigger(t, 'partner')}
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

      {/* Toast Notifications */}
      <Notification
        message={notification?.message}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
