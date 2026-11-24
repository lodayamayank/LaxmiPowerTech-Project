// src/lib/roles.js
// Role checks. Each helper is the exact condition that was repeated across the app.
// Pass the same expression the old code used (`user.role` vs `user?.role`) so a missing user
// behaves exactly as before.
import { ROLES } from './constants';

/** role === 'admin' */
export const isAdminRole = (role) => role === ROLES.admin;

/** The field roles that work on a selected branch: supervisor or subcontractor. */
export const isFieldRole = (role) => role === ROLES.supervisor || role === ROLES.subcontractor;

/** role === 'labour' */
export const isLabourRole = (role) => role === ROLES.labour;
