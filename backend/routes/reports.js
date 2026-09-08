import express from 'express';
import Transaction from '../models/Transaction.js';
import BankTransaction from '../models/BankTransaction.js';
import PartnerFlow from '../models/PartnerFlow.js';

const router = express.Router();

// Helper to filter items by date range
function filterByDate(items, startDate, endDate) {
  if (!startDate && !endDate) return items;
  const start = startDate ? new Date(startDate) : new Date(0);
  if (startDate) start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  if (endDate) end.setHours(23, 59, 59, 999);

  return items.filter(item => {
    const d = new Date(item.date || item.createdAt);
    return d >= start && d <= end;
  });
}

// Compute financial metric breakdown for a given list of data
function computeStatementMetrics(transactions, bankTransactions, partnerFlows) {
  // Operating Ledger (Exclude internal cash-in transfers from business revenue)
  const isInternalTransfer = (cat) => {
    const c = String(cat || '').toLowerCase().trim();
    return c === 'atm cash withdrawal' || c === 'cash transfer' || c === 'internal transfer' || c === 'transfer';
  };

  const isPurchase = (cat) => {
    const c = String(cat || '').toLowerCase().trim();
    return c === 'purchase' || c === 'stock' || c === 'purchases' || c === 'raw materials';
  };

  const revenue = transactions
    .filter(t => t.type === 'Credit' && !isInternalTransfer(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const purchases = transactions
    .filter(t => t.type === 'Debit' && isPurchase(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const operatingExpenses = transactions
    .filter(t => t.type === 'Debit' && !isPurchase(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = purchases + operatingExpenses;
  const grossProfit = revenue - purchases;
  const netIncome = revenue - totalExpenses;

  // Cash In Hand
  const inHandCashInflow = transactions
    .filter(t => t.isHandCash && t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const inHandCashOutflow = transactions
    .filter(t => t.isHandCash && t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const inHandCashNet = inHandCashInflow - inHandCashOutflow;

  // Bank Balances (Includes both standard Withdrawal and ATM Withdrawal)
  const bankDeposits = bankTransactions
    .filter(t => t.type === 'Deposit' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const bankWithdrawals = bankTransactions
    .filter(t => (t.type === 'Withdrawal' || t.type === 'ATM Withdrawal') && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const bankNet = bankDeposits - bankWithdrawals;

  // Total Liquid Assets
  const totalAssets = inHandCashNet + bankNet;

  // Partner Equity
  const partnerContributions = partnerFlows
    .filter(t => t.type === 'Capital Contribution')
    .reduce((sum, t) => sum + t.amount, 0);
  const partnerDrawings = partnerFlows
    .filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution')
    .reduce((sum, t) => sum + t.amount, 0);
  const netPartnerEquity = partnerContributions - partnerDrawings;

  // Cash Flow Items (Operating Cash Flow + Financing Cash Flow)
  const operatingCashFlow = revenue - totalExpenses;
  const financingCashFlow = partnerContributions - partnerDrawings;
  const netCashFlow = operatingCashFlow + financingCashFlow;

  return {
    pnl: {
      revenue,
      purchases,
      grossProfit,
      operatingExpenses,
      totalExpenses,
      netIncome
    },
    balanceSheet: {
      assets: {
        inHandCash: inHandCashNet,
        bankBalance: bankNet,
        totalAssets
      },
      liabilities: {
        totalLiabilities: 0
      },
      equity: {
        partnerCapital: partnerContributions,
        partnerDrawings,
        netPartnerEquity,
        retainedEarnings: netIncome,
        totalEquity: netPartnerEquity + netIncome
      }
    },
    cashFlow: {
      operatingCashFlow,
      financingCashFlow,
      bankNet,
      netCashFlow
    }
  };
}

// GET /api/reports/financial-statements
router.get('/financial-statements', async (req, res, next) => {
  try {
    const { startDate, endDate, compareStartDate, compareEndDate } = req.query;

    const [allTransactions, allBankTransactions, allPartnerFlows] = await Promise.all([
      Transaction.find({}),
      BankTransaction.find({}),
      PartnerFlow.find({})
    ]);

    const period1Trans = filterByDate(allTransactions, startDate, endDate);
    const period1Bank = filterByDate(allBankTransactions, startDate, endDate);
    const period1Partner = filterByDate(allPartnerFlows, startDate, endDate);

    const primaryMetrics = computeStatementMetrics(period1Trans, period1Bank, period1Partner);

    let comparisonMetrics = null;
    let variance = null;

    if (compareStartDate || compareEndDate) {
      const period2Trans = filterByDate(allTransactions, compareStartDate, compareEndDate);
      const period2Bank = filterByDate(allBankTransactions, compareStartDate, compareEndDate);
      const period2Partner = filterByDate(allPartnerFlows, compareStartDate, compareEndDate);

      comparisonMetrics = computeStatementMetrics(period2Trans, period2Bank, period2Partner);

      const calcVar = (val1, val2) => {
        const diff = val1 - val2;
        const pct = val2 !== 0 ? ((diff / Math.abs(val2)) * 100).toFixed(1) : (val1 > 0 ? 100 : 0);
        return { diff, pct: Number(pct) };
      };

      variance = {
        pnl: {
          revenue: calcVar(primaryMetrics.pnl.revenue, comparisonMetrics.pnl.revenue),
          totalExpenses: calcVar(primaryMetrics.pnl.totalExpenses, comparisonMetrics.pnl.totalExpenses),
          netIncome: calcVar(primaryMetrics.pnl.netIncome, comparisonMetrics.pnl.netIncome)
        },
        balanceSheet: {
          totalAssets: calcVar(primaryMetrics.balanceSheet.assets.totalAssets, comparisonMetrics.balanceSheet.assets.totalAssets),
          totalEquity: calcVar(primaryMetrics.balanceSheet.equity.totalEquity, comparisonMetrics.balanceSheet.equity.totalEquity)
        },
        cashFlow: {
          netCashFlow: calcVar(primaryMetrics.cashFlow.netCashFlow, comparisonMetrics.cashFlow.netCashFlow)
        }
      };
    }

    res.json({
      primary: primaryMetrics,
      comparison: comparisonMetrics,
      variance,
      dates: {
        primary: { startDate, endDate },
        comparison: { compareStartDate, compareEndDate }
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/partner-dividends - Calculate & allocate partner dividends
router.post('/partner-dividends', async (req, res, next) => {
  try {
    const { netProfit, equityPercentages, periodName } = req.body;
    const profitVal = parseFloat(netProfit) || 0;

    // Discover partner names dynamically from database or custom input
    let partners = [];
    if (equityPercentages && typeof equityPercentages === 'object') {
      partners = Object.keys(equityPercentages);
    } else {
      const dbPartners = await PartnerFlow.distinct('partnerName');
      partners = dbPartners.length > 0 
        ? dbPartners 
        : ['Milan Javiya', 'Krushang Prajapati', 'Umang Prajapati', 'Moksh Shah'];
    }

    const defaultEqualPct = partners.length > 0 ? (100 / partners.length) : 0;
    const eqMap = equityPercentages || {};

    const distributions = partners.map(name => {
      const pct = eqMap[name] !== undefined ? parseFloat(eqMap[name]) : defaultEqualPct;
      const amount = (profitVal * pct) / 100;
      return {
        partnerName: name,
        equityPct: Number(pct.toFixed(2)),
        dividendAmount: Number(amount.toFixed(2))
      };
    });

    res.json({
      netProfit: profitVal,
      periodName: periodName || 'Custom Fiscal Period',
      distributions
    });
  } catch (error) {
    next(error);
  }
});

export default router;
