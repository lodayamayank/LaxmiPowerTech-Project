// src/lib/recovery.js
// Helpers for recovering from failures that would otherwise leave the user on a blank screen:
// recognising "a code file could not be loaded" errors, reloading automatically at most ONCE per failure window,
// and a manual reload that escalates to clearing the app's static caches when a plain reload did not help.
// Nothing here touches localStorage, the offline punch queue (IndexedDB) or the API/offline-data cache.

const CHUNK_RELOAD_KEY = 'lpt-chunk-reload-at';
const MANUAL_RELOAD_KEY = 'lpt-manual-reload';
const CHUNK_RELOAD_WINDOW_MS = 60_000;
const MANUAL_ESCALATE_WINDOW_MS = 5 * 60_000;

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|Loading CSS chunk|Unable to preload CSS|ChunkLoadError/i;

/** True for "the JS/CSS file for this screen could not be downloaded" (outdated deployment, bad network). */
export function isChunkLoadError(error) {
  if (!error) return false;
  return error.name === 'ChunkLoadError' || CHUNK_ERROR_PATTERN.test(String(error.message || error));
}

/** A short reference the user can quote to support. It carries no technical detail. */
export function newErrorId() {
  return `ERR-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/**
 * Reload the page automatically after a code-loading failure, but only once per minute and only while online
 * (an offline reload would only show the browser's own error page). Returns true when a reload was started.
 * If sessionStorage is unavailable it never reloads, so it cannot loop.
 */
export function reloadOnceForChunkError() {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < CHUNK_RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

async function clearStaticCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      // Only the app shell / build files. The API cache and the offline queue are left alone.
      await Promise.all(names.filter((n) => n.startsWith('lpt-static')).map((n) => caches.delete(n)));
    }
  } catch {
    // best effort
  }
}

/**
 * The "Reload application" button. A first reload is a plain reload. If the user has to reload again within five
 * minutes, the previous reload obviously did not fix it, so the app's static caches and service worker are cleared
 * first (the worker registers itself again on the next load).
 */
export async function reloadApp() {
  let escalate = false;
  try {
    const previous = JSON.parse(sessionStorage.getItem(MANUAL_RELOAD_KEY) || 'null');
    escalate = Boolean(previous && Date.now() - previous.at < MANUAL_ESCALATE_WINDOW_MS);
    sessionStorage.setItem(MANUAL_RELOAD_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    // sessionStorage unavailable: plain reload
  }
  if (escalate) await clearStaticCaches();
  window.location.reload();
}
