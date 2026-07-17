import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Users2, 
  Wallet, 
  BarChart3
} from 'lucide-react';

export default function FinancialSummary({ transactions = [], bankTransactions = [], partnerTransactions = [] }) {
  
  // 1. General Ledger & In Hand Cash Calculations
  const ledgerInflow = transactions
    .filter(t => t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const ledgerOutflow = transactions
    .filter(t => t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const ledgerNet = ledgerInflow - ledgerOutflow;

  const inHandCashInflow = transactions
    .filter(t => t.isHandCash && t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const inHandCashOutflow = transactions
    .filter(t => t.isHandCash && t.type === 'Debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const inHandCashNet = inHandCashInflow - inHandCashOutflow;

  // 2. Bank Transactions Calculations
  const bankDeposits = bankTransactions
    .filter(t => t.type === 'Deposit' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const bankWithdrawals = bankTransactions
    .filter(t => t.type === 'Withdrawal' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const bankNet = bankDeposits - bankWithdrawals;

  // Group by Bank Account Name/Number
  const bankAccountsMap = {};
  bankTransactions.forEach(t => {
    if (t.status !== 'Completed') return;
    const key = `${t.bankName} (A/C: ${t.accountNumber || 'N/A'})`;
    if (!bankAccountsMap[key]) {
      bankAccountsMap[key] = { bankName: t.bankName, accountNumber: t.accountNumber, deposits: 0, withdrawals: 0 };
    }
    if (t.type === 'Deposit') {
      bankAccountsMap[key].deposits += t.amount;
    } else {
      bankAccountsMap[key].withdrawals += t.amount;
    }
  });

  const bankAccountsList = Object.keys(bankAccountsMap).map(key => ({
    name: key,
    net: bankAccountsMap[key].deposits - bankAccountsMap[key].withdrawals,
    deposits: bankAccountsMap[key].deposits,
    withdrawals: bankAccountsMap[key].withdrawals
  }));

  // 3. Partner Money Flow Calculations
  const partnerContribution = partnerTransactions
    .filter(t => t.type === 'Capital Contribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerWithdrawal = partnerTransactions
    .filter(t => t.type === 'Profit Withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerNet = partnerContribution - partnerWithdrawal;

  // Predefined partners list
  const partners = ['Milan Javiya', 'Krushang Prajapati', 'Umang Prajapati', 'Moksh Shah'];
  
  const partnerBreakdown = partners.map(name => {
    const flows = partnerTransactions.filter(t => t.partnerName === name);
    const contributions = flows
      .filter(t => t.type === 'Capital Contribution')
      .reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = flows
      .filter(t => t.type === 'Profit Withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      name,
      contributions,
      withdrawals,
      net: contributions - withdrawals
    };
  });

  // 4. Combined calculations
  const totalCombinedInflows = ledgerInflow + bankDeposits + partnerContribution;
  const totalCombinedOutflows = ledgerOutflow + bankWithdrawals + partnerWithdrawal;
  const totalNetLiquidAssets = inHandCashNet + bankNet;

  // 5. Category-wise Spending (Ledger Debits)
  const categoryTotals = {};
  transactions
    .filter(t => t.type === 'Debit')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const totalExpense = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const categoriesList = Object.keys(categoryTotals).map(cat => ({
    category: cat,
    amount: categoryTotals[cat],
    percentage: totalExpense > 0 ? (categoryTotals[cat] / totalExpense) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-8 animate-slide-up">
      {/* Page Title Header */}
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
          <BarChart3 className="text-violet-600 dark:text-violet-400" size={20} />
          Financial Calculations Center
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
          Consolidated real-time balance sheets, equity holdings, and cash distributions.
        </p>
      </div>

      {/* Combined Positions Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 glow-violet relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-violet-650/10 to-indigo-650/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Combined Cash Assets</span>
            <span className="px-2 py-0.5 bg-violet-500/10 dark:bg-violet-950/45 text-[9px] font-bold text-violet-600 dark:text-violet-400 rounded-md tracking-wide uppercase border border-violet-500/10">
              Liquid Cash Position
            </span>
          </div>
          <div className="my-4 z-10">
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${totalNetLiquidAssets >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
              {formatCurrency(totalNetLiquidAssets)}
            </h1>
            <p className="text-slate-450 dark:text-slate-400 text-[10.5px] mt-1 font-medium">
              Sum of In-Hand Cash Ledger Balance ({formatCurrency(inHandCashNet)}) + Bank Accounts Balance ({formatCurrency(bankNet)}).
            </p>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider border-t border-slate-200/50 dark:border-slate-800/50 pt-3 z-10">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Cash: {formatCurrency(inHandCashNet)}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Bank: {formatCurrency(bankNet)}</span>
          </div>
        </div>

        {/* Combined Turnover Statistics */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Total Combined Turnovers</span>
          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400"><TrendingUp size={14} /></div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-450">Inflows</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCombinedInflows)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-450"><TrendingDown size={14} /></div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-450">Outflows</span>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalCombinedOutflows)}</span>
            </div>
          </div>
          <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5 mt-2.5 text-[9px] font-medium text-slate-400 dark:text-slate-500 italic text-center">
            Includes all Ledgers, Bank and Partner activities.
          </div>
        </div>
      </div>

      {/* Segment Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
        {/* Ledger */}
        <div className="glass-panel rounded-xl p-4.5 glow-indigo relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[9.5px] tracking-wider uppercase">Operating Ledger</span>
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400"><Wallet size={14} /></div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">{formatCurrency(ledgerNet)}</h3>
          <div className="flex items-center justify-between mt-2.5 text-[9.5px] font-semibold text-slate-500 dark:text-slate-450">
            <span>Inflows: {formatCurrency(ledgerInflow)}</span>
            <span>Outflows: {formatCurrency(ledgerOutflow)}</span>
          </div>
        </div>

        {/* Bank */}
        <div className="glass-panel rounded-xl p-4.5 glow-green relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[9.5px] tracking-wider uppercase">Bank Assets</span>
            <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-600 dark:text-sky-400"><Building2 size={14} /></div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">{formatCurrency(bankNet)}</h3>
          <div className="flex items-center justify-between mt-2.5 text-[9.5px] font-semibold text-slate-500 dark:text-slate-450">
            <span>Deposits: {formatCurrency(bankDeposits)}</span>
            <span>Withdrawals: {formatCurrency(bankWithdrawals)}</span>
          </div>
        </div>

        {/* Partner Flow */}
        <div className="glass-panel rounded-xl p-4.5 glow-rose relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[9.5px] tracking-wider uppercase">Partner Capital</span>
            <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-600 dark:text-violet-400"><Users2 size={14} /></div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">{formatCurrency(partnerNet)}</h3>
          <div className="flex items-center justify-between mt-2.5 text-[9.5px] font-semibold text-slate-500 dark:text-slate-450">
            <span>Contributions: {formatCurrency(partnerContribution)}</span>
            <span>Withdrawn: {formatCurrency(partnerWithdrawal)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Balances Sheet */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
              <Users2 size={15} className="text-violet-600 dark:text-violet-400" />
              Partner Capital Accounts
            </h3>
            <span className="text-[9px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded border border-violet-500/10">Equity</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                  <th className="py-2">Partner</th>
                  <th className="py-2 text-right">Contributed</th>
                  <th className="py-2 text-right">Withdrawn</th>
                  <th className="py-2 text-right">Net Equity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-medium text-slate-750 dark:text-slate-300">
                {partnerBreakdown.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-450">{formatCurrency(row.contributions)}</td>
                    <td className="py-2.5 text-right text-rose-500 dark:text-rose-450">{formatCurrency(row.withdrawals)}</td>
                    <td className={`py-2.5 text-right font-black ${row.net >= 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-450'}`}>
                      {formatCurrency(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bank Accounts Balance Sheet */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
              <Building2 size={15} className="text-sky-600 dark:text-sky-400" />
              Bank Account Positions
            </h3>
            <span className="text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded border border-sky-500/10">Cash at Bank</span>
          </div>
          {bankAccountsList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic">No completed bank transactions available to aggregate.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                    <th className="py-2">Account</th>
                    <th className="py-2 text-right">Deposited</th>
                    <th className="py-2 text-right">Withdrawn</th>
                    <th className="py-2 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-medium text-slate-750 dark:text-slate-300">
                  {bankAccountsList.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-450">{formatCurrency(row.deposits)}</td>
                      <td className="py-2.5 text-right text-slate-500 dark:text-slate-400">{formatCurrency(row.withdrawals)}</td>
                      <td className={`py-2.5 text-right font-black ${row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {formatCurrency(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Category Expenses Distribution */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
            <BarChart3 size={15} className="text-emerald-600 dark:text-emerald-400" />
            Operating Expense Categories Distribution
          </h3>
          <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/10">Expenses</span>
        </div>
        {categoriesList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic">No debit/expense items recorded in the ledger.</div>
        ) : (
          <div className="space-y-4">
            {categoriesList.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.category}</span>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-150 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${item.percentage}%` }} 
                    className="h-full bg-gradient-to-r from-violet-650 to-indigo-500 rounded-full transition-all duration-1000 ease-out" 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
