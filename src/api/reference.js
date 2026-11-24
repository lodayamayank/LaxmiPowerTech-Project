// src/api/reference.js
// Reference-data fetchers (branches, projects, users, vendors, material catalog).
// Each returns a plain ARRAY, whatever shape the server used, so hooks stay simple.
import axios from './client';
import { branchesAPI, projectsAPI, vendorsAPI, materialCatalogAPI } from './material';

/** Normalise `[...]`, `{ data: [...] }` or `{ <key>: [...] }` to an array ([] otherwise). */
export function asArray(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (key && Array.isArray(payload?.[key])) return payload[key];
  return [];
}

export const getBranches = async () => asArray(await branchesAPI.getAll(), 'branches');
export const getProjects = async () => asArray(await projectsAPI.getAll(), 'projects');
export const getVendors = async () => asArray(await vendorsAPI.getAll(), 'vendors');
export const getMaterialCatalog = async () => asArray(await materialCatalogAPI.getMaterials(), 'materials');

/** GET /users, optionally filtered (e.g. { role: 'labour' }). */
export const getUsers = async (params) => {
  const res = await axios.get('/users', params ? { params } : undefined);
  return asArray(res.data, 'users');
};
