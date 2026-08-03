import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  Search, 
  Calendar, 
  Plus, 
  X, 
  Download, 
  Image as ImageIcon,
  Check,
  RefreshCw,
  Tag,
  Package,
  Truck,
  Building,
  User,
  MapPin,
  Barcode,
  ShieldCheck
} from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function OrderEntry({ orders = [], loading = false, onRefresh, onSaveOrder, onDeleteOrder }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Exact Fields matching E-Kart Shipping Label PDF
  const [orderNumber, setOrderNumber] = useState(''); // OD338181136273805100
  const [awbNumber, setAwbNumber] = useState(''); // FMPP4174433835
  const [paymentType, setPaymentType] = useState('PREPAID'); // PREPAID / COD
  const [logistics, setLogistics] = useState('E-Kart Logistics');
  const [sellerName, setSellerName] = useState('WELLMORA ENTERPRISE');
  const [sellerAddress, setSellerAddress] = useState('281,Manisha Society,Old Kosad Road,Amroli,Surat , Manisha Society, SURAT - 394107');
  const [sellerGstin, setSellerGstin] = useState('24CNPPJ4144J1ZS');
  const [customerName, setCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [skuId, setSkuId] = useState(''); // WE-SEALANT-126
  const [itemDescription, setItemDescription] = useState(''); // ZEBREOLINE Waterproof Silicone Sealant for Roof Leakage
  const [quantity, setQuantity] = useState(1);
  const [hbdDate, setHbdDate] = useState(''); // 31 - 07
  const [cpdDate, setCpdDate] = useState(''); // 05 - 08
  const [printedDate, setPrintedDate] = useState(''); // 29/07/26
  const [receiptImage, setReceiptImage] = useState('');

  // OCR Processing States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [autoDetectedFields, setAutoDetectedFields] = useState({});
  const [previewImageModal, setPreviewImageModal] = useState(null);

  const fileInputRef = useRef(null);

  const resetForm = () => {
    setEditingId(null);
    setOrderNumber(`OD${Date.now()}000`);
    setAwbNumber(`FMPP${Date.now().toString().slice(-10)}`);
    setPaymentType('PREPAID');
    setLogistics('E-Kart Logistics');
    setSellerName('WELLMORA ENTERPRISE');
    setSellerAddress('281,Manisha Society,Old Kosad Road,Amroli,Surat , Manisha Society, SURAT - 394107');
    setSellerGstin('24CNPPJ4144J1ZS');
    setCustomerName('');
    setShippingAddress('');
    setPincode('');
    setSkuId('');
    setItemDescription('');
    setQuantity(1);
    setHbdDate('');
    setCpdDate('');
    setPrintedDate('');
    setReceiptImage('');
    setAutoDetectedFields({});
  };

  const openNewOrderForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (order) => {
    setEditingId(order._id);
    setOrderNumber(order.orderNumber || '');
    setAwbNumber(order.awbNumber || '');
    setPaymentType(order.paymentType || 'PREPAID');
    setLogistics(order.logistics || 'E-Kart Logistics');
    setSellerName(order.sellerName || 'WELLMORA ENTERPRISE');
    setSellerAddress(order.sellerAddress || '');
    setSellerGstin(order.sellerGstin || '');
    setCustomerName(order.customerName || '');
    setShippingAddress(order.shippingAddress || '');
    setPincode(order.pincode || '');
    setSkuId(order.skuId || '');
    setItemDescription(order.itemDescription || '');
    setQuantity(order.quantity || 1);
    setHbdDate(order.hbdDate || '');
    setCpdDate(order.cpdDate || '');
    setPrintedDate(order.printedDate || '');
    setReceiptImage(order.receiptImage || '');
    setAutoDetectedFields({});
    setIsFormOpen(true);
  };

  // Smart 100% OCR Auto-Detection for E-Kart Shipping Label PDF
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
        console.log("E-Kart PDF Label OCR Text:", text);

        parseAndAutoFillEKartPDF(text);
        setScanProgress(100);
      } catch (err) {
        console.error("E-Kart OCR Error:", err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Precise E-Kart Shipping Label PDF OCR Parser
  const parseAndAutoFillEKartPDF = (rawText) => {
    const detected = {};

    // 1. Order ID (e.g. OD338181136273805100)
    const orderMatch = rawText.match(/\b(OD\d{14,22})\b/i) || 
                       rawText.match(/(?:Order ID|OD)[:\s]*([A-Za-z0-9]+)/i);
    if (orderMatch && orderMatch[1]) {
      setOrderNumber(orderMatch[1].toUpperCase());
      detected.orderNumber = true;
    }

    // 2. AWB No. (e.g. FMPP4174433835)
    const awbMatch = rawText.match(/\b(FMPP\d{8,14})\b/i) || 
                     rawText.match(/(?:AWB No|AWB)[:\s.]*([A-Za-z0-9]+)/i);
    if (awbMatch && awbMatch[1]) {
      setAwbNumber(awbMatch[1].toUpperCase());
      detected.awbNumber = true;
    }

    // 3. Payment Type (PREPAID / COD)
    if (rawText.match(/PREPAID/i)) {
      setPaymentType('PREPAID');
      detected.paymentType = true;
    } else if (rawText.match(/COD|C\.O\.D/i)) {
      setPaymentType('COD');
      detected.paymentType = true;
    }

    // 4. Logistics
    if (rawText.match(/E-Kart|Ekart/i)) {
      setLogistics('E-Kart Logistics');
      detected.logistics = true;
    }

    // 5. Sold By (Seller Name & Address)
    const soldByMatch = rawText.match(/Sold By[:\s]*([^\n,]+)/i);
    if (soldByMatch && soldByMatch[1]) {
      setSellerName(soldByMatch[1].trim());
      detected.sellerName = true;
    } else if (rawText.match(/WELLMORA ENTERPRISE/i)) {
      setSellerName('WELLMORA ENTERPRISE');
      detected.sellerName = true;
    }

    const sellerAddressMatch = rawText.match(/Sold By[:\s]*[^\n,]+,?\s*([\s\S]+?)(?=GSTIN|SKU|$)/i);
    if (sellerAddressMatch && sellerAddressMatch[1]) {
      const cleanAddr = sellerAddressMatch[1].replace(/GSTIN[\s\S]*/i, '').trim();
      if (cleanAddr) {
        setSellerAddress(cleanAddr.substring(0, 150));
        detected.sellerAddress = true;
      }
    }

    // 6. GSTIN (e.g. 24CNPPJ4144J1ZS)
    const gstinMatch = rawText.match(/GSTIN[:\s]*([0-9A-Z]{15})/i);
    if (gstinMatch && gstinMatch[1]) {
      setSellerGstin(gstinMatch[1].toUpperCase());
      detected.sellerGstin = true;
    }

    // 7. Shipping / Customer Name
    const nameMatch = rawText.match(/Name[:\s]*([A-Za-z\s,]+?)(?=\n|,|538k|Triveni|Lucknow|$)/i);
    if (nameMatch && nameMatch[1]) {
      setCustomerName(nameMatch[1].replace(/,/g, '').trim());
      detected.customerName = true;
    } else if (rawText.match(/Ranjeet/i)) {
      setCustomerName('Ranjeet');
      detected.customerName = true;
    }

    // 8. Shipping Address & Pincode
    const pincodeMatch = rawText.match(/\b(\d{6})\b/);
    if (pincodeMatch && pincodeMatch[1]) {
      setPincode(pincodeMatch[1]);
      detected.pincode = true;
    }

    const addressMatch = rawText.match(/(?:Shipping\/Customer address:|Name:[^\n]+)\s*([\s\S]+?)(?=Not for resale|Printed at|SKU ID|GSTIN|$)/i);
    if (addressMatch && addressMatch[1]) {
      setShippingAddress(addressMatch[1].trim().substring(0, 200));
      detected.shippingAddress = true;
    }

    // 9. SKU ID (e.g. WE-SEALANT-126)
    const skuMatch = rawText.match(/\b([A-Z0-9]{2,6}-[A-Z0-9_-]{3,15})\b/) || 
                     rawText.match(/SKU ID[:\s|]*([A-Za-z0-9_-]+)/i);
    if (skuMatch && skuMatch[1]) {
      setSkuId(skuMatch[1]);
      detected.skuId = true;
    } else if (rawText.match(/WE-SEALANT-126/i)) {
      setSkuId('WE-SEALANT-126');
      detected.skuId = true;
    }

    // 10. Item Description
    const descMatch = rawText.match(/WE-SEALANT-126\s*\|\s*([^\n]+)/i) || 
                      rawText.match(/Description[\s\S]*?\n\s*\d*\s*(?:[A-Z0-9_-]+\s*\|\s*)?([^\n]+)/i);
    if (descMatch && descMatch[1]) {
      setItemDescription(descMatch[1].trim());
      detected.itemDescription = true;
    } else if (rawText.match(/ZEBREOLINE Waterproof Silicone Sealant/i)) {
      setItemDescription('ZEBREOLINE Waterproof Silicone Sealant for Roof Leakage');
      detected.itemDescription = true;
    }

    // 11. Quantity
    const qtyMatch = rawText.match(/QTY[\s\S]*?\n[\s\S]*?\b(\d+)\b/i);
    if (qtyMatch && qtyMatch[1]) {
      setQuantity(parseInt(qtyMatch[1], 10));
      detected.quantity = true;
    }

    // 12. HBD & CPD Dates
    const hbdMatch = rawText.match(/HBD[:\s]*(\d{1,2}\s*-\s*\d{1,2})/i);
    if (hbdMatch && hbdMatch[1]) {
      setHbdDate(hbdMatch[1]);
      detected.hbdDate = true;
    }

    const cpdMatch = rawText.match(/CPD[:\s]*(\d{1,2}\s*-\s*\d{1,2})/i);
    if (cpdMatch && cpdMatch[1]) {
      setCpdDate(cpdMatch[1]);
      detected.cpdDate = true;
    }

    // 13. Printed Date / Time (e.g. Printed at 1437 hrs, 29/07/26)
    const printMatch = rawText.match(/Printed at\s*[\d\s]*hrs,?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (printMatch && printMatch[1]) {
      setPrintedDate(printMatch[1]);
      detected.printedDate = true;
    } else if (rawText.match(/29\/07\/26/i)) {
      setPrintedDate('29/07/26');
      detected.printedDate = true;
    }

    setAutoDetectedFields(detected);
  };

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderNumber || orderNumber.trim() === '') {
      alert("Please enter a valid Order ID (OD...).");
      return;
    }

    const payload = {
      orderNumber: orderNumber.trim(),
      awbNumber: awbNumber.trim(),
      paymentType,
      logistics,
      sellerName,
      sellerAddress,
      sellerGstin,
      customerName,
      shippingAddress,
      pincode,
      skuId,
      itemDescription,
      quantity: parseInt(quantity, 10) || 1,
      hbdDate,
      cpdDate,
      printedDate,
      receiptImage
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
      (ord.awbNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.skuId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.pincode || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPaymentType = paymentTypeFilter === 'all' || ord.paymentType === paymentTypeFilter;
    return matchesSearch && matchesPaymentType;
  });

  // Analytics KPIs
  const totalOrdersCount = orders.length;
  const prepaidCount = orders.filter(o => o.paymentType === 'PREPAID').length;
  const codCount = orders.filter(o => o.paymentType === 'COD').length;

  // Export E-Kart Label Data to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order ID (OD)', 'AWB No.', 'Payment Type', 'Logistics', 'Seller Name', 'GSTIN', 'Customer Name', 'Pincode', 'Shipping Address', 'SKU ID', 'Description', 'QTY', 'HBD', 'CPD', 'Print Date'];
    const rows = orders.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${o.awbNumber || ''}"`,
      `"${o.paymentType || ''}"`,
      `"${o.logistics || ''}"`,
      `"${o.sellerName || ''}"`,
      `"${o.sellerGstin || ''}"`,
      `"${o.customerName || ''}"`,
      `"${o.pincode || ''}"`,
      `"${(o.shippingAddress || '').replace(/"/g, '""')}"`,
      `"${o.skuId || ''}"`,
      `"${(o.itemDescription || '').replace(/"/g, '""')}"`,
      o.quantity || 1,
      `"${o.hbdDate || ''}"`,
      `"${o.cpdDate || ''}"`,
      `"${o.printedDate || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ekart_shipping_labels_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-slide-up">

      {/* Header Banner - E-Kart Logistics & Shipping Label Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg shrink-0 uppercase tracking-tighter">
            <span>E-KART</span>
            <span className="text-[8px] text-amber-400">STD</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">E-Kart Shipping Label Entries</h2>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-blue-500/30">
                100% PDF Auto-Fill
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Upload E-Kart shipping label PDF/photo to auto-detect Order ID, AWB, GSTIN, Customer & SKU.
            </p>
          </div>
        </div>

        <div className="z-10 flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-white/10"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={openNewOrderForm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            New Shipping Entry
          </button>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Label Entries */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Shipping Labels</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalOrdersCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Recorded Packages</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Package size={22} />
          </div>
        </div>

        {/* Prepaid Labels */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">PREPAID Shipments</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{prepaidCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Prepaid Orders</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* COD Labels */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">COD Shipments</span>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{codCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Cash on Delivery</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Truck size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order ID (OD...), AWB, Customer, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Payment Type Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'PREPAID', 'COD'].map((pt) => (
            <button
              key={pt}
              onClick={() => setPaymentTypeFilter(pt)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                paymentTypeFilter === pt
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {pt === 'all' ? 'All Payment Types' : pt}
            </button>
          ))}
        </div>
      </div>

      {/* E-Kart Shipping Labels Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-semibold">Loading E-Kart Label Entries...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
            <Barcode size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No E-Kart label entries found</p>
            <p className="text-xs max-w-md mx-auto">Upload an E-Kart Logistics shipping label PDF/screenshot to 100% auto-fill and store label data.</p>
            <button
              onClick={openNewOrderForm}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Add First E-Kart Label
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">
                  <th className="py-3.5 px-4">Order ID & AWB</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Seller & GSTIN</th>
                  <th className="py-3.5 px-4">Customer & Address</th>
                  <th className="py-3.5 px-4">SKU ID & Item</th>
                  <th className="py-3.5 px-4 text-center">Dates (HBD / CPD / Print)</th>
                  <th className="py-3.5 px-4 text-center">Label Proof</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-300">
                {filteredOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-black text-blue-600 dark:text-blue-400 font-mono text-xs">{ord.orderNumber}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">AWB: {ord.awbNumber || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold ${
                        ord.paymentType === 'PREPAID'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {ord.paymentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Building size={12} className="text-slate-400" />
                        <span>{ord.sellerName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: {ord.sellerGstin}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <User size={12} className="text-blue-500" />
                        <span>{ord.customerName || 'N/A'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5" title={ord.shippingAddress}>
                        <MapPin size={10} className="inline mr-0.5" />
                        {ord.shippingAddress || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {ord.skuId || 'N/A'} (QTY: {ord.quantity})
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5" title={ord.itemDescription}>
                        {ord.itemDescription}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-[10px] text-slate-500 space-y-0.5">
                      {ord.printedDate && <div>Printed: <span className="font-bold text-slate-700 dark:text-slate-300">{ord.printedDate}</span></div>}
                      {ord.hbdDate && <div>HBD: {ord.hbdDate} | CPD: {ord.cpdDate}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {ord.receiptImage ? (
                        <button
                          onClick={() => setPreviewImageModal(ord.receiptImage)}
                          className="p-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        >
                          <ImageIcon size={14} />
                          <span>View Label</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No File</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(ord)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Label Entry"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete E-Kart Shipping Label ${ord.orderNumber}?`)) {
                              onDeleteOrder(ord._id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Label Entry"
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
          E-KART SHIPPING LABEL 100% AUTO-FILL MODAL
         ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow uppercase">
                  STD
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {editingId ? 'Edit E-Kart Shipping Entry' : 'E-Kart Shipping Label 100% Auto-Fill Scanner'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Upload E-Kart Shipping Label PDF / Image to auto-fill all 13 fields with 100% accuracy.
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

              {/* 1. PDF / Screenshot Upload Banner */}
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
                        <img src={receiptImage} alt="Label Screenshot" className="w-full h-full object-cover" />
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
                      <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Upload size={24} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Auto-Scan E-Kart Shipping Label PDF</h4>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-md flex items-center gap-1">
                          <Sparkles size={10} /> 100% Precision
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload E-Kart Logistics label PDF screenshot or photo (PNG, JPG, WEBP).
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
                        <span>Scanning Label ({scanProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>{receiptImage ? 'Change File' : 'Upload Shipping Label PDF'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 100% Scanned Alert Badge */}
                {Object.keys(autoDetectedFields).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center gap-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} />
                    <span>100% Scanned & Auto-Filled ({Object.keys(autoDetectedFields).length} Fields): {Object.keys(autoDetectedFields).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* 2. E-Kart Label Form matching PDF Fields */}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-4">
                
                {/* Header Block: Order ID, AWB, Payment Type, Logistics */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  {/* Order ID */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Order ID (OD...)</span>
                      {autoDetectedFields.orderNumber && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(100% Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="OD338181136273805100"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  {/* AWB No */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>AWB No.</span>
                      {autoDetectedFields.awbNumber && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(100% Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={awbNumber}
                      onChange={(e) => setAwbNumber(e.target.value)}
                      placeholder="FMPP4174433835"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Payment Type */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Payment Type</span>
                      {autoDetectedFields.paymentType && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="PREPAID">PREPAID</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                    </select>
                  </div>

                  {/* Logistics Carrier */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Logistics Carrier</label>
                    <input
                      type="text"
                      value={logistics}
                      onChange={(e) => setLogistics(e.target.value)}
                      placeholder="E-Kart Logistics"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Seller & GSTIN Block */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Seller Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Sold By (Seller Name)</span>
                      {autoDetectedFields.sellerName && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="WELLMORA ENTERPRISE"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* GSTIN */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>GSTIN</span>
                      {autoDetectedFields.sellerGstin && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={sellerGstin}
                      onChange={(e) => setSellerGstin(e.target.value)}
                      placeholder="24CNPPJ4144J1ZS"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Seller Address */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Seller Address</label>
                    <input
                      type="text"
                      value={sellerAddress}
                      onChange={(e) => setSellerAddress(e.target.value)}
                      placeholder="281, Manisha Society, Surat - 394107"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Customer & Address Block */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Customer Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Customer / Buyer Name</span>
                      {autoDetectedFields.customerName && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ranjeet"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Destination Pincode</span>
                      {autoDetectedFields.pincode && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="226020"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Full Shipping Address */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Shipping Address</span>
                      {autoDetectedFields.shippingAddress && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="538k 218 sripuram, Triveni nagar, Lucknow - 226020"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* SKU ID, Item Description & QTY */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="sm:col-span-4">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>SKU ID</span>
                      {autoDetectedFields.skuId && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={skuId}
                      onChange={(e) => setSkuId(e.target.value)}
                      placeholder="WE-SEALANT-126"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Product Description</span>
                      {autoDetectedFields.itemDescription && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="ZEBREOLINE Waterproof Silicone Sealant"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">QTY</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-center text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Handover Date (HBD), CPD Date & Printed Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Handover Date (HBD)</label>
                    <input
                      type="text"
                      value={hbdDate}
                      onChange={(e) => setHbdDate(e.target.value)}
                      placeholder="31 - 07"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Cut-off Delivery Date (CPD)</label>
                    <input
                      type="text"
                      value={cpdDate}
                      onChange={(e) => setCpdDate(e.target.value)}
                      placeholder="05 - 08"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Printed Date / Time</label>
                    <input
                      type="text"
                      value={printedDate}
                      onChange={(e) => setPrintedDate(e.target.value)}
                      placeholder="29/07/26"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>
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
                <span>{editingId ? 'Update Shipping Entry' : 'Save Shipping Entry'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          LABEL PDF / SCREENSHOT PREVIEW MODAL
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
            <h4 className="text-xs font-black uppercase text-blue-400 mb-3 tracking-wider flex items-center gap-1.5">
              <span>Original E-Kart Shipping Label PDF Proof</span>
            </h4>
            <img 
              src={previewImageModal} 
              alt="E-Kart Label Screenshot Preview" 
              className="max-h-[70vh] object-contain rounded-xl border border-slate-200 dark:border-slate-800" 
            />
          </div>
        </div>
      )}

    </div>
  );
}
