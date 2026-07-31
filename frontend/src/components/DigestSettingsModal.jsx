import React, { useState, useEffect } from 'react';
import { X, Bell, Send, Check, AlertCircle, MessageSquare, Mail, Smartphone } from 'lucide-react';

const SlackIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="13" y="2" width="3" height="8" rx="1.5"/>
    <path d="M19 8.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/>
    <rect x="8" y="14" width="3" height="8" rx="1.5"/>
    <path d="M5 15.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3"/>
    <rect x="2" y="8" width="8" height="3" rx="1.5"/>
    <path d="M8.5 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
    <rect x="14" y="13" width="8" height="3" rx="1.5"/>
    <path d="M15.5 19a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0"/>
  </svg>
);

export default function DigestSettingsModal({ isOpen, onClose }) {
  const [config, setConfig] = useState({
    enabled: false,
    channel: 'Slack',
    webhookUrl: '',
    emailRecipient: 'admin@wellmora.com',
    scheduleTime: '09:00',
    frequency: 'daily'
  });

  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const token = localStorage.getItem('token');

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
        setTestResult('✅ Digest notification settings saved successfully!');
      }
    } catch (err) {
      setTestResult('❌ Failed to save digest settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setTestResult('');
    try {
      const resp = await fetch('/api/digest/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          channel: config.channel
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setTestResult(`✅ ${data.message}`);
        setPreviewData(data.digest);
      } else {
        setTestResult('❌ Failed to dispatch digest');
      }
    } catch (err) {
      setTestResult(`❌ Error: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-2xl w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Slack / WhatsApp / Email Daily Digest</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Configure automated daily financial summary reports to your team's chat channels.</p>
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

          {testResult && (
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300">
              {testResult}
            </div>
          )}

          {/* Toggle Enable */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 block">Automated Daily Financial Digest</span>
              <span className="text-[10px] text-slate-400">Send automatic summary cards every morning at 09:00 AM.</span>
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

          {/* Channel Choice */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Notification Channel
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'Slack', label: 'Slack Webhook', icon: SlackIcon },
                { id: 'Discord', label: 'Discord Webhook', icon: MessageSquare },
                { id: 'WhatsApp', label: 'WhatsApp Bot', icon: Smartphone },
                { id: 'Email', label: 'Email Digest', icon: Mail }
              ].map(ch => {
                const IconComp = ch.icon;
                const isSelected = config.channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setConfig({ ...config, channel: ch.id })}
                    className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-extrabold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:border-slate-300'
                    }`}
                  >
                    <IconComp size={18} />
                    <span className="text-xs">{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inputs based on channel */}
          <div className="space-y-3">
            {config.channel === 'Email' ? (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  value={config.emailRecipient}
                  onChange={(e) => setConfig({ ...config, emailRecipient: e.target.value })}
                  placeholder="admin@wellmora.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {config.channel} Incoming Webhook URL / Endpoint
                </label>
                <input
                  type="text"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  placeholder={`https://hooks.${config.channel.toLowerCase()}.com/services/...`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Live Preview Card */}
          <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1">
                <Bell size={12} /> Live Digest Payload Preview ({config.channel})
              </span>
              <button
                onClick={handleSendTest}
                disabled={sendingTest}
                className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Send size={11} /> {sendingTest ? 'Sending...' : 'Send Test Digest Now'}
              </button>
            </div>

            <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {previewData ? previewData.textDigest : `📊 WELLMORA LEDGER - DAILY FINANCIAL DIGEST
📅 Date: ${new Date().toLocaleDateString('en-IN')}

💰 Liquidity Position: ₹15,40,000
• Bank Accounts Balance: ₹12,00,000
• In-Hand Cash Balance: ₹3,40,000

⚡ Today's Ledger Activity:
• Money Inflow (Credits): ₹2,50,000
• Money Outflow (Debits): ₹80,000
• Today's Net Flow: +₹1,70,000

🤝 Partner Capital Net Equity: ₹25,00,000
-----------------------------------------
System Status: ✅ All ledgers balanced.`}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Close
          </button>

          <button
            disabled={loading}
            onClick={handleSaveConfig}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

      </div>
    </div>
  );
}
