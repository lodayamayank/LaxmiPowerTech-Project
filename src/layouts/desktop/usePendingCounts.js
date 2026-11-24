// src/layouts/desktop/usePendingCounts.js
// Pending leave / reimbursement counts for the sidebar badges.
// Same behavior as before: cached in sessionStorage, loaded once and then every 60 s
// (paused while the tab is hidden) for admin and supervisor only, and refreshed on the
// "pending-counts:refresh" window event.
import { useEffect, useState } from 'react';
import axios from '@/api/client';
import { STORAGE_KEYS, ROLES } from '@/lib/constants';
import { EVENTS } from '@/lib/events';
import usePolling from '@/hooks/usePolling';

const readCachedCount = (key) => {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
const writeCachedCount = (key, count) => {
  try {
    sessionStorage.setItem(key, String(count));
  } catch {
    /* storage unavailable: skip the cache */
  }
};

export const canSeeApprovals = (role) => role === ROLES.admin || role === ROLES.supervisor;

export default function usePendingCounts(role) {
  const [leaves, setLeaves] = useState(() => readCachedCount(STORAGE_KEYS.pendingLeaveCount));
  const [reimbursements, setReimbursements] = useState(() =>
    readCachedCount(STORAGE_KEYS.pendingReimbursementCount),
  );

  const load = async (url, key, set, label) => {
    try {
      const res = await axios.get(url);
      const count = res.data?.count ?? 0;
      set(count);
      writeCachedCount(key, count);
    } catch (error) {
      console.error(`Failed to load pending ${label} count:`, error);
    }
  };

  const refresh = () => {
    load('/leaves/pending-count', STORAGE_KEYS.pendingLeaveCount, setLeaves, 'leave');
    load('/reimbursements/pending-count', STORAGE_KEYS.pendingReimbursementCount, setReimbursements, 'reimbursement');
  };

  const enabled = canSeeApprovals(role);
  usePolling(refresh, 60_000, { enabled, immediate: true });

  useEffect(() => {
    if (!enabled) return undefined;
    const onRefresh = () => refresh();
    window.addEventListener(EVENTS.pendingCountsRefresh, onRefresh);
    return () => window.removeEventListener(EVENTS.pendingCountsRefresh, onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { leaves, reimbursements };
}
