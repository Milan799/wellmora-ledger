import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  IndianRupee, 
  Package, 
  User, 
  Receipt, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calculator,
  ChevronDown
} from 'lucide-react';

export default function WholesaleForm({ isOpen, onClose, onSubmit, purchase = null }) {
  const [formData, setFormData] = useState({
    sellerName: 'Dev',
    customSellerName: '',
    description: '',
    quantity: '',
    unitPrice: '',
    totalAmount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentStatus: 'Pending', // 'Done' | 'Pending' | 'Partial'
    paidAmount: '',
    paymentMode: 'Cash',
    billNumber: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when modal opens or purchase prop changes
  useEffect(() => {
    if (purchase) {
      const formattedDate = purchase.date 
        ? new Date(purchase.date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];

      const isKnownSeller = ['Dev', 'Sneh'].includes(purchase.sellerName);
      const initialSeller = isKnownSeller ? purchase.sellerName : (purchase.sellerName ? 'Other' : 'Dev');
      const customSeller = isKnownSeller ? '' : (purchase.customSellerName || purchase.sellerName || '');

      const qty = purchase.quantity !== undefined ? purchase.quantity : '';
      const price = purchase.unitPrice !== undefined ? purchase.unitPrice : '';
      const total = purchase.totalAmount !== undefined ? purchase.totalAmount : (Number(qty) * Number(price) || 0);
      const paid = purchase.paidAmount !== undefined ? purchase.paidAmount : '';
      
      let status = purchase.paymentStatus || 'Pending';
      if (status === 'Paid') status = 'Done';

      setFormData({
        sellerName: initialSeller,
        customSellerName: customSeller,
        description: purchase.description || '',
        quantity: qty.toString(),
        unitPrice: price.toString(),
        totalAmount: total,
        date: formattedDate,
        paymentStatus: status,
        paidAmount: paid.toString(),
        paymentMode: purchase.paymentMode || 'Cash',
        billNumber: purchase.billNumber || '',
        notes: purchase.notes || ''
      });
      setErrors({});
    } else {
      setFormData({
        sellerName: 'Dev',
        customSellerName: '',
        description: '',
        quantity: '',
        unitPrice: '',
        totalAmount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentStatus: 'Pending',
        paidAmount: '0',
        paymentMode: 'Cash',
        billNumber: '',
        notes: ''
      });
      setErrors({});
    }
  }, [purchase, isOpen]);

  // Recalculate Total and Paid/Pending automatically whenever quantity, unitPrice, or paymentStatus changes
  const qtyNum = parseFloat(formData.quantity) || 0;
  const priceNum = parseFloat(formData.unitPrice) || 0;
  const calculatedTotal = Math.round(qtyNum * priceNum * 100) / 100;

  // Compute pending balance
  let parsedPaid = parseFloat(formData.paidAmount);
  if (isNaN(parsedPaid)) parsedPaid = 0;
  const calculatedPending = Math.max(0, Math.round((calculatedTotal - parsedPaid) * 100) / 100);

  if (!isOpen) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Automatic logic calculation when quantity or price changes
      if (name === 'quantity' || name === 'unitPrice') {
        const q = name === 'quantity' ? (parseFloat(value) || 0) : (parseFloat(prev.quantity) || 0);
        const p = name === 'unitPrice' ? (parseFloat(value) || 0) : (parseFloat(prev.unitPrice) || 0);
        const newTotal = Math.round(q * p * 100) / 100;
        updated.totalAmount = newTotal;

        // Auto adjust paid amount based on status
        if (prev.paymentStatus === 'Done') {
          updated.paidAmount = newTotal.toString();
        } else if (prev.paymentStatus === 'Pending') {
          updated.paidAmount = '0';
        }
      }

      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePaymentStatusChange = (status) => {
    setFormData(prev => {
      let newPaid = prev.paidAmount;
      if (status === 'Done') {
        newPaid = calculatedTotal.toString();
      } else if (status === 'Pending') {
        newPaid = '0';
      } else if (status === 'Partial') {
        if (!newPaid || Number(newPaid) === 0 || Number(newPaid) >= calculatedTotal) {
          newPaid = Math.round((calculatedTotal / 2) * 100) / 100 ? (Math.round((calculatedTotal / 2) * 100) / 100).toString() : '';
        }
      }
      return {
        ...prev,
        paymentStatus: status,
        paidAmount: newPaid
      };
    });

    if (errors.paidAmount || errors.paymentStatus) {
      setErrors(prev => ({ ...prev, paidAmount: '', paymentStatus: '' }));
    }
  };

  const validate = () => {
    const errs = {};

    // 1. Seller validation
    if (!formData.sellerName) {
      errs.sellerName = 'Please select a seller';
    } else if (formData.sellerName === 'Other' && !formData.customSellerName.trim()) {
      errs.customSellerName = 'Please specify wholesaler name';
    }

    // 2. Description validation
    if (!formData.description.trim()) {
      errs.description = 'Product / goods description is required';
    } else if (formData.description.trim().length < 2) {
      errs.description = 'Description must be at least 2 characters';
    }

    // 3. Quantity validation
    if (!formData.quantity || isNaN(qtyNum) || qtyNum <= 0) {
      errs.quantity = 'Quantity bought must be greater than 0';
    }

    // 4. Price validation
    if (!formData.unitPrice || isNaN(priceNum) || priceNum <= 0) {
      errs.unitPrice = 'Price of product must be greater than 0';
    }

    // 5. Total verification
    if (calculatedTotal <= 0) {
      errs.totalAmount = 'Total product price must be greater than 0';
    }

    // 6. Date validation
    if (!formData.date) {
      errs.date = 'Date of purchase is required';
    }

    // 7. Payment validation
    const paidVal = parseFloat(formData.paidAmount);
    if (isNaN(paidVal) || paidVal < 0) {
      errs.paidAmount = 'Paid amount cannot be negative';
    } else if (paidVal > calculatedTotal) {
      errs.paidAmount = `Paid amount (${formatCurrency(paidVal)}) cannot exceed total (${formatCurrency(calculatedTotal)})`;
    } else if (formData.paymentStatus === 'Partial' && (paidVal <= 0 || paidVal >= calculatedTotal)) {
      errs.paidAmount = 'For partial payment, paid amount must be greater than 0 and less than total';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalSeller = formData.sellerName === 'Other' && formData.customSellerName.trim()
        ? formData.customSellerName.trim()
        : formData.sellerName;

      const paidVal = parseFloat(formData.paidAmount) || 0;
      const pendingVal = Math.max(0, Math.round((calculatedTotal - paidVal) * 100) / 100);

      const payload = {
        sellerName: finalSeller,
        customSellerName: formData.customSellerName.trim(),
        description: formData.description.trim(),
        quantity: qtyNum,
        unitPrice: priceNum,
        totalAmount: calculatedTotal,
        date: formData.date,
        paymentStatus: formData.paymentStatus,
        paidAmount: paidVal,
        pendingAmount: pendingVal,
        paymentMode: formData.paymentMode,
        billNumber: formData.billNumber.trim(),
        notes: formData.notes.trim()
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Error submitting wholesale purchase:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {purchase ? 'Edit Wholesale Purchase' : 'Buy Goods from Wholesaler'}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Track purchase quantity, price, and done/pending payments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* 1. SELLER NAME DROPDOWN (Dev & Sneh) */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-violet-500" />
                Wholesaler / Seller Name <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Select primary seller</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'Dev', label: 'Dev', tag: 'Primary Wholesaler' },
                { id: 'Sneh', label: 'Sneh', tag: 'Primary Wholesaler' },
                { id: 'Other', label: '+ Other', tag: 'Custom Seller' }
              ].map(seller => (
                <button
                  type="button"
                  key={seller.id}
                  onClick={() => handleFieldChange('sellerName', seller.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.sellerName === seller.id
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 shadow-sm ring-1 ring-violet-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{seller.label}</span>
                    {formData.sellerName === seller.id && (
                      <CheckCircle2 size={13} className="text-violet-600 dark:text-violet-400" />
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5 font-medium">
                    {seller.tag}
                  </span>
                </button>
              ))}
            </div>

            {formData.sellerName === 'Other' && (
              <div className="pt-1.5 animate-slide-down">
                <input
                  type="text"
                  value={formData.customSellerName}
                  onChange={(e) => handleFieldChange('customSellerName', e.target.value)}
                  placeholder="Enter wholesaler / supplier name..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border ${
                    errors.customSellerName 
                      ? 'border-rose-500 ring-2 ring-rose-500/20' 
                      : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/30'
                  } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all`}
                />
                {errors.customSellerName && (
                  <p className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.customSellerName}
                  </p>
                )}
              </div>
            )}

            {errors.sellerName && (
              <p className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.sellerName}
              </p>
            )}
          </div>

          {/* 2. PRODUCT DESCRIPTION & DATE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Description / Goods Detail <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="e.g. Cotton T-Shirts, Perfume 100ml, Packaging boxes..."
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border ${
                  errors.description 
                    ? 'border-rose-500 ring-2 ring-rose-500/20' 
                    : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/30'
                } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all`}
              />
              {errors.description && (
                <p className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.description}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Calendar size={13} className="text-slate-400" />
                Date of Purchase <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border ${
                  errors.date 
                    ? 'border-rose-500 ring-2 ring-rose-500/20' 
                    : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/30'
                } text-slate-900 dark:text-white focus:outline-none transition-all`}
              />
              {errors.date && (
                <p className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.date}
                </p>
              )}
            </div>
          </div>

          {/* 3. QUANTITY, UNIT PRICE, AND AUTOMATIC TOTAL CALCULATOR */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calculator size={13} className="text-amber-500" />
                Price Calculation Logic
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Auto-Calculated
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Qty Buy */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Qty Buy (Units / Pcs) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange('quantity', e.target.value)}
                  placeholder="e.g. 50"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border ${
                    errors.quantity 
                      ? 'border-rose-500 ring-2 ring-rose-500/20' 
                      : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/30'
                  } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all`}
                />
                {errors.quantity && (
                  <p className="text-[10px] font-bold text-rose-500 mt-0.5">
                    {errors.quantity}
                  </p>
                )}
              </div>

              {/* Price of Product */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Price of Product (₹/pc) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleFieldChange('unitPrice', e.target.value)}
                    placeholder="e.g. 240.00"
                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border ${
                      errors.unitPrice 
                        ? 'border-rose-500 ring-2 ring-rose-500/20' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/30'
                    } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all`}
                  />
                </div>
                {errors.unitPrice && (
                  <p className="text-[10px] font-bold text-rose-500 mt-0.5">
                    {errors.unitPrice}
                  </p>
                )}
              </div>

              {/* Total of Product (Automatically Calculated) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Total of Product (Auto)
                </label>
                <div className="px-3 py-2 rounded-xl bg-violet-500/10 dark:bg-violet-950/40 border border-violet-500/30 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">Total:</span>
                  <span className="text-sm font-black text-violet-700 dark:text-violet-300">
                    {formatCurrency(calculatedTotal)}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 text-right">
                  {qtyNum} × ₹{priceNum}
                </p>
              </div>
            </div>
          </div>

          {/* 4. PAYMENT SETTLEMENT ENTRY (Pending Payment vs Done Payment) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CreditCard size={13} className="text-emerald-500" />
                Payment Settlement & Status
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Track Done & Pending
              </span>
            </div>

            {/* Payment Status Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Done', label: 'Done Payment', desc: '100% Paid', icon: CheckCircle2, color: 'text-emerald-600' },
                { id: 'Pending', label: 'Pending Payment', desc: 'Full Pending', icon: Clock, color: 'text-rose-600' },
                { id: 'Partial', label: 'Partial Payment', desc: 'Part Paid / Balance', icon: AlertCircle, color: 'text-amber-600' }
              ].map(status => {
                const Icon = status.icon;
                const isSelected = formData.paymentStatus === status.id;
                return (
                  <button
                    type="button"
                    key={status.id}
                    onClick={() => handlePaymentStatusChange(status.id)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-sm ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={14} className={`mx-auto mb-1 ${status.color}`} />
                    <span className="text-[11px] block truncate">{status.label}</span>
                    <span className="text-[9px] opacity-70 block font-normal">{status.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Paid Amount and Calculated Pending Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Paid Amount Entry */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Paid Amount (Done Payment) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={calculatedTotal}
                    value={formData.paidAmount}
                    onChange={(e) => handleFieldChange('paidAmount', e.target.value)}
                    disabled={formData.paymentStatus === 'Done' || formData.paymentStatus === 'Pending'}
                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-900 border ${
                      errors.paidAmount 
                        ? 'border-rose-500 ring-2 ring-rose-500/20' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/30'
                    } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed`}
                  />
                </div>
                {errors.paidAmount && (
                  <p className="text-[10px] font-bold text-rose-500 mt-0.5">
                    {errors.paidAmount}
                  </p>
                )}
              </div>

              {/* Pending Payment Display (Automatically calculated: Total - Paid) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Pending Balance (To Wholesaler)
                </label>
                <div className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
                  calculatedPending > 0
                    ? 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/30 text-rose-700 dark:text-rose-400'
                    : 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {calculatedPending > 0 ? 'Pending Pay:' : 'Cleared:'}
                  </span>
                  <span className="text-sm font-black">
                    {formatCurrency(calculatedPending)}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 text-right">
                  {calculatedPending > 0 ? `Payable to ${formData.sellerName}` : 'All payments settled'}
                </p>
              </div>
            </div>

            {/* Payment Method / Mode */}
            {parsedPaid > 0 && (
              <div className="space-y-1 pt-1 animate-slide-down">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Payment Mode / Outflow Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Cash', 'Bank Transfer', 'UPI', 'Cheque'].map(mode => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => handleFieldChange('paymentMode', mode)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        formData.paymentMode === mode
                          ? 'border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. OPTIONAL DETAILS: BILL / INVOICE NUMBER & NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Receipt size={13} className="text-slate-400" />
                Bill / Invoice No. (Optional)
              </label>
              <input
                type="text"
                value={formData.billNumber}
                onChange={(e) => handleFieldChange('billNumber', e.target.value)}
                placeholder="e.g. INV-2026-981"
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <FileText size={13} className="text-slate-400" />
                Notes / Specs (Optional)
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="e.g. Batch #14, Grade A quality"
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package size={15} />
              <span>{isSubmitting ? 'Saving Entry...' : purchase ? 'Update Purchase' : 'Save Purchase Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
