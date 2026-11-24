import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FaArrowLeft,
  FaDatabase,
  FaEllipsisV,
  FaFileAlt,
  FaFolder,
  FaFolderPlus,
  FaInbox,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTimes,
  FaUpload,
} from 'react-icons/fa';
import DashboardLayout from '@/layouts/desktop/DashboardLayout';
import StatCard from '@/components/common/StatCard';
import EmptyTableRow from '@/components/common/EmptyTableRow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import useCurrentUser from '@/hooks/useCurrentUser';
import { documentsApi } from '@/api/projectDocuments';
import { CATEGORY_LABELS, errorMessage, formatBytes, formatDate, getFileIcon } from '@/lib/documentUtils';
import UploadDialog from './components/UploadDialog';
import NameDialog from './components/NameDialog';
import MoveDialog from './components/MoveDialog';
import DetailsDialog from './components/DetailsDialog';
import PreviewDialog from './components/PreviewDialog';
import DeleteRequestsPanel from './components/DeleteRequestsPanel';

const PAGE_SIZE = 25;

const ProjectDocuments = () => {
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

  const sortIcon = (by) =>
    sort.by === by ? (sort.order === 'asc' ? <FaSortAmountUp size={11} className="inline ml-1" /> : <FaSortAmountDown size={11} className="inline ml-1" />) : null;

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

  /* ---------------- render ---------------- */

  if (!user.canUseDocuments) {
    return (
      <DashboardLayout title="Documents">
        <Card>
          <CardContent className="p-8 text-center text-gray-600">You do not have permission to view project documents.</CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  if (accessError) {
    return (
      <DashboardLayout title="Documents">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-gray-700">{accessError}</p>
            <Button variant="outline" onClick={() => navigate(user.isAdmin ? '/admin/projects' : '/documents')}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const totalPages = Math.max(1, Math.ceil(docs.total / PAGE_SIZE));
  const empty = !loading && folders.length === 0 && docs.items.length === 0;
  const deleteLabel = user.isAdmin ? 'Delete' : 'Request deletion';

  const renderMenu = (type, item) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Actions">
          <FaEllipsisV size={13} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {type === 'folder' ? (
          <DropdownMenuItem onClick={() => openFolder(item._id)}>Open</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => setPreviewDoc(item)}>{item.previewable ? 'Preview' : 'View info'}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadDocument(item)}>Download</DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => setRenameTarget({ type, item })}>Rename</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setMoveTarget({
              type,
              id: item._id,
              name: type === 'folder' ? item.name : item.originalName,
              parentId: type === 'folder' ? item.parentFolderId : item.folderId,
            })
          }
        >
          Move
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDetailsTarget({ type, id: item._id })}>Details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={Boolean(item.deleteRequest)}
          className="text-red-600 focus:text-red-600"
          onClick={() => setDeleteTarget({ type, item })}
        >
          {item.deleteRequest ? 'Deletion requested' : deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const requestedBadge = (item) =>
    item.deleteRequest ? (
      <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
        Deletion requested
      </Badge>
    ) : null;

  return (
    <DashboardLayout title="Documents">
      <div className="space-y-6" onDragOver={(e) => e.preventDefault()} onDrop={onPageDrop}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user.isAdmin && (
              <Button variant="ghost" size="icon" title="Back to projects" onClick={() => navigate('/admin/projects')}>
                <FaArrowLeft size={14} />
              </Button>
            )}
            <div>
              <p className="text-sm text-gray-500">{summary?.projectName || 'Project'}</p>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Documents</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.isAdmin && (
              <Button variant="outline" onClick={() => setRequestsOpen(true)} className="gap-2">
                Delete requests
                {pendingCount > 0 && <Badge className="bg-red-600 text-white">{pendingCount}</Badge>}
              </Button>
            )}
            <Button variant="outline" onClick={() => setNewFolderOpen(true)} className="gap-2">
              <FaFolderPlus size={14} /> New Folder
            </Button>
            <Button onClick={() => setUploadOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white shadow-md gap-2">
              <FaUpload size={13} /> Upload Files
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Documents" value={summary?.totalDocuments ?? 0} icon={FaFileAlt} color="orange" />
          <StatCard title="Total Storage" value={formatBytes(summary?.totalSize ?? 0)} icon={FaDatabase} color="blue" />
          <StatCard title="Total Folders" value={summary?.totalFolders ?? 0} icon={FaFolder} color="green" />
        </div>

        <Card>
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 space-y-3">
            {/* Breadcrumbs */}
            <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
              {breadcrumbs.length === 0 ? (
                <span className="font-semibold text-gray-800 dark:text-gray-100">All Documents</span>
              ) : (
                <button type="button" className="text-orange-600 hover:underline" onClick={() => openFolder(null)}>
                  All Documents
                </button>
              )}
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={b._id}>
                  <span className="text-gray-400">/</span>
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{b.name}</span>
                  ) : (
                    <button type="button" className="text-orange-600 hover:underline" onClick={() => openFolder(b._id)}>
                      {b.name}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </nav>

            {/* Search and filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input placeholder="Search files in this project..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearch('')} title="Clear">
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isFiltering && <p className="text-xs text-muted-foreground">Showing matching files from all folders. Clear the search and type filter to browse folders.</p>}
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    Name
                    {sortIcon('name')}
                  </TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('size')}>
                    Size
                    {sortIcon('size')}
                  </TableHead>
                  <TableHead className="font-semibold">Uploaded By</TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('date')}>
                    Uploaded Date
                    {sortIcon('date')}
                  </TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full max-w-[140px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : empty ? (
                  <EmptyTableRow
                    colSpan={6}
                    message={isFiltering ? 'No files match your search.' : 'This folder is empty. Upload files or create a folder to get started.'}
                  />
                ) : (
                  <>
                    {folders.map((f) => (
                      <TableRow key={`f-${f._id}`} className="dark:border-gray-700">
                        <TableCell>
                          <button type="button" className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600" onClick={() => openFolder(f._id)}>
                            <FaFolder className="text-yellow-500" size={17} />
                            <span className="truncate max-w-[280px]">{f.name}</span>
                          </button>
                          {requestedBadge(f)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">Folder</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell className="text-muted-foreground">{f.createdBy?.name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(f.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {renderMenu('folder', f)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {docs.items.map((d) => {
                      const { Icon, className } = getFileIcon(d.extension);
                      return (
                        <TableRow key={`d-${d._id}`} className="dark:border-gray-700">
                          <TableCell>
                            <button type="button" className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600" onClick={() => setPreviewDoc(d)}>
                              <Icon className={className} size={16} />
                              <span className="truncate max-w-[280px]">{d.originalName}</span>
                            </button>
                            {requestedBadge(d)}
                          </TableCell>
                          <TableCell className="text-muted-foreground uppercase">{d.extension}</TableCell>
                          <TableCell className="text-muted-foreground">{formatBytes(d.fileSize)}</TableCell>
                          <TableCell className="text-muted-foreground">{d.uploadedBy?.name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            {renderMenu('document', d)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                )}
              </TableBody>
            </Table>

            {docs.total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm">
                <span className="text-muted-foreground">
                  Page {page} of {totalPages} · {docs.total} files
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={(o) => {
          setUploadOpen(o);
          if (!o) setDroppedFiles(null);
        }}
        projectId={projectId}
        folderId={folderId}
        folderName={currentFolderName}
        config={config}
        initialFiles={droppedFiles}
        existingNames={docs.items.map((d) => d.originalName)}
        onUploaded={refresh}
      />

      <NameDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New folder"
        description={`Create a folder in ${currentFolderName || 'All Documents'}`}
        label="Folder name"
        submitLabel="Create"
        onSubmit={async (name) => {
          await documentsApi.createFolder(projectId, name, folderId);
          toast.success('Folder created');
          refresh();
        }}
      />

      <NameDialog
        open={Boolean(renameTarget)}
        onOpenChange={(o) => !o && setRenameTarget(null)}
        title={renameTarget?.type === 'folder' ? 'Rename folder' : 'Rename file'}
        label="Name"
        initialValue={renameTarget ? renameTarget.item.name || renameTarget.item.originalName : ''}
        selectBaseOnly={renameTarget?.type === 'document'}
        submitLabel="Rename"
        onSubmit={async (name) => {
          if (renameTarget.type === 'folder') await documentsApi.renameFolder(projectId, renameTarget.item._id, name);
          else await documentsApi.renameDocument(renameTarget.item._id, name);
          toast.success('Renamed');
          refresh();
          if (renameTarget.type === 'folder') setBreadcrumbs((b) => b.map((x) => (x._id === renameTarget.item._id ? { ...x, name } : x)));
        }}
      />

      <MoveDialog
        open={Boolean(moveTarget)}
        onOpenChange={(o) => !o && setMoveTarget(null)}
        projectId={projectId}
        item={moveTarget}
        onMoved={() => {
          toast.success('Moved');
          refresh();
        }}
      />

      <DetailsDialog open={Boolean(detailsTarget)} onOpenChange={(o) => !o && setDetailsTarget(null)} projectId={projectId} item={detailsTarget} isAdmin={user.isAdmin} />

      <PreviewDialog open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreviewDoc(null)} doc={previewDoc} onDownload={downloadDocument} />

      {user.isAdmin && <DeleteRequestsPanel open={requestsOpen} onOpenChange={setRequestsOpen} onChanged={refresh} />}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && !deleting && closeDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.isAdmin ? 'Delete' : 'Request deletion of'} "{deleteTarget?.item?.name || deleteTarget?.item?.originalName}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cascadeInfo
                ? `This folder contains ${cascadeInfo.folders} subfolder(s) and ${cascadeInfo.documents} file(s). Everything inside will be permanently deleted. This cannot be undone.`
                : user.isAdmin
                ? deleteTarget?.type === 'folder'
                  ? 'The folder will be deleted. This cannot be undone.'
                  : 'The file will be permanently deleted from storage. This cannot be undone.'
                : 'Your request will be sent to an admin. Nothing is deleted until they approve it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!user.isAdmin && (
            <Textarea placeholder="Reason (optional)" maxLength={500} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleting ? 'Working...' : cascadeInfo ? 'Delete everything' : user.isAdmin ? 'Delete' : 'Send request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ProjectDocuments;
