import express from 'express';
import Transaction from '../models/Transaction.js';
import BankTransaction from '../models/BankTransaction.js';
import PartnerFlow from '../models/PartnerFlow.js';

const router = express.Router();

// Helper to filter items by date range (strictly between start and end date)
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

// Helper to filter items cumulatively up to as-of end date (for Balance Sheet point-in-time snapshot)
function filterCumulative(items, endDate) {
  if (!endDate) return items;
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return items.filter(item => {
    const d = new Date(item.date || item.createdAt);
    return d <= end;
  });
}

// Compute financial metric breakdown for a given list of data
function computeStatementMetrics(periodTrans, cumulativeTrans, cumulativeBank, cumulativePartner) {
  const isInternalTransfer = (cat) => {
    const c = String(cat || '').toLowerCase().trim();
    return c === 'atm cash withdrawal' || c === 'cash transfer' || c === 'internal transfer' || c === 'transfer';
  };

  const isPurchase = (cat) => {
    const c = String(cat || '').toLowerCase().trim();
    return c === 'purchase' || c === 'stock' || c === 'purchases' || c === 'raw materials' || c === 'wholesale purchase' || c.includes('wholesale');
  };

  // 1. Profit & Loss Metrics (Calculated for the specified fiscal period)
  const revenue = periodTrans
    .filter(t => t.type === 'Credit' && !isInternalTransfer(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const purchases = periodTrans
    .filter(t => t.type === 'Debit' && isPurchase(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const operatingExpenses = periodTrans
    .filter(t => t.type === 'Debit' && !isPurchase(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = purchases + operatingExpenses;
  const grossProfit = revenue - purchases;
  const netIncome = revenue - totalExpenses;

  // 2. Balance Sheet Metrics (Cumulative snapshot as of statement end date)
  const inHandCashInflow = cumulativeTrans
    .filter(t => t.isHandCash && t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const inHandCashOutflow = cumulativeTrans
    .filter(t => t.isHandCash && t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const inHandCashNet = inHandCashInflow - inHandCashOutflow;

  // Bank Balances (Includes both standard Withdrawal and ATM Withdrawal)
  const bankDeposits = cumulativeBank
    .filter(t => t.type === 'Deposit' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const bankWithdrawals = cumulativeBank
    .filter(t => (t.type === 'Withdrawal' || t.type === 'ATM Withdrawal') && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const bankNet = bankDeposits - bankWithdrawals;

  // Total Liquid Assets as of date
  const totalAssets = inHandCashNet + bankNet;

  // Cumulative Partner Equity as of date
  const partnerContributions = cumulativePartner
    .filter(t => t.type === 'Capital Contribution')
    .reduce((sum, t) => sum + t.amount, 0);
  const partnerDrawings = cumulativePartner
    .filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution')
    .reduce((sum, t) => sum + t.amount, 0);
  const netPartnerEquity = partnerContributions - partnerDrawings;

  // Cumulative retained earnings
  const cumulativeRevenue = cumulativeTrans
    .filter(t => t.type === 'Credit' && !isInternalTransfer(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const cumulativeExpenses = cumulativeTrans
    .filter(t => t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const cumulativeRetainedEarnings = cumulativeRevenue - cumulativeExpenses;

  // Cash Flow for active period
  const operatingCashFlow = revenue - totalExpenses;
  const periodPartnerContrib = periodTrans
    .filter(t => t.type === 'Credit' && t.category === 'Capital Contribution')
    .reduce((sum, t) => sum + t.amount, 0);
  const periodFinancingCashFlow = partnerContributions - partnerDrawings;
  const netCashFlow = operatingCashFlow + periodFinancingCashFlow;

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
        retainedEarnings: cumulativeRetainedEarnings,
        totalEquity: netPartnerEquity + cumulativeRetainedEarnings
      }
    },
    cashFlow: {
      operatingCashFlow,
      financingCashFlow: periodFinancingCashFlow,
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
      Transaction.find({}).lean(),
      BankTransaction.find({}).lean(),
      PartnerFlow.find({}).lean()
    ]);

    const period1Trans = filterByDate(allTransactions, startDate, endDate);
    const cum1Trans = filterCumulative(allTransactions, endDate);
    const cum1Bank = filterCumulative(allBankTransactions, endDate);
    const cum1Partner = filterCumulative(allPartnerFlows, endDate);

    const primaryMetrics = computeStatementMetrics(period1Trans, cum1Trans, cum1Bank, cum1Partner);

    let comparisonMetrics = null;
    let variance = null;

    if (compareStartDate || compareEndDate) {
      const period2Trans = filterByDate(allTransactions, compareStartDate, compareEndDate);
      const cum2Trans = filterCumulative(allTransactions, compareEndDate);
      const cum2Bank = filterCumulative(allBankTransactions, compareEndDate);
      const cum2Partner = filterCumulative(allPartnerFlows, compareEndDate);

      comparisonMetrics = computeStatementMetrics(period2Trans, cum2Trans, cum2Bank, cum2Partner);

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
