import React, { useState, useRef } from 'react';
import { X, Download, Printer, ShieldCheck, Landmark, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PartnerCapitalStatement({ isOpen, onClose, partnerTransactions = [], initialPartnerName = 'Milan Javiya' }) {
  const [selectedPartner, setSelectedPartner] = useState(initialPartnerName);
  const [dateRange, setDateRange] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const statementRef = useRef(null);

  const partners = ['Milan Javiya', 'Krushang Prajapati', 'Umang Prajapati', 'Moksh Shah'];

  if (!isOpen) return null;

  const partnerFlows = partnerTransactions.filter(t => t.partnerName === selectedPartner);

  const totalContributions = partnerFlows
    .filter(t => t.type === 'Capital Contribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDrawings = partnerFlows
    .filter(t => t.type === 'Profit Withdrawal' || t.type === 'Share Distribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const netEquity = totalContributions - totalDrawings;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (d) => {
    return new Date(d || Date.now()).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // PDF Exporter
  const handleDownloadPDF = async () => {
    if (!statementRef.current) return;
    setIsExporting(true);
    try {
      const element = statementRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Capital_Statement_${selectedPartner.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. You can also use the Print button.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-4xl w-full max-h-[92vh] flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Modal Toolbar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500">Partner:</label>
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-extrabold focus:ring-2 focus:ring-violet-500"
            >
              {partners.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer size={14} /> Print
            </button>

            <button
              disabled={isExporting}
              onClick={handleDownloadPDF}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Download size={14} />
              {isExporting ? 'Generating PDF...' : 'Download PDF Statement'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg ml-2"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Statement Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100 dark:bg-slate-950">
          <div 
            ref={statementRef} 
            className="max-w-3xl mx-auto bg-white text-slate-900 p-8 md:p-10 rounded-xl shadow-lg border border-slate-200 space-y-6"
          >
            {/* Header Letterhead */}
            <div className="flex items-start justify-between border-b-2 border-violet-600 pb-5">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-violet-900">WELLMORA ENTERPRISE</h1>
                <p className="text-xs font-semibold text-slate-500">Business Expense & Partner Ledger System</p>
                <p className="text-[10px] text-slate-400 mt-1">Official Partner Capital & Equity Position Statement</p>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[10px] font-bold">
                  <ShieldCheck size={12} /> Audit Verified
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">Doc ID: STMT-{Date.now().toString().slice(-6)}</p>
                <p className="text-[10px] text-slate-500">Generated: {formatDate(new Date())}</p>
              </div>
            </div>

            {/* Partner Details Banner */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partner Full Name</span>
                <span className="text-base font-black text-slate-900">{selectedPartner}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statement Period</span>
                <span className="text-xs font-bold text-slate-800">All Historical Flows to Date</span>
              </div>
            </div>

            {/* Capital Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 block">Total Capital Contributed</span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">{formatCurrency(totalContributions)}</span>
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-800 block">Total Drawings & Dividends</span>
                <span className="text-lg font-black text-rose-700 mt-1 block">{formatCurrency(totalDrawings)}</span>
              </div>

              <div className="p-3.5 bg-violet-50/70 border border-violet-200 rounded-xl">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-violet-800 block">Closing Net Equity</span>
                <span className="text-lg font-black text-violet-900 mt-1 block">{formatCurrency(netEquity)}</span>
              </div>
            </div>

            {/* Itemized Flow Table */}
            <div>
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-3">Itemized Activity Log</h3>
              {partnerFlows.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic border border-dashed rounded-xl">No transactions recorded for this partner yet.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-200">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Flow Type</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {partnerFlows.map(t => (
                      <tr key={t._id}>
                        <td className="py-2 px-3 font-semibold text-slate-700">{formatDate(t.date || t.createdAt)}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{t.type}</td>
                        <td className="py-2 px-3 text-slate-600">{t.description || '—'}</td>
                        <td className={`py-2 px-3 text-right font-bold ${
                          t.type === 'Capital Contribution' ? 'text-emerald-700' : 'text-slate-900'
                        }`}>
                          {t.type === 'Capital Contribution' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Signature & Verification Footer */}
            <div className="pt-8 border-t border-slate-200 flex items-end justify-between">
              <div>
                <div className="w-32 h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                  <span className="font-serif italic text-slate-600 text-xs">Wellmora Authority</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">Authorized Stamp & Signature</span>
              </div>

              <div className="text-right">
                <p className="text-[9px] text-slate-400 italic">Confidential & Proprietary Statement</p>
                <p className="text-[9px] text-slate-400">Wellmora Ledger System</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
