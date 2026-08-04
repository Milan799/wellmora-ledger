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
  TrendingDown,
  FileText,
  Landmark,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowRight,
  AlertOctagon
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

export default function OrderEntry({ orders = [], loading = false, onRefresh, onSaveOrder, onSaveBatchOrders, onDeleteOrder, onSaveBulkSku }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'sku_grouped'
  
  // Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formStep, setFormStep] = useState(1); // Mobile step switcher: 1, 2, 3
  
  // 3-BOX SETTLEMENT FIELDS
  // Box 1: Order & Product Identification
  const [orderNumber, setOrderNumber] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [paymentType, setPaymentType] = useState('PREPAID');
  const [productName, setProductName] = useState('');
  const [skuId, setSkuId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Box 2: Financial Settlement & Cost Breakdown (Expenses)
  const [purchaseCost, setPurchaseCost] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [otherCost, setOtherCost] = useState(''); // Optional / Unrequired field

  // Box 3: Bank Settlement Field (Income / Payout Credited in Bank)
  const [bankSettlement, setBankSettlement] = useState('');

  // Optional Meta Fields
  const [sellerName, setSellerName] = useState('WELLMORA ENTERPRISE');
  const [customerName, setCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [labelImage, setLabelImage] = useState('');

  // Mobile card expand state
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Bulk SKU Edit Modal State
  const [bulkSkuModal, setBulkSkuModal] = useState({
    isOpen: false,
    skuId: '',
    productName: '',
    count: 0,
    purchaseCost: '',
    packagingCost: '',
    otherCost: '',
    bankSettlement: ''
  });

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
    setBankSettlement('');
    setSellerName('WELLMORA ENTERPRISE');
    setCustomerName('');
    setShippingAddress('');
    setPincode('');
    setLabelImage('');
    setAutoDetectedFields({});
    setBatchSummary(null);
    setScanStatusMessage('');
    setFormStep(1);
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
    setPurchaseCost(order.purchaseCost !== undefined ? String(order.purchaseCost) : '');
    setPackagingCost(order.packagingCost !== undefined ? String(order.packagingCost) : '');
    setOtherCost(order.otherCost !== undefined ? String(order.otherCost) : '');
    setBankSettlement(order.bankSettlement !== undefined ? String(order.bankSettlement) : '');
    setSellerName(order.sellerName || 'WELLMORA ENTERPRISE');
    setCustomerName(order.customerName || '');
    setShippingAddress(order.shippingAddress || '');
    setPincode(order.pincode || '');
    setLabelImage(order.labelImage || order.receiptImage || '');
    setAutoDetectedFields({});
    setBatchSummary(null);
    setScanStatusMessage('');
    setFormStep(1);
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
              productName: parsedData.productName || 'Standard Product Item',
              skuId: parsedData.skuId || '',
              quantity: parsedData.quantity || 1,
              purchaseCost: Number(purchaseCost || 0),
              packagingCost: Number(packagingCost || 0),
              otherCost: Number(otherCost || 0),
              bankSettlement: Number(bankSettlement || 0),
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

  // HIGH-PRECISION MULTI-PASS FIELD EXTRACTOR FOR E-COMMERCE SHIPPING LABELS
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

    // 4. SKU ID (e.g., WE-SEALANT-126)
    let extractedSkuId = '';
    const skuMatch = text.match(/\b([A-Z0-9]{2,8}-[A-Z0-9_-]{3,20})\b/) || text.match(/SKU ID[:\s|]*([A-Za-z0-9_-]+)/i);
    if (skuMatch && skuMatch[1]) {
      extractedSkuId = skuMatch[1];
      detected.skuId = true;
    }

    // 5. PRODUCT NAME / DESCRIPTION EXTRACTOR (MULTI-PASS ROBUST ALGORITHM)
    let extractedProductName = '';

    // Pass 1: Pipe delimiter pattern after SKU (e.g. WE-SEALANT-126 | ZEBREOLINE Waterproof Silicone Sealant for Roof Leakage)
    const pipeMatch = text.match(/(?:[A-Z0-9_-]{3,20})\s*\|\s*([^\n]+)/i);
    if (pipeMatch && pipeMatch[1] && pipeMatch[1].trim().length > 3) {
      extractedProductName = pipeMatch[1].trim();
      detected.productName = true;
    }

    // Pass 2: Explicit "Description", "Product Name", "Goods Description", "Title" header
    if (!extractedProductName) {
      const descHeaderMatch = text.match(/(?:Description|Product Name|Item Description|Goods Description|Title|Product)[:\s]*([^\n]+)/i);
      if (descHeaderMatch && descHeaderMatch[1] && descHeaderMatch[1].trim().length > 3) {
        extractedProductName = descHeaderMatch[1].trim();
        detected.productName = true;
      }
    }

    // Pass 3: Common E-Commerce product keywords (Silicone, Sealant, ZEBREOLINE, Waterproof, Tape, Cleaner, Spray, etc.)
    if (!extractedProductName) {
      const brandMatch = text.match(/([A-Z0-9\s-]{2,30}(?:Sealant|Silicone|Waterproof|Leakage|Tape|Spray|Cleaner|Tool|Kit|Cleaner|Adhesive|Box|Cover|Stand|Holder|Mat|Light|Bag)[A-Z0-9\s-]{0,50})/i);
      if (brandMatch && brandMatch[1] && brandMatch[1].trim().length > 4) {
        extractedProductName = brandMatch[1].trim();
        detected.productName = true;
      }
    }

    // Pass 4: Multiline text scan - Line immediately following "Description" or line before SKU
    if (!extractedProductName) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/Description/i) && i + 1 < lines.length && lines[i+1].length > 4) {
          extractedProductName = lines[i+1];
          detected.productName = true;
          break;
        }
      }
    }

    // Pass 5: Fallback Product Name if SKU ID is present
    if (!extractedProductName && extractedSkuId) {
      extractedProductName = `Product Item (${extractedSkuId})`;
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

  // Net Profit / Loss calculation for single order entry
  const calculatedNetProfit = useMemo(() => {
    const bSettlement = parseFloat(bankSettlement) || 0;
    return bSettlement - calculatedTotalCost;
  }, [bankSettlement, calculatedTotalCost]);

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
      bankSettlement: Number(bankSettlement || 0),
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

  // Bulk SKU Submit Handler
  const handleBulkSkuSubmit = (e) => {
    e.preventDefault();
    if (!bulkSkuModal.skuId) return;

    if (onSaveBulkSku) {
      onSaveBulkSku({
        skuId: bulkSkuModal.skuId,
        purchaseCost: Number(bulkSkuModal.purchaseCost || 0),
        packagingCost: Number(bulkSkuModal.packagingCost || 0),
        otherCost: Number(bulkSkuModal.otherCost || 0),
        bankSettlement: Number(bulkSkuModal.bankSettlement || 0)
      });
    }

    setBulkSkuModal({ ...bulkSkuModal, isOpen: false });
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
          purchaseCost: ord.purchaseCost || 0,
          packagingCost: ord.packagingCost || 0,
          otherCost: ord.otherCost || 0,
          bankSettlement: ord.bankSettlement || 0,
          totalPurchaseCost: 0,
          totalPackagingCost: 0,
          totalOtherCost: 0,
          totalBankSettlement: 0,
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
      item.totalBankSettlement += (ord.bankSettlement || 0);
      item.totalExpense += (ord.totalCost || 0);
    });

    return Array.from(skuMap.values());
  }, [filteredOrders]);

  // Analytics KPIs
  const totalOrdersCount = uniqueOrdersList.length;
  const totalUnitsSold = uniqueOrdersList.reduce((acc, o) => acc + (o.quantity || 1), 0);
  const totalExpenseAccumulated = uniqueOrdersList.reduce((acc, o) => acc + (o.totalCost || 0), 0);
  const totalBankSettlementAccumulated = uniqueOrdersList.reduce((acc, o) => acc + (o.bankSettlement || 0), 0);
  const totalNetProfitAccumulated = totalBankSettlementAccumulated - totalExpenseAccumulated;
  const uniqueSkusCount = new Set(uniqueOrdersList.map(o => o.skuId).filter(Boolean)).size;

  // Export CSV
  const handleExportCSV = () => {
    if (uniqueOrdersList.length === 0) return;
    const headers = ['Order ID', 'AWB No.', 'Payment Type', 'Product Name', 'SKU ID', 'QTY', 'Purchase Cost (₹)', 'Packaging Cost (₹)', 'Other Cost (₹)', 'Total Cost (₹)', 'Bank Settlement (₹)', 'Net Profit/Loss (₹)', 'Customer Name'];
    const rows = uniqueOrdersList.map(o => {
      const totCost = o.totalCost || 0;
      const bSettlement = o.bankSettlement || 0;
      const netProfit = bSettlement - totCost;
      return [
        `"${o.orderNumber || ''}"`,
        `"${o.awbNumber || ''}"`,
        `"${o.paymentType || ''}"`,
        `"${(o.productName || o.itemDescription || '').replace(/"/g, '""')}"`,
        `"${o.skuId || ''}"`,
        o.quantity || 1,
        o.purchaseCost || 0,
        o.packagingCost || 0,
        o.otherCost || 0,
        totCost,
        bSettlement,
        netProfit,
        `"${o.customerName || ''}"`
      ];
    });

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
    <div className="space-y-5 pb-24 md:pb-12 animate-slide-up">

      {/* =========================================================
          1. HERO DASHBOARD BANNER - MATCHING WEBSITE UI
         ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 border border-blue-500/30 dark:border-slate-800 p-5 sm:p-6 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 dark:bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-400/20 dark:bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 dark:bg-blue-600/30 text-white font-black flex items-center justify-center shadow-lg shrink-0 border border-white/30 backdrop-blur-md">
              <Box size={24} className="text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Order Entry</h1>
                <span className="px-2.5 py-0.5 bg-white/20 text-white font-extrabold text-[10px] sm:text-[10.5px] rounded-full uppercase tracking-wider border border-white/30 flex items-center gap-1 backdrop-blur-md">
                  <Sparkles size={11} className="text-amber-300 animate-pulse" />
                  Real-Time Auto-Sync
                </span>
              </div>
              <p className="text-xs text-blue-50 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Scan multi-page PDFs or photos to auto-detect Order ID, Product Name, SKU ID, and track financial settlement margins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 backdrop-blur-md transition-all cursor-pointer border border-white/20 shadow-sm"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={openNewOrderForm}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-white text-blue-600 hover:bg-blue-50 active:scale-95 text-xs font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer border border-white/40"
            >
              <Plus size={18} />
              <span>New Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          2. RESPONSIVE ANALYTICS KPI CARDS
         ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Orders */}
        <div className="glass-panel p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-blue-500/40 transition-all duration-300 shadow-sm group bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Orders</span>
            <div className="p-2 sm:p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <Box size={18} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{totalOrdersCount}</h3>
            <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Package size={11} className="text-blue-500" />
              {totalUnitsSold} Dispatched
            </span>
          </div>
        </div>

        {/* KPI 2: Bank Settlement Payout */}
        <div className="glass-panel p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-sky-500/40 transition-all duration-300 shadow-sm group bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Bank Payout</span>
            <div className="p-2 sm:p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl group-hover:scale-110 transition-transform">
              <Landmark size={18} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">₹{totalBankSettlementAccumulated.toLocaleString('en-IN')}</h3>
            <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Bank Credited</span>
          </div>
        </div>

        {/* KPI 3: Total Expense */}
        <div className="glass-panel p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-rose-500/40 transition-all duration-300 shadow-sm group bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Expense</span>
            <div className="p-2 sm:p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">₹{totalExpenseAccumulated.toLocaleString('en-IN')}</h3>
            <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Purchase + Packaging</span>
          </div>
        </div>

        {/* KPI 4: Net Profit */}
        <div className="glass-panel p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 shadow-sm group bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Net Margin</span>
            <div className={`p-2 sm:p-2.5 rounded-xl group-hover:scale-110 transition-transform ${totalNetProfitAccumulated >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-xl sm:text-2xl font-black font-mono ${totalNetProfitAccumulated >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              ₹{totalNetProfitAccumulated.toLocaleString('en-IN')}
            </h3>
            <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {totalNetProfitAccumulated >= 0 ? <TrendingUp size={11} className="text-emerald-500" /> : <TrendingDown size={11} className="text-rose-500" />}
              {uniqueSkusCount} SKU Variants
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. RESPONSIVE TOOLBAR, VIEW SWITCHER & FILTERS
         ========================================================= */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3.5 shadow-sm bg-white dark:bg-slate-900">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order ID, Product, SKU ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-100/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
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

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto justify-center">
            <button
              onClick={() => setViewMode('individual')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'individual'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Individual Orders
            </button>
            <button
              onClick={() => setViewMode('sku_grouped')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'sku_grouped'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Layers size={13} />
              <span>SKU Grouping</span>
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
          VIEW MODE 1: INDIVIDUAL ORDERS
         ========================================================= */}
      {viewMode === 'individual' && (
        <div className="space-y-4">
          
          {loading ? (
            <div className="glass-panel rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center bg-white dark:bg-slate-900">
              <RefreshCw size={28} className="animate-spin text-blue-500 mb-3" />
              <span className="text-xs font-semibold text-slate-500">Loading Order Entries...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <Barcode size={36} />
              </div>
              <div>
                <p className="text-base font-black text-slate-800 dark:text-slate-200">No Orders Found</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">Upload a PDF or shipping label photo to auto-fill Order ID, Product Name, SKU ID, and costs.</p>
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
            <>
              {/* DESKTOP DATA TABLE VIEW */}
              <div className="hidden md:block glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-4 px-5">Order ID & AWB</th>
                        <th className="py-4 px-5">Product & SKU ID</th>
                        <th className="py-4 px-5 text-center">QTY</th>
                        <th className="py-4 px-5">Payment</th>
                        <th className="py-4 px-5 text-right">Purchase Cost</th>
                        <th className="py-4 px-5 text-right">Packaging Cost</th>
                        <th className="py-4 px-5 text-right">Total Expense</th>
                        <th className="py-4 px-5 text-right">Bank Settlement</th>
                        <th className="py-4 px-5 text-right min-w-[150px] whitespace-nowrap">Net Profit / Loss</th>
                        <th className="py-4 px-5 text-center min-w-[110px] whitespace-nowrap">Proof</th>
                        <th className="py-4 px-5 text-center min-w-[150px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-300">
                      {filteredOrders.map((ord) => {
                        const unitQty = ord.quantity || 1;
                        const pCost = Number(ord.purchaseCost || 0);
                        const pkgCost = Number(ord.packagingCost || 0);
                        const oCost = Number(ord.otherCost || 0);
                        const totCost = Number(ord.totalCost) || ((pCost + pkgCost + oCost) * unitQty);
                        const bSettlement = Number(ord.bankSettlement || 0);
                        const netProfit = bSettlement - totCost;

                        return (
                          <tr key={ord._id || ord.orderNumber} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-4 px-5">
                              <div className="font-black text-blue-600 dark:text-blue-400 font-mono text-xs">
                                {ord.orderNumber}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">AWB: {ord.awbNumber || 'N/A'}</div>
                            </td>
                            <td className="py-4 px-5 max-w-[220px]">
                              <div className="font-bold text-slate-900 dark:text-white truncate" title={ord.productName || ord.itemDescription}>
                                {ord.productName || ord.itemDescription || 'Standard Product Item'}
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
                            <td className="py-4 px-5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                              ₹{totCost.toLocaleString('en-IN')}
                            </td>
                            <td className="py-4 px-5 text-right font-mono font-black text-sky-600 dark:text-sky-400 text-xs bg-sky-500/5 dark:bg-sky-500/10">
                              ₹{bSettlement.toLocaleString('en-IN')}
                            </td>
                            
                            {/* CRISP & CLEAR NET PROFIT / LOSS BADGE (NO CLIPPING) */}
                            <td className="py-4 px-5 text-right font-mono font-black text-xs whitespace-nowrap">
                              <span className={`inline-flex items-center justify-end px-3 py-1.5 rounded-xl font-bold font-mono text-xs shadow-sm border ${
                                netProfit >= 0
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              }`}>
                                {netProfit >= 0 ? `+₹${netProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(netProfit).toLocaleString('en-IN')}`}
                              </span>
                            </td>

                            {/* PROOF COLUMN WITH CLEAR VIEW BUTTON & NO FILE BADGE */}
                            <td className="py-4 px-5 text-center whitespace-nowrap">
                              {(ord.labelImage || ord.receiptImage) ? (
                                <button
                                  onClick={() => setPreviewImageModal(ord.labelImage || ord.receiptImage)}
                                  className="px-3 py-1 bg-blue-500/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 border border-blue-500/20 shadow-sm cursor-pointer"
                                  title="View Shipping Label Proof"
                                >
                                  <Eye size={13} />
                                  <span>View Label</span>
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 text-[10.5px] font-medium rounded-xl border border-slate-200/50 dark:border-slate-800 inline-block">
                                  No File
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditClick(ord)}
                                  className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-blue-500/20 shadow-sm active:scale-95 cursor-pointer"
                                  title="Edit Order Entry"
                                >
                                  <Edit3 size={13} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => setDeletingOrder(ord)}
                                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-rose-500/20 shadow-sm active:scale-95 cursor-pointer"
                                  title="Delete Order Entry"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* NATIVE TOUCH-OPTIMIZED MOBILE ORDER CARDS */}
              <div className="md:hidden space-y-3">
                {filteredOrders.map((ord) => {
                  const unitQty = ord.quantity || 1;
                  const pCost = Number(ord.purchaseCost || 0);
                  const pkgCost = Number(ord.packagingCost || 0);
                  const oCost = Number(ord.otherCost || 0);
                  const totCost = Number(ord.totalCost) || ((pCost + pkgCost + oCost) * unitQty);
                  const bSettlement = Number(ord.bankSettlement || 0);
                  const netProfit = bSettlement - totCost;
                  const isExpanded = expandedCardId === ord._id;

                  return (
                    <div 
                      key={`mob_order_${ord._id || ord.orderNumber}`}
                      className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm bg-white dark:bg-slate-900"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-blue-600 dark:text-blue-400 font-mono text-xs">{ord.orderNumber}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase border ${
                              ord.paymentType === 'PREPAID'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {ord.paymentType}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">AWB: {ord.awbNumber || 'N/A'}</p>
                        </div>

                        {/* PROMINENT DELETE & EDIT ACTION BUTTONS */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(ord)}
                            className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border border-blue-500/20 cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingOrder(ord)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border border-rose-500/20 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Product Name & SKU */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {ord.productName || ord.itemDescription || 'Standard Product Item'}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-mono text-indigo-500 font-bold flex items-center gap-1">
                            <Tag size={10} />
                            {ord.skuId || 'N/A'}
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                            QTY: <span className="font-black">{unitQty}</span>
                          </span>
                        </div>
                      </div>

                      {/* Financial Settlement Bar */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[9.5px] font-black uppercase text-slate-400 block">Bank Payout</span>
                          <span className="font-mono font-black text-sky-600 dark:text-sky-400">₹{bSettlement.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-black uppercase text-slate-400 block text-right">Expense</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">₹{totCost.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9.5px] font-black uppercase text-slate-400 block">Net Profit</span>
                          <span className={`font-mono font-black ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                            {netProfit >= 0 ? `+₹${netProfit}` : `-₹${Math.abs(netProfit)}`}
                          </span>
                        </div>
                      </div>

                      {/* Expand Details Trigger */}
                      <div className="flex items-center justify-between pt-1">
                        {(ord.labelImage || ord.receiptImage) ? (
                          <button
                            onClick={() => setPreviewImageModal(ord.labelImage || ord.receiptImage)}
                            className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>View Label Proof</span>
                          </button>
                        ) : <div />}

                        <button
                          onClick={() => setExpandedCardId(isExpanded ? null : ord._id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Breakdown Costs'}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>

                      {/* Expanded Breakdown */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1.5 font-medium text-slate-600 dark:text-slate-400 animate-slide-up">
                          <div className="flex justify-between">
                            <span>Purchase Cost per Unit:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{pCost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Packaging Cost per Unit:</span>
                            <span className="font-mono text-slate-600 dark:text-slate-400">₹{pkgCost}</span>
                          </div>
                          {oCost > 0 && (
                            <div className="flex justify-between">
                              <span>Other Cost:</span>
                              <span className="font-mono text-slate-500">₹{oCost}</span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      )}

      {/* =========================================================
          VIEW MODE 2: SKU ID GROUPING ANALYTICS & BULK EDIT VIEW
         ========================================================= */}
      {viewMode === 'sku_grouped' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {skuGroupedAnalytics.map((skuGroup) => {
            const groupNetMargin = skuGroup.totalBankSettlement - skuGroup.totalExpense;

            return (
              <div key={skuGroup.skuId} className="glass-panel p-4.5 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 hover:border-indigo-500/40 transition-all duration-300 shadow-sm flex flex-col justify-between bg-white dark:bg-slate-900">
                <div>
                  {/* SKU Badge & Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        <Tag size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">SKU Variant</span>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">{skuGroup.skuId}</h4>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] rounded-xl border border-blue-500/20">
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
                      <span>Dispatched Units:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{skuGroup.totalUnits} Units</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Purchase Cost / Unit:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{skuGroup.purchaseCost.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Packaging Cost / Unit:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">₹{skuGroup.packagingCost.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Bank Settlement / Unit:</span>
                      <span className="font-mono font-black text-sky-600 dark:text-sky-400">₹{skuGroup.bankSettlement.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer & Bulk Edit Button */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Total Group Profit</span>
                      <span className={`text-sm sm:text-base font-black font-mono ${groupNetMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {groupNetMargin >= 0 ? `+₹${groupNetMargin.toLocaleString('en-IN')}` : `-₹${Math.abs(groupNetMargin).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Total Expense</span>
                      <span className="text-xs font-black font-mono text-rose-500">₹{skuGroup.totalExpense.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* BULK SKU EDIT BUTTON */}
                  <button
                    type="button"
                    onClick={() => setBulkSkuModal({
                      isOpen: true,
                      skuId: skuGroup.skuId,
                      productName: skuGroup.productName,
                      count: skuGroup.totalOrders,
                      purchaseCost: skuGroup.purchaseCost || '',
                      packagingCost: skuGroup.packagingCost || '',
                      otherCost: skuGroup.otherCost || '',
                      bankSettlement: skuGroup.bankSettlement || ''
                    })}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer border border-indigo-400/30 active:scale-98"
                  >
                    <Sliders size={14} />
                    <span>Bulk Edit SKU Costs & Settlement</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          4. ORDER ENTRY FORM POPUP MODAL (WEBSITE STANDARD THEME)
         ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 text-white relative shrink-0">
              <div className="flex items-center gap-3 z-10">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 dark:bg-blue-600/30 text-white font-black text-xs flex items-center justify-center shadow-lg shrink-0 border border-white/20 backdrop-blur-md">
                  <Box size={20} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>{editingId ? 'Edit Order Entry' : 'Order Entry'}</span>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-extrabold rounded-md uppercase border border-white/30">
                      OCR Scan
                    </span>
                  </h3>
                  <p className="text-[10.5px] sm:text-[11px] text-blue-100 dark:text-slate-300 mt-0.5 line-clamp-1">
                    Auto-detect fields via OCR or manually enter financial settlement details.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all cursor-pointer z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Tab Step Switcher */}
            <div className="sm:hidden flex items-center justify-around border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1.5 text-xs font-bold shrink-0">
              {[
                { step: 1, label: '1. Specs', icon: Tag },
                { step: 2, label: '2. Expenses', icon: IndianRupee },
                { step: 3, label: '3. Settlement', icon: Landmark }
              ].map(s => {
                const SIcon = s.icon;
                return (
                  <button
                    key={`step_${s.step}`}
                    onClick={() => setFormStep(s.step)}
                    className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition-all ${
                      formStep === s.step
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <SIcon size={13} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50 dark:bg-slate-950/30">

              {/* Drag & Drop OCR Upload Dropzone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-4 sm:p-5 rounded-3xl border-2 border-dashed transition-all duration-300 relative overflow-hidden bg-white dark:bg-slate-900 ${
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

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    {labelImage ? (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-blue-500/40 shrink-0 bg-white shadow-md group">
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
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-3xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-inner">
                        <Upload size={24} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Upload Label Image or PDF</h4>
                        <span className="px-2 py-0.2 bg-blue-600 text-white text-[9px] font-extrabold rounded-md flex items-center gap-1 shadow-sm">
                          <Sparkles size={9} /> Auto-Scan
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Supports multi-page `.pdf` and image screenshots (`.png`, `.jpg`, `.webp`).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer shrink-0 border border-blue-400/30"
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
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400">
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

              {/* 3-BOX SETTLEMENT FORM */}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-5">
                
                {/* BOX 1: ORDER & PRODUCT IDENTIFICATION */}
                <div className={`${(formStep === 1 || window.innerWidth >= 640) ? 'block' : 'hidden'} p-4 sm:p-5 rounded-3xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 space-y-4`}>
                  <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        Box 1: Order & Product Identification
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9.5px] font-black rounded-full uppercase">
                      Core Specs
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1">
                    {/* Product Name */}
                    <div className="sm:col-span-6">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Product Name / Item Description</span>
                        {autoDetectedFields.productName && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto-Detected)</span>
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

                {/* BOX 2: FINANCIAL SETTLEMENT COST BREAKDOWN (EXPENSES) */}
                <div className={`${(formStep === 2 || window.innerWidth >= 640) ? 'block' : 'hidden'} p-4 sm:p-5 rounded-3xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-4`}>
                  <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                        Box 2: Financial Settlement Cost Breakdown (Expenses)
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9.5px] font-black rounded-full uppercase">
                      Cost Structure
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                          className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
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
                          className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Other Cost (Optional) */}
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
                          className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOX 3: BANK SETTLEMENT & NET PROFIT PAYOUT (INCOME) */}
                <div className={`${(formStep === 3 || window.innerWidth >= 640) ? 'block' : 'hidden'} p-4 sm:p-5 rounded-3xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20 space-y-4`}>
                  <div className="flex items-center justify-between pb-3 border-b border-sky-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-sky-900 dark:text-sky-300">
                        Box 3: Bank Settlement Field (Income Credited)
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[9.5px] font-black rounded-full uppercase">
                      Bank Payout
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Bank Settlement Field */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Bank Settlement Amount (₹)</span>
                        <span className="text-[9px] text-sky-600 dark:text-sky-400 font-bold">(Net Payout in Bank)</span>
                      </label>
                      <div className="relative">
                        <Landmark size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={bankSettlement}
                          onChange={(e) => setBankSettlement(e.target.value)}
                          placeholder="250.00"
                          className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono font-bold text-sky-600 dark:text-sky-400 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Live Margin Calculation Card */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] font-black uppercase text-slate-400 block">Calculated Net Profit / Loss</span>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          Payout ₹{bankSettlement || 0} - Expense ₹{calculatedTotalCost}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm sm:text-base font-black font-mono ${calculatedNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {calculatedNetProfit >= 0 ? `+₹${calculatedNetProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(calculatedNetProfit).toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="orderForm"
                className="px-7 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black rounded-2xl shadow-xl shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 border border-blue-400/30"
              >
                <Check size={16} />
                <span>{editingId ? 'Update Entry' : 'Save Order Entry'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          5. BULK SKU EDIT PRICE & SETTLEMENT MODAL
         ========================================================= */}
      {bulkSkuModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Bulk Edit SKU Prices</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[10px] font-mono font-bold rounded-md">
                      {bulkSkuModal.skuId}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Changes will apply to ALL {bulkSkuModal.count} orders under this SKU ID.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkSkuModal({ ...bulkSkuModal, isOpen: false })}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkSkuSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Purchase Cost */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Purchase Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkSkuModal.purchaseCost}
                    onChange={(e) => setBulkSkuModal({ ...bulkSkuModal, purchaseCost: e.target.value })}
                    placeholder="150.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Packaging Cost */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Packaging Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkSkuModal.packagingCost}
                    onChange={(e) => setBulkSkuModal({ ...bulkSkuModal, packagingCost: e.target.value })}
                    placeholder="20.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Other Cost */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Other Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkSkuModal.otherCost}
                    onChange={(e) => setBulkSkuModal({ ...bulkSkuModal, otherCost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Bank Settlement */}
                <div>
                  <label className="text-[11px] font-bold text-sky-600 dark:text-sky-400 mb-1 block">
                    Bank Settlement / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkSkuModal.bankSettlement}
                    onChange={(e) => setBulkSkuModal({ ...bulkSkuModal, bankSettlement: e.target.value })}
                    placeholder="250.00"
                    className="w-full px-3 py-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs font-mono font-bold text-sky-600 dark:text-sky-400"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setBulkSkuModal({ ...bulkSkuModal, isOpen: false })}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg cursor-pointer"
                >
                  Apply Prices to All {bulkSkuModal.count} Orders
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          6. WEBSITE-STANDARD DELETE CONFIRMATION POPUP MODAL
         ========================================================= */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-modal relative overflow-hidden">
            
            {/* Header Close button */}
            <button 
              onClick={() => setDeletingOrder(null)}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Pulsing Warning Icon */}
            <div className="flex flex-col items-center text-center mt-1 mb-2">
              <div className="w-12 h-12 bg-rose-500/10 dark:bg-rose-500/15 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mb-2.5 border border-rose-500/20 relative">
                <span className="absolute inset-0 rounded-full bg-rose-500/10 dark:bg-rose-500/20 animate-ping"></span>
                <AlertOctagon size={22} className="relative z-10" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-50 tracking-tight">Delete Order Entry</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1 max-w-[280px]">
                This operation is permanent. Are you sure you want to delete this order record?
              </p>
            </div>

            {/* High Fidelity Order Details Panel */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs relative overflow-hidden">
              <div className="flex justify-between items-center text-slate-900 dark:text-white font-mono">
                <span className="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Order ID</span>
                <span className="font-black text-blue-600 dark:text-blue-400">{deletingOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product Name</span>
                <span className="font-bold truncate max-w-[200px] text-right">{deletingOrder.productName || 'Standard Item'}</span>
              </div>
              {deletingOrder.skuId && (
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SKU Variant</span>
                  <span className="font-mono font-bold text-indigo-500">{deletingOrder.skuId}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bank Settlement</span>
                <span className="font-mono font-black text-sky-600 dark:text-sky-400">₹{(deletingOrder.bankSettlement || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteOrder(deletingOrder._id, deletingOrder.orderNumber);
                  setDeletingOrder(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 border border-rose-400/30"
              >
                <Trash2 size={15} />
                <span>Confirm Delete Order Entry</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
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
