// src/lib/queryClient.js
// Shared TanStack Query client + helpers for scoping cached data to the signed-in user.
import { QueryClient } from '@tanstack/react-query';

/** App-wide client. Reference data (branches, projects, ...) is cached for 5 minutes. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

/**
 * "<userId>:<role>" of the stored user (same source the rest of the app reads).
 * Put it in query keys so one user never sees another user's cached data.
 */
export function userScope() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return `${user?._id || user?.id || 'anon'}:${user?.role || 'none'}`;
  } catch {
    return 'anon:none';
  }
}
