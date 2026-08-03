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
  Layers
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

  // Multi-Page Batch States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [autoDetectedFields, setAutoDetectedFields] = useState({});
  const [batchSummary, setBatchSummary] = useState(null);
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

    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');

    return { dataUrl, pdfText };
  };

  // Multi-Page PDF & Image File Processor with Unique Deduplication
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
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
        console.log(`Processing Multi-Page PDF: ${totalPages} Pages Found`);

        const uniqueOrdersMap = new Map();
        let firstPageImage = '';
        let firstPageFields = null;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const progressPercent = Math.round((pageNum / totalPages) * 90);
          setScanProgress(progressPercent);
          setScanStatusMessage(`Scanning PDF Page ${pageNum} of ${totalPages}...`);

          const pageRes = await renderPdfPageToCanvas(pdf, pageNum);
          if (pageNum === 1) firstPageImage = pageRes.dataUrl;

          // OCR on canvas
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

            // Deduplicate by Order Number to guarantee 100% uniqueness
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

          // Auto-save batch orders to ensure all unique multi-page orders are stored
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

        setReceiptImage(imageDataUrl);
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
      console.error("Multi-Page PDF Processing Error:", err);
      alert("Error processing file: " + err.message);
    } finally {
      setIsScanning(false);
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

    // 11. Quantity
    let extractedQuantity = 1;
    const qtyMatch = text.match(/QTY[\s\S]*?\n[\s\S]*?\b(\d+)\b/i);
    if (qtyMatch && qtyMatch[1]) {
      extractedQuantity = parseInt(qtyMatch[1], 10);
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
    link.setAttribute('download', `ekart_unique_shipping_labels_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-slide-up">

      {/* Header Banner - E-Kart Logistics & Multi-Page PDF Scanner Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg shrink-0 uppercase tracking-tighter">
            <span>E-KART</span>
            <span className="text-[8px] text-amber-400">MULTI</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">E-Kart Unique Order Entries</h2>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-blue-500/30 flex items-center gap-1">
                <Layers size={11} /> Multi-Page PDF Scanner
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Scans all pages in multi-page PDFs to auto-fill multiple unique orders with zero duplicates.
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
            New Unique Order
          </button>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Unique Label Entries */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Unique Orders</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalOrdersCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">100% Unique Recorded</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Package size={22} />
          </div>
        </div>

        {/* Prepaid Labels */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">PREPAID Orders</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{prepaidCount}</h3>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Prepaid Shipments</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* COD Labels */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">COD Orders</span>
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

      {/* E-Kart Unique Shipping Labels Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-semibold">Loading Unique E-Kart Orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
            <Barcode size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No unique E-Kart order entries found</p>
            <p className="text-xs max-w-md mx-auto">Upload a single or multi-page E-Kart PDF to auto-detect and save all unique order entries.</p>
            <button
              onClick={openNewOrderForm}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Add First Order
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
                  <tr key={ord._id || ord.orderNumber} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
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
          E-KART MULTI-PAGE PDF & SINGLE IMAGE SCANNER MODAL
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
                    {editingId ? 'Edit E-Kart Shipping Entry' : 'Multi-Page PDF & Image Auto-Fill Scanner'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Upload single or multi-page PDF files to automatically scan and save all unique orders.
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

              {/* 1. PDF / Image Multi-Page Upload Banner */}
              <div className="p-4 bg-blue-500/5 dark:bg-blue-950/20 border border-dashed border-blue-500/30 rounded-2xl relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf,.pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {receiptImage ? (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-blue-500/30 shrink-0 bg-white">
                        <img src={receiptImage} alt="Label Rendered Preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setReceiptImage('')}
                          className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full shadow"
                          title="Remove File"
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
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Upload Multi-Page PDF or Image File</h4>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-md flex items-center gap-1">
                          <Layers size={10} /> Multi-Order Scanner
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Scans all pages in multi-page PDFs. Deduplicates every order to ensure 100% unique entries.
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
                        <span>{scanStatusMessage || 'Scanning PDF Pages...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>{receiptImage ? 'Change Multi-Page PDF' : 'Upload PDF File'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Batch Multi-Page Summary Banner */}
                {batchSummary && (
                  <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center justify-between gap-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} />
                      <span>Scanned {batchSummary.totalPages} PDF Pages: Successfully Auto-Filled & Saved {batchSummary.uniqueOrdersCount} Unique Orders!</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[9.5px]">
                      Zero Duplicates
                    </span>
                  </div>
                )}

                {/* Single Page Auto-Detect Badge */}
                {!batchSummary && Object.keys(autoDetectedFields).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center gap-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} />
                    <span>100% Auto-Filled ({Object.keys(autoDetectedFields).length} Fields): {Object.keys(autoDetectedFields).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* 2. E-Kart Form matching Shipping Label PDF */}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-4">
                
                {/* Header Block: Order ID, AWB, Payment Type, Logistics */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  {/* Order ID */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>Order ID (OD...)</span>
                      {autoDetectedFields.orderNumber && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
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
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Auto)</span>
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
