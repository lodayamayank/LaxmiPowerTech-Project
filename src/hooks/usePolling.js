// src/hooks/usePolling.js
// Run a data-refresh callback on an interval, but only while the tab is visible.
import { useEffect, useRef } from 'react';

/**
 * usePolling(callback, intervalMs, { enabled = true, immediate = false })
 * - Ticks are skipped while document.hidden.
 * - When the tab becomes visible again the callback runs once immediately, then polling resumes.
 * - immediate: also run the callback once when polling starts (mount / enabled turns true).
 * - The latest callback is kept in a ref, so changing it does not restart the interval.
 * - The interval and the visibilitychange listener are always cleaned up.
 */
export default function usePolling(callback, intervalMs, { enabled = true, immediate = false } = {}) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const run = () => saved.current && saved.current();
    if (immediate) run();
    const id = setInterval(() => {
      if (!document.hidden) run();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled, immediate]);
}
