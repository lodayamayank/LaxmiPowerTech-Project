import { DraftingCompass, File, FileImage, FileSpreadsheet, FileText } from 'lucide-react';

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${i === 0 || n >= 10 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ICONS = {
  pdf: [FileText, 'text-tone-bad-fg'],
  jpg: [FileImage, 'text-tone-purple-fg'],
  jpeg: [FileImage, 'text-tone-purple-fg'],
  png: [FileImage, 'text-tone-purple-fg'],
  webp: [FileImage, 'text-tone-purple-fg'],
  xls: [FileSpreadsheet, 'text-tone-ok-fg'],
  xlsx: [FileSpreadsheet, 'text-tone-ok-fg'],
  csv: [FileSpreadsheet, 'text-tone-ok-fg'],
  doc: [FileText, 'text-tone-info-fg'],
  docx: [FileText, 'text-tone-info-fg'],
  txt: [FileText, 'text-ink-3'],
  dwg: [DraftingCompass, 'text-tone-highlight-fg'],
  dxf: [DraftingCompass, 'text-tone-highlight-fg'],
};

export function getFileIcon(extension) {
  const [Icon, className] = ICONS[String(extension || '').toLowerCase()] || [File, 'text-ink-4'];
  return { Icon, className };
}

export const CATEGORY_LABELS = {
  cad: 'CAD drawings',
  spreadsheet: 'Spreadsheets',
  document: 'Documents',
  image: 'Images',
};

// Turns an Axios error into a message that is safe to show to users.
export function errorMessage(err, fallback = 'Something went wrong') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK' || (err?.request && !err?.response)) {
    return 'Network error. Please check your connection and try again.';
  }
  return err?.message || fallback;
}
