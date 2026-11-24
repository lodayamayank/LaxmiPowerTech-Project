import axios from 'axios';
import api from './client'; // the app's instance: auth header, base URL, 401 handling

// A SEPARATE client for the direct upload to Cloudflare R2. It must NOT use
// the app's instance: that one adds the Authorization header and sends
// credentials, which R2 rejects (and which would leak the app token to R2).
const storageClient = axios.create({ timeout: 0, withCredentials: false });

const base = (projectId) => `/projects/${projectId}`;
const data = (res) => res.data;

export const documentsApi = {
  getUploadConfig: () => api.get('/documents/config').then(data),
  getSummary: (projectId) => api.get(`${base(projectId)}/documents/summary`).then(data),

  // Folders
  listFolders: (projectId, params) => api.get(`${base(projectId)}/folders`, { params }).then(data),
  getFolder: (projectId, folderId, params) => api.get(`${base(projectId)}/folders/${folderId}`, { params }).then(data),
  createFolder: (projectId, name, parentFolderId) =>
    api.post(`${base(projectId)}/folders`, { name, parentFolderId: parentFolderId || null }).then(data),
  renameFolder: (projectId, folderId, name) => api.patch(`${base(projectId)}/folders/${folderId}`, { name }).then(data),
  moveFolder: (projectId, folderId, parentFolderId) =>
    api.patch(`${base(projectId)}/folders/${folderId}/move`, { parentFolderId: parentFolderId || null }).then(data),
  // Admin: deletes. Others: files a request (HTTP 202). Resolves to the full response.
  deleteFolder: (projectId, folderId, { cascade = false, reason } = {}) =>
    api.delete(`${base(projectId)}/folders/${folderId}`, { params: cascade ? { cascade: 'true' } : undefined, data: { reason } }),

  // Documents
  listDocuments: (projectId, params) => api.get(`${base(projectId)}/documents`, { params }).then(data),
  getDocument: (projectId, documentId) => api.get(`${base(projectId)}/documents/${documentId}`).then(data),
  getDownloadUrl: (documentId, { inline = false } = {}) =>
    api.get(`/documents/${documentId}/download-url`, { params: inline ? { inline: 'true' } : undefined }).then(data),
  moveDocument: (documentId, folderId) => api.patch(`/documents/${documentId}/move`, { folderId: folderId || null }).then(data),
  renameDocument: (documentId, name) => api.patch(`/documents/${documentId}/rename`, { name }).then(data),
  deleteDocument: (documentId, { reason } = {}) => api.delete(`/documents/${documentId}`, { data: { reason } }),

  // Admin approval queue
  listDeleteRequests: () => api.get('/documents/delete-requests').then(data),
  approveDocumentDelete: (documentId) => api.patch(`/documents/${documentId}/delete-request/approve`).then(data),
  rejectDocumentDelete: (documentId) => api.patch(`/documents/${documentId}/delete-request/reject`, {}).then(data),
  approveFolderDelete: (projectId, folderId) =>
    api.patch(`${base(projectId)}/folders/${folderId}/delete-request/approve`).then(data),
  rejectFolderDelete: (projectId, folderId) =>
    api.patch(`${base(projectId)}/folders/${folderId}/delete-request/reject`, {}).then(data),
};

const status = (err) => err?.response?.status;

/**
 * Uploads ONE file straight to R2 in three steps:
 *   1. ask our backend for a presigned URL (backend validates everything)
 *   2. PUT the file to R2 (never passes through our server)
 *   3. tell our backend to verify and save it
 * Resolves to the saved document. Progress: 0-95 while uploading, 100 when saved.
 * A network drop or expired link restarts the whole sequence once.
 */
export async function uploadFile({ projectId, folderId, file, onProgress, signal }) {
  const run = async () => {
    const init = await api
      .post(
        `${base(projectId)}/documents/upload-url`,
        { originalName: file.name, mimeType: file.type || '', size: file.size, folderId: folderId || null },
        { signal }
      )
      .then(data);

    try {
      await storageClient.put(init.upload.url, file, {
        headers: init.upload.headers, // Content-Type chosen by the server
        signal,
        onUploadProgress: (e) => {
          if (e.total) onProgress?.(Math.min(95, Math.round((e.loaded / e.total) * 95)));
        },
      });
    } catch (err) {
      err.isStorageError = true;
      throw err;
    }

    onProgress?.(97);
    const doc = await api.post(`${base(projectId)}/documents/confirm`, { ticket: init.ticket }, { signal, timeout: 120000 }).then(data);
    onProgress?.(100);
    return doc;
  };

  try {
    return await run();
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    const storageRetry = err.isStorageError && (!err.response || status(err) === 403 || status(err) >= 500);
    const confirmRetry = !err.isStorageError && (!err.response || status(err) >= 502);
    if (storageRetry || confirmRetry) {
      onProgress?.(0);
      return run();
    }
    throw err;
  }
}
