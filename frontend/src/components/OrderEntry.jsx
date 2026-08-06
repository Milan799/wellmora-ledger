import React, { useState, useRef } from 'react';
import {
  Box,
  Plus,
  Search,
  UploadCloud,
  FileText,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Download,
  Layers,
  TrendingUp,
  DollarSign,
  PackageCheck,
  Eye,
  RefreshCw,
  Info,
  ChevronRight,
  ArrowRight,
  Calendar,
  Filter,
  Tag
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

export default function OrderEntry({
  orders = [],
  loading = false,
  onRefresh,
  onSaveOrder,
  onSaveBatchOrders,
  onDeleteOrder,
  onDeleteBatchOrders,
  onSaveBulkSku
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'sku_grouped'

  // Date Wise Filter State
  const [dateFrameFilter, setDateFrameFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_30_days' | 'custom'
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');

  // Multi-Select & Bulk Delete State
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formStep, setFormStep] = useState(1); // Mobile step switcher: 1, 2, 3

  // 3-BOX SETTLEMENT FIELDS
  // Box 1: Order & Product Identification & Order Date
  const [orderNumber, setOrderNumber] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [paymentType, setPaymentType] = useState('PREPAID');
  const [productName, setProductName] = useState('');
  const [skuId, setSkuId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);

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
    setOrderDate(new Date().toISOString().split('T')[0]);
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
    
    const formattedDate = order.orderDate
      ? new Date(order.orderDate).toISOString().split('T')[0]
      : (order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setOrderDate(formattedDate);

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

  // Compress canvas output to lightweight JPEG (~50KB)
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
            const cleanParsedSku = parsedData.skuId ? parsedData.skuId.trim().toUpperCase() : '';
            const matchingSkuOrder = cleanParsedSku ? orders.find(o => o.skuId && o.skuId.trim().toUpperCase() === cleanParsedSku) : null;

            const orderObj = {
              orderNumber: parsedData.orderNumber,
              awbNumber: parsedData.awbNumber || `FMPP${Date.now().toString().slice(-10)}`,
              paymentType: parsedData.paymentType || 'PREPAID',
              productName: parsedData.productName || 'Standard Product Item',
              skuId: parsedData.skuId || '',
              quantity: parsedData.quantity || 1,
              purchaseCost: matchingSkuOrder ? (matchingSkuOrder.purchaseCost || 0) : Number(purchaseCost || 0),
              packagingCost: matchingSkuOrder ? (matchingSkuOrder.packagingCost || 0) : Number(packagingCost || 0),
              otherCost: matchingSkuOrder ? (matchingSkuOrder.otherCost || 0) : Number(otherCost || 0),
              bankSettlement: matchingSkuOrder ? (matchingSkuOrder.bankSettlement || 0) : Number(bankSettlement || 0),
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

          setBatchSummary({
            totalPages,
            uniqueOrdersCount: uniqueOrdersList.length,
            ordersList: uniqueOrdersList
          });

          setScanStatusMessage(`Multi-Page PDF Scanned! ${uniqueOrdersList.length} Unique Orders extracted from ${totalPages} Pages. Click "Save Order Entry" below to confirm.`);
        } else {
          setScanStatusMessage(`Scanned ${totalPages} pages, no valid Order IDs found.`);
        }
      } else {
        // Single Image Upload
        setScanStatusMessage('Reading Image File...');
        const imageDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(file);
        });

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

  const handleSkuIdChange = (val) => {
    setSkuId(val);
    if (!val || !val.trim()) return;
    const cleanSku = val.trim().toUpperCase();
    const existingSkuOrder = orders.find(o => o.skuId && o.skuId.trim().toUpperCase() === cleanSku);
    if (existingSkuOrder) {
      if (existingSkuOrder.purchaseCost !== undefined && existingSkuOrder.purchaseCost !== null) {
        setPurchaseCost(String(existingSkuOrder.purchaseCost));
      }
      if (existingSkuOrder.packagingCost !== undefined && existingSkuOrder.packagingCost !== null) {
        setPackagingCost(String(existingSkuOrder.packagingCost));
      }
      if (existingSkuOrder.otherCost !== undefined && existingSkuOrder.otherCost !== null) {
        setOtherCost(String(existingSkuOrder.otherCost));
      }
      if (existingSkuOrder.bankSettlement !== undefined && existingSkuOrder.bankSettlement !== null) {
        setBankSettlement(String(existingSkuOrder.bankSettlement));
      }
    }
  };

  const applyFieldsToForm = (parsedData) => {
    if (parsedData.orderNumber) setOrderNumber(parsedData.orderNumber);
    if (parsedData.awbNumber) setAwbNumber(parsedData.awbNumber);
    if (parsedData.paymentType) setPaymentType(parsedData.paymentType);
    if (parsedData.productName) setProductName(parsedData.productName);
    if (parsedData.skuId) {
      handleSkuIdChange(parsedData.skuId);
    }
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

    // 1. Order ID
    let extractedOrderNumber = '';
    const orderMatch = text.match(/\b(OD\d{14,22})\b/i) || text.match(/(?:Order ID|OD)[:\s]*([A-Za-z0-9]+)/i);
    if (orderMatch && orderMatch[1]) {
      extractedOrderNumber = orderMatch[1].toUpperCase();
      detected.orderNumber = true;
    }

    // 2. AWB No.
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
    const skuMatch = text.match(/\b([A-Z0-9]{2,8}-[A-Z0-9_-]{3,20})\b/) || text.match(/SKU ID[:\s|]*([A-Za-z0-9_-]+)/i);
    if (skuMatch && skuMatch[1]) {
      extractedSkuId = skuMatch[1];
      detected.skuId = true;
    }

    // 5. PRODUCT NAME / DESCRIPTION EXTRACTOR
    let extractedProductName = '';

    const pipeMatch = text.match(/(?:[A-Z0-9_-]{3,20})\s*\|\s*([^\n]+)/i);
    if (pipeMatch && pipeMatch[1] && pipeMatch[1].trim().length > 3) {
      extractedProductName = pipeMatch[1].trim();
      detected.productName = true;
    }

    if (!extractedProductName) {
      const descHeaderMatch = text.match(/(?:Description|Product Name|Item Description|Goods Description|Title|Product)[:\s]*([^\n]+)/i);
      if (descHeaderMatch && descHeaderMatch[1] && descHeaderMatch[1].trim().length > 3) {
        extractedProductName = descHeaderMatch[1].trim();
        detected.productName = true;
      }
    }

    if (!extractedProductName) {
      const brandMatch = text.match(/([A-Z0-9\s-]{2,30}(?:Sealant|Silicone|Waterproof|Leakage|Tape|Spray|Cleaner|Tool|Kit|Cleaner|Adhesive|Box|Cover|Stand|Holder|Mat|Light|Bag)[A-Z0-9\s-]{0,50})/i);
      if (brandMatch && brandMatch[1] && brandMatch[1].trim().length > 4) {
        extractedProductName = brandMatch[1].trim();
        detected.productName = true;
      }
    }

    if (!extractedProductName && extractedSkuId) {
      extractedProductName = `Product Item (${extractedSkuId})`;
      detected.productName = true;
    }

    // STRICT SANITIZATION: Retain ONLY concise product name
    if (extractedProductName) {
      let cleanName = extractedProductName.split(/\r?\n/)[0].trim();
      cleanName = cleanName.split(/(?:Not for resale|Printed at|GSTIN|SKU|QTY|Seller|Return|Ship to|Customer|Order ID|AWB|Tracking|Courier|Price|Rs\.|\b\d{6}\b)/i)[0].trim();
      cleanName = cleanName.replace(/^[:\s|#.\-]+/, '').trim();
      if (cleanName.length > 50) {
        cleanName = cleanName.substring(0, 50).trim();
      }
      extractedProductName = cleanName;
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

  // Calculations
  const calculatedTotalCost = (
    (Number(purchaseCost || 0) + Number(packagingCost || 0) + Number(otherCost || 0)) *
    (parseInt(quantity, 10) || 1)
  );

  const calculatedMargin = Number(bankSettlement || 0) - calculatedTotalCost;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (batchSummary && batchSummary.ordersList && batchSummary.ordersList.length > 1) {
      if (onSaveBatchOrders) {
        onSaveBatchOrders(batchSummary.ordersList);
      }
      setIsFormOpen(false);
      resetForm();
      return;
    }

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
      labelImage,
      orderDate: orderDate || new Date().toISOString().split('T')[0]
    };

    if (editingId) {
      payload._id = editingId;
    }

    onSaveOrder(payload);
    setIsFormOpen(false);
    resetForm();
  };

  const toggleSelectAll = () => {
    if (filteredOrders.length === 0) return;
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o._id || o.orderNumber));
    }
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = () => {
    if (onDeleteBatchOrders && selectedOrderIds.length > 0) {
      onDeleteBatchOrders(selectedOrderIds);
      setSelectedOrderIds([]);
    }
    setIsBulkDeleteModalOpen(false);
  };

  // Date Range bounds calculation
  const getEffectiveDateRange = () => {
    const now = new Date();
    let start = null;
    let end = null;

    if (dateFrameFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFrameFilter === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
      end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
    } else if (dateFrameFilter === 'this_week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      start = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFrameFilter === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFrameFilter === 'last_30_days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      start = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFrameFilter === 'custom') {
      if (orderStartDate) {
        start = new Date(orderStartDate);
        start.setHours(0, 0, 0, 0);
      }
      if (orderEndDate) {
        end = new Date(orderEndDate);
        end.setHours(23, 59, 59, 999);
      }
    }
    return { start, end };
  };

  // Filtering Orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.awbNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.skuId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPayment =
      paymentTypeFilter === 'all' ||
      (o.paymentType || 'PREPAID').toUpperCase() === paymentTypeFilter.toUpperCase();

    const { start, end } = getEffectiveDateRange();
    let matchesDate = true;
    const rawDate = o.orderDate || o.createdAt;
    if (rawDate && (start || end)) {
      const oDate = new Date(rawDate);
      if (start && oDate < start) matchesDate = false;
      if (end && oDate > end) matchesDate = false;
    }

    return matchesSearch && matchesPayment && matchesDate;
  });

  // SKU Grouping calculation
  const skuGroupedMap = new Map();
  filteredOrders.forEach(o => {
    const key = o.skuId ? o.skuId.trim().toUpperCase() : 'NO-SKU-ID';
    if (!skuGroupedMap.has(key)) {
      skuGroupedMap.set(key, {
        skuId: key,
        productName: o.productName || 'Unassigned SKU Product',
        count: 0,
        totalQuantity: 0,
        totalPurchaseCost: 0,
        totalPackagingCost: 0,
        totalOtherCost: 0,
        totalBankSettlement: 0,
        totalCost: 0,
        sampleOrder: o
      });
    }

    const group = skuGroupedMap.get(key);
    group.count += 1;
    group.totalQuantity += (o.quantity || 1);
    group.totalPurchaseCost += Number(o.purchaseCost || 0);
    group.totalPackagingCost += Number(o.packagingCost || 0);
    group.totalOtherCost += Number(o.otherCost || 0);
    group.totalBankSettlement += Number(o.bankSettlement || 0);
    group.totalCost += Number(o.totalCost || 0);
  });
  const skuGroupedList = Array.from(skuGroupedMap.values());

  // Overall Statistics
  const statsTotalOrders = filteredOrders.length;
  const statsTotalQuantity = filteredOrders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const statsTotalPurchase = filteredOrders.reduce((sum, o) => sum + Number(o.purchaseCost || 0), 0);
  const statsTotalPackaging = filteredOrders.reduce((sum, o) => sum + Number(o.packagingCost || 0), 0);
  const statsTotalOther = filteredOrders.reduce((sum, o) => sum + Number(o.otherCost || 0), 0);
  const statsTotalBankSettlement = filteredOrders.reduce((sum, o) => sum + Number(o.bankSettlement || 0), 0);
  const statsTotalCost = filteredOrders.reduce((sum, o) => sum + Number(o.totalCost || 0), 0);
  const statsTotalNetMargin = statsTotalBankSettlement - statsTotalCost;

  const handleOpenBulkSkuModal = (group) => {
    const sample = group.sampleOrder || {};
    setBulkSkuModal({
      isOpen: true,
      skuId: group.skuId,
      productName: group.productName,
      count: group.count,
      purchaseCost: sample.purchaseCost !== undefined ? String(sample.purchaseCost) : '',
      packagingCost: sample.packagingCost !== undefined ? String(sample.packagingCost) : '',
      otherCost: sample.otherCost !== undefined ? String(sample.otherCost) : '',
      bankSettlement: sample.bankSettlement !== undefined ? String(sample.bankSettlement) : ''
    });
  };

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

    setBulkSkuModal(prev => ({ ...prev, isOpen: false }));
  };



  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No orders to export.");
      return;
    }

    const headers = [
      "Order Date", "Order ID", "AWB Number", "Payment Type", "Product Name", "SKU ID", "Qty",
      "Purchase Cost", "Packaging Cost", "Other Cost", "Total Cost", "Bank Settlement", "Net Margin"
    ];

    const rows = filteredOrders.map(o => {
      const oDateStr = o.orderDate ? new Date(o.orderDate).toISOString().split('T')[0] : (o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '');
      return [
        oDateStr, o.orderNumber, o.awbNumber, o.paymentType, `"${(o.productName || '').replace(/"/g, '""')}"`,
        o.skuId, o.quantity || 1, o.purchaseCost || 0, o.packagingCost || 0, o.otherCost || 0,
        o.totalCost || 0, o.bankSettlement || 0, (o.bankSettlement || 0) - (o.totalCost || 0)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wellmora_orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20">

      {/* =========================================================
          1. HERO DASHBOARD BANNER - RECREATED MODERN DESIGN
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
                  Real-Time Direct Sync
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 sm:pt-0 w-full sm:w-auto">
            {/* Primary Action Button - Full width on Mobile */}
            <button
              onClick={openNewOrderForm}
              className="order-1 sm:order-3 w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 text-xs sm:text-xs font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer border border-amber-300/40"
            >
              <Plus size={16} />
              <span className="whitespace-nowrap">New Order Entry</span>
            </button>

            {/* Secondary Actions Row - Side-by-Side 50/50 on Mobile */}
            <div className="order-2 sm:order-1 flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-[11px] sm:text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 backdrop-blur-md transition-all cursor-pointer border border-white/20 shadow-sm whitespace-nowrap"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          1.5 DATE WISE FILTER & DYNAMIC PRICING TOOLBAR
         ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Date Wise Filter & Order Frame
            </h2>
            {dateFrameFilter !== 'all' && (
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] rounded-full uppercase border border-blue-200 dark:border-blue-800">
                Filter Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {dateFrameFilter !== 'all' && (
              <button
                onClick={() => {
                  setDateFrameFilter('all');
                  setOrderStartDate('');
                  setOrderEndDate('');
                }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Reset Date Filter
              </button>
            )}
          </div>
        </div>

        {/* Date Frame Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'custom', label: 'Custom Range' }
          ].map((df) => (
            <button
              key={df.id}
              onClick={() => setDateFrameFilter(df.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                dateFrameFilter === df.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {dateFrameFilter === 'custom' && (
          <div className="pt-2 flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-slide-up">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">From Date:</span>
              <input
                type="date"
                value={orderStartDate}
                onChange={(e) => setOrderStartDate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">To Date:</span>
              <input
                type="date"
                value={orderEndDate}
                onChange={(e) => setOrderEndDate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          2. STATISTICAL KPI OVERVIEW CARDS
         ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Orders</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <PackageCheck size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{statsTotalOrders}</span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">({statsTotalQuantity} units)</span>
          </div>
        </div>

        {/* Bank Settlement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Bank Settlement</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">₹{statsTotalBankSettlement.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Total Costs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <TrendingUp size={16} className="rotate-180" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">₹{statsTotalCost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Net Profit Margin</span>
            <div className={`p-2 rounded-xl ${statsTotalNetMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'}`}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xl sm:text-2xl font-black tracking-tight ${statsTotalNetMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              ₹{statsTotalNetMargin.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. CONTROLS BAR: SEARCH, FILTERS & VIEW MODES
         ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID (OD...), SKU, AWB, Product Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
          {/* Payment Type Filters */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            {['all', 'PREPAID', 'COD'].map((pt) => (
              <button
                key={pt}
                onClick={() => setPaymentTypeFilter(pt)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  paymentTypeFilter === pt
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {pt.toUpperCase()}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'individual'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>All Orders ({filteredOrders.length})</span>
            </button>

            <button
              onClick={() => setViewMode('sku_grouped')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'sku_grouped'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>SKU Grouped ({skuGroupedList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          4. CONTENT VIEWS (INDIVIDUAL OR SKU GROUPED)
         ========================================================= */}
      {viewMode === 'individual' ? (
        /* INDIVIDUAL ORDERS VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="py-3.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      title="Select / Deselect All Orders"
                    />
                  </th>
                  <th className="py-3.5 px-4">Order Date</th>
                  <th className="py-3.5 px-4">Order & Product Identification</th>
                  <th className="py-3.5 px-4 text-center">SKU ID & Qty</th>
                  <th className="py-3.5 px-4 text-right">Purchase Cost</th>
                  <th className="py-3.5 px-4 text-right">Packaging Cost</th>
                  <th className="py-3.5 px-4 text-right">Bank Settlement</th>
                  <th className="py-3.5 px-4 text-right">Net Margin</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <Box size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm">No Order Entries Found</p>
                      <p className="text-xs text-slate-400">Click "New Order Entry" or upload a shipping PDF to create entries.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const margin = (o.bankSettlement || 0) - (o.totalCost || 0);
                    const rawDate = o.orderDate || o.createdAt;
                    const dateFormatted = rawDate
                      ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A';
                    return (
                      <tr key={o._id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${selectedOrderIds.includes(o._id || o.orderNumber) ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''}`}>
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(o._id || o.orderNumber)}
                            onChange={() => toggleSelectOrder(o._id || o.orderNumber)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap flex items-center gap-1.5 w-max">
                            <Calendar size={12} className="text-blue-500" />
                            {dateFormatted}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {o.labelImage ? (
                              <button
                                onClick={() => setPreviewImageModal(o.labelImage)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 relative group cursor-pointer"
                              >
                                <img src={o.labelImage} alt="Label Proof" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye size={14} />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50 text-[10px]">
                                OD
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900 dark:text-white font-mono">{o.orderNumber}</span>
                                <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9.5px] uppercase ${
                                  o.paymentType === 'COD' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                  {o.paymentType || 'PREPAID'}
                                </span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 max-w-xs mt-0.5">{o.productName || 'Standard Product'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{o.skuId || 'N/A'}</span>
                          <div className="text-[10.5px] text-slate-400">Qty: {o.quantity || 1}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          ₹{Number(o.purchaseCost || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          ₹{Number(o.packagingCost || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Number(o.bankSettlement || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black">
                          <span className={margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            ₹{margin.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditClick(o)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title="Edit Order Settlement"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingOrder(o)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Order Entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Box size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No Orders Found</p>
              </div>
            ) : (
              filteredOrders.map((o) => {
                const margin = (o.bankSettlement || 0) - (o.totalCost || 0);
                const rawDate = o.orderDate || o.createdAt;
                const dateFormatted = rawDate
                  ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A';

                return (
                  <div key={o._id} className={`p-4 space-y-3 ${selectedOrderIds.includes(o._id || o.orderNumber) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(o._id || o.orderNumber)}
                          onChange={() => toggleSelectOrder(o._id || o.orderNumber)}
                          className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold text-[10px] rounded-md flex items-center gap-1">
                            <Calendar size={11} className="text-blue-500 shrink-0" />
                            {dateFormatted}
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[9.5px] rounded uppercase">
                            {o.paymentType || 'PREPAID'}
                          </span>
                        </div>
                        <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                          {o.orderNumber}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">{o.productName || 'Standard Product'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClick(o)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 cursor-pointer"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingOrder(o)}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 active:scale-95 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 text-center font-mono text-[11px]">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Purchase</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">₹{o.purchaseCost || 0}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Bank Payout</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{o.bankSettlement || 0}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Net Margin</span>
                        <span className={`font-black ${margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          ₹{margin}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* SKU GROUPED VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skuGroupedList.map((group) => {
            const margin = group.totalBankSettlement - group.totalCost;
            return (
              <div
                key={group.skuId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                      <Layers size={18} />
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-full">
                      {group.count} Orders
                    </span>
                  </div>

                  <h3 className="font-black text-sm text-slate-900 dark:text-white mt-3 font-mono">{group.skuId}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{group.productName}</p>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs font-mono">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Settlement</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">₹{group.totalBankSettlement.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Net Margin</span>
                      <span className={`font-black ${margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ₹{margin.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenBulkSkuModal(group)}
                  className="w-full py-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-2xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Edit size={14} />
                  <span>Bulk Edit Settlement for SKU ({group.count})</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          5. ADD / EDIT ORDER ENTRY POPUP MODAL
          (COMPACT & NON-SCROLLABLE OUTER CONTAINER FOR MOBILE)
         ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          {/* Inner Dialog Container - Fixed non-scrollable outer container */}
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-md">
                  <Box size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {editingId ? 'Edit Order Entry Settlement' : 'New Order Entry'}
                  </h2>
                  <p className="text-[11px] text-slate-400">Order Financial Settlement & Tracking</p>
                </div>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Step Switcher Bar */}
            <div className="flex sm:hidden border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 shrink-0 text-[11px]">
              {[
                { id: 1, label: '1. Identification' },
                { id: 2, label: '2. Costs' },
                { id: 3, label: '3. Settlement' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFormStep(s.id)}
                  className={`flex-1 py-1.5 font-extrabold rounded-xl transition-all ${
                    formStep === s.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Scrollable Form Content (Internal Section Scrolling Only) */}
            <form id="order-entry-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              
              {/* FILE UPLOAD & OCR SCANNER BAR */}
              {(formStep === 1 || window.innerWidth >= 640) && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-3 sm:p-4 rounded-2xl border-2 border-dashed transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                        <UploadCloud size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Auto-Detect via Shipping Label</h4>
                        <p className="text-[10.5px] text-slate-400">Upload PDF or Image to auto-detect Order ID, SKU & Product Name</p>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isScanning ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                      <span>{isScanning ? 'Scanning...' : 'Select PDF / Image'}</span>
                    </button>
                  </div>

                  {/* Scanning Progress */}
                  {isScanning && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        <span>{scanStatusMessage}</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1 / BOX 1: ORDER IDENTIFICATION */}
              {(formStep === 1 || window.innerWidth >= 640) && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60">
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Box size={14} />
                    <span>Box 1: Order & Product Identification</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Order Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Order ID (OD...) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. OD33818113627"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Type
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="PREPAID">PREPAID</option>
                        <option value="COD">COD (Cash on Delivery)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Product Name Only
                      </label>
                      <input
                        type="text"
                        placeholder="Concise product title..."
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                          SKU ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. WE-SEALANT"
                          value={skuId}
                          onChange={(e) => handleSkuIdChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 / BOX 2: FINANCIAL COSTS & EXPENSES */}
              {(formStep === 2 || window.innerWidth >= 640) && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <TrendingUp size={14} className="rotate-180" />
                    <span>Box 2: Financial Expenses & Purchase Costs</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Purchase Cost (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={purchaseCost}
                        onChange={(e) => setPurchaseCost(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Packaging Cost (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={packagingCost}
                        onChange={(e) => setPackagingCost(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Other Cost (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={otherCost}
                        onChange={(e) => setOtherCost(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 / BOX 3: BANK SETTLEMENT */}
              {(formStep === 3 || window.innerWidth >= 640) && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <DollarSign size={14} />
                    <span>Box 3: Bank Settlement (Net Payout Credited)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Bank Settlement Amount (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={bankSettlement}
                        onChange={(e) => setBankSettlement(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-mono">
                      <div className="flex justify-between text-slate-500 text-[10.5px]">
                        <span>Calculated Expenses:</span>
                        <span>₹{calculatedTotalCost}</span>
                      </div>
                      <div className="flex justify-between font-black mt-1">
                        <span>Expected Net Margin:</span>
                        <span className={calculatedMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          ₹{calculatedMargin}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Fixed Bottom Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="order-entry-form"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 size={15} />
                <span>{editingId ? 'Update Settlement' : 'Save Order Entry'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          6. DELETE ORDER CONFIRMATION MODAL
          (NON-SCROLLABLE POPUP MENU FOR MOBILE)
         ========================================================= */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Delete Order Entry?</h3>
                <p className="text-[11px] text-slate-400 font-mono font-bold">{deletingOrder.orderNumber}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-xs space-y-1 font-mono">
              <div className="text-slate-600 dark:text-slate-300 font-semibold line-clamp-1">{deletingOrder.productName || 'Standard Product'}</div>
              <div className="text-[11px] text-slate-400">SKU: {deletingOrder.skuId || 'N/A'} | Bank: ₹{deletingOrder.bankSettlement || 0}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteOrder(deletingOrder._id, deletingOrder.orderNumber);
                  setDeletingOrder(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          7. BULK SKU EDIT MODAL (NON-SCROLLABLE POPUP)
         ========================================================= */}
      {bulkSkuModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white font-mono">Bulk SKU Edit: {bulkSkuModal.skuId}</h3>
                  <p className="text-[10.5px] text-slate-400">Updates settlement & costs for all {bulkSkuModal.count} orders</p>
                </div>
              </div>
              <button onClick={() => setBulkSkuModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkSkuSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={bulkSkuModal.purchaseCost}
                    onChange={(e) => setBulkSkuModal(prev => ({ ...prev, purchaseCost: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Packaging Cost (₹)</label>
                  <input
                    type="number"
                    value={bulkSkuModal.packagingCost}
                    onChange={(e) => setBulkSkuModal(prev => ({ ...prev, packagingCost: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Settlement (₹)</label>
                <input
                  type="number"
                  value={bulkSkuModal.bankSettlement}
                  onChange={(e) => setBulkSkuModal(prev => ({ ...prev, bankSettlement: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-black text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBulkSkuModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow"
                >
                  Update SKU ({bulkSkuModal.count}) Orders
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* =========================================================
          8. PROOF IMAGE PREVIEW MODAL
         ========================================================= */}
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
            <div className="overflow-auto max-h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-800">
              <img src={previewImageModal} alt="Label Proof" className="max-w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          9. FLOATING MULTI-SELECT ACTION TOOLBAR & BULK DELETE MODAL
         ========================================================= */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white border border-slate-700 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-slide-up backdrop-blur-lg">
          <div className="flex items-center gap-2 text-xs font-black">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">
              {selectedOrderIds.length}
            </span>
            <span>Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 size={14} />
            <span>Delete Selected ({selectedOrderIds.length})</span>
          </button>

          <button
            onClick={() => setSelectedOrderIds([])}
            className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Delete Selected Orders?</h3>
                <p className="text-[11px] text-slate-400 font-bold">{selectedOrderIds.length} order entry(s) will be permanently deleted.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete All {selectedOrderIds.length}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
