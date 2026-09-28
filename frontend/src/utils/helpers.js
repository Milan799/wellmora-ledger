/**
 * Shared utility helpers for Wellmora Ledger
 * Ensures clean date handling, timezone preservation (IST), and description formatting
 */

// Returns current local date in YYYY-MM-DD format (respects user's local timezone like IST UTC+05:30)
export const getTodayLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

// Formats any date input into YYYY-MM-DD local string
export const toLocalDateString = (dateInput) => {
  if (!dateInput) return getTodayLocalDate();
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const dt = new Date(dateInput);
  if (isNaN(dt.getTime())) return getTodayLocalDate();
  const offset = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - offset).toISOString().split('T')[0];
};

// Clean wholesale product description: strips [Wholesale: Seller] and (X pcs @ ₹Y) prefixes/suffixes
export const cleanWholesaleDescription = (desc) => {
  if (!desc) return '';
  return String(desc)
    .replace(/^\[Wholesale:\s*[^\]]+\]\s*/gi, '')
    .replace(/\s*\(\d+(?:\.\d+)?\s*pcs\s*@\s*₹?\d+(?:\.\d+)?\)$/gi, '')
    .replace(/^\[Wholesale:\s*[^\]]+\]\s*/gi, '')
    .trim();
};

// Format a wholesale description for standard ledger / expenses table
export const formatWholesaleLedgerDescription = (seller, description, quantity, unitPrice) => {
  const clean = cleanWholesaleDescription(description);
  const sellerLabel = seller || 'Wholesaler';
  const qty = Number(quantity) || 1;
  const price = Number(unitPrice) || 0;
  return `[Wholesale: ${sellerLabel}] ${clean} (${qty} pcs @ ₹${price})`;
};

// Format INR currency
export const formatCurrencyINR = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(val || 0);
};

// Robust display date formatting (e.g. "28 Sep 2026")
export const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  try {
    const str = String(dateInput).trim();
    if (str.includes('T')) {
      const [datePart] = str.split('T');
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const [y, m, d] = datePart.split('-').map(Number);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d} ${months[m - 1]} ${y}`;
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d} ${months[m - 1]} ${y}`;
    }
    const dt = new Date(dateInput);
    if (isNaN(dt.getTime())) return 'N/A';
    return dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return 'N/A';
  }
};
