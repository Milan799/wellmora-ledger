import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Cloud, 
  ShieldCheck, 
  HardDrive, 
  Calendar, 
  Search, 
  CheckCircle2, 
  Sparkles,
  Zap
} from 'lucide-react';

export default function BackupManagerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('files'); // 'files', 'cloud', 'restore'
  const [backups, setBackups] = useState([]);
  const [settings, setSettings] = useState({ schedule: 'daily', cloudWebhookUrl: '', autoCloudUpload: false });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testingCloud, setTestingCloud] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const token = localStorage.getItem('authToken') || localStorage.getItem('token');

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/backups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setBackups(data.backups || []);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    setCreating(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const resp = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setStatusMsg({ type: 'success', text: `Backup snapshot created: ${data.filename}` });
        fetchBackups();
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to create backup snapshot.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (filename) => {
    window.open(`/api/backups/download/${encodeURIComponent(filename)}`, '_blank');
  };

  const handleFileUploadAndRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('⚠️ CRITICAL SAFETY WARNING: Restoring a backup snapshot will overwrite your current ledger database. Proceed with restoration?')) {
      return;
    }

    setStatusMsg({ type: 'info', text: 'Reading snapshot payload and replacing database collections...' });

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      const resp = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ backupPayload: payload })
      });

      if (resp.ok) {
        const data = await resp.json();
        setStatusMsg({ type: 'success', text: data.message });
        setTimeout(() => {
          alert('Database restored successfully! Reloading application...');
          window.location.reload();
        }, 1000);
      } else {
        const errData = await resp.json();
        setStatusMsg({ type: 'error', text: `Restore failed: ${errData.message}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Invalid JSON format: ${err.message}` });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const resp = await fetch('/api/backups/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (resp.ok) {
        setStatusMsg({ type: 'success', text: 'Cloud sync & backup schedule saved successfully!' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  const handleTestCloudWebhook = async () => {
    if (!settings.cloudWebhookUrl) {
      setStatusMsg({ type: 'error', text: 'Please enter a Cloud Webhook URL before testing.' });
      return;
    }
    setTestingCloud(true);
    try {
      const resp = await fetch(settings.cloudWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test_connection', timestamp: new Date().toISOString() })
      });
      if (resp.ok) {
        setStatusMsg({ type: 'success', text: 'Cloud Webhook endpoint returned 200 OK! Connection verified.' });
      } else {
        setStatusMsg({ type: 'error', text: `Cloud Webhook returned status HTTP ${resp.status}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Webhook test failed: ${err.message}` });
    } finally {
      setTestingCloud(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSizeBytes = backups.reduce((sum, b) => sum + (b.sizeBytes || 0), 0);
  const filteredBackups = backups.filter(b => b.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-3xl w-full max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
              <Database size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                  Database & Cloud Backup Center
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                  <ShieldCheck size={11} /> Auto-Protected
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
                Automated local JSON snapshots, cloud webhooks, and database restoration.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Dashboard Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Snapshots</span>
              <span className="text-lg font-black text-violet-600 dark:text-violet-400">{backups.length} Files</span>
            </div>
            <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400">
              <HardDrive size={18} />
            </div>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Storage Used</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatSize(totalSizeBytes)}</span>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Database size={18} />
            </div>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">Backup Policy</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">30-Day Auto Prune</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            {[
              { id: 'files', label: 'Local Snapshots', icon: HardDrive },
              { id: 'cloud', label: 'Cloud Webhook Sync', icon: Cloud },
              { id: 'restore', label: 'Restore Database', icon: Upload }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-4 text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <button
            disabled={creating}
            onClick={handleCreateBackup}
            className="mb-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-violet-500/20 active:scale-95 cursor-pointer transition-all"
          >
            <RefreshCw size={13} className={creating ? 'animate-spin' : ''} />
            {creating ? 'Creating Snapshot...' : 'Take Instant Snapshot'}
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMsg.text && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
              : statusMsg.type === 'error'
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                : 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20'
          }`}>
            {statusMsg.type === 'success' && <CheckCircle2 size={16} className="shrink-0" />}
            {statusMsg.type === 'error' && <AlertCircle size={16} className="shrink-0" />}
            {statusMsg.type === 'info' && <Sparkles size={16} className="shrink-0" />}
            <span className="flex-1">{statusMsg.text}</span>
          </div>
        )}

        {/* Tab 1: Local Snapshot Files */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search backup JSON files by date or filename..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <button
                  onClick={fetchBackups}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh List
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 font-semibold flex flex-col items-center">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  Fetching backup files...
                </div>
              ) : filteredBackups.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <HardDrive size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No backup files match your search.</p>
                  <p className="text-[11px] text-slate-400">Click "Take Instant Snapshot" above to create your first backup.</p>
                </div>
              ) : (
                <div className="border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-200/80 dark:border-slate-800/80">
                        <th className="py-3 px-4">Snapshot Filename</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 font-medium">
                      {filteredBackups.map(b => (
                        <tr key={b.filename} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-violet-600 dark:text-violet-400 text-[11.5px]">
                            {b.filename}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-semibold">
                            {new Date(b.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-extrabold text-slate-700 dark:text-slate-300">
                            {formatSize(b.sizeBytes)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDownload(b.filename)}
                              className="px-3 py-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/20 rounded-xl font-extrabold text-[10px] flex items-center gap-1.5 ml-auto cursor-pointer transition-all active:scale-95"
                            >
                              <Download size={12} /> JSON Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Cloud Webhook Auto-Sync */}
          {activeTab === 'cloud' && (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 rounded-2xl border border-violet-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-violet-600 text-white">
                      <Cloud size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider">
                        Automated Cloud Webhook Sync
                      </h4>
                      <p className="text-[10px] text-slate-500">Automatically POST database backups to AWS S3, Google Drive, or custom webhook URLs.</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoCloudUpload}
                      onChange={(e) => setSettings({ ...settings, autoCloudUpload: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Cloud Endpoint Webhook URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={settings.cloudWebhookUrl}
                        onChange={(e) => setSettings({ ...settings, cloudWebhookUrl: e.target.value })}
                        placeholder="https://api.yourcloud.com/v1/ledger-backups"
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                      />
                      <button
                        disabled={testingCloud}
                        onClick={handleTestCloudWebhook}
                        className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Zap size={13} className={testingCloud ? 'animate-spin' : ''} />
                        {testingCloud ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Auto Snapshot Schedule
                    </label>
                    <select
                      value={settings.schedule}
                      onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                    >
                      <option value="daily">Daily Midnight Snapshot (00:00 AM)</option>
                      <option value="weekly">Weekly Sunday Snapshot</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Save Cloud Sync Configuration
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Restore Database Snapshot */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-violet-500/30 rounded-2xl bg-violet-500/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center mx-auto shadow-lg">
                  <Upload size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Upload JSON Snapshot to Restore Database</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto mt-1 font-medium">
                    Select a previously exported Wellmora Ledger JSON backup file to overwrite current database collections.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all">
                  <Upload size={15} /> Browse Backup JSON File
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUploadAndRestore}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-300 text-xs space-y-1">
                <span className="font-extrabold block uppercase tracking-wider text-[10px]">Safety Notice</span>
                <p className="font-medium">
                  Restoring replaces all current transactions, bank ledger entries, and partner equity flows with the content of the backup file. Always take an instant snapshot before restoring.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-500" /> Wellmora System Integrity Active
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}
