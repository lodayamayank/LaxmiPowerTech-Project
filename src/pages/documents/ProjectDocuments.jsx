// src/pages/documents/ProjectDocuments.jsx  (route: Documents)
// Data, requests and handlers live in components/useProjectDocuments.js (moved unchanged); this file lays out the page.
import { Fragment, useMemo } from 'react';
import { ArrowLeft, ChevronRight, Database, FileText, Folder, FolderPlus, Inbox, Upload } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/layouts/desktop/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterBar, FilterField } from '@/components/common/FilterBar';
import { PageHeader } from '@/components/common/PageHeader';
import { PaginationBar } from '@/components/common/PaginationBar';
import { SearchInput } from '@/components/common/SearchInput';
import { SectionCard } from '@/components/common/SectionCard';
import { StatCard } from '@/components/common/StatCard';
import { documentsApi } from '@/api/projectDocuments';
import { CATEGORY_LABELS, formatBytes } from '@/lib/documentUtils';
import UploadDialog from './components/UploadDialog';
import NameDialog from './components/NameDialog';
import MoveDialog from './components/MoveDialog';
import DetailsDialog from './components/DetailsDialog';
import PreviewDialog from './components/PreviewDialog';
import DeleteRequestsPanel from './components/DeleteRequestsPanel';
import useProjectDocuments, { PAGE_SIZE } from './components/useProjectDocuments';
import { documentRowKey, getDocumentColumns, getDocumentMobileCard, toDocumentRows } from './components/documentColumns';

// shadcn SelectItem can't use value="", so "All types" uses the existing "all" value
const ProjectDocuments = () => {
  const d = useProjectDocuments();
  const {
    projectId, navigate, user, folderId, summary, folders, docs, breadcrumbs, config, loading, accessError, pendingCount, search, setSearch,
    typeFilter, setTypeFilter, sort, page, setPage, isFiltering, currentFolderName, uploadOpen, setUploadOpen, droppedFiles, setDroppedFiles,
    newFolderOpen, setNewFolderOpen, renameTarget, setRenameTarget, moveTarget, setMoveTarget, detailsTarget, setDetailsTarget, previewDoc,
    setPreviewDoc, requestsOpen, setRequestsOpen, deleteTarget, setDeleteTarget, deleteReason, setDeleteReason, cascadeInfo, deleting,
    setBreadcrumbs, refresh, openFolder, toggleSort, downloadDocument, closeDelete, confirmDelete, onPageDrop,
  } = d;

  const deleteLabel = user.isAdmin ? 'Delete' : 'Request deletion';
  const rows = useMemo(() => toDocumentRows(folders, docs.items), [folders, docs.items]);
  const handlers = useMemo(
    () => ({ openFolder, setPreviewDoc, downloadDocument, setRenameTarget, setMoveTarget, setDetailsTarget, setDeleteTarget, deleteLabel }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folderId, deleteLabel],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => getDocumentColumns(handlers, sort, toggleSort), [handlers, sort]);
  const mobileCard = useMemo(() => getDocumentMobileCard(handlers), [handlers]);

  if (!user.canUseDocuments) {
    return (
      <DashboardLayout>
        <SectionCard>
          <EmptyState icon={Inbox} title="You do not have permission to view project documents." />
        </SectionCard>
      </DashboardLayout>
    );
  }
  if (accessError) {
    return (
      <DashboardLayout>
        <SectionCard>
          <EmptyState
            icon={Inbox}
            title={accessError}
            action={
              <Button variant="outline" onClick={() => navigate(user.isAdmin ? '/admin/projects' : '/documents')}>
                Go back
              </Button>
            }
          />
        </SectionCard>
      </DashboardLayout>
    );
  }

  const totalPages = Math.max(1, Math.ceil(docs.total / PAGE_SIZE));
  const hasFilters = Boolean(search) || typeFilter !== 'all';
  const uploadAction = (
    <Button onClick={() => setUploadOpen(true)}>
      <Upload /> Upload Files
    </Button>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6" onDragOver={(e) => e.preventDefault()} onDrop={onPageDrop}>
        <PageHeader
          eyebrow="Projects / Documents"
          title="Documents"
          description={summary?.projectName || 'Project'}
          actions={
            <>
              {user.isAdmin && (
                <Button variant="ghost" size="icon" title="Back to projects" aria-label="Back to projects" onClick={() => navigate('/admin/projects')}>
                  <ArrowLeft />
                </Button>
              )}
              {user.isAdmin && (
                <Button variant="outline" onClick={() => setRequestsOpen(true)}>
                  Delete requests
                  {pendingCount > 0 && <Badge variant="bad">{pendingCount}</Badge>}
                </Button>
              )}
              <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus /> New Folder
              </Button>
              {uploadAction}
            </>
          }
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatCard label="Total Documents" value={summary?.totalDocuments ?? 0} icon={FileText} tone="highlight" />
          <StatCard label="Total Storage" value={formatBytes(summary?.totalSize ?? 0)} icon={Database} tone="info" />
          <StatCard label="Total Folders" value={summary?.totalFolders ?? 0} icon={Folder} tone="ok" />
        </div>

        <SectionCard flush>
          {/* Breadcrumbs */}
          <nav className="flex flex-wrap items-center gap-1 border-b border-line px-4 py-3 text-small" aria-label="Breadcrumb">
            {breadcrumbs.length === 0 ? (
              <span className="font-semibold text-ink-1">All Documents</span>
            ) : (
              <Button variant="ghost" size="sm" className="h-auto px-1 py-0.5 text-primary" onClick={() => openFolder(null)}>
                All Documents
              </Button>
            )}
            {breadcrumbs.map((b, i) => (
              <Fragment key={b._id}>
                <ChevronRight className="size-3.5 text-ink-4" aria-hidden="true" />
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-ink-1">{b.name}</span>
                ) : (
                  <Button variant="ghost" size="sm" className="h-auto px-1 py-0.5 text-primary" onClick={() => openFolder(b._id)}>
                    {b.name}
                  </Button>
                )}
              </Fragment>
            ))}
          </nav>

          <FilterBar
            onClear={() => {
              setSearch('');
              setTypeFilter('all');
            }}
            showClear={hasFilters}
          >
            <FilterField label="Search files" htmlFor="doc-filter-search" grow={22} minWidth={220}>
              <SearchInput id="doc-filter-search" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder="Search files in this project..." />
            </FilterField>
            <FilterField label="Type" htmlFor="doc-filter-type" grow={12} minWidth={160} maxWidth={220}>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="doc-filter-type">
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
            </FilterField>
          </FilterBar>
          {isFiltering && <p className="px-4 pb-3 text-caption-lg text-ink-3">Showing matching files from all folders. Clear the search and type filter to browse folders.</p>}

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={documentRowKey}
            loading={loading}
            mobileCard={mobileCard}
            emptyState={
              <EmptyState
                icon={Inbox}
                title={isFiltering ? 'No files match your search.' : 'This folder is empty. Upload files or create a folder to get started.'}
                action={isFiltering ? undefined : uploadAction}
              />
            }
            footer={
              docs.total > PAGE_SIZE ? (
                <PaginationBar currentPage={page} totalPages={totalPages} totalItems={docs.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
              ) : undefined
            }
          />
        </SectionCard>
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
        existingNames={docs.items.map((x) => x.originalName)}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && !deleting && closeDelete()}
        title={`${user.isAdmin ? 'Delete' : 'Request deletion of'} "${deleteTarget?.item?.name || deleteTarget?.item?.originalName}"?`}
        description={
          cascadeInfo
            ? `This folder contains ${cascadeInfo.folders} subfolder(s) and ${cascadeInfo.documents} file(s). Everything inside will be permanently deleted. This cannot be undone.`
            : user.isAdmin
            ? deleteTarget?.type === 'folder'
              ? 'The folder will be deleted. This cannot be undone.'
              : 'The file will be permanently deleted from storage. This cannot be undone.'
            : 'Your request will be sent to an admin. Nothing is deleted until they approve it.'
        }
        confirmLabel={deleting ? 'Working...' : cascadeInfo ? 'Delete everything' : user.isAdmin ? 'Delete' : 'Send request'}
        tone="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      >
        {!user.isAdmin && <Textarea placeholder="Reason (optional)" maxLength={500} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />}
      </ConfirmDialog>
    </DashboardLayout>
  );
};

export default ProjectDocuments;
