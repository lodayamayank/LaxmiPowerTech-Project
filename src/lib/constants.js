// src/lib/constants.js
// Shared string constants. Every value is the exact string the app already used, so data
// stored by earlier versions (localStorage / sessionStorage) keeps working. Never change a value.
import { EVENTS } from './events';

/** Role names as stored on the user object (`user.role`). Case-sensitive. */
export const ROLES = {
  admin: 'admin',
  staff: 'staff',
  supervisor: 'supervisor',
  subcontractor: 'subcontractor',
  labour: 'labour',
};

/** Session length enforced by PrivateRoute (8 hours, in ms). */
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

/** localStorage keys (sessionStorage for the two pending-count caches). */
export const STORAGE_KEYS = {
  token: 'token', // string (JWT)
  user: 'user', // JSON object
  loginTime: 'loginTime', // number as string (Date.now())
  role: 'role', // legacy key, only ever removed on logout
  selectedBranchId: 'selectedBranchId', // string
  selectedBranchName: 'selectedBranchName', // string
  darkMode: 'darkMode', // "true" | "false"
  // sessionStorage: cached badge counts in the desktop layout
  pendingLeaveCount: 'pendingLeaveCount',
  pendingReimbursementCount: 'pendingReimbursementCount',
  // localStorage signals between screens (same strings as the matching EVENTS entries)
  intentRefresh: EVENTS.intentRefresh,
  siteTransferRefresh: EVENTS.siteTransferRefresh,
  upcomingDeliveryRefresh: EVENTS.upcomingDeliveryRefresh,
  deliveryRefresh: EVENTS.deliveryRefresh,
};
