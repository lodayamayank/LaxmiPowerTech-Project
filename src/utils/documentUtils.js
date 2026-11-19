import {
  FaFilePdf,
  FaFileImage,
  FaFileExcel,
  FaFileWord,
  FaFileCsv,
  FaFileAlt,
  FaDraftingCompass,
  FaFile,
} from 'react-icons/fa';

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
  pdf: [FaFilePdf, 'text-red-500'],
  jpg: [FaFileImage, 'text-purple-500'],
  jpeg: [FaFileImage, 'text-purple-500'],
  png: [FaFileImage, 'text-purple-500'],
  webp: [FaFileImage, 'text-purple-500'],
  xls: [FaFileExcel, 'text-green-600'],
  xlsx: [FaFileExcel, 'text-green-600'],
  csv: [FaFileCsv, 'text-green-600'],
  doc: [FaFileWord, 'text-blue-600'],
  docx: [FaFileWord, 'text-blue-600'],
  txt: [FaFileAlt, 'text-gray-500'],
  dwg: [FaDraftingCompass, 'text-orange-500'],
  dxf: [FaDraftingCompass, 'text-orange-500'],
};

export function getFileIcon(extension) {
  const [Icon, className] = ICONS[String(extension || '').toLowerCase()] || [FaFile, 'text-gray-400'];
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
