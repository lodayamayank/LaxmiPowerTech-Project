// One entry point for every write the app makes.
//
// Forms should not call axios.post directly: a submit that happens on a site
// with no signal has to survive in IndexedDB until the phone reconnects, and
// that only works if the request goes through the sync engine. This module is
// the thin adapter between "a form has a FormData or an object" and the shape
// the queue stores.
//
// Usage:
//
//   const result = await submitOffline({
//     module: 'task',
//     endpoint: '/tasks',
//     formData,                       // or: data: { ... }
//     label: 'Task submission',
//   });
//   if (result.offline) toast.info('Saved offline – will sync when connected');
//   else toast.success('Submitted!');

import syncEngine from './syncEngine';

/**
 * Convert a FormData into something IndexedDB can store.
 *
 * FormData itself is not structured-cloneable, so it cannot go into IndexedDB.
 * Its entries can: strings stay strings and File/Blob values are cloned whole,
 * which is what keeps an offline photo from being lost. The sync engine rebuilds
 * the FormData from this at send time.
 */
export function serializeFormData(formData) {
  const fields = [];
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      fields.push([key, value, value.name]);
    } else if (value instanceof Blob) {
      fields.push([key, value, `${key}.bin`]);
    } else {
      fields.push([key, value]);
    }
  }
  return { __multipart: true, fields };
}

/**
 * Submit a form, online or offline.
 *
 * @param {Object} options
 * @param {string} options.module      – 'task' | 'attendance' | 'leave' | 'reimbursement' | 'material' | …
 * @param {string} options.endpoint    – API path, e.g. '/tasks'
 * @param {FormData} [options.formData] – multipart body (use for anything with a file)
 * @param {Object}   [options.data]     – JSON body (use when there are no files)
 * @param {string} [options.method]    – defaults to 'POST'
 * @param {string} [options.actionType] – 'create' | 'update' | 'delete', defaults to 'create'
 * @param {string} [options.label]     – shown in the offline queue UI
 * @param {string} [options.capturedAt] – ISO time the user performed this; defaults to now
 * @param {Object} [options.meta]      – anything extra worth keeping with the queued entry
 * @param {boolean} [options.retryServerErrors] – false keeps 5xx responses visible to the form
 * @returns {Promise<{ offline: boolean, queueId?: number, response?: any }>}
 * @throws  the axios error when the server actively rejects the request (4xx),
 *          so the form can show a validation message instead of silently queueing
 */
export async function submitOffline({
  module,
  endpoint,
  formData,
  data,
  method = 'POST',
  actionType = 'create',
  label,
  capturedAt,
  meta,
  retryServerErrors,
}) {
  if (!module || !endpoint) {
    throw new Error('submitOffline requires a module and an endpoint');
  }
  if (formData && data) {
    throw new Error('submitOffline takes either formData or data, not both');
  }

  const payload = formData ? serializeFormData(formData) : (data ?? null);

  return syncEngine.smartRequest({
    actionType,
    module,
    endpoint,
    method,
    payload,
    label: label || `${actionType} ${module}`,
    capturedAt,
    meta,
    retryServerErrors,
  });
}

export default submitOffline;
