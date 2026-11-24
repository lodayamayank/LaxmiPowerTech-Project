// src/utils/status.js
// Single source of truth for "status string -> visual tone".
// Tones map to the Badge variants (ok, warn, bad, info, neutral, highlight, purple, pink).

export const TONES = ["ok", "warn", "bad", "info", "neutral", "highlight", "purple", "pink"];

/** Keys are lowercase; "-" and "_" are normalised to spaces before lookup. */
export const STATUS_TONES = {
  // ok
  approved: "ok",
  completed: "ok",
  complete: "ok",
  received: "ok",
  transferred: "ok",
  paid: "ok",
  delivered: "ok",
  active: "ok",
  present: "ok",
  // warn
  pending: "warn",
  "partially received": "warn",
  "half day": "warn",
  incomplete: "warn",
  late: "warn",
  "on hold": "warn",
  // bad
  rejected: "bad",
  cancelled: "bad",
  canceled: "bad",
  overdue: "bad",
  absent: "bad",
  failed: "bad",
  // info
  submitted: "info",
  open: "info",
  new: "info",
  ordered: "info",
  "in transit": "info",
  "in progress": "info",
  processing: "info",
  "paid leave": "info",
  // highlight
  partial: "highlight",
  "sick leave": "highlight",
  // live attendance
  "punched in": "ok",
  "punched out": "info",
  "no punch in": "neutral",
  // leave types (AdminLeaves)
  sick: "highlight",
  unpaid: "purple",
  casual: "pink",
  // purple / pink
  triggered: "purple",
  "unpaid leave": "purple",
  "casual leave": "pink",
  // neutral
  draft: "neutral",
  inactive: "neutral",
  unknown: "neutral",
  "week off": "neutral",
  future: "neutral",
};

/** Role -> badge tone (used for role badges). */
export const ROLE_TONES = {
  admin: "purple",
  supervisor: "highlight",
  staff: "info",
  labour: "ok",
  subcontractor: "neutral",
};

/**
 * Tone for a role string (case-insensitive).
 * @param {string|null|undefined} role
 * @returns {"purple"|"highlight"|"info"|"ok"|"neutral"} "neutral" for anything else
 */
export function getRoleTone(role) {
  return ROLE_TONES[String(role ?? "").trim().toLowerCase()] || "neutral";
}

/** Leave type -> badge tone. Types are categories, not statuses, so "paid" is blue here (it stays green as a status). */
export const LEAVE_TYPE_TONES = {
  paid: "info",
  sick: "highlight",
  unpaid: "purple",
  casual: "pink",
};

/**
 * Tone for a leave type (case-insensitive).
 * @param {string|null|undefined} type
 * @returns {"info"|"highlight"|"purple"|"pink"|"neutral"} "neutral" for any other type
 */
export function getLeaveTypeTone(type) {
  return LEAVE_TYPE_TONES[String(type ?? "").trim().toLowerCase()] || "neutral";
}

const normalise = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

/**
 * Tone for a status string (case-insensitive; "in_progress" == "In Progress").
 * @param {string|null|undefined} status
 * @returns {"ok"|"warn"|"bad"|"info"|"neutral"|"highlight"|"purple"|"pink"} "neutral" when unknown
 */
export function getStatusTone(status) {
  return STATUS_TONES[normalise(status)] || "neutral";
}

/**
 * Display label: underscores/hyphens to spaces, Title Case ("in_progress" -> "In Progress").
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function formatStatusLabel(status) {
  const s = normalise(status);
  return s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}
