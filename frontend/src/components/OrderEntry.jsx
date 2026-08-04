import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Search, 
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
  ShieldCheck,
  Eye,
  AlertTriangle,
  IndianRupee,
  Layers,
  Box,
  TrendingUp,
  FileText
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker URL dynamically matching installed pdfjs-dist version
try {
  const ver = pdfjsLib.version || '3.11.174';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("PDF.js worker setup warning:", e);
}

export default function OrderEntry({ orders = [], loading = false, onRefresh, onSaveOrder, onSaveBatchOrders, onDeleteOrder }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'sku_grouped'
  
  // Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // 2-BOX SETTLEMENT FIELDS
  // Box 1: Order & Product Identification
  const [orderNumber, setOrderNumber] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [paymentType, setPaymentType] = useState('PREPAID');
  const [productName, setProductName] = useState('');
  const [skuId, setSkuId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Box 2: Financial Settlement & Cost Breakdown
  const [purchaseCost, setPurchaseCost] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [otherCost, setOtherCost] = useState(''); // Optional / Unrequired field

  // Optional Meta Fields
  const [sellerName, setSellerName] = useState('WELLMORA ENTERPRISE');
  const [customerName, setCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [labelImage, setLabelImage] = useState('');

  // Scanning & Deduplication States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [autoDetectedFields, setAutoDetectedFields] = useState({});
  const [batchSummary, setBatchSummary] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const resetForm = () => {
    setEditingId(null);
    setOrderNumber(`OD${Date.now()}000`);
    setAwbNumber(`FMPP${Date.now().toString().slice(-10)}`);
    setPaymentType('PREPAID');
    setProductName('');
    setSkuId('');
    setQuantity(1);
    setPurchaseCost('');
    setPackagingCost('');
    setOtherCost('');
    setSellerName('WELLMORA ENTERPRISE');
    setCustomerName('');
    setShippingAddress('');
    setPincode('');
    setLabelImage('');
    setAutoDetectedFields({});
    setBatchSummary(null);
    setScanStatusMessage('');
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
    setProductName(order.productName || order.itemDescription || '');
    setSkuId(order.skuId || '');
    setQuantity(order.quantity || 1);
    setPurchaseCost(order.purchaseCost || '');
    setPackagingCost(order.packagingCost || '');
    setOtherCost(order.otherCost || '');
    setSellerName(order.sellerName || 'WELLMORA ENTERPRISE');
    setCustomerName(order.customerName || '');
    setShippingAddress(order.shippingAddress || '');
    setPincode(order.pincode || '');
    setLabelImage(order.labelImage || order.receiptImage || '');
    setAutoDetectedFields({});
    setBatchSummary(null);
    setScanStatusMessage('');
    setIsFormOpen(true);
  };

  // Compress canvas output to lightweight JPEG (~50KB) to prevent 413 Payload Too Large errors
  const compressCanvasToJpeg = (canvas, maxWidth = 800, quality = 0.6) => {
    try {
      const compCanvas = document.createElement('canvas');
      let width = canvas.width || 800;
      let height = canvas.height || 600;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      compCanvas.width = width;
      compCanvas.height = height;
      const ctx = compCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, width, height);
      return compCanvas.toDataURL('image/jpeg', quality);
    } catch (e) {
      return canvas.toDataURL('image/jpeg', 0.5);
    }
  };

  // Render a specific PDF page to Canvas Data URL & extract direct PDF text
  const renderPdfPageToCanvas = async (pdf, pageNum) => {
    const page = await pdf.getPage(pageNum);

    let pdfText = '';
    try {
      const textContent = await page.getTextContent();
      pdfText = textContent.items.map(i => i.str).join(' ');
    } catch (e) {
      console.warn(`PDF text extraction warning on page ${pageNum}:`, e);
    }

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const dataUrl = compressCanvasToJpeg(canvas);

    return { dataUrl, pdfText };
  };

  // Process selected or dropped file (PDF or Image)
  const processFile = async (file) => {
    if (!file) return;

    setIsScanning(true);
    setScanProgress(5);
    setScanStatusMessage('Loading File...');

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        setScanStatusMessage('Loading PDF Document...');
        const arrayBuffer = await file.arrayBuffer();
        
        try {
          const ver = pdfjsLib.version || '3.11.174';
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
        } catch (e) {}

        let pdf;
        try {
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        } catch (err) {
          const ver = pdfjsLib.version || '3.11.174';
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        }

        const totalPages = pdf.numPages;
        const uniqueOrdersMap = new Map();
        let firstPageImage = '';
        let firstPageFields = null;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const progressPercent = Math.round((pageNum / totalPages) * 90);
          setScanProgress(progressPercent);
          setScanStatusMessage(`Scanning PDF Page ${pageNum} of ${totalPages}...`);

          const pageRes = await renderPdfPageToCanvas(pdf, pageNum);
          if (pageNum === 1) firstPageImage = pageRes.dataUrl;

          // OCR on rendered canvas
          let ocrText = '';
          try {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(pageRes.dataUrl);
            await worker.terminate();
            ocrText = ret.data.text || '';
          } catch (ocrErr) {
            console.warn(`OCR warning on page ${pageNum}:`, ocrErr);
          }

          const combinedText = `${pageRes.pdfText}\n${ocrText}`;
          const parsedData = extractFieldsFromText(combinedText);

          if (parsedData.orderNumber) {
            const orderObj = {
              orderNumber: parsedData.orderNumber,
              awbNumber: parsedData.awbNumber || `FMPP${Date.now().toString().slice(-10)}`,
              paymentType: parsedData.paymentType || 'PREPAID',
              productName: parsedData.productName || '',
              skuId: parsedData.skuId || '',
              quantity: parsedData.quantity || 1,
              purchaseCost: Number(purchaseCost || 0),
              packagingCost: Number(packagingCost || 0),
              otherCost: Number(otherCost || 0),
              sellerName: parsedData.sellerName || 'WELLMORA ENTERPRISE',
              customerName: parsedData.customerName || '',
              shippingAddress: parsedData.shippingAddress || '',
              pincode: parsedData.pincode || '',
              labelImage: pageRes.dataUrl
            };

            if (!uniqueOrdersMap.has(orderObj.orderNumber)) {
              uniqueOrdersMap.set(orderObj.orderNumber, orderObj);
            }

            if (!firstPageFields) firstPageFields = { parsedData, orderObj };
          }
        }

        const uniqueOrdersList = Array.from(uniqueOrdersMap.values());
        setScanProgress(100);

        if (uniqueOrdersList.length > 0) {
          setLabelImage(firstPageImage || uniqueOrdersList[0].labelImage);
          applyFieldsToForm(firstPageFields ? firstPageFields.parsedData : extractFieldsFromText(''));
          setAutoDetectedFields(firstPageFields ? firstPageFields.parsedData.detected : {});

          if (onSaveBatchOrders) {
            onSaveBatchOrders(uniqueOrdersList);
          }

          setBatchSummary({
            totalPages,
            uniqueOrdersCount: uniqueOrdersList.length,
            ordersList: uniqueOrdersList
          });

          setScanStatusMessage(`Multi-Page PDF Scanned! ${uniqueOrdersList.length} Unique Orders Saved from ${totalPages} Pages.`);
        } else {
          setScanStatusMessage(`Scanned ${totalPages} pages, no valid Order IDs found.`);
        }
      } else {
        // Single or Multiple Image Upload
        setScanStatusMessage('Reading Image File...');
        const imageDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(file);
        });

        // Compress image Data URL
        const tempImg = new Image();
        tempImg.onload = () => {
          const compCanvas = document.createElement('canvas');
          let w = tempImg.width;
          let h = tempImg.height;
          if (w > 800) {
            h = Math.round((h * 800) / w);
            w = 800;
          }
          compCanvas.width = w;
          compCanvas.height = h;
          const ctx = compCanvas.getContext('2d');
          ctx.drawImage(tempImg, 0, 0, w, h);
          setLabelImage(compCanvas.toDataURL('image/jpeg', 0.6));
        };
        tempImg.src = imageDataUrl;

        setScanProgress(50);
        setScanStatusMessage('Running Precision OCR Extraction...');

        let ocrText = '';
        try {
          const worker = await createWorker('eng');
          setScanProgress(80);
          const ret = await worker.recognize(imageDataUrl);
          await worker.terminate();
          ocrText = ret.data.text || '';
        } catch (ocrErr) {}

        const parsedData = extractFieldsFromText(ocrText);
        applyFieldsToForm(parsedData);
        setAutoDetectedFields(parsedData.detected);
        setScanProgress(100);
        setScanStatusMessage('Single Image Scanned & Auto-Filled!');
      }
    } catch (err) {
      console.error("PDF/Image Processing Error:", err);
      alert("Error processing file: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Helper to apply parsed fields to form state
  const applyFieldsToForm = (parsedData) => {
    if (parsedData.orderNumber) setOrderNumber(parsedData.orderNumber);
    if (parsedData.awbNumber) setAwbNumber(parsedData.awbNumber);
    if (parsedData.paymentType) setPaymentType(parsedData.paymentType);
    if (parsedData.productName) setProductName(parsedData.productName);
    if (parsedData.skuId) setSkuId(parsedData.skuId);
    if (parsedData.quantity) setQuantity(parsedData.quantity);
    if (parsedData.sellerName) setSellerName(parsedData.sellerName);
    if (parsedData.customerName) setCustomerName(parsedData.customerName);
    if (parsedData.shippingAddress) setShippingAddress(parsedData.shippingAddress);
    if (parsedData.pincode) setPincode(parsedData.pincode);
  };

  // Precise Field Extractor for Shipping Label Formats
  const extractFieldsFromText = (rawText) => {
    const detected = {};
    const text = rawText || '';

    // 1. Order ID (e.g. OD338181136273805100)
    let extractedOrderNumber = '';
    const orderMatch = text.match(/\b(OD\d{14,22})\b/i) || text.match(/(?:Order ID|OD)[:\s]*([A-Za-z0-9]+)/i);
    if (orderMatch && orderMatch[1]) {
      extractedOrderNumber = orderMatch[1].toUpperCase();
      detected.orderNumber = true;
    }

    // 2. AWB No. (e.g. FMPP4174433835)
    let extractedAwbNumber = '';
    const awbMatch = text.match(/\b(FMPP\d{8,14})\b/i) || text.match(/(?:AWB No|AWB)[:\s.]*([A-Za-z0-9]+)/i);
    if (awbMatch && awbMatch[1]) {
      extractedAwbNumber = awbMatch[1].toUpperCase();
      detected.awbNumber = true;
    }

    // 3. Payment Type
    let extractedPaymentType = 'PREPAID';
    if (text.match(/PREPAID/i)) {
      extractedPaymentType = 'PREPAID';
      detected.paymentType = true;
    } else if (text.match(/\bCOD\b|C\.O\.D/i)) {
      extractedPaymentType = 'COD';
      detected.paymentType = true;
    }

    // 4. SKU ID
    let extractedSkuId = '';
    const skuMatch = text.match(/\b([A-Z0-9]{2,6}-[A-Z0-9_-]{3,15})\b/) || text.match(/SKU ID[:\s|]*([A-Za-z0-9_-]+)/i);
    if (skuMatch && skuMatch[1]) {
      extractedSkuId = skuMatch[1];
      detected.skuId = true;
    }

    // 5. Product Name / Description
    let extractedProductName = '';
    const descMatch = text.match(/WE-SEALANT-[0-9]+\s*\|\s*([^\n]+)/i) || 
                      text.match(/Description[\s\S]*?\n\s*\d*\s*(?:[A-Z0-9_-]+\s*\|\s*)?([^\n]+)/i);
    if (descMatch && descMatch[1]) {
      extractedProductName = descMatch[1].trim();
      detected.productName = true;
    } else if (text.match(/ZEBREOLINE Waterproof Silicone Sealant/i)) {
      extractedProductName = 'ZEBREOLINE Waterproof Silicone Sealant for Roof Leakage';
      detected.productName = true;
    }

    // 6. Quantity (QTY)
    let extractedQuantity = 1;
    const qtyMatch = text.match(/\bQTY[:\s|]*([1-9]\d{0,2})\b/i);
    if (qtyMatch && qtyMatch[1]) {
      const q = parseInt(qtyMatch[1], 10);
      if (q > 0 && q <= 500) {
        extractedQuantity = q;
        detected.quantity = true;
      }
    }

    // 7. Customer Name & Address
    let extractedCustomerName = '';
    const nameMatch = text.match(/Name[:\s]*([A-Za-z0-9\s]+?)(?=,|\n|538k|Triveni|Lucknow|$)/i);
    if (nameMatch && nameMatch[1]) {
      extractedCustomerName = nameMatch[1].replace(/,/g, '').trim();
      detected.customerName = true;
    }

    let extractedPincode = '';
    const pincodeMatch = text.match(/\b(\d{6})\b/);
    if (pincodeMatch && pincodeMatch[1]) {
      extractedPincode = pincodeMatch[1];
      detected.pincode = true;
    }

    let extractedShippingAddress = '';
    const addressMatch = text.match(/(?:Shipping\/Customer address:|Name:[^\n]+)\s*([\s\S]+?)(?=Not for resale|Printed at|SKU ID|GSTIN|$)/i);
    if (addressMatch && addressMatch[1]) {
      extractedShippingAddress = addressMatch[1].trim().substring(0, 200);
      detected.shippingAddress = true;
    }

    return {
      orderNumber: extractedOrderNumber,
      awbNumber: extractedAwbNumber,
      paymentType: extractedPaymentType,
      productName: extractedProductName,
      skuId: extractedSkuId,
      quantity: extractedQuantity,
      sellerName: 'WELLMORA ENTERPRISE',
      customerName: extractedCustomerName,
      shippingAddress: extractedShippingAddress,
      pincode: extractedPincode,
      detected
    };
  };

  // Total calculated cost per order
  const calculatedTotalCost = useMemo(() => {
    const q = parseInt(quantity, 10) || 1;
    const p = parseFloat(purchaseCost) || 0;
    const pkg = parseFloat(packagingCost) || 0;
    const oth = parseFloat(otherCost) || 0;
    return (p + pkg + oth) * q;
  }, [quantity, purchaseCost, packagingCost, otherCost]);

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderNumber || !orderNumber.trim()) {
      alert("Please enter a valid Order ID (OD...).");
      return;
    }

    const payload = {
      orderNumber: orderNumber.trim(),
      awbNumber: awbNumber.trim(),
      paymentType,
      productName: productName.trim(),
      skuId: skuId.trim(),
      quantity: parseInt(quantity, 10) || 1,
      purchaseCost: Number(purchaseCost || 0),
      packagingCost: Number(packagingCost || 0),
      otherCost: Number(otherCost || 0),
      totalCost: calculatedTotalCost,
      sellerName,
      customerName,
      shippingAddress,
      pincode,
      labelImage
    };

    if (editingId) {
      payload._id = editingId;
    }

    onSaveOrder(payload);
    setIsFormOpen(false);
    resetForm();
  };

  // Unique Deduplication Filtered Orders List
  const uniqueOrdersList = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      if (o.orderNumber && !map.has(o.orderNumber.trim())) {
        map.set(o.orderNumber.trim(), o);
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return uniqueOrdersList.filter(ord => {
      const matchesSearch = 
        (ord.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ord.awbNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ord.productName || ord.itemDescription || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ord.skuId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ord.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPaymentType = paymentTypeFilter === 'all' || ord.paymentType === paymentTypeFilter;
      return matchesSearch && matchesPaymentType;
    });
  }, [uniqueOrdersList, searchTerm, paymentTypeFilter]);

  // SKU ID Grouped Aggregation
  const skuGroupedAnalytics = useMemo(() => {
    const skuMap = new Map();
    filteredOrders.forEach(ord => {
      const key = ord.skuId || 'Uncategorized SKU';
      if (!skuMap.has(key)) {
        skuMap.set(key, {
          skuId: key,
          productName: ord.productName || ord.itemDescription || 'Unknown Item',
          totalOrders: 0,
          totalUnits: 0,
          totalPurchaseCost: 0,
          totalPackagingCost: 0,
          totalOtherCost: 0,
          totalExpense: 0,
          sampleImage: ord.labelImage || ord.receiptImage || ''
        });
      }
      const item = skuMap.get(key);
      const qty = ord.quantity || 1;
      item.totalOrders += 1;
      item.totalUnits += qty;
      item.totalPurchaseCost += (ord.purchaseCost || 0) * qty;
      item.totalPackagingCost += (ord.packagingCost || 0) * qty;
      item.totalOtherCost += (ord.otherCost || 0) * qty;
      item.totalExpense += (ord.totalCost || 0);
    });

    return Array.from(skuMap.values());
  }, [filteredOrders]);

  // Analytics KPIs
  const totalOrdersCount = uniqueOrdersList.length;
  const totalUnitsSold = uniqueOrdersList.reduce((acc, o) => acc + (o.quantity || 1), 0);
  const totalExpenseAccumulated = uniqueOrdersList.reduce((acc, o) => acc + (o.totalCost || 0), 0);
  const uniqueSkusCount = new Set(uniqueOrdersList.map(o => o.skuId).filter(Boolean)).size;

  // Export CSV
  const handleExportCSV = () => {
    if (uniqueOrdersList.length === 0) return;
    const headers = ['Order ID', 'AWB No.', 'Payment Type', 'Product Name', 'SKU ID', 'QTY', 'Purchase Cost (₹)', 'Packaging Cost (₹)', 'Other Cost (₹)', 'Total Cost (₹)', 'Customer Name'];
    const rows = uniqueOrdersList.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${o.awbNumber || ''}"`,
      `"${o.paymentType || ''}"`,
      `"${(o.productName || o.itemDescription || '').replace(/"/g, '""')}"`,
      `"${o.skuId || ''}"`,
      o.quantity || 1,
      o.purchaseCost || 0,
      o.packagingCost || 0,
      o.otherCost || 0,
      o.totalCost || 0,
      `"${o.customerName || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `order_settlements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-slide-up">

      {/* =========================================================
          HERO DASHBOARD BANNER - 2-BOX SETTLEMENT & OCR ANALYTICS
         ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 border border-slate-800/80 p-6 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg shadow-blue-600/30 shrink-0 uppercase tracking-tighter border border-white/20">
              <Box size={22} className="text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white">Order Entry & 2-Box Settlement</h1>
                <span className="px-3 py-0.5 bg-blue-500/20 text-blue-300 font-extrabold text-[10.5px] rounded-full uppercase tracking-wider border border-blue-400/30 flex items-center gap-1.5 backdrop-blur-md">
                  <Sparkles size={12} className="text-amber-400 animate-pulse" />
                  PDF & Image Auto-OCR
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Scan single/multi-page PDFs or label photos to auto-detect Order ID, SKU ID, and Product Name. Auto-calculate Purchase, Packaging, and optional Other Costs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer border border-white/10 shadow-sm"
            >
              <Download size={15} />
              Export CSV
            </button>
            <button
              onClick={openNewOrderForm}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-600/30 transition-all cursor-pointer border border-blue-400/30"
            >
              <Plus size={18} />
              <span>New Order Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          ANALYTICS KPI GRID (4 COLUMNS)
         ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Orders */}
        <div className="glass-panel p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-blue-500/40 transition-all duration-300 shadow-sm group">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Orders</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">{totalOrdersCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Recorded Orders
            </span>
          </div>
          <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Package size={22} />
          </div>
        </div>

        {/* KPI 2: Total Units Sold */}
        <div className="glass-panel p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-indigo-500/40 transition-all duration-300 shadow-sm group">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Units Dispatched</span>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalUnitsSold}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Total Quantity</span>
          </div>
          <div className="p-3.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Box size={22} />
          </div>
        </div>

        {/* KPI 3: Total Settlement Cost */}
        <div className="glass-panel p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/40 transition-all duration-300 shadow-sm group">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Settlement Expense</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalExpenseAccumulated.toLocaleString('en-IN')}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Purchase + Packaging + Other</span>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
            <IndianRupee size={22} />
          </div>
        </div>

        {/* KPI 4: Unique SKU Variants */}
        <div className="glass-panel p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-amber-500/40 transition-all duration-300 shadow-sm group">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">SKU Variants</span>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{uniqueSkusCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Grouped Products</span>
          </div>
          <div className="p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* =========================================================
          TOOLBAR, VIEW MODES & QUICK FILTERS
         ========================================================= */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order ID, Product Name, SKU ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* View Mode Switch (Individual Orders vs SKU Grouped) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'individual'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Individual Orders
            </button>
            <button
              onClick={() => setViewMode('sku_grouped')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'sku_grouped'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Layers size={13} />
              <span>SKU ID Grouping</span>
            </button>
          </div>

          {/* Payment Type Segmented Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
            {['all', 'PREPAID', 'COD'].map((pt) => (
              <button
                key={pt}
                onClick={() => setPaymentTypeFilter(pt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentTypeFilter === pt
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {pt === 'all' ? 'All' : pt}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* =========================================================
          VIEW MODE 1: INDIVIDUAL ORDERS TABLE
         ========================================================= */}
      {viewMode === 'individual' && (
        <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
              <RefreshCw size={28} className="animate-spin text-blue-500" />
              <span className="text-xs font-semibold">Loading Order Entries...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <Barcode size={36} />
              </div>
              <div>
                <p className="text-base font-black text-slate-800 dark:text-slate-200">No Orders Found</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">Upload a PDF or label photo to auto-fill Order ID, Product Name, SKU ID, and 2-Box costs.</p>
              </div>
              <button
                onClick={openNewOrderForm}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Add First Order Entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">
                    <th className="py-4 px-5">Order ID & AWB</th>
                    <th className="py-4 px-5">Product & SKU ID</th>
                    <th className="py-4 px-5 text-center">QTY</th>
                    <th className="py-4 px-5">Payment</th>
                    <th className="py-4 px-5 text-right">Purchase Cost</th>
                    <th className="py-4 px-5 text-right">Packaging Cost</th>
                    <th className="py-4 px-5 text-right">Other Cost</th>
                    <th className="py-4 px-5 text-right">Total Cost (₹)</th>
                    <th className="py-4 px-5 text-center">Proof</th>
                    <th className="py-4 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-300">
                  {filteredOrders.map((ord) => {
                    const unitQty = ord.quantity || 1;
                    const pCost = ord.purchaseCost || 0;
                    const pkgCost = ord.packagingCost || 0;
                    const oCost = ord.otherCost || 0;
                    const totCost = ord.totalCost || ((pCost + pkgCost + oCost) * unitQty);

                    return (
                      <tr key={ord._id || ord.orderNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-black text-blue-600 dark:text-blue-400 font-mono text-xs">
                            {ord.orderNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">AWB: {ord.awbNumber || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-5 max-w-[220px]">
                          <div className="font-bold text-slate-900 dark:text-white truncate" title={ord.productName || ord.itemDescription}>
                            {ord.productName || ord.itemDescription || 'N/A'}
                          </div>
                          <div className="text-[10px] font-mono text-indigo-500 font-bold mt-0.5 flex items-center gap-1">
                            <Tag size={11} />
                            <span>{ord.skuId || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-center font-bold text-slate-900 dark:text-white">
                          {unitQty}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase border ${
                            ord.paymentType === 'PREPAID'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {ord.paymentType}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          ₹{pCost.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-5 text-right font-mono text-slate-600 dark:text-slate-400">
                          ₹{pkgCost.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-5 text-right font-mono text-slate-500">
                          {oCost > 0 ? `₹${oCost.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-4 px-5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          ₹{totCost.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {(ord.labelImage || ord.receiptImage) ? (
                            <button
                              onClick={() => setPreviewImageModal(ord.labelImage || ord.receiptImage)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="View Shipping Label Proof"
                            >
                              <Eye size={15} />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No File</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditClick(ord)}
                              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors cursor-pointer"
                              title="Edit Order Entry"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingOrder(ord)}
                              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                              title="Delete Order Entry"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          VIEW MODE 2: SKU ID GROUPING ANALYTICS VIEW
         ========================================================= */}
      {viewMode === 'sku_grouped' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {skuGroupedAnalytics.map((skuGroup) => (
            <div key={skuGroup.skuId} className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 hover:border-indigo-500/40 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                {/* SKU Badge & Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Tag size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">SKU Variant</span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white font-mono">{skuGroup.skuId}</h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs rounded-xl border border-blue-500/20">
                    {skuGroup.totalOrders} Orders
                  </span>
                </div>

                {/* Product Name */}
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-3 line-clamp-2" title={skuGroup.productName}>
                  {skuGroup.productName}
                </p>

                {/* Breakdown Stats */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs font-medium">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Total Dispatched Quantity:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{skuGroup.totalUnits} Units</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Total Purchase Cost:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{skuGroup.totalPurchaseCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Total Packaging Cost:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">₹{skuGroup.totalPackagingCost.toLocaleString('en-IN')}</span>
                  </div>
                  {skuGroup.totalOtherCost > 0 && (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Other Costs:</span>
                      <span className="font-mono text-slate-500">₹{skuGroup.totalOtherCost.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Total Expense */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl">
                <span className="text-[11px] font-black uppercase text-slate-400">Total Group Expense</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{skuGroup.totalExpense.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          2-BOX SETTLEMENT EDIT & ENTRY POPUP MODAL
         ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white relative">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg uppercase tracking-tighter border border-white/20">
                  <Box size={20} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>{editingId ? 'Edit Order Settlement Entry' : 'Order Entry & 2-Box Settlement'}</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] font-extrabold rounded-md uppercase border border-blue-400/30">
                      OCR Auto-Fill
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Upload shipping label image/PDF for auto-detect or manually enter Order ID, Product, SKU, and 2-Box costs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all cursor-pointer z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/30">

              {/* Drag & Drop OCR Upload Dropzone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-5 rounded-3xl border-2 border-dashed transition-all duration-300 relative overflow-hidden ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                    : 'border-blue-500/30 hover:border-blue-500/50 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-transparent'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf,.pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    {labelImage ? (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-blue-500/40 shrink-0 bg-white shadow-md group">
                        <img src={labelImage} alt="Label Preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setLabelImage('')}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:scale-110 transition-transform cursor-pointer"
                          title="Remove Image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-3xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-inner">
                        <Upload size={28} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Upload Label Image or PDF</h4>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold rounded-md flex items-center gap-1 shadow-sm">
                          <Sparkles size={10} /> Auto-Scan
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Supports PDF files (`.pdf`) and label screenshots (`.png`, `.jpg`, `.webp`).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer shrink-0 border border-blue-400/30"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw size={15} className="animate-spin text-amber-300" />
                        <span>{scanStatusMessage || 'Scanning File...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} />
                        <span>{labelImage ? 'Change File' : 'Browse File'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress Bar during Scanning */}
                {isScanning && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px] font-bold text-blue-600 dark:text-blue-400">
                      <span>{scanStatusMessage}</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2-BOX SETTLEMENT FORM */}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* =========================================================
                    BOX 1: ORDER & PRODUCT IDENTIFICATION
                   ========================================================= */}
                <div className="glass-panel p-5 rounded-3xl border border-blue-500/30 bg-blue-500/5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        Box 1: Order & Product Identification
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full uppercase">
                      Core Specs
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Order ID */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Order ID (OD...)</span>
                        {autoDetectedFields.orderNumber && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="OD338181136273805100"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    {/* AWB No */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>AWB Number</span>
                        {autoDetectedFields.awbNumber && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={awbNumber}
                        onChange={(e) => setAwbNumber(e.target.value)}
                        placeholder="FMPP4174433835"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    {/* Payment Type */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Payment Method</span>
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none cursor-pointer"
                      >
                        <option value="PREPAID">PREPAID</option>
                        <option value="COD">COD (Cash on Delivery)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
                    {/* Product Name */}
                    <div className="sm:col-span-6">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Product Name / Item Description</span>
                        {autoDetectedFields.productName && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="ZEBREOLINE Waterproof Silicone Sealant for Roof Leakage"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    {/* SKU ID */}
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>SKU ID (Variant Group)</span>
                        {autoDetectedFields.skuId && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={skuId}
                        onChange={(e) => setSkuId(e.target.value)}
                        placeholder="WE-SEALANT-126"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* =========================================================
                    BOX 2: FINANCIAL SETTLEMENT & COST BREAKDOWN
                   ========================================================= */}
                <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                        Box 2: Financial Settlement & Cost Breakdown
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full uppercase">
                      Cost Settlement
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Purchase Cost */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Purchase Cost per Unit (₹)
                      </label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={purchaseCost}
                          onChange={(e) => setPurchaseCost(e.target.value)}
                          placeholder="150.00"
                          className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Packaging Cost */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Packaging Cost per Unit (₹)
                      </label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={packagingCost}
                          onChange={(e) => setPackagingCost(e.target.value)}
                          placeholder="20.00"
                          className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Other Cost (Optional / Unrequired Field) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Other Cost (₹)</span>
                        <span className="text-[9px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={otherCost}
                          onChange={(e) => setOtherCost(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculated Total Settlement Summary Card */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                        Calculated Total Order Expense
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        (Purchase ₹{purchaseCost || 0} + Packaging ₹{packagingCost || 0} + Other ₹{otherCost || 0}) × {quantity} QTY
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{calculatedTotalCost.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 flex items-center justify-end gap-3 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="orderForm"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black rounded-2xl shadow-xl shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 border border-blue-400/30"
              >
                <Check size={16} />
                <span>{editingId ? 'Update Settlement Entry' : 'Save Order Entry'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          CUSTOM DELETE CONFIRMATION POP-UP MODAL
         ========================================================= */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Order Entry?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            {/* Target Entry Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-900 dark:text-white">
                <span className="text-[11px] font-sans text-slate-400">Order ID:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{deletingOrder.orderNumber}</span>
              </div>
              {deletingOrder.skuId && (
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px] font-sans text-slate-400">SKU ID:</span>
                  <span className="font-sans font-semibold text-indigo-500">{deletingOrder.skuId}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="px-4.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteOrder(deletingOrder._id);
                  setDeletingOrder(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs font-black rounded-2xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>Delete Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl max-h-[85vh] p-5 shadow-2xl flex flex-col items-center animate-slide-up">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800 cursor-pointer shadow"
            >
              <X size={16} />
            </button>
            <h4 className="text-xs font-black uppercase text-blue-500 mb-3 tracking-wider flex items-center gap-1.5">
              <Eye size={14} />
              <span>Original Shipping Label Proof</span>
            </h4>
            <img 
              src={previewImageModal} 
              alt="Label Preview" 
              className="max-h-[70vh] object-contain rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md" 
            />
          </div>
        </div>
      )}

    </div>
  );
}
