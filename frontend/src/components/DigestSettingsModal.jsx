import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Send, 
  Check, 
  AlertCircle, 
  Mail, 
  Smartphone, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  SendHorizontal
} from 'lucide-react';

export default function DigestSettingsModal({ isOpen, onClose }) {
  const [config, setConfig] = useState({
    enabled: false,
    channel: 'Email', // 'Email', 'WhatsApp', 'Telegram'
    webhookUrl: '',
    emailRecipient: 'admin@wellmora.com',
    scheduleTime: '09:00',
    frequency: 'daily'
  });

  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState({ type: '', text: '' });
  const [previewData, setPreviewData] = useState(null);

  const token = localStorage.getItem('authToken') || localStorage.getItem('token');

  const fetchConfig = async () => {
    try {
      const resp = await fetch('/api/digest/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch digest config:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async () => {
    setLoading(true);
    setTestResult({ type: '', text: '' });
    try {
      const resp = await fetch('/api/digest/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (resp.ok) {
        setTestResult({ type: 'success', text: 'Digest settings saved successfully!' });
      }
    } catch (err) {
      setTestResult({ type: 'error', text: 'Failed to save digest settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setTestResult({ type: '', text: '' });
    try {
      const resp = await fetch('/api/digest/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          emailRecipient: config.emailRecipient,
          channel: config.channel
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setTestResult({ type: 'success', text: data.message });
        setPreviewData(data.digest);
      } else {
        setTestResult({ type: 'error', text: 'Failed to dispatch digest payload.' });
      }
    } catch (err) {
      setTestResult({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setSendingTest(false);
    }
  };

  const samplePreviewText = `📊 WELLMORA LEDGER - DAILY FINANCIAL DIGEST
📅 Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}

💰 Liquidity Position: ₹15,40,000.00
• Bank Accounts Balance: ₹12,00,000.00
• In-Hand Cash Balance: ₹3,40,000.00

⚡ Today's Operating Activity:
• Inflow (Credits): ₹2,50,000.00
• Outflow (Debits): ₹80,000.00
• Today's Net Change: +₹1,70,000.00

🤝 Partner Capital Net Equity: ₹25,00,000.00
-----------------------------------------
System Status: ✅ All ledgers balanced and audit verified.`;

  const handleCopyPreview = () => {
    const textToCopy = previewData ? previewData.textDigest : samplePreviewText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-2xl w-full max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
              <Bell size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                Email & Instant Digest Alerts
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
                Automated daily financial snapshots delivered to email or WhatsApp/Telegram bots.
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Test Status Banner */}
          {testResult.text && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
              testResult.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
            }`}>
              {testResult.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
              <span className="flex-1">{testResult.text}</span>
            </div>
          )}

          {/* Toggle Active Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 block">
                Automated Daily Financial Digest
              </span>
              <span className="text-[11px] text-slate-500 block">
                Automatically generate and send a daily summary report every morning.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          {/* Channel Choice (Email / WhatsApp / Telegram) */}
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Notification Destination Channel
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'Email', label: 'Email Report', icon: Mail, desc: 'HTML & Text email digest' },
                { id: 'WhatsApp', label: 'WhatsApp Bot', icon: Smartphone, desc: 'WhatsApp Webhook payload' },
                { id: 'Telegram', label: 'Telegram Bot', icon: SendHorizontal, desc: 'Telegram Bot API webhook' }
              ].map(ch => {
                const IconComp = ch.icon;
                const isSelected = config.channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setConfig({ ...config, channel: ch.id })}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-600 bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-md ring-1 ring-violet-500/30'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        <IconComp size={16} />
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-violet-600 dark:text-violet-400" />}
                    </div>
                    <div>
                      <span className="text-xs font-black block text-slate-900 dark:text-slate-100">{ch.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{ch.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Configuration Fields */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 text-xs">
            {config.channel === 'Email' ? (
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={config.emailRecipient}
                  onChange={(e) => setConfig({ ...config, emailRecipient: e.target.value })}
                  placeholder="admin@wellmora.com"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {config.channel} Webhook / Bot API URL
                </label>
                <input
                  type="text"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  placeholder={`https://api.${config.channel.toLowerCase()}.com/webhook/send`}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Schedule Time</label>
                <div className="relative">
                  <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    value={config.scheduleTime}
                    onChange={(e) => setConfig({ ...config, scheduleTime: e.target.value })}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Dispatch Frequency</label>
                <select
                  value={config.frequency}
                  onChange={(e) => setConfig({ ...config, frequency: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="daily">Daily Every Morning</option>
                  <option value="weekly">Weekly Summary</option>
                  <option value="monthly">Monthly Summary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Live Payload Preview Box */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                <Sparkles size={13} /> Live Digest Payload Preview
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPreview}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>

                <button
                  disabled={sendingTest}
                  onClick={handleSendTest}
                  className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Send size={11} className={sendingTest ? 'animate-spin' : ''} />
                  {sendingTest ? 'Sending...' : 'Send Live Test'}
                </button>
              </div>
            </div>

            <pre className="text-[11px] font-mono text-emerald-400 bg-slate-900/80 p-3.5 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
              {previewData ? previewData.textDigest : samplePreviewText}
            </pre>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleSaveConfig}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}
