// src/pages/reports/reportFormat.js
// The Reports page formatters, moved here unchanged (whole rupees; null/NaN shows ₹0). They are NOT lib/format's formatCurrency.

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};