// src/hooks/useProjects.js
// Cached list of projects (shared by every page; refreshed after 5 min or on invalidate).
// Returns { data (array, default []), isLoading, error, refetch }.
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '@/api/reference';
import { queryClient, userScope } from '@/lib/queryClient';

const EMPTY = [];

/** Prefix of every projects query; pass to queryClient.invalidateQueries({ queryKey }) after a change. */
export const PROJECTS_KEY = ['projects'];
/** Full query key for the current user. */
export const projectsQueryKey = () => [...PROJECTS_KEY, userScope()];

/**
 * @param {{ lite?: boolean }} [options] lite: ask the API for the lighter list (GET /projects?lite=true);
 *   it is cached apart from the full list, but still invalidated by PROJECTS_KEY.
 */
export function useProjects({ lite = false } = {}) {
  const q = useQuery({
    queryKey: lite ? [...projectsQueryKey(), 'lite'] : projectsQueryKey(),
    queryFn: () => getProjects(lite ? { lite: true } : undefined),
  });
  return { data: q.data ?? EMPTY, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
}

/** For non-component code: returns the cached list if fresh, otherwise fetches it once (shared with the hook). */
export const fetchProjectsCached = () =>
  queryClient.fetchQuery({ queryKey: projectsQueryKey(), queryFn: getProjects });
