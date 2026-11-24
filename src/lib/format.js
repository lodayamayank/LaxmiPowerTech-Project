// src/utils/format.js
// Shared display formatters. Pure functions: no React, no side effects.
// (The cn() class helper lives in src/lib/utils.js; data/format helpers live in src/utils/.)

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EMPTY = "-";

const isBlank = (v) => v === null || v === undefined || v === "";

const toDate = (value) => {
  if (isBlank(value)) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const pad = (n) => String(n).padStart(2, "0");

/**
 * Format a date as "DD MMM YYYY" (e.g. "04 Sep 2026"), device-local time zone.
 * @param {string|number|Date|null|undefined} value
 * @param {{ withTime?: boolean }} [options] withTime appends " hh:mm A" (e.g. "04 Sep 2026 02:30 PM")
 * @returns {string} "-" for null/empty/invalid input
 */
export function formatDate(value, options = {}) {
  const d = toDate(value);
  if (!d) return EMPTY;
  const date = `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!options.withTime) return date;
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${date} ${pad(hour12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toNumber = (value) => {
  if (isBlank(value)) return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Format an amount as Indian rupees with en-IN grouping ("₹10,000"; "₹1,250.50" when fractional).
 * @param {number|string|null|undefined} value
 * @returns {string} "-" for null/empty/NaN
 */
export function formatCurrency(value) {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  return Number.isInteger(n) ? inr0.format(n) : inr2.format(n);
}

const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 20 });

/**
 * Format a number with en-IN digit grouping ("12,34,567").
 * @param {number|string|null|undefined} value
 * @returns {string} "-" for null/empty/NaN
 */
export function formatNumber(value) {
  const n = toNumber(value);
  return n === null ? EMPTY : num.format(n);
}

/**
 * Up to two uppercase initials from a name ("Anil Kumar Rao" -> "AK").
 * @param {string|null|undefined} name
 * @returns {string} "?" when the name is empty
 */
export function getInitials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  const out = parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  return out || "?";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Today's date for the top bar, e.g. "Mon, 23 Nov 2026" (local time).
 * @param {Date} [now] defaults to the current time
 * @returns {string}
 */
export function formatToday(now = new Date()) {
  return `${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}
