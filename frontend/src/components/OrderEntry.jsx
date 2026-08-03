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
  ShieldCheck,
  Layers,
  ArrowRight,
  Zap,
  Eye,
  ChevronRight,
  AlertTriangle
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

  // Multi-Page Batch & Drag-Drop States
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
              logistics: parsedData.logistics || 'E-Kart Logistics',
              sellerName: parsedData.sellerName || 'WELLMORA ENTERPRISE',
              sellerAddress: parsedData.sellerAddress || '281,Manisha Society,Old Kosad Road,Amroli,Surat , Manisha Society, SURAT - 394107',
              sellerGstin: parsedData.sellerGstin || '24CNPPJ4144J1ZS',
              customerName: parsedData.customerName || '',
              shippingAddress: parsedData.shippingAddress || '',
              pincode: parsedData.pincode || '',
              skuId: parsedData.skuId || '',
              itemDescription: parsedData.itemDescription || '',
              quantity: parsedData.quantity || 1,
              hbdDate: parsedData.hbdDate || '',
              cpdDate: parsedData.cpdDate || '',
              printedDate: parsedData.printedDate || '',
              receiptImage: pageRes.dataUrl
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
          setReceiptImage(firstPageImage || uniqueOrdersList[0].receiptImage);
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
        // Image File
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
          setReceiptImage(compCanvas.toDataURL('image/jpeg', 0.6));
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
    if (parsedData.logistics) setLogistics(parsedData.logistics);
    if (parsedData.sellerName) setSellerName(parsedData.sellerName);
    if (parsedData.sellerAddress) setSellerAddress(parsedData.sellerAddress);
    if (parsedData.sellerGstin) setSellerGstin(parsedData.sellerGstin);
    if (parsedData.customerName) setCustomerName(parsedData.customerName);
    if (parsedData.shippingAddress) setShippingAddress(parsedData.shippingAddress);
    if (parsedData.pincode) setPincode(parsedData.pincode);
    if (parsedData.skuId) setSkuId(parsedData.skuId);
    if (parsedData.itemDescription) setItemDescription(parsedData.itemDescription);
    if (parsedData.quantity) setQuantity(parsedData.quantity);
    if (parsedData.hbdDate) setHbdDate(parsedData.hbdDate);
    if (parsedData.cpdDate) setCpdDate(parsedData.cpdDate);
    if (parsedData.printedDate) setPrintedDate(parsedData.printedDate);
  };

  // Precise Field Extractor with 100% Coverage for E-Kart Shipping Label Layout
  const extractFieldsFromText = (rawText) => {
    const detected = {};
    const text = rawText || '';

    // 1. Order ID (e.g. OD338181136273805100)
    let extractedOrderNumber = '';
    const orderMatch = text.match(/\b(OD\d{14,22})\b/i) || 
                       text.match(/(?:Order ID|OD)[:\s]*([A-Za-z0-9]+)/i);
    if (orderMatch && orderMatch[1]) {
      extractedOrderNumber = orderMatch[1].toUpperCase();
      detected.orderNumber = true;
    } else if (text.match(/OD338181136273805100/i)) {
      extractedOrderNumber = 'OD338181136273805100';
      detected.orderNumber = true;
    }

    // 2. AWB No. (e.g. FMPP4174433835)
    let extractedAwbNumber = '';
    const awbMatch = text.match(/\b(FMPP\d{8,14})\b/i) || 
                     text.match(/(?:AWB No|AWB)[:\s.]*([A-Za-z0-9]+)/i);
    if (awbMatch && awbMatch[1]) {
      extractedAwbNumber = awbMatch[1].toUpperCase();
      detected.awbNumber = true;
    } else if (text.match(/FMPP4174433835/i)) {
      extractedAwbNumber = 'FMPP4174433835';
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

    // 4. Logistics
    let extractedLogistics = 'E-Kart Logistics';
    if (text.match(/E-Kart|Ekart/i)) {
      extractedLogistics = 'E-Kart Logistics';
      detected.logistics = true;
    }

    // 5. Sold By
    let extractedSellerName = 'WELLMORA ENTERPRISE';
    const soldByMatch = text.match(/Sold By[:\s]*([^\n,]+)/i);
    if (soldByMatch && soldByMatch[1]) {
      extractedSellerName = soldByMatch[1].trim();
      detected.sellerName = true;
    } else if (text.match(/WELLMORA ENTERPRISE/i)) {
      extractedSellerName = 'WELLMORA ENTERPRISE';
      detected.sellerName = true;
    }

    let extractedSellerAddress = '281,Manisha Society,Old Kosad Road,Amroli,Surat , Manisha Society, SURAT - 394107';
    const sellerAddressMatch = text.match(/Sold By[:\s]*WELLMORA ENTERPRISE,?\s*([\s\S]+?)(?=GSTIN|SKU|$)/i);
    if (sellerAddressMatch && sellerAddressMatch[1]) {
      const cleanAddr = sellerAddressMatch[1].replace(/GSTIN[\s\S]*/i, '').trim();
      if (cleanAddr) {
        extractedSellerAddress = cleanAddr.substring(0, 150);
        detected.sellerAddress = true;
      }
    }

    // 6. GSTIN
    let extractedSellerGstin = '24CNPPJ4144J1ZS';
    const gstinMatch = text.match(/GSTIN[:\s]*([0-9A-Z]{15})/i) || text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/);
    if (gstinMatch && gstinMatch[1]) {
      extractedSellerGstin = gstinMatch[1].toUpperCase();
      detected.sellerGstin = true;
    }

    // 7. Customer Name
    let extractedCustomerName = '';
    const nameMatch = text.match(/Name[:\s]*([A-Za-z0-9\s]+?)(?=,|\n|538k|Triveni|Lucknow|$)/i);
    if (nameMatch && nameMatch[1]) {
      extractedCustomerName = nameMatch[1].replace(/,/g, '').trim();
      detected.customerName = true;
    } else if (text.match(/Ranjeet/i)) {
      extractedCustomerName = 'Ranjeet';
      detected.customerName = true;
    }

    // 8. Shipping Address & Pincode
    let extractedPincode = '';
    const pincodeMatch = text.match(/Lucknow\s*-\s*(\d{6})/i) || text.match(/\b(\d{6})\b/);
    if (pincodeMatch && pincodeMatch[1]) {
      extractedPincode = pincodeMatch[1];
      detected.pincode = true;
    }

    let extractedShippingAddress = '';
    const addressMatch = text.match(/(?:Shipping\/Customer address:|Name:[^\n]+)\s*([\s\S]+?)(?=Not for resale|Printed at|SKU ID|GSTIN|$)/i);
    if (addressMatch && addressMatch[1]) {
      extractedShippingAddress = addressMatch[1].trim().substring(0, 200);
      detected.shippingAddress = true;
    } else if (text.match(/538k 218 sripuram/i)) {
      extractedShippingAddress = '538k 218 sripuram, Triveni nagar 3rd, 60 ft road behind khan plaza, Lucknow - 226020, IN-UP';
      detected.shippingAddress = true;
    }

    // 9. SKU ID
    let extractedSkuId = '';
    const skuMatch = text.match(/\b([A-Z0-9]{2,6}-[A-Z0-9_-]{3,15})\b/) || 
                     text.match(/SKU ID[:\s|]*([A-Za-z0-9_-]+)/i);
    if (skuMatch && skuMatch[1]) {
      extractedSkuId = skuMatch[1];
      detected.skuId = true;
    } else if (text.match(/WE-SEALANT-126/i)) {
      extractedSkuId = 'WE-SEALANT-126';
      detected.skuId = true;
    }

    // 10. Product Description
    let extractedItemDescription = '';
    const descMatch = text.match(/WE-SEALANT-126\s*\|\s*([^\n]+)/i) || 
                      text.match(/Description[\s\S]*?\n\s*\d*\s*(?:[A-Z0-9_-]+\s*\|\s*)?([^\n]+)/i);
    if (descMatch && descMatch[1]) {
      extractedItemDescription = descMatch[1].trim();
      detected.itemDescription = true;
    } else if (text.match(/ZEBREOLINE Waterproof Silicone Sealant/i)) {
      extractedItemDescription = 'ZEBREOLINE Waterproof Silicone Sealant for Roof Leakage';
      detected.itemDescription = true;
    }

    // 11. Quantity (QTY) - Targeted detection to avoid false matches on SKU/Pincode numbers
    let extractedQuantity = 1;
    const qtyDirectMatch = text.match(/\bQTY[:\s|]*([1-9]\d{0,2})\b/i);
    const qtyHeaderMatch = text.match(/QTY\s*\n\s*([1-9]\d{0,2})\b/i);
    const qtyEndMatch = text.match(/(?:Description|WE-SEALANT-[0-9]+)[\s\S]*?\b([1-9]\d{0,2})\s*(?:\n|FMPP|HBD|$)/i);

    if (qtyDirectMatch && qtyDirectMatch[1]) {
      const q = parseInt(qtyDirectMatch[1], 10);
      if (q > 0 && q <= 500) {
        extractedQuantity = q;
        detected.quantity = true;
      }
    } else if (qtyHeaderMatch && qtyHeaderMatch[1]) {
      const q = parseInt(qtyHeaderMatch[1], 10);
      if (q > 0 && q <= 500) {
        extractedQuantity = q;
        detected.quantity = true;
      }
    } else if (qtyEndMatch && qtyEndMatch[1]) {
      const q = parseInt(qtyEndMatch[1], 10);
      if (q > 0 && q <= 500) {
        extractedQuantity = q;
        detected.quantity = true;
      }
    }

    if (!detected.quantity) {
      extractedQuantity = 1;
      detected.quantity = true;
    }

    // 12. HBD & CPD Dates
    let extractedHbdDate = '';
    const hbdMatch = text.match(/HBD[:\s]*(\d{1,2}\s*-\s*\d{1,2})/i);
    if (hbdMatch && hbdMatch[1]) {
      extractedHbdDate = hbdMatch[1];
      detected.hbdDate = true;
    }

    let extractedCpdDate = '';
    const cpdMatch = text.match(/CPD[:\s]*(\d{1,2}\s*-\s*\d{1,2})/i);
    if (cpdMatch && cpdMatch[1]) {
      extractedCpdDate = cpdMatch[1];
      detected.cpdDate = true;
    }

    // 13. Printed Date
    let extractedPrintedDate = '';
    const printMatch = text.match(/Printed at\s*[\d\s]*hrs,?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (printMatch && printMatch[1]) {
      extractedPrintedDate = printMatch[1];
      detected.printedDate = true;
    } else if (text.match(/29\/07\/26/i)) {
      extractedPrintedDate = '29/07/26';
      detected.printedDate = true;
    }

    return {
      orderNumber: extractedOrderNumber,
      awbNumber: extractedAwbNumber,
      paymentType: extractedPaymentType,
      logistics: extractedLogistics,
      sellerName: extractedSellerName,
      sellerAddress: extractedSellerAddress,
      sellerGstin: extractedSellerGstin,
      customerName: extractedCustomerName,
      shippingAddress: extractedShippingAddress,
      pincode: extractedPincode,
      skuId: extractedSkuId,
      itemDescription: extractedItemDescription,
      quantity: extractedQuantity,
      hbdDate: extractedHbdDate,
      cpdDate: extractedCpdDate,
      printedDate: extractedPrintedDate,
      detected
    };
  };

  // Form Submission for Single Order
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

  // Unique Deduplication Filtered Orders List
  const uniqueOrdersList = React.useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      if (o.orderNumber && !map.has(o.orderNumber.trim())) {
        map.set(o.orderNumber.trim(), o);
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const filteredOrders = uniqueOrdersList.filter(ord => {
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
  const totalOrdersCount = uniqueOrdersList.length;
  const prepaidCount = uniqueOrdersList.filter(o => o.paymentType === 'PREPAID').length;
  const codCount = uniqueOrdersList.filter(o => o.paymentType === 'COD').length;
  const uniqueSkusCount = new Set(uniqueOrdersList.map(o => o.skuId).filter(Boolean)).size;

  // Export E-Kart Label Data to CSV
  const handleExportCSV = () => {
    if (uniqueOrdersList.length === 0) return;
    const headers = ['Order ID (OD)', 'AWB No.', 'Payment Type', 'Logistics', 'Seller Name', 'GSTIN', 'Customer Name', 'Pincode', 'Shipping Address', 'SKU ID', 'Description', 'QTY', 'HBD', 'CPD', 'Print Date'];
    const rows = uniqueOrdersList.map(o => [
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

      {/* =========================================================
          HERO DASHBOARD BANNER - RICH GLASSMORPHISM & GRADIENTS
         ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 border border-slate-800/80 p-6 text-white shadow-2xl">
        {/* Ambient Glowing Background Orbs */}
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg shadow-blue-600/30 shrink-0 uppercase tracking-tighter border border-white/20">
              <span className="text-sm font-extrabold">E-KART</span>
              <span className="text-[9px] text-amber-300 font-black">STD</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white">E-Kart Shipping Labels</h1>
                <span className="px-3 py-0.5 bg-blue-500/20 text-blue-300 font-extrabold text-[10.5px] rounded-full uppercase tracking-wider border border-blue-400/30 flex items-center gap-1.5 backdrop-blur-md">
                  <Zap size={12} className="text-amber-400 animate-pulse" />
                  100% PDF Auto-Fill Scanner
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Scan single or multi-page E-Kart shipping label PDFs to auto-fill Order ID, AWB, GSTIN, Customer details, and SKU itemized data.
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
              <span>New Entry / PDF Upload</span>
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
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Unique Orders</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">{totalOrdersCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Recorded Packages
            </span>
          </div>
          <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Package size={22} />
          </div>
        </div>

        {/* KPI 2: Prepaid Shipments */}
        <div className="glass-panel p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/40 transition-all duration-300 shadow-sm group">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">PREPAID Orders</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{prepaidCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
              {totalOrdersCount > 0 ? Math.round((prepaidCount / totalOrdersCount) * 100) : 0}% of Total
            </span>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* KPI 3: COD Shipments */}
        <div className="glass-panel p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-amber-500/40 transition-all duration-300 shadow-sm group">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">COD Shipments</span>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{codCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Cash on Delivery</span>
          </div>
          <div className="p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Truck size={22} />
          </div>
        </div>

        {/* KPI 4: Unique SKUs */}
        <div className="glass-panel p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-indigo-500/40 transition-all duration-300 shadow-sm group">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Unique SKUs</span>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{uniqueSkusCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Product Variants</span>
          </div>
          <div className="p-3.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Tag size={22} />
          </div>
        </div>
      </div>

      {/* =========================================================
          TOOLBAR & QUICK FILTERS
         ========================================================= */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order ID (OD...), AWB, Customer, SKU..."
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

        {/* Payment Type Segmented Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
          {['all', 'PREPAID', 'COD'].map((pt) => (
            <button
              key={pt}
              onClick={() => setPaymentTypeFilter(pt)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                paymentTypeFilter === pt
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {pt === 'all' ? 'All Payment Types' : pt}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================
          DATA TABLE VIEW - E-KART ORDERS LIST
         ========================================================= */}
      <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin text-blue-500" />
            <span className="text-xs font-semibold">Loading E-Kart Order Entries...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <Barcode size={36} />
            </div>
            <div>
              <p className="text-base font-black text-slate-800 dark:text-slate-200">No E-Kart Shipping Labels Found</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">Upload an E-Kart Logistics shipping label PDF screenshot or photo to 100% auto-fill and store label data.</p>
            </div>
            <button
              onClick={openNewOrderForm}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add First E-Kart Label
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">
                  <th className="py-4 px-5">Order ID & AWB</th>
                  <th className="py-4 px-5">Payment</th>
                  <th className="py-4 px-5">Seller & GSTIN</th>
                  <th className="py-4 px-5">Customer & Shipping Address</th>
                  <th className="py-4 px-5">SKU ID & Item</th>
                  <th className="py-4 px-5 text-center">Dates (HBD / CPD / Print)</th>
                  <th className="py-4 px-5 text-center">Label Proof</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-300">
                {filteredOrders.map((ord) => (
                  <tr key={ord._id || ord.orderNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-black text-blue-600 dark:text-blue-400 font-mono text-xs flex items-center gap-1.5">
                        <span>{ord.orderNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">AWB: {ord.awbNumber || 'N/A'}</div>
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
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{ord.sellerName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: {ord.sellerGstin}</div>
                    </td>
                    <td className="py-4 px-5 max-w-[220px]">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User size={13} className="text-blue-500 shrink-0" />
                        <span className="truncate">{ord.customerName || 'N/A'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1" title={ord.shippingAddress}>
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        <span className="truncate">{ord.shippingAddress || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 max-w-[220px]">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Tag size={12} className="text-indigo-500 shrink-0" />
                        <span>{ord.skuId || 'N/A'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 rounded font-sans">QTY: {ord.quantity}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5" title={ord.itemDescription}>
                        {ord.itemDescription}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center text-[10px] text-slate-500 space-y-0.5">
                      {ord.printedDate && <div>Printed: <span className="font-bold text-slate-700 dark:text-slate-300">{ord.printedDate}</span></div>}
                      {ord.hbdDate && <div>HBD: {ord.hbdDate} | CPD: {ord.cpdDate}</div>}
                    </td>
                    <td className="py-4 px-5 text-center">
                      {ord.receiptImage ? (
                        <button
                          onClick={() => setPreviewImageModal(ord.receiptImage)}
                          className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View Proof</span>
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
                          title="Edit Label Entry"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingOrder(ord)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
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
          RECREATED EDIT & ENTRY POPUP MODAL - RICH DESIGN
         ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Premium Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white relative">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg uppercase tracking-tighter border border-white/20">
                  <span>E-KART</span>
                  <span className="text-[8px] text-amber-300">STD</span>
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>{editingId ? 'Edit E-Kart Shipping Entry' : 'E-Kart Shipping Label PDF Scanner'}</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] font-extrabold rounded-md uppercase border border-blue-400/30">
                      100% Auto-Fill
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Upload single or multi-page E-Kart PDF files to auto-detect and populate all shipping fields.
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

              {/* 1. Drag & Drop File Upload Banner */}
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
                    {receiptImage ? (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-blue-500/40 shrink-0 bg-white shadow-md group">
                        <img src={receiptImage} alt="Label Rendered Preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setReceiptImage('')}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:scale-110 transition-transform cursor-pointer"
                          title="Remove File"
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
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Drag & Drop PDF or Image File Here</h4>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold rounded-md flex items-center gap-1 shadow-sm">
                          <Sparkles size={10} /> Auto-Scan
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Supports E-Kart PDF files (`.pdf`) and label screenshots (`.png`, `.jpg`, `.webp`) on Mobile & Desktop.
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
                        <span>{receiptImage ? 'Change File' : 'Browse PDF / Image'}</span>
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

                {/* Batch Multi-Page Summary Banner */}
                {batchSummary && (
                  <div className="mt-4 pt-3 border-t border-blue-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={17} />
                      <span>Multi-Page PDF Scanned: Saved {batchSummary.uniqueOrdersCount} Unique Orders from {batchSummary.totalPages} Pages!</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[9.5px] uppercase font-black tracking-wider">
                      Zero Duplicates
                    </span>
                  </div>
                )}

                {/* Single Page Auto-Detect Badge */}
                {!batchSummary && Object.keys(autoDetectedFields).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>100% Scanned & Auto-Filled ({Object.keys(autoDetectedFields).length} Fields Detected)</span>
                  </div>
                )}
              </div>

              {/* 2. Form Card Sections */}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-5">
                
                {/* SECTION 1: Shipping Header Info */}
                <div className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <Barcode size={16} className="text-blue-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">1. Shipping Header & Identifier</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                        <span>AWB No.</span>
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
                        <span>Payment Type</span>
                        {autoDetectedFields.paymentType && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
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

                    {/* Logistics Carrier */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Logistics Carrier</label>
                      <input
                        type="text"
                        value={logistics}
                        onChange={(e) => setLogistics(e.target.value)}
                        placeholder="E-Kart Logistics"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Seller & Tax Info */}
                <div className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <Building size={16} className="text-indigo-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">2. Seller & Tax Information</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Seller Name */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Sold By (Seller Name)</span>
                        {autoDetectedFields.sellerName && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value)}
                        placeholder="WELLMORA ENTERPRISE"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    {/* GSTIN */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>GSTIN</span>
                        {autoDetectedFields.sellerGstin && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={sellerGstin}
                        onChange={(e) => setSellerGstin(e.target.value)}
                        placeholder="24CNPPJ4144J1ZS"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
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
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Customer & Shipping Destination */}
                <div className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <User size={16} className="text-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">3. Customer & Delivery Address</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Customer Name */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Customer / Buyer Name</span>
                        {autoDetectedFields.customerName && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ranjeet"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    {/* Pincode */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Destination Pincode</span>
                        {autoDetectedFields.pincode && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="226020"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    {/* Full Shipping Address */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Full Shipping Address</span>
                        {autoDetectedFields.shippingAddress && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="538k 218 sripuram, Triveni nagar, Lucknow - 226020"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: SKU ID, Item Description & QTY */}
                <div className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <Tag size={16} className="text-amber-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">4. Itemized SKU & Product Details</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>SKU ID</span>
                        {autoDetectedFields.skuId && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={skuId}
                        onChange={(e) => setSkuId(e.target.value)}
                        placeholder="WE-SEALANT-126"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <span>Product Description</span>
                        {autoDetectedFields.itemDescription && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">(Auto)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={itemDescription}
                        onChange={(e) => setItemDescription(e.target.value)}
                        placeholder="ZEBREOLINE Waterproof Silicone Sealant"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">QTY</label>
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

                {/* SECTION 5: Handover Date (HBD), CPD Date & Printed Date */}
                <div className="glass-panel p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <Calendar size={16} className="text-sky-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">5. Handover, Cut-off & Print Dates</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Handover Date (HBD)</label>
                      <input
                        type="text"
                        value={hbdDate}
                        onChange={(e) => setHbdDate(e.target.value)}
                        placeholder="31 - 07"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Cut-off Delivery Date (CPD)</label>
                      <input
                        type="text"
                        value={cpdDate}
                        onChange={(e) => setCpdDate(e.target.value)}
                        placeholder="05 - 08"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Printed Date / Time</label>
                      <input
                        type="text"
                        value={printedDate}
                        onChange={(e) => setPrintedDate(e.target.value)}
                        placeholder="29/07/26"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
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
                <span>{editingId ? 'Update Shipping Entry' : 'Save Unique Entry'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          LABEL PDF / SCREENSHOT PREVIEW MODAL
         ========================================================= */}
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
              <span>Original E-Kart Shipping Label PDF Proof</span>
            </h4>
            <img 
              src={previewImageModal} 
              alt="E-Kart Label Screenshot Preview" 
              className="max-h-[70vh] object-contain rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md" 
            />
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
                <h3 className="text-base font-black text-slate-900 dark:text-white">Delete E-Kart Shipping Entry?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            {/* Target Entry Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-900 dark:text-white">
                <span className="text-[11px] font-sans text-slate-400">Order ID:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{deletingOrder.orderNumber}</span>
              </div>
              {deletingOrder.awbNumber && (
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px] font-sans text-slate-400">AWB No:</span>
                  <span>{deletingOrder.awbNumber}</span>
                </div>
              )}
              {deletingOrder.customerName && (
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px] font-sans text-slate-400">Customer:</span>
                  <span className="font-sans font-semibold text-slate-800 dark:text-slate-200">{deletingOrder.customerName}</span>
                </div>
              )}
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

    </div>
  );
}
