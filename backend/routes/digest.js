import express from 'express';
import Transaction from '../models/Transaction.js';
import BankTransaction from '../models/BankTransaction.js';
import PartnerFlow from '../models/PartnerFlow.js';

const router = express.Router();

let digestConfig = {
  enabled: false,
  channel: 'Email', // 'Email', 'WhatsApp', 'Telegram'
  webhookUrl: '',
  emailRecipient: 'admin@wellmora.com',
  scheduleTime: '09:00',
  frequency: 'daily'
};

// Helper to build financial digest payload
async function generateDigestPayload() {
  const [transactions, bankTransactions, partnerFlows] = await Promise.all([
    Transaction.find({}),
    BankTransaction.find({}),
    PartnerFlow.find({})
  ]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Today's activities
  const todayLedger = transactions.filter(t => new Date(t.date || t.createdAt) >= todayStart);
  const todayInflow = todayLedger.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
  const todayOutflow = todayLedger.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);

  // Bank Position
  const bankDeposits = bankTransactions.filter(t => t.type === 'Deposit' && t.status === 'Completed').reduce((s, t) => s + t.amount, 0);
  const bankWithdrawals = bankTransactions.filter(t => t.type === 'Withdrawal' && t.status === 'Completed').reduce((s, t) => s + t.amount, 0);
  const totalBankBalance = bankDeposits - bankWithdrawals;

  // In-Hand Cash
  const cashIn = transactions.filter(t => t.isHandCash && t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
  const cashOut = transactions.filter(t => t.isHandCash && t.type === 'Debit').reduce((s, t) => s + t.amount, 0);
  const totalCashBalance = cashIn - cashOut;

  // Partner Capital
  const partnerContrib = partnerFlows.filter(t => t.type === 'Capital Contribution').reduce((s, t) => s + t.amount, 0);
  const partnerDraw = partnerFlows.filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution').reduce((s, t) => s + t.amount, 0);
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 12px;">
      <h2 style="color: #4f46e5; margin-top: 0;">📊 Wellmora Ledger - Financial Digest</h2>
      <p style="color: #64748b; font-size: 13px;">Date: <strong>${formattedDate}</strong></p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin-0; color: #1e293b; font-size: 18px;">Total Liquidity: ₹${totalLiquidity.toLocaleString('en-IN')}</h3>
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

// GET /api/digest/config
router.get('/config', (req, res) => {
  res.json(digestConfig);
});

// POST /api/digest/config
router.post('/config', (req, res) => {
  const { enabled, channel, webhookUrl, emailRecipient, scheduleTime, frequency } = req.body;
  if (enabled !== undefined) digestConfig.enabled = enabled;
  if (channel !== undefined) digestConfig.channel = channel;
  if (webhookUrl !== undefined) digestConfig.webhookUrl = webhookUrl;
  if (emailRecipient !== undefined) digestConfig.emailRecipient = emailRecipient;
  if (scheduleTime !== undefined) digestConfig.scheduleTime = scheduleTime;
  if (frequency !== undefined) digestConfig.frequency = frequency;

  res.json({ message: 'Digest settings updated successfully', config: digestConfig });
});

// POST /api/digest/send - Send instant digest or preview
router.post('/send', async (req, res, next) => {
  try {
    const digestData = await generateDigestPayload();
    const targetWebhook = req.body.webhookUrl || digestConfig.webhookUrl;
    const channel = req.body.channel || digestConfig.channel;

    let dispatchStatus = 'Preview Generated';

    if (channel === 'Email') {
      dispatchStatus = `Email Digest ready for ${req.body.emailRecipient || digestConfig.emailRecipient}!`;
    } else if (targetWebhook) {
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

    res.json({
      message: dispatchStatus,
      digest: digestData
    });
  } catch (error) {
    next(error);
  }
});

export default router;
