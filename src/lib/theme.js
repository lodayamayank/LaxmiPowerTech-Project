// src/lib/theme.js
// Theme switch for the whole app.
//
// DARK_MODE_ENABLED is false on purpose: dark mode was never designed (its token values are "provisional" in
// index.css) and the mobile/role pages are not migrated, so it looks inconsistent. While it is false the dark
// toggle is hidden, a saved "dark" preference is ignored, and every page (login, desktop, mobile) renders the
// light theme from the first paint. Set it to true only after the dark palette is designed and the legacy pages
// no longer depend on the `.dark .bg-white/...` compatibility rules in index.css.
import { STORAGE_KEYS } from '@/lib/constants';

export const DARK_MODE_ENABLED = false;

/** True when the user saved a dark preference AND dark mode is enabled. Never throws (localStorage may be blocked). */
export function readDarkPreference() {
  if (!DARK_MODE_ENABLED) return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.darkMode) === 'true';
  } catch {
    return false;
  }
}

/**
 * Put the theme class on <html> synchronously, before React renders, so every route (login, desktop, mobile)
 * starts in the right theme and nothing flashes. Called once from main.jsx.
 */
export function applyInitialTheme() {
  document.documentElement.classList.toggle('dark', readDarkPreference());
}
