// src/hooks/useUsers.js
// Cached list of users, optionally filtered by query params (e.g. { role: 'labour' }).
// Returns { data (array, default []), isLoading, error, refetch }.
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/api/reference';
import { queryClient, userScope } from '@/lib/queryClient';

const EMPTY = [];

/** Prefix of every users query (any params); pass to invalidateQueries after a change. */
export const USERS_KEY = ['users'];
/** Full query key for the current user and params. */
export const usersQueryKey = (params) => [...USERS_KEY, userScope(), params || {}];

export function useUsers(params) {
  const q = useQuery({ queryKey: usersQueryKey(params), queryFn: () => getUsers(params) });
  return { data: q.data ?? EMPTY, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
}

/** For non-component code: returns the cached list if fresh, otherwise fetches it once (shared with the hook). */
export const fetchUsersCached = (params) =>
  queryClient.fetchQuery({ queryKey: usersQueryKey(params), queryFn: () => getUsers(params) });
