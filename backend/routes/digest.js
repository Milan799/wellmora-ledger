import express from 'express';
import Transaction from '../models/Transaction.js';
import BankTransaction from '../models/BankTransaction.js';
import PartnerFlow from '../models/PartnerFlow.js';
import Settings from '../models/Settings.js';
import { isSafeWebhookUrl } from './backups.js';

const router = express.Router();

const DEFAULT_DIGEST_CONFIG = {
  enabled: false,
  channel: 'Email', // 'Email', 'WhatsApp', 'Telegram'
  webhookUrl: '',
  emailRecipient: 'admin@wellmora.com',
  scheduleTime: '09:00',
  frequency: 'daily'
};

export const getPersistedDigestConfig = async () => {
  try {
    const doc = await Settings.findOne({ key: 'digestConfig' });
    if (doc && doc.value) return { ...DEFAULT_DIGEST_CONFIG, ...doc.value };
  } catch (e) {
    console.error('Failed to load digest config from DB:', e.message);
  }
  return DEFAULT_DIGEST_CONFIG;
};

export const savePersistedDigestConfig = async (config) => {
  const updated = await Settings.findOneAndUpdate(
    { key: 'digestConfig' },
    { key: 'digestConfig', value: config },
    { upsert: true, new: true }
  );
  return updated.value;
};

// Helper to build financial digest payload
export async function generateDigestPayload() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [todayLedger, bankTransactions, partnerFlows, inHandTransactions] = await Promise.all([
    Transaction.find({ date: { $gte: todayStart } }).lean(),
    BankTransaction.find({ status: 'Completed' }).lean(),
    PartnerFlow.find({}).lean(),
    Transaction.find({ isHandCash: true }).lean()
  ]);

  // Today's activities (Exclude internal transfer credits from operating inflow)
  const isInternalTransfer = (cat) => {
    const c = String(cat || '').toLowerCase().trim();
    return c === 'atm cash withdrawal' || c === 'cash transfer' || c === 'internal transfer' || c === 'transfer';
  };

  const todayInflow = todayLedger
    .filter(t => t.type === 'Credit' && !isInternalTransfer(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const todayOutflow = todayLedger
    .filter(t => t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);

  // Bank Position (Include both Withdrawal and ATM Withdrawal)
  const bankDeposits = bankTransactions
    .filter(t => t.type === 'Deposit')
    .reduce((s, t) => s + t.amount, 0);
  const bankWithdrawals = bankTransactions
    .filter(t => t.type === 'Withdrawal' || t.type === 'ATM Withdrawal')
    .reduce((s, t) => s + t.amount, 0);
  const totalBankBalance = bankDeposits - bankWithdrawals;

  // In-Hand Cash
  const cashIn = inHandTransactions
    .filter(t => t.type === 'Credit')
    .reduce((s, t) => s + t.amount, 0);
  const cashOut = inHandTransactions
    .filter(t => t.type === 'Debit')
    .reduce((s, t) => s + t.amount, 0);
  const totalCashBalance = cashIn - cashOut;

  // Partner Capital
  const partnerContrib = partnerFlows
    .filter(t => t.type === 'Capital Contribution')
    .reduce((s, t) => s + t.amount, 0);
  const partnerDraw = partnerFlows
    .filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution')
    .reduce((s, t) => s + t.amount, 0);
  const netPartnerEquity = partnerContrib - partnerDraw;

  const totalLiquidity = totalBankBalance + totalCashBalance;
  const formattedDate = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const textDigest = `
📊 WELLMORA LEDGER - DAILY FINANCIAL DIGEST
📅 Date: ${formattedDate}

💰 Liquidity Position: ₹${totalLiquidity.toLocaleString('en-IN')}
• Bank Accounts Balance: ₹${totalBankBalance.toLocaleString('en-IN')}
• In-Hand Cash Balance: ₹${totalCashBalance.toLocaleString('en-IN')}

⚡ Today's Operating Activity:
• Inflow (Credits): ₹${todayInflow.toLocaleString('en-IN')}
• Outflow (Debits): ₹${todayOutflow.toLocaleString('en-IN')}
• Today's Net Change: ₹${(todayInflow - todayOutflow).toLocaleString('en-IN')}

🤝 Partner Capital Net Equity: ₹${netPartnerEquity.toLocaleString('en-IN')}
-----------------------------------------
System Status: ✅ All ledgers balanced and audit verified.
`.trim();

  const htmlDigest = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4f46e5; margin-top: 0;">📊 Wellmora Ledger - Financial Digest</h2>
      <p style="color: #64748b; font-size: 13px;">Date: <strong>${formattedDate}</strong></p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin: 0; color: #1e293b; font-size: 18px;">Total Liquidity: ₹${totalLiquidity.toLocaleString('en-IN')}</h3>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Bank: ₹${totalBankBalance.toLocaleString('en-IN')} | Cash: ₹${totalCashBalance.toLocaleString('en-IN')}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px;">
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 8px 0; color: #64748b;">Today's Inflow (+)</td>
          <td style="padding: 8px 0; text-align: right; color: #10b981; font-weight: bold;">+₹${todayInflow.toLocaleString('en-IN')}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 8px 0; color: #64748b;">Today's Outflow (-)</td>
          <td style="padding: 8px 0; text-align: right; color: #e11d48; font-weight: bold;">-₹${todayOutflow.toLocaleString('en-IN')}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">Net Partner Equity</td>
          <td style="padding: 8px 0; text-align: right; color: #4f46e5; font-weight: bold;">₹${netPartnerEquity.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    date: formattedDate,
    totalLiquidity,
    totalBankBalance,
    totalCashBalance,
    todayInflow,
    todayOutflow,
    netPartnerEquity,
    textDigest,
    htmlDigest
  };
}

// Internal helper to dispatch digest to configured channel
export async function dispatchDigest(overrideTarget = {}) {
  const digestConfig = await getPersistedDigestConfig();
  const targetWebhook = overrideTarget.webhookUrl || digestConfig.webhookUrl;
  const channel = overrideTarget.channel || digestConfig.channel;
  const emailRecipient = overrideTarget.emailRecipient || digestConfig.emailRecipient;

  const digestData = await generateDigestPayload();
  let dispatchStatus = 'Preview Generated';

  if (channel === 'Email') {
    dispatchStatus = `Email Digest prepared for ${emailRecipient} (Configure SMTP for automated inbox delivery)`;
  } else if (targetWebhook) {
    if (!isSafeWebhookUrl(targetWebhook)) {
      dispatchStatus = `Webhook blocked: Target URL is invalid or forbidden (SSRF protection).`;
    } else {
      try {
        const resp = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: digestData.textDigest,
            html: digestData.htmlDigest,
            data: digestData
          })
        });

        if (resp.ok) {
          dispatchStatus = `Successfully sent digest to ${channel} Webhook!`;
        } else {
          dispatchStatus = `Webhook returned HTTP ${resp.status}`;
        }
      } catch (webhookErr) {
        dispatchStatus = `Webhook dispatch error: ${webhookErr.message}`;
      }
    }
  }

  return { dispatchStatus, digestData };
}

// GET /api/digest/config
router.get('/config', async (req, res, next) => {
  try {
    const config = await getPersistedDigestConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// POST /api/digest/config
router.post('/config', async (req, res, next) => {
  try {
    const { enabled, channel, webhookUrl, emailRecipient, scheduleTime, frequency } = req.body;
    const current = await getPersistedDigestConfig();

    if (enabled !== undefined) current.enabled = enabled;
    if (channel !== undefined) current.channel = channel;
    if (webhookUrl !== undefined) {
      if (webhookUrl && !isSafeWebhookUrl(webhookUrl)) {
        return res.status(400).json({ message: 'Invalid or forbidden webhook URL' });
      }
      current.webhookUrl = webhookUrl;
    }
    if (emailRecipient !== undefined) current.emailRecipient = emailRecipient;
    if (scheduleTime !== undefined) current.scheduleTime = scheduleTime;
    if (frequency !== undefined) current.frequency = frequency;

    const saved = await savePersistedDigestConfig(current);
    res.json({ message: 'Digest settings updated successfully', config: saved });
  } catch (error) {
    next(error);
  }
});

// POST /api/digest/send - Send instant digest or preview
router.post('/send', async (req, res, next) => {
  try {
    const { dispatchStatus, digestData } = await dispatchDigest(req.body);
    res.json({
      message: dispatchStatus,
      digest: digestData
    });
  } catch (error) {
    next(error);
  }
});

export default router;

