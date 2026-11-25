// src/lib/theme.js
// The one place that owns the light/dark theme. Everything else reads it from here:
//  - the desktop toggle (layouts/desktop/useDarkMode.js), the attendance chart and the toaster, through the
//    hooks/useDarkTheme.js hook;
//  - the inline script in index.html, which runs the same few lines before the first paint so a saved dark
//    choice never flashes light (keep the two in sync: same storage key, same theme-color values).
//
// The source of truth at runtime is the `dark` class on <html>; the choice is persisted in localStorage under
// STORAGE_KEYS.darkMode ("true" / "false", unchanged, so earlier saved choices keep working). Light is the default.
import { STORAGE_KEYS } from '@/lib/constants';

// Browser UI colour (address bar / PWA status bar) = the page background of each theme.
const THEME_COLOR = { light: '#F5F6F8', dark: '#020817' };

const listeners = new Set();

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEYS.darkMode) === 'true';
  } catch {
    return false; // localStorage can be blocked (private mode, policies)
  }
}

function apply(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

const emit = () => listeners.forEach((fn) => fn());

/** True when the app is currently in dark mode. */
export const isDarkMode = () => document.documentElement.classList.contains('dark');

/** Switch theme: applies it, saves it, and notifies subscribers (toaster, charts, toggle). */
export function setDarkMode(dark) {
  try {
    localStorage.setItem(STORAGE_KEYS.darkMode, String(dark));
  } catch {
    /* not persisted; the theme still changes for this session */
  }
  apply(dark);
  emit();
}

export const toggleDarkMode = () => setDarkMode(!isDarkMode());

/** For useSyncExternalStore. Returns the unsubscribe function. */
export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Apply the saved theme synchronously before React renders (called once from main.jsx), and follow changes made
 * in another tab. The inline script in index.html already did the same before first paint; this keeps the
 * runtime state and theme-color in sync with it.
 */
export function applyInitialTheme() {
  apply(readSaved());
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.darkMode) {
      apply(readSaved());
      emit();
    }
  });
}
