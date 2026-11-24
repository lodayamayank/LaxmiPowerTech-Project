// src/hooks/useVendors.js
// Cached list of vendors (shared by every page; refreshed after 5 min or on invalidate).
// Returns { data (array, default []), isLoading, error, refetch }.
import { useQuery } from '@tanstack/react-query';
import { getVendors } from '@/api/reference';
import { queryClient, userScope } from '@/lib/queryClient';

const EMPTY = [];

/** Prefix of every vendors query; pass to queryClient.invalidateQueries({ queryKey }) after a change. */
export const VENDORS_KEY = ['vendors'];
/** Full query key for the current user. */
export const vendorsQueryKey = () => [...VENDORS_KEY, userScope()];

export function useVendors() {
  const q = useQuery({ queryKey: vendorsQueryKey(), queryFn: getVendors });
  return { data: q.data ?? EMPTY, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
}

/** For non-component code: returns the cached list if fresh, otherwise fetches it once (shared with the hook). */
export const fetchVendorsCached = () =>
  queryClient.fetchQuery({ queryKey: vendorsQueryKey(), queryFn: getVendors });
