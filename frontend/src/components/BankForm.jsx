import React, { useState, useEffect } from 'react';
import { X, Calendar, IndianRupee, Landmark, FileText, Activity } from 'lucide-react';

export default function BankForm({ isOpen, onClose, onSubmit, transaction = null }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bankName: '',
    accountNumber: '',
    type: 'Deposit',
    amount: '',
    status: 'Completed',
    description: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (transaction) {
      const formattedDate = transaction.date 
        ? new Date(transaction.date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];
      setFormData({
        date: formattedDate,
        bankName: transaction.bankName || '',
        accountNumber: transaction.accountNumber || '',
        type: transaction.type || 'Deposit',
        amount: transaction.amount || '',
        status: transaction.status || 'Completed',
        description: transaction.description || ''
      });
      setErrors({});
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bankName: '',
        accountNumber: '',
        type: 'Deposit',
        amount: '',
        status: 'Completed',
        description: ''
      });
      setErrors({});
    }
  }, [transaction, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required';
    if (!formData.accountNumber.trim()) newErrors.accountNumber = 'Account number is required';
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit({ ...formData, amount: Number(formData.amount) });
  };

  const isEdit = !!transaction;

  // Unified theme styling
  const styles = {
    backdrop: 'bg-slate-950/40 dark:bg-slate-955/70',
    panel: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    headerBg: 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800',
    headerText: 'text-slate-900 dark:text-slate-50',
    closeBtnHover: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
    input: 'bg-slate-55 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-violet-500/10 focus:border-violet-500/40',
    icon: 'text-slate-400 dark:text-slate-500',
    label: 'text-slate-600 dark:text-slate-400',
    toggleInactive: 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/50',
    cancelBtn: 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
    submitBtn: 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/10 dark:shadow-violet-900/15 border-violet-500/20'
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ${styles.backdrop}`}>
      <div className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border ${styles.panel} animate-modal`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${styles.headerBg}`}>
          <h2 className={`text-lg font-bold tracking-tight ${styles.headerText}`}>
            {isEdit ? '✏️ Edit Bank Transaction' : '➕ Add Bank Money'}
          </h2>
          <button onClick={onClose} className={`transition-colors p-1.5 rounded-xl cursor-pointer ${styles.closeBtnHover}`}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white/10 dark:bg-transparent">
          {/* Type Toggle */}
          <div>
            <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${styles.label}`}>Transaction Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('Deposit')}
                className={`py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border cursor-pointer transition-all duration-200 ${
                  formData.type === 'Deposit'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm'
                    : styles.toggleInactive
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${formData.type === 'Deposit' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                Deposit (Cash In)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Withdrawal')}
                className={`py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border cursor-pointer transition-all duration-200 ${
                  formData.type === 'Withdrawal'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-sm'
                    : styles.toggleInactive
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${formData.type === 'Withdrawal' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                Withdrawal (Cash Out)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bank Name */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${styles.label}`}>Bank Name</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${styles.icon}`}>
                  <Landmark size={14} />
                </div>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="e.g. HDFC Bank, SBI"
                  className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 ${styles.input} ${
                    errors.bankName ? 'border-red-500/40 focus:ring-red-500/10' : ''
                  }`}
                />
              </div>
              {errors.bankName && <p className="text-red-500 dark:text-red-455 text-xs mt-1.5 font-medium">{errors.bankName}</p>}
            </div>

            {/* Account Number */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${styles.label}`}>Account Number</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${styles.icon}`}>
                  <FileText size={14} />
                </div>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="e.g. 50100987654"
                  className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 ${styles.input} ${
                    errors.accountNumber ? 'border-red-500/40 focus:ring-red-500/10' : ''
                  }`}
                />
              </div>
              {errors.accountNumber && <p className="text-red-500 dark:text-red-455 text-xs mt-1.5 font-medium">{errors.accountNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${styles.label}`}>Amount (₹)</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${styles.icon}`}>
                  <IndianRupee size={14} />
                </div>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 ${styles.input} ${
                    errors.amount ? 'border-red-500/40 focus:ring-red-500/10' : ''
                  }`}
                />
              </div>
              {errors.amount && <p className="text-red-500 dark:text-red-455 text-xs mt-1.5 font-medium">{errors.amount}</p>}
            </div>

            {/* Date */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${styles.label}`}>Date</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${styles.icon}`}>
                  <Calendar size={14} />
                </div>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 ${styles.input}`}
                />
              </div>
            </div>
          </div>

          {/* Status & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${styles.label}`}>Status</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${styles.icon}`}>
                  <Activity size={14} />
                </div>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`block w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:ring-2 appearance-none cursor-pointer ${styles.input}`}
                >
                  <option value="Completed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Completed</option>
                  <option value="Pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending</option>
                  <option value="Failed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Failed</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${styles.label}`}>Description</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${styles.icon}`}>
                  <FileText size={14} />
                </div>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g. Salary transfer, vendor pay"
                  className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 ${styles.input}`}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl border border-transparent cursor-pointer transition-all duration-200 ${styles.cancelBtn}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-sm font-bold text-white active:scale-95 rounded-xl border transition-all duration-200 cursor-pointer ${styles.submitBtn}`}
            >
              {isEdit ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
