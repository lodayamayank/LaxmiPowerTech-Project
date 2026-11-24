// src/hooks/useBranches.js
// Cached list of branches (shared by every page; refreshed after 5 min or on invalidate).
// Returns { data (array, default []), isLoading, error, refetch }.
import { useQuery } from '@tanstack/react-query';
import { getBranches } from '@/api/reference';
import { queryClient, userScope } from '@/lib/queryClient';

const EMPTY = [];

/** Prefix of every branches query; pass to queryClient.invalidateQueries({ queryKey }) after a change. */
export const BRANCHES_KEY = ['branches'];
/** Full query key for the current user. */
export const branchesQueryKey = () => [...BRANCHES_KEY, userScope()];

export function useBranches() {
  const q = useQuery({ queryKey: branchesQueryKey(), queryFn: getBranches });
  return { data: q.data ?? EMPTY, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
}

/** For non-component code: returns the cached list if fresh, otherwise fetches it once (shared with the hook). */
export const fetchBranchesCached = () =>
  queryClient.fetchQuery({ queryKey: branchesQueryKey(), queryFn: getBranches });
