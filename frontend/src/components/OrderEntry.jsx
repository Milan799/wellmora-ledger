import React, { useState, useRef } from 'react';
import { 
  ShoppingBag, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Trash2, 
  Edit3, 
  Search, 
  Calendar, 
  DollarSign, 
  Plus, 
  X, 
  Eye, 
  Download, 
  Image as ImageIcon,
  Check,
  RefreshCw,
  Tag
} from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function OrderEntry({ orders = [], loading = false, onRefresh, onSaveOrder, onDeleteOrder }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorCustomer, setVendorCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [category, setCategory] = useState('Purchase');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  
  // Line Items
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0, total: 0 }]);

  // OCR Processing States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [autoDetectedFields, setAutoDetectedFields] = useState({});
  const [previewImageModal, setPreviewImageModal] = useState(null);

  const fileInputRef = useRef(null);

  // Formatting currency helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const resetForm = () => {
    setEditingId(null);
    setOrderNumber(`ORD-${Date.now().toString().slice(-6)}`);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setVendorCustomer('');
    setAmount('');
    setTaxAmount('');
    setPaymentStatus('Paid');
    setPaymentMode('UPI');
    setCategory('Purchase');
    setNotes('');
    setReceiptImage('');
    setItems([{ description: '', quantity: 1, price: 0, total: 0 }]);
    setAutoDetectedFields({});
  };

  const openNewOrderForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (order) => {
    setEditingId(order._id);
    setOrderNumber(order.orderNumber || '');
    setOrderDate(order.date ? new Date(order.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setVendorCustomer(order.vendorCustomer || '');
    setAmount(order.amount || '');
    setTaxAmount(order.taxAmount || '');
    setPaymentStatus(order.paymentStatus || 'Paid');
    setPaymentMode(order.paymentMode || 'UPI');
    setCategory(order.category || 'Purchase');
    setNotes(order.notes || '');
    setReceiptImage(order.receiptImage || '');
    setItems(order.items && order.items.length > 0 ? order.items : [{ description: '', quantity: 1, price: 0, total: 0 }]);
    setAutoDetectedFields({});
    setIsFormOpen(true);
  };

  // Smart OCR auto-detection from uploaded screenshot/photo
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Convert file to Base64 for local storage & preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      setReceiptImage(base64Data);

      // Trigger OCR Analysis
      setIsScanning(true);
      setScanProgress(10);

      try {
        const worker = await createWorker('eng');
        setScanProgress(40);

        const ret = await worker.recognize(base64Data);
        setScanProgress(80);
        await worker.terminate();

        const text = ret.data.text;
        console.log("OCR Extracted Text:", text);

        // Run Intelligent Auto-Detection Patterns
        parseAndAutoFillData(text);
        setScanProgress(100);
      } catch (err) {
        console.error("OCR Error:", err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Regex and pattern heuristics to auto-extract fields from text
  const parseAndAutoFillData = (rawText) => {
    const detected = {};
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Detect Order / Invoice Number
    const orderMatch = rawText.match(/(?:Order|Invoice|Inv|Ord|ID|Ref|#)\s*[:#.-]?\s*([A-Za-z0-9_-]{4,20})/i);
    if (orderMatch && orderMatch[1]) {
      const extractedNo = orderMatch[1].toUpperCase();
      setOrderNumber(extractedNo);
      detected.orderNumber = true;
    }

    // 2. Detect Date
    const dateMatch = rawText.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/i);
    if (dateMatch) {
      try {
        const parsedDate = new Date(dateMatch[0]);
        if (!isNaN(parsedDate.getTime())) {
          setOrderDate(parsedDate.toISOString().split('T')[0]);
          detected.orderDate = true;
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Detect Amounts (Total, Grand Total, Net Payable, GST, Tax)
    const totalMatch = rawText.match(/(?:Total|Grand Total|Net Amount|Amount Paid|Payable|Total Amount)\s*[:=]?\s*(?:₹|Rs\.?|\$)?\s*([\d,]+\.?\d*)/i);
    if (totalMatch) {
      const cleanAmt = totalMatch[1].replace(/,/g, '');
      const parsedAmt = parseFloat(cleanAmt);
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        setAmount(parsedAmt);
        detected.amount = true;
      }
    } else {
      // Fallback: look for largest currency pattern in text
      const currencyMatches = rawText.match(/(?:₹|Rs\.?|\$)\s*([\d,]+\.?\d*)/gi);
      if (currencyMatches) {
        const numbers = currencyMatches.map(m => {
          const numStr = m.replace(/[^0-9.]/g, '');
          return parseFloat(numStr);
        }).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          const maxVal = Math.max(...numbers);
          setAmount(maxVal);
          detected.amount = true;
        }
      }
    }

    // 4. Detect Tax Amount (GST, Tax, VAT)
    const taxMatch = rawText.match(/(?:GST|Tax|VAT|CGST|SGST)\s*[:=]?\s*(?:₹|Rs\.?|\$)?\s*([\d,]+\.?\d*)/i);
    if (taxMatch) {
      const cleanTax = taxMatch[1].replace(/,/g, '');
      const parsedTax = parseFloat(cleanTax);
      if (!isNaN(parsedTax)) {
        setTaxAmount(parsedTax);
        detected.taxAmount = true;
      }
    }

    // 5. Detect Vendor / Company Name (usually first non-trivial line)
    if (lines.length > 0) {
      const possibleVendor = lines.find(line => 
        line.length > 3 && 
        !line.match(/invoice|receipt|tax|date|total|bill|phone|gst/i)
      );
      if (possibleVendor) {
        setVendorCustomer(possibleVendor.substring(0, 40));
        detected.vendorCustomer = true;
      }
    }

    // 6. Detect Payment Mode & Status
    if (rawText.match(/upi|gpay|phonepe|paytm/i)) {
      setPaymentMode('UPI');
      detected.paymentMode = true;
    } else if (rawText.match(/cash/i)) {
      setPaymentMode('Cash');
      detected.paymentMode = true;
    } else if (rawText.match(/card|visa|mastercard/i)) {
      setPaymentMode('Credit Card');
      detected.paymentMode = true;
    } else if (rawText.match(/bank|neft|rtgs|transfer/i)) {
      setPaymentMode('Bank Transfer');
      detected.paymentMode = true;
    }

    if (rawText.match(/paid|completed|success/i)) {
      setPaymentStatus('Paid');
      detected.paymentStatus = true;
    } else if (rawText.match(/pending|due|unpaid/i)) {
      setPaymentStatus('Pending');
      detected.paymentStatus = true;
    }

    setAutoDetectedFields(detected);
  };

  // Item list handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'price') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const prc = parseFloat(updated[index].price) || 0;
      updated[index].total = qty * prc;
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, total: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Submit Order Form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 0) {
      alert("Please enter a valid order total amount.");
      return;
    }

    const payload = {
      orderNumber: orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
      date: orderDate || new Date(),
      vendorCustomer: vendorCustomer || 'General Order',
      amount: parseFloat(amount),
      taxAmount: parseFloat(taxAmount || 0),
      paymentStatus,
      paymentMode,
      category,
      receiptImage,
      notes,
      items: items.filter(i => i.description.trim() !== '')
    };

    if (editingId) {
      payload._id = editingId;
    }

    onSaveOrder(payload);
    setIsFormOpen(false);
    resetForm();
  };

  // Filtered Orders
  const filteredOrders = orders.filter(ord => {
    const matchesSearch = 
      (ord.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.vendorCustomer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ord.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Analytics KPIs
  const totalOrdersCount = orders.length;
  const totalOrdersValue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const paidOrdersValue = orders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + (o.amount || 0), 0);
  const pendingOrdersValue = orders.filter(o => o.paymentStatus === 'Pending').reduce((sum, o) => sum + (o.amount || 0), 0);

  // CSV Exporter for Orders
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order #', 'Date', 'Vendor/Customer', 'Category', 'Payment Mode', 'Status', 'Tax (INR)', 'Total Amount (INR)', 'Notes'];
    const rows = orders.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${o.date ? new Date(o.date).toLocaleDateString('en-IN') : ''}"`,
      `"${o.vendorCustomer || ''}"`,
      `"${o.category || ''}"`,
      `"${o.paymentMode || ''}"`,
      `"${o.paymentStatus || ''}"`,
      o.taxAmount || 0,
      o.amount || 0,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellmora_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-slide-up">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
              <ShoppingBag size={22} />
            </div>
            Order Details & Receipt Entry
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Upload order receipts/screenshots for auto-data detection & management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={openNewOrderForm}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            New Order Entry
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Orders</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalOrdersCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Total Entries Recorded</span>
          </div>
          <div className="p-3 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl">
            <ShoppingBag size={22} />
          </div>
        </div>

        {/* Total Order Value */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Volume</span>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(totalOrdersValue)}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Combined Gross Value</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Paid Orders */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Paid Settlements</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(paidOrdersValue)}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Settled Receipts</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Pending Orders */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Pending Due</span>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(pendingOrdersValue)}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Unsettled Amounts</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, vendor, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Paid', 'Pending', 'Refunded'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {st === 'all' ? 'All Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <RefreshCw size={24} className="animate-spin text-violet-500" />
            <span className="text-xs font-semibold">Loading Order Entries...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
            <ShoppingBag size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No order entries found</p>
            <p className="text-xs max-w-sm mx-auto">Upload an order receipt screenshot or create a manual order entry to begin tracking.</p>
            <button
              onClick={openNewOrderForm}
              className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Add First Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">
                  <th className="py-3.5 px-4">Order Details</th>
                  <th className="py-3.5 px-4">Vendor / Customer</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Tax</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-center">Receipt Photo</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-300">
                {filteredOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{ord.orderNumber}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        {ord.date ? new Date(ord.date).toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{ord.vendorCustomer || 'General'}</div>
                      {ord.items && ord.items.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {ord.items.map(i => i.description).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-bold">
                        {ord.category || 'Purchase'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold w-fit ${
                          ord.paymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : ord.paymentStatus === 'Pending'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}>
                          {ord.paymentStatus}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-semibold">{ord.paymentMode}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {formatCurrency(ord.taxAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white text-sm">
                      {formatCurrency(ord.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {ord.receiptImage ? (
                        <button
                          onClick={() => setPreviewImageModal(ord.receiptImage)}
                          className="p-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-500/20 transition-colors inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        >
                          <ImageIcon size={14} />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No Photo</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(ord)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Order Entry"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete order ${ord.orderNumber}?`)) {
                              onDeleteOrder(ord._id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Order Entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================
          ORDER ENTRY & AUTO-DETECTION MODAL
         ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    {editingId ? 'Edit Order Entry' : 'Smart Order Entry & Photo Scanner'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Upload receipt screenshot for instant AI data auto-detection.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">

              {/* 1. Photo / Screenshot Upload Banner */}
              <div className="p-4 bg-violet-500/5 dark:bg-violet-950/20 border border-dashed border-violet-500/30 rounded-2xl relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {receiptImage ? (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-violet-500/30 shrink-0">
                        <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setReceiptImage('')}
                          className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full"
                          title="Remove Photo"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <Upload size={24} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Auto-Detect Order Data from Photo</h4>
                        <span className="px-2 py-0.5 bg-violet-500 text-white text-[9px] font-bold rounded-md flex items-center gap-1">
                          <Sparkles size={10} /> AI OCR
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload invoice screenshot or photo (PNG, JPG, WEBP).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Scanning ({scanProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>{receiptImage ? 'Change Photo' : 'Upload Receipt Photo'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Detected Notice Badge */}
                {Object.keys(autoDetectedFields).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-violet-500/20 flex items-center gap-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span>Auto-detected: {Object.keys(autoDetectedFields).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* 2. Interactive Entry Form */}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Order Number */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Order / Invoice #</span>
                      {autoDetectedFields.orderNumber && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto-detected)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. ORD-9821"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Order Date */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Order Date</span>
                      {autoDetectedFields.orderDate && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto-detected)</span>
                      )}
                    </label>
                    <input
                      type="date"
                      required
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Vendor / Customer */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Vendor / Customer Name</span>
                      {autoDetectedFields.vendorCustomer && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto-detected)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={vendorCustomer}
                      onChange={(e) => setVendorCustomer(e.target.value)}
                      placeholder="e.g. Amazon / Tech Supplier"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Total Amount */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Total Amount (INR)</span>
                      {autoDetectedFields.amount && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto-detected)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  {/* Tax Amount */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>GST / Tax Amount</span>
                      {autoDetectedFields.taxAmount && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto-detected)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Purchase">Purchase</option>
                      <option value="Office Expense">Office Expense</option>
                      <option value="Logistics">Logistics & Shipping</option>
                      <option value="Marketing">Marketing & Ads</option>
                      <option value="Sales">Sales Return / Goods</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Internal Reference</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Order for office stationery"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Line Items Section */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Itemized Line Details</label>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Line Item
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Item Description"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Price"
                          step="any"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-right"
                        />
                      </div>
                      <div className="col-span-2 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="orderForm"
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={15} />
                <span>{editingId ? 'Update Order Entry' : 'Save Order Entry'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          RECEIPT PHOTO PREVIEW MODAL
         ========================================================= */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl max-h-[85vh] p-4 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h4 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-wider">Original Order Receipt Proof</h4>
            <img 
              src={previewImageModal} 
              alt="Receipt Preview" 
              className="max-h-[70vh] object-contain rounded-xl border border-slate-200 dark:border-slate-800" 
            />
          </div>
        </div>
      )}

    </div>
  );
}
