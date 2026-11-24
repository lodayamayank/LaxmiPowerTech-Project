// src/pages/documents/components/useProjectDocuments.js
// Data, requests and handlers of the project documents page (moved unchanged from ProjectDocuments.jsx;
// only the sort-icon JSX stayed in the page).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import useCurrentUser from '@/hooks/useCurrentUser';
import { documentsApi } from '@/api/projectDocuments';
import { errorMessage } from '@/lib/documentUtils';

export const PAGE_SIZE = 25;

export default function useProjectDocuments() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useCurrentUser();

  const folderId = searchParams.get('folder') || null;

  // data
  const [summary, setSummary] = useState(null);
  const [folders, setFolders] = useState([]);
  const [docs, setDocs] = useState({ items: [], total: 0 });
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // view state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState({ by: 'date', order: 'desc' });
  const [page, setPage] = useState(1);

  // dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // { type, item }
  const [moveTarget, setMoveTarget] = useState(null); // { type, id, name, parentId }
  const [detailsTarget, setDetailsTarget] = useState(null); // { type, id }
  const [previewDoc, setPreviewDoc] = useState(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, item }
  const [deleteReason, setDeleteReason] = useState('');
  const [cascadeInfo, setCascadeInfo] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const requestSeq = useRef(0);
  const isFiltering = Boolean(debouncedSearch || typeFilter !== 'all');
  const currentFolderName = breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1].name : null;

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // back to page 1 whenever the view changes
  useEffect(() => {
    setPage(1);
  }, [folderId, debouncedSearch, typeFilter, sort]);

  const load = useCallback(async () => {
    if (!user.canUseDocuments) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const docParams = { page, limit: PAGE_SIZE, sortBy: sort.by, order: sort.order };
      if (debouncedSearch) docParams.q = debouncedSearch;
      if (typeFilter !== 'all') docParams.fileType = typeFilter;
      if (!isFiltering) docParams.folderId = folderId || 'root';

      const [docRes, folderRes, sum] = await Promise.all([
        documentsApi.listDocuments(projectId, docParams),
        isFiltering ? Promise.resolve([]) : documentsApi.listFolders(projectId, { parentFolderId: folderId || 'root' }),
        documentsApi.getSummary(projectId),
      ]);
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      setDocs(docRes);
      setFolders(folderRes);
      setSummary(sum);
      setAccessError('');
    } catch (err) {
      if (seq !== requestSeq.current) return;
      const status = err?.response?.status;
      if (status === 403 || status === 404) setAccessError(errorMessage(err, 'You do not have access to this project'));
      else toast.error(errorMessage(err, 'Failed to load documents'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [projectId, folderId, page, sort, debouncedSearch, typeFilter, isFiltering, user.canUseDocuments]);

  useEffect(() => {
    load();
  }, [load]);

  // breadcrumbs follow the current folder
  useEffect(() => {
    if (!user.canUseDocuments) return;
    if (!folderId) {
      setBreadcrumbs([]);
      return;
    }
    documentsApi
      .getFolder(projectId, folderId)
      .then((res) => setBreadcrumbs(res.breadcrumbs))
      .catch(() => {
        toast.error('That folder no longer exists');
        setSearchParams({});
      });
  }, [projectId, folderId, user.canUseDocuments, setSearchParams]);

  useEffect(() => {
    if (user.canUseDocuments) documentsApi.getUploadConfig().then(setConfig).catch(() => {});
  }, [user.canUseDocuments]);

  const loadPendingCount = useCallback(() => {
    if (!user.isAdmin) return;
    documentsApi
      .listDeleteRequests()
      .then((r) => setPendingCount(r.documents.length + r.folders.length))
      .catch(() => {});
  }, [user.isAdmin]);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  const refresh = () => {
    load();
    loadPendingCount();
  };

  /* ---------------- navigation ---------------- */

  const openFolder = (id) => {
    setSearch('');
    setTypeFilter('all');
    setSearchParams(id ? { folder: id } : {});
  };

  const toggleSort = (by) =>
    setSort((s) => (s.by === by ? { by, order: s.order === 'asc' ? 'desc' : 'asc' } : { by, order: by === 'name' ? 'asc' : 'desc' }));

  /* ---------------- actions ---------------- */

  const downloadDocument = async (doc) => {
    try {
      const { url } = await documentsApi.getDownloadUrl(doc._id);
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to download'));
    }
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteReason('');
    setCascadeInfo(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;
    setDeleting(true);
    try {
      const reason = deleteReason.trim() || undefined;
      const res =
        type === 'folder'
          ? await documentsApi.deleteFolder(projectId, item._id, { cascade: Boolean(cascadeInfo), reason })
          : await documentsApi.deleteDocument(item._id, { reason });
      if (res.status === 202) toast.info('Delete request sent to an admin for approval');
      else toast.success(type === 'folder' ? 'Folder deleted' : 'File deleted');
      closeDelete();
      refresh();
    } catch (err) {
      const data = err?.response?.data;
      if (err?.response?.status === 409 && data?.requiresCascade) {
        setCascadeInfo({ folders: data.folders, documents: data.documents }); // ask once more, with counts
      } else {
        toast.error(errorMessage(err, 'Failed to delete'));
      }
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- page-level drag & drop ---------------- */

  const onPageDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) {
      setDroppedFiles(Array.from(e.dataTransfer.files));
      setUploadOpen(true);
    }
  };
  return {
    projectId, navigate, user, folderId, summary, folders, docs, breadcrumbs, config, loading, accessError, pendingCount,
    search, setSearch, typeFilter, setTypeFilter, sort, page, setPage, isFiltering, currentFolderName,
    uploadOpen, setUploadOpen, droppedFiles, setDroppedFiles, newFolderOpen, setNewFolderOpen, renameTarget, setRenameTarget,
    moveTarget, setMoveTarget, detailsTarget, setDetailsTarget, previewDoc, setPreviewDoc, requestsOpen, setRequestsOpen,
    deleteTarget, setDeleteTarget, deleteReason, setDeleteReason, cascadeInfo, deleting, setBreadcrumbs,
    refresh, openFolder, toggleSort, downloadDocument, closeDelete, confirmDelete, onPageDrop,
  };
}
