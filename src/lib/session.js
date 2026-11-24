// src/lib/session.js
// Login session helpers (pure functions, no React). Same keys and value formats the app
// has always used, so users who are already logged in stay logged in.
import { STORAGE_KEYS, SESSION_MAX_AGE_MS } from './constants';
import { queryClient } from './queryClient';

/** The JWT, or null. */
export const getToken = () => localStorage.getItem(STORAGE_KEYS.token);

/** The raw JSON string of the stored user (callers that parse it themselves), or null. */
export const getUserRaw = () => localStorage.getItem(STORAGE_KEYS.user);

/** The stored user object, or null when missing or unreadable. */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user));
  } catch {
    return null;
  }
}

/** user.role, or undefined. */
export const getRole = () => getUser()?.role;

/** user._id (falls back to user.id), or undefined. */
export const getUserId = () => {
  const user = getUser();
  return user?._id || user?.id;
};

/** loginTime as the stored string (milliseconds since epoch), or null. */
export const getLoginTime = () => localStorage.getItem(STORAGE_KEYS.loginTime);

/** Overwrite the stored user (e.g. after refreshing it from /auth/me). */
export const storeUser = (user) => localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

/**
 * Store a new login. Writes token, user (JSON) and loginTime, in that order, and drops any
 * cached server data first so a previous user's data is never shown.
 */
export function setSession({ token, user, loginTime = Date.now() }) {
  queryClient.clear();
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.loginTime, loginTime);
}

/** True once the login is older than 8 hours (same rule PrivateRoute always used). */
export const isSessionExpired = () =>
  Date.now() - parseInt(getLoginTime(), 10) > SESSION_MAX_AGE_MS;

/**
 * Log out: remove the session keys and the cached server data.
 * - default: token, user, role, loginTime, selectedBranchId, selectedBranchName and the two
 *   sessionStorage badge-count caches.
 * - keepSelectedBranch / keepLoginTime: leave those keys in place (the supervisor dashboard
 *   logout has always kept them).
 * - all: wipe localStorage completely (401 handler, expired session, "Clear storage" button).
 */
export function clearSession({ all = false, keepSelectedBranch = false, keepLoginTime = false } = {}) {
  if (all) {
    localStorage.clear();
    queryClient.clear();
    return;
  }
  sessionStorage.removeItem(STORAGE_KEYS.pendingLeaveCount);
  sessionStorage.removeItem(STORAGE_KEYS.pendingReimbursementCount);
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  queryClient.clear();
  localStorage.removeItem(STORAGE_KEYS.role);
  if (!keepLoginTime) localStorage.removeItem(STORAGE_KEYS.loginTime);
  if (!keepSelectedBranch) {
    localStorage.removeItem(STORAGE_KEYS.selectedBranchId);
    localStorage.removeItem(STORAGE_KEYS.selectedBranchName);
  }
}

/** The branch a supervisor/subcontractor picked: { id, name } (each may be null). */
export const getSelectedBranch = () => ({
  id: localStorage.getItem(STORAGE_KEYS.selectedBranchId),
  name: localStorage.getItem(STORAGE_KEYS.selectedBranchName),
});

/** Remember the picked branch (name falls back to 'Selected Branch'). */
export function setSelectedBranch({ id, name }) {
  localStorage.setItem(STORAGE_KEYS.selectedBranchId, id);
  localStorage.setItem(STORAGE_KEYS.selectedBranchName, name || 'Selected Branch');
}

/** Store only the branch name (used when it is looked up from the API). */
export const setSelectedBranchName = (name) =>
  localStorage.setItem(STORAGE_KEYS.selectedBranchName, name);
