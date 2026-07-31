import React, { useState, useEffect } from 'react';
import { X, Database, Download, Upload, RefreshCw, Check, AlertCircle, Cloud, ShieldCheck } from 'lucide-react';

export default function BackupManagerModal({ isOpen, onClose }) {
  const [backups, setBackups] = useState([]);
  const [settings, setSettings] = useState({ schedule: 'daily', cloudWebhookUrl: '', autoCloudUpload: false });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const token = localStorage.getItem('token');

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
    setStatusMsg('');
    try {
      const resp = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setStatusMsg(`✅ Backup snapshot created successfully: ${data.filename}`);
        fetchBackups();
      } else {
        setStatusMsg('❌ Failed to create backup');
      }
    } catch (err) {
      setStatusMsg('❌ Error: ' + err.message);
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

    if (!confirm('⚠️ WARNING: Restoring a backup will replace your current database entries. Are you sure you want to proceed?')) {
      return;
    }

    setRestoring(true);
    setStatusMsg('Reading backup snapshot payload...');

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
        setStatusMsg(`✅ ${data.message}`);
        alert('Database restored successfully! Reloading application data...');
        window.location.reload();
      } else {
        const errData = await resp.json();
        setStatusMsg(`❌ Restore failed: ${errData.message}`);
      }
    } catch (err) {
      setStatusMsg(`❌ Invalid JSON file or restore failed: ${err.message}`);
    } finally {
      setRestoring(false);
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
        setStatusMsg('✅ Cloud backup settings updated!');
      }
    } catch (err) {
      setStatusMsg('❌ Failed to save settings');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-2xl w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Automated Cloud & Local Backup Sync</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Manage system snapshots, cloud webhooks, and database restoration.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {statusMsg && (
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300">
              {statusMsg}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 block">Instant Safety Snapshot</span>
              <span className="text-[10px] text-slate-400">Capture a full JSON backup of all ledger tables immediately.</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors">
                <Upload size={14} /> Restore File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUploadAndRestore}
                  className="hidden"
                />
              </label>

              <button
                disabled={creating}
                onClick={handleCreateBackup}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <RefreshCw size={14} className={creating ? 'animate-spin' : ''} />
                {creating ? 'Creating Snapshot...' : 'Create Backup Now'}
              </button>
            </div>
          </div>

          {/* Cloud Settings Box */}
          <div className="p-4 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 rounded-xl border border-violet-500/20 space-y-3">
            <h4 className="text-xs font-black uppercase text-violet-600 dark:text-violet-400 tracking-wider flex items-center gap-1.5">
              <Cloud size={14} /> Cloud Storage Sync Settings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Auto-Backup Frequency</label>
                <select
                  value={settings.schedule}
                  onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="daily">Daily at Midnight (00:00)</option>
                  <option value="weekly">Weekly</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cloud Webhook Target URL (S3 / Drive / Webhook)</label>
                <input
                  type="text"
                  value={settings.cloudWebhookUrl}
                  onChange={(e) => setSettings({ ...settings, cloudWebhookUrl: e.target.value })}
                  placeholder="https://api.mycloud.com/backup-webhook"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.autoCloudUpload}
                  onChange={(e) => setSettings({ ...settings, autoCloudUpload: e.target.checked })}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                Automatically POST backups to Cloud Webhook URL
              </label>

              <button
                onClick={handleSaveSettings}
                className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] rounded-lg cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>

          {/* Backup History Table */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2.5">
              Available Snapshot Files ({backups.length})
            </h4>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading backup history...</div>
            ) : backups.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">No backup files recorded yet. Click "Create Backup Now" above.</div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2.5 px-4">Filename</th>
                      <th className="py-2.5 px-4">Created At</th>
                      <th className="py-2.5 px-4">File Size</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                    {backups.map(b => (
                      <tr key={b.filename} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="py-2.5 px-4 font-mono font-bold text-violet-600 dark:text-violet-400 text-[11px]">{b.filename}</td>
                        <td className="py-2.5 px-4 text-slate-500">{new Date(b.createdAt).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300">{formatSize(b.sizeBytes)}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDownload(b.filename)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Download size={12} /> Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
