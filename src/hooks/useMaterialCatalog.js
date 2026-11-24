// src/hooks/useMaterialCatalog.js
// Cached list of material-catalog (shared by every page; refreshed after 5 min or on invalidate).
// Returns { data (array, default []), isLoading, error, refetch }.
import { useQuery } from '@tanstack/react-query';
import { getMaterialCatalog } from '@/api/reference';
import { queryClient, userScope } from '@/lib/queryClient';

const EMPTY = [];

/** Prefix of every material-catalog query; pass to queryClient.invalidateQueries({ queryKey }) after a change. */
export const MATERIAL_CATALOG_KEY = ['material-catalog'];
/** Full query key for the current user. */
export const materialCatalogQueryKey = () => [...MATERIAL_CATALOG_KEY, userScope()];

export function useMaterialCatalog() {
  const q = useQuery({ queryKey: materialCatalogQueryKey(), queryFn: getMaterialCatalog });
  return { data: q.data ?? EMPTY, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
}

/** For non-component code: returns the cached list if fresh, otherwise fetches it once (shared with the hook). */
export const fetchMaterialCatalogCached = () =>
  queryClient.fetchQuery({ queryKey: materialCatalogQueryKey(), queryFn: getMaterialCatalog });
