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
  Tag,
  Package,
  Truck,
  Store,
  ExternalLink,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function OrderEntry({ orders = [], loading = false, onRefresh, onSaveOrder, onDeleteOrder }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Flipkart Specific Fields
  const [orderNumber, setOrderNumber] = useState(''); // e.g. OD328719203910283000
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [vendorCustomer, setVendorCustomer] = useState(''); // Buyer / Customer Name
  const [sellerName, setSellerName] = useState('RetailNet'); // Flipkart Seller
  
  const [amount, setAmount] = useState(''); // Net Paid
  const [subtotalAmount, setSubtotalAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState(''); // GST
  const [discountAmount, setDiscountAmount] = useState(''); // Flipkart Discount
  const [deliveryFee, setDeliveryFee] = useState(''); // Delivery Charge

  const [orderStatus, setOrderStatus] = useState('Delivered'); // Ordered, Shipped, Delivered, Cancelled, Returned
  const [paymentStatus, setPaymentStatus] = useState('Paid'); // Paid, Pending, Refunded
  const [paymentMode, setPaymentMode] = useState('UPI / PhonePe');
  const [category, setCategory] = useState('Flipkart Purchase');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  
  // Line Items
  const [items, setItems] = useState([{ description: '', fsnSku: '', quantity: 1, price: 0, total: 0 }]);

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
    setOrderNumber(`OD${Date.now()}000`);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate('');
    setVendorCustomer('');
    setSellerName('RetailNet');
    setAmount('');
    setSubtotalAmount('');
    setTaxAmount('');
    setDiscountAmount('');
    setDeliveryFee('0');
    setOrderStatus('Delivered');
    setPaymentStatus('Paid');
    setPaymentMode('UPI / PhonePe');
    setCategory('Flipkart Purchase');
    setNotes('');
    setReceiptImage('');
    setItems([{ description: '', fsnSku: '', quantity: 1, price: 0, total: 0 }]);
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
    setDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
    setVendorCustomer(order.vendorCustomer || '');
    setSellerName(order.sellerName || 'RetailNet');
    setAmount(order.amount || '');
    setSubtotalAmount(order.subtotalAmount || '');
    setTaxAmount(order.taxAmount || '');
    setDiscountAmount(order.discountAmount || '');
    setDeliveryFee(order.deliveryFee || '0');
    setOrderStatus(order.orderStatus || 'Delivered');
    setPaymentStatus(order.paymentStatus || 'Paid');
    setPaymentMode(order.paymentMode || 'UPI / PhonePe');
    setCategory(order.category || 'Flipkart Purchase');
    setNotes(order.notes || '');
    setReceiptImage(order.receiptImage || '');
    setItems(order.items && order.items.length > 0 ? order.items : [{ description: '', fsnSku: '', quantity: 1, price: 0, total: 0 }]);
    setAutoDetectedFields({});
    setIsFormOpen(true);
  };

  // Smart Flipkart OCR auto-detection from uploaded receipt / order details screenshot
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      setReceiptImage(base64Data);

      setIsScanning(true);
      setScanProgress(15);

      try {
        const worker = await createWorker('eng');
        setScanProgress(45);

        const ret = await worker.recognize(base64Data);
        setScanProgress(85);
        await worker.terminate();

        const text = ret.data.text;
        console.log("Flipkart OCR Extracted Text:", text);

        parseAndAutoFillFlipkartData(text);
        setScanProgress(100);
      } catch (err) {
        console.error("Flipkart OCR Error:", err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Specialized Flipkart OCR Heuristics Parser
  const parseAndAutoFillFlipkartData = (rawText) => {
    const detected = {};
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Detect Flipkart Order ID (e.g., OD328719203910283000 or OD...)
    const flipkartOrderMatch = rawText.match(/\b(OD\d{14,20})\b/i) || 
                                rawText.match(/(?:Order ID|Order No|OD)[:\s]*([A-Za-z0-9_-]{10,24})/i);
    if (flipkartOrderMatch && flipkartOrderMatch[1]) {
      const extractedNo = flipkartOrderMatch[1].toUpperCase();
      setOrderNumber(extractedNo);
      detected.orderNumber = true;
    }

    // 2. Detect Seller Name (RetailNet, SuperComNet, etc.)
    const sellerMatch = rawText.match(/(?:Sold By|Seller|Merchant)[:\s]*([A-Za-z0-9\s&.-]{3,30})/i);
    if (sellerMatch && sellerMatch[1]) {
      setSellerName(sellerMatch[1].trim());
      detected.sellerName = true;
    } else if (rawText.match(/RetailNet/i)) {
      setSellerName('RetailNet');
      detected.sellerName = true;
    } else if (rawText.match(/SuperComNet/i)) {
      setSellerName('SuperComNet');
      detected.sellerName = true;
    }

    // 3. Detect Order Date
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

    // 4. Detect Delivery Date
    const deliveryMatch = rawText.match(/(?:Delivered on|Delivered by|Expected Delivery|Delivery Date)[:\s]*([A-Za-z0-9\s,-]+)/i);
    if (deliveryMatch && deliveryMatch[1]) {
      try {
        const delDateParsed = new Date(deliveryMatch[1]);
        if (!isNaN(delDateParsed.getTime())) {
          setDeliveryDate(delDateParsed.toISOString().split('T')[0]);
          detected.deliveryDate = true;
        }
      } catch (e) {}
    }

    // 5. Detect Net Paid Amount & Price Breakdown
    const totalMatch = rawText.match(/(?:Total Amount|Amount Paid|Net Payable|Total Paid|Final Price|Grand Total)\s*[:=]?\s*(?:₹|Rs\.?|\$)?\s*([\d,]+\.?\d*)/i);
    if (totalMatch) {
      const cleanAmt = totalMatch[1].replace(/,/g, '');
      const parsedAmt = parseFloat(cleanAmt);
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        setAmount(parsedAmt);
        detected.amount = true;
      }
    } else {
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

    // 6. Detect Discount & Delivery Fee
    const discountMatch = rawText.match(/(?:Discount|Offer Discount|Saved)\s*[:=]?\s*(?:₹|Rs\.?|\$)?\s*([\d,]+\.?\d*)/i);
    if (discountMatch) {
      setDiscountAmount(parseFloat(discountMatch[1].replace(/,/g, '')));
      detected.discountAmount = true;
    }

    const deliveryFeeMatch = rawText.match(/(?:Delivery Fee|Delivery Charges|Shipping)\s*[:=]?\s*(?:₹|Rs\.?|\$)?\s*([\d,]+\.?\d*)/i);
    if (deliveryFeeMatch) {
      setDeliveryFee(parseFloat(deliveryFeeMatch[1].replace(/,/g, '')));
      detected.deliveryFee = true;
    }

    // 7. Detect Payment Mode (Flipkart Pay Later, UPI, COD, Card)
    if (rawText.match(/pay later|flipkart pay later/i)) {
      setPaymentMode('Flipkart Pay Later');
      detected.paymentMode = true;
    } else if (rawText.match(/upi|phonepe|gpay|paytm/i)) {
      setPaymentMode('UPI / PhonePe');
      detected.paymentMode = true;
    } else if (rawText.match(/cash on delivery|cod/i)) {
      setPaymentMode('Cash on Delivery (COD)');
      detected.paymentMode = true;
    } else if (rawText.match(/card|visa|mastercard/i)) {
      setPaymentMode('Credit / Debit Card');
      detected.paymentMode = true;
    }

    // 8. Detect Order Status
    if (rawText.match(/delivered/i)) {
      setOrderStatus('Delivered');
      setPaymentStatus('Paid');
      detected.orderStatus = true;
    } else if (rawText.match(/cancelled/i)) {
      setOrderStatus('Cancelled');
      setPaymentStatus('Refunded');
      detected.orderStatus = true;
    } else if (rawText.match(/returned|refunded/i)) {
      setOrderStatus('Returned');
      setPaymentStatus('Refunded');
      detected.orderStatus = true;
    } else if (rawText.match(/shipped|out for delivery/i)) {
      setOrderStatus('Shipped');
      setPaymentStatus('Paid');
      detected.orderStatus = true;
    }

    // 9. Item title extraction
    if (lines.length > 0) {
      const itemTitleLine = lines.find(line => 
        line.length > 5 && 
        !line.match(/flipkart|order|invoice|total|price|subtotal|discount|delivery|paid|payment|sold/i)
      );
      if (itemTitleLine) {
        setItems([{
          description: itemTitleLine.substring(0, 60),
          fsnSku: '',
          quantity: 1,
          price: detected.amount ? amount : 0,
          total: detected.amount ? amount : 0
        }]);
      }
    }

    setAutoDetectedFields(detected);
  };

  // Item List Handlers
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
    setItems([...items, { description: '', fsnSku: '', quantity: 1, price: 0, total: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 0) {
      alert("Please enter a valid net Flipkart order amount.");
      return;
    }

    const payload = {
      orderSource: 'Flipkart',
      orderNumber: orderNumber || `OD${Date.now()}000`,
      date: orderDate || new Date(),
      deliveryDate: deliveryDate || null,
      vendorCustomer: vendorCustomer || 'Flipkart Customer',
      sellerName: sellerName || 'RetailNet',
      amount: parseFloat(amount),
      subtotalAmount: parseFloat(subtotalAmount || amount),
      taxAmount: parseFloat(taxAmount || 0),
      discountAmount: parseFloat(discountAmount || 0),
      deliveryFee: parseFloat(deliveryFee || 0),
      orderStatus,
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

  // Filtered Flipkart Orders
  const filteredOrders = orders.filter(ord => {
    const matchesSearch = 
      (ord.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.vendorCustomer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ord.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Analytics
  const totalOrdersCount = orders.length;
  const totalSpend = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const deliveredCount = orders.filter(o => o.orderStatus === 'Delivered').length;
  const cancelledReturnedCount = orders.filter(o => o.orderStatus === 'Cancelled' || o.orderStatus === 'Returned').length;

  // Export Flipkart Orders CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Flipkart Order #', 'Order Date', 'Delivery Date', 'Seller', 'Buyer / Customer', 'Status', 'Payment Mode', 'Discount (INR)', 'Net Amount (INR)', 'Notes'];
    const rows = orders.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${o.date ? new Date(o.date).toLocaleDateString('en-IN') : ''}"`,
      `"${o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN') : ''}"`,
      `"${o.sellerName || ''}"`,
      `"${o.vendorCustomer || ''}"`,
      `"${o.orderStatus || ''}"`,
      `"${o.paymentMode || ''}"`,
      o.discountAmount || 0,
      o.amount || 0,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `flipkart_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-slide-up">

      {/* Flipkart Branded Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-900 font-black text-xl flex items-center justify-center shadow-lg shrink-0">
            F
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Flipkart Order Entries</h2>
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                E-Commerce Suite
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5 font-medium">
              Upload Flipkart screenshots or tax invoices for instant auto-detection & expense auditing.
            </p>
          </div>
        </div>

        <div className="z-10 flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-white/20"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={openNewOrderForm}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            New Flipkart Order
          </button>
        </div>
      </div>

      {/* Flipkart KPI Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Flipkart Orders */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Flipkart Orders</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalOrdersCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Total Entries Saved</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Package size={22} />
          </div>
        </div>

        {/* Total Flipkart Spend */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Net Spend</span>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(totalSpend)}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Combined Order Value</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Delivered Orders</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{deliveredCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Successful Deliveries</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Truck size={22} />
          </div>
        </div>

        {/* Returns & Cancellations */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Returns / Cancelled</span>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{cancelledReturnedCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Refund / Return Tracking</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
            <ArrowRightLeft size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Flipkart Order ID (OD...), seller, buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Order Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'Delivered', 'Ordered', 'Shipped', 'Cancelled', 'Returned'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-semibold">Loading Flipkart Orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/10 text-amber-500 mx-auto flex items-center justify-center font-black text-2xl">
              F
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Flipkart order entries found</p>
            <p className="text-xs max-w-md mx-auto">Upload a screenshot of your Flipkart Order Details page or tax invoice to auto-detect and save your order entry.</p>
            <button
              onClick={openNewOrderForm}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Add First Flipkart Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">
                  <th className="py-3.5 px-4">Flipkart Order ID</th>
                  <th className="py-3.5 px-4">Seller & Customer</th>
                  <th className="py-3.5 px-4">Status & Delivery</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Discount</th>
                  <th className="py-3.5 px-4 text-right">Net Paid</th>
                  <th className="py-3.5 px-4 text-center">Receipt Proof</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-300">
                {filteredOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-black text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1">
                        <span>{ord.orderNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        {ord.date ? new Date(ord.date).toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Store size={12} className="text-amber-500" />
                        <span>{ord.sellerName || 'RetailNet'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                        Buyer: {ord.vendorCustomer || 'General Customer'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold w-fit ${
                          ord.orderStatus === 'Delivered'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : ord.orderStatus === 'Shipped' || ord.orderStatus === 'Ordered'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}>
                          {ord.orderStatus}
                        </span>
                        {ord.deliveryDate && (
                          <span className="text-[9.5px] text-slate-400 font-semibold flex items-center gap-1">
                            <Truck size={10} /> {new Date(ord.deliveryDate).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200">
                        {ord.paymentMode}
                      </span>
                      <span className="block text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-semibold">
                      {ord.discountAmount ? formatCurrency(ord.discountAmount) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white text-sm">
                      {formatCurrency(ord.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {ord.receiptImage ? (
                        <button
                          onClick={() => setPreviewImageModal(ord.receiptImage)}
                          className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
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
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Order Entry"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete Flipkart Order ${ord.orderNumber}?`)) {
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
          FLIPKART SPECIALIZED ORDER ENTRY & AUTO-DETECTION MODAL
         ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow">
                  F
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {editingId ? 'Edit Flipkart Order Entry' : 'Flipkart Order Auto-Detection & Entry'}
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Upload Flipkart screenshot or invoice photo for automatic data extraction.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">

              {/* 1. Flipkart Photo Upload Banner */}
              <div className="p-4 bg-blue-500/5 dark:bg-blue-950/20 border border-dashed border-blue-500/30 rounded-2xl relative">
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
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-blue-500/30 shrink-0">
                        <img src={receiptImage} alt="Flipkart Screenshot" className="w-full h-full object-cover" />
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
                      <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Upload size={24} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Auto-Detect Flipkart Order Screenshot</h4>
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-extrabold rounded-md flex items-center gap-1">
                          <Sparkles size={10} /> Flipkart Scanner
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload screenshot of Flipkart Order Details screen or invoice PDF photo.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Scanning Flipkart Photo ({scanProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>{receiptImage ? 'Change Screenshot' : 'Upload Flipkart Screenshot'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Auto-detected Notice Badge */}
                {Object.keys(autoDetectedFields).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center gap-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span>Flipkart Fields Auto-Detected: {Object.keys(autoDetectedFields).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* 2. Flipkart Order Form */}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Flipkart Order ID */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Flipkart Order ID (OD...)</span>
                      {autoDetectedFields.orderNumber && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. OD328719203910283000"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  {/* Order Date */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Order Date</span>
                      {autoDetectedFields.orderDate && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
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

                  {/* Delivery Date */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Delivery Date</span>
                      {autoDetectedFields.deliveryDate && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Seller Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Flipkart Seller Name</span>
                      {autoDetectedFields.sellerName && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="e.g. RetailNet / SuperComNet"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Buyer / Customer */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Buyer / Account Name</label>
                    <input
                      type="text"
                      value={vendorCustomer}
                      onChange={(e) => setVendorCustomer(e.target.value)}
                      placeholder="e.g. Milan Javiya"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  {/* Net Paid */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Net Paid Total (INR)</span>
                      {autoDetectedFields.amount && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Flipkart Discount</label>
                    <input
                      type="number"
                      step="any"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Delivery Charge */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Charge</label>
                    <input
                      type="number"
                      step="any"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Tax GST */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">GST Tax</label>
                    <input
                      type="number"
                      step="any"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Order Status */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Order Status</label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Delivered">Delivered</option>
                      <option value="Ordered">Ordered</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Returned">Returned / Refunded</option>
                    </select>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Flipkart Pay Later">Flipkart Pay Later</option>
                      <option value="UPI / PhonePe">UPI / PhonePe / GPay</option>
                      <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                      <option value="Credit / Debit Card">Credit / Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Other">Other</option>
                    </select>
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
                </div>

                {/* Line Items */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Product Items</label>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Flipkart Product
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Product Name / Title"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="FSN / SKU"
                          value={item.fsnSku}
                          onChange={(e) => handleItemChange(idx, 'fsnSku', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-center"
                        />
                      </div>
                      <div className="col-span-3 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.total || (item.quantity * item.price))}
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
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={15} />
                <span>{editingId ? 'Update Flipkart Order' : 'Save Flipkart Order'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          FLIPKART RECEIPT SCREENSHOT PREVIEW MODAL
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
            <h4 className="text-xs font-black uppercase text-amber-500 mb-3 tracking-wider flex items-center gap-1.5">
              <span>Flipkart Order Details Screenshot</span>
            </h4>
            <img 
              src={previewImageModal} 
              alt="Flipkart Screenshot Preview" 
              className="max-h-[70vh] object-contain rounded-xl border border-slate-200 dark:border-slate-800" 
            />
          </div>
        </div>
      )}

    </div>
  );
}
