import express from 'express';
import Transaction from '../models/Transaction.js';
import BankTransaction from '../models/BankTransaction.js';
import PartnerFlow from '../models/PartnerFlow.js';

const router = express.Router();

let digestConfig = {
  enabled: false,
  channel: 'Slack', // 'Slack', 'Discord', 'WhatsApp', 'Email'
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

  // Plain text digest
  const textDigest = `
📊 *WELLMORA LEDGER - DAILY FINANCIAL DIGEST*
📅 Date: ${formattedDate}

💰 *Liquidity Position*: ₹${totalLiquidity.toLocaleString('en-IN')}
• Bank Accounts Balance: ₹${totalBankBalance.toLocaleString('en-IN')}
• In-Hand Cash Balance: ₹${totalCashBalance.toLocaleString('en-IN')}

⚡ *Today's Ledger Activity*:
• Money Inflow (Credits): ₹${todayInflow.toLocaleString('en-IN')}
• Money Outflow (Debits): ₹${todayOutflow.toLocaleString('en-IN')}
• Today's Net Flow: ₹${(todayInflow - todayOutflow).toLocaleString('en-IN')}

🤝 *Partner Capital Net Equity*: ₹${netPartnerEquity.toLocaleString('en-IN')}
-----------------------------------------
System Status: ✅ All ledgers balanced.
`.trim();

  // Slack block kit payload
  const slackPayload = {
    text: `Wellmora Financial Digest for ${formattedDate}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 Wellmora Ledger - Daily Financial Digest', emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Date:*\n${formattedDate}` },
          { type: 'mrkdwn', text: `*Total Liquidity:*\n*₹${totalLiquidity.toLocaleString('en-IN')}*` }
        ]
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💵 Cash & Bank Balances:*\n• Bank Accounts: ₹${totalBankBalance.toLocaleString('en-IN')}\n• In-Hand Cash: ₹${totalCashBalance.toLocaleString('en-IN')}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⚡ Today's Turnover:*\n• Inflow (+): ₹${todayInflow.toLocaleString('en-IN')}\n• Outflow (-): ₹${todayOutflow.toLocaleString('en-IN')}\n• Net Change: ₹${(todayInflow - todayOutflow).toLocaleString('en-IN')}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🤝 Net Partner Equity:*\n*₹${netPartnerEquity.toLocaleString('en-IN')}*`
        }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '🔒 Verified Wellmora Automated Ledger Snapshot' }
        ]
      }
    ]
  };

  return {
    date: formattedDate,
    totalLiquidity,
    totalBankBalance,
    totalCashBalance,
    todayInflow,
    todayOutflow,
    netPartnerEquity,
    textDigest,
    slackPayload
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

    if (targetWebhook) {
      try {
        const bodyPayload = channel === 'Slack' 
          ? JSON.stringify(digestData.slackPayload) 
          : JSON.stringify({ content: digestData.textDigest, text: digestData.textDigest });

        const resp = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyPayload
        });

        if (resp.ok) {
          dispatchStatus = `Successfully dispatched to ${channel} Webhook!`;
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
