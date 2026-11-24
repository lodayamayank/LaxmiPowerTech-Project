// src/pages/payroll/payrollFormat.js
// Money formatting for the payroll pages. This is the formatter these pages always used (whole rupees,
// en-IN grouping): it is NOT lib/format's formatCurrency, which shows paise for fractional amounts.
// Kept apart on purpose so payroll figures keep the exact rounding they had before.

export const formatRupees = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SHORT_MONTH_NAMES = MONTH_NAMES.map((m) => m.slice(0, 3));
