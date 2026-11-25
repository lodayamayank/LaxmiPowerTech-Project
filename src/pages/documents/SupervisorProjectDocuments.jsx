import React, { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import MobilePage from "@/layouts/mobile/MobilePage";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, Folder, FolderPlus, MoreVertical, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PaginationBar } from "@/components/common/PaginationBar";
import useCurrentUser from "@/hooks/useCurrentUser";
import { getSelectedBranch } from "@/lib/session";
import { documentsApi } from "@/api/projectDocuments";
import {
  CATEGORY_LABELS,
  errorMessage,
  formatBytes,
  formatDate,
  getFileIcon,
} from "@/lib/documentUtils";
import UploadDialog from "./components/UploadDialog";
import NameDialog from "./components/NameDialog";
import MoveDialog from "./components/MoveDialog";
import DetailsDialog from "./components/DetailsDialog";
import PreviewDialog from "./components/PreviewDialog";

const PAGE_SIZE = 20;

const Shell = ({ children, onBack }) => (
  <MobilePage title="Documents" back onBack={onBack}>
    {children}
  </MobilePage>
);

const SupervisorProjectDocuments = () => {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useCurrentUser();

  const folderId = searchParams.get("folder") || null;
  const branchName = getSelectedBranch().name;

  // data
  const [summary, setSummary] = useState(null);
  const [folders, setFolders] = useState([]);
  const [docs, setDocs] = useState({ items: [], total: 0 });
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

  // view state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  // dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [cascadeInfo, setCascadeInfo] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const requestSeq = useRef(0);
  const isFiltering = Boolean(debouncedSearch || typeFilter !== "all");
  const currentFolderName = breadcrumbs.length
    ? breadcrumbs[breadcrumbs.length - 1].name
    : null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [folderId, debouncedSearch, typeFilter]);

  const load = useCallback(async () => {
    if (!user.canUseDocuments) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const docParams = {
        page,
        limit: PAGE_SIZE,
        sortBy: "date",
        order: "desc",
      };
      if (debouncedSearch) docParams.q = debouncedSearch;
      if (typeFilter !== "all") docParams.fileType = typeFilter;
      if (!isFiltering) docParams.folderId = folderId || "root";

      const [docRes, folderRes, sum] = await Promise.all([
        documentsApi.listDocuments(projectId, docParams),
        isFiltering
          ? Promise.resolve([])
          : documentsApi.listFolders(projectId, {
              parentFolderId: folderId || "root",
            }),
        documentsApi.getSummary(projectId),
      ]);
      if (seq !== requestSeq.current) return;
      setDocs(docRes);
      setFolders(folderRes);
      setSummary(sum);
      setAccessError("");
    } catch (err) {
      if (seq !== requestSeq.current) return;
      const status = err?.response?.status;
      if (status === 403 || status === 404)
        setAccessError(
          errorMessage(err, "You do not have access to this project"),
        );
      else toast.error(errorMessage(err, "Failed to load documents"));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [
    projectId,
    folderId,
    page,
    debouncedSearch,
    typeFilter,
    isFiltering,
    user.canUseDocuments,
  ]);

  useEffect(() => {
    load();
  }, [load]);

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
        toast.error("That folder no longer exists");
        setSearchParams({});
      });
  }, [projectId, folderId, user.canUseDocuments, setSearchParams]);

  useEffect(() => {
    if (user.canUseDocuments)
      documentsApi
        .getUploadConfig()
        .then(setConfig)
        .catch(() => {});
  }, [user.canUseDocuments]);

  const refresh = () => load();

  /* ---------------- navigation ---------------- */

  const openFolder = (id) => {
    setSearch("");
    setTypeFilter("all");
    setSearchParams(id ? { folder: id } : {});
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1)
      openFolder(breadcrumbs[breadcrumbs.length - 2]._id);
    else if (breadcrumbs.length === 1) openFolder(null);
    else navigate("/supervisor/projects"); // <- your supervisor project list route
  };

  /* ---------------- actions ---------------- */

  const downloadDocument = async (doc) => {
    try {
      const { url } = await documentsApi.getDownloadUrl(doc._id);
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to download"));
    }
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteReason("");
    setCascadeInfo(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;
    setDeleting(true);
    try {
      const reason = deleteReason.trim() || undefined;
      const res =
        type === "folder"
          ? await documentsApi.deleteFolder(projectId, item._id, {
              cascade: Boolean(cascadeInfo),
              reason,
            })
          : await documentsApi.deleteDocument(item._id, { reason });
      if (res.status === 202)
        toast.info("Delete request sent to an admin for approval");
      else toast.success(type === "folder" ? "Folder deleted" : "File deleted");
      closeDelete();
      refresh();
    } catch (err) {
      const data = err?.response?.data;
      if (err?.response?.status === 409 && data?.requiresCascade) {
        setCascadeInfo({ folders: data.folders, documents: data.documents });
      } else {
        toast.error(errorMessage(err, "Failed to delete"));
      }
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- render ---------------- */

  

  if (!user.canUseDocuments) {
    return (
      <Shell>
        <div className="p-8 text-center text-sm text-ink-3">
          You do not have permission to view project documents.
        </div>
      </Shell>
    );
  }

  if (accessError) {
    return (
      <Shell>
        <div className="p-8 text-center space-y-3">
          <p className="text-sm text-ink-2">{accessError}</p>
          <Button
            variant="outline"
            onClick={() => navigate("/supervisor/projects")}
          >
            Go back
          </Button>
        </div>
      </Shell>
    );
  }

  const totalPages = Math.max(1, Math.ceil(docs.total / PAGE_SIZE));
  const empty = !loading && folders.length === 0 && docs.items.length === 0;
  const deleteLabel = user.isAdmin ? "Delete" : "Request deletion";

  const renderMenu = (type, item) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          title="Actions"
        >
          <MoreVertical size={13} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {type === "folder" ? (
          <DropdownMenuItem onClick={() => openFolder(item._id)}>
            Open
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => setPreviewDoc(item)}>
              {item.previewable ? "Preview" : "View info"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadDocument(item)}>
              Download
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => setRenameTarget({ type, item })}>
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setMoveTarget({
              type,
              id: item._id,
              name: type === "folder" ? item.name : item.originalName,
              parentId: type === "folder" ? item.parentFolderId : item.folderId,
            })
          }
        >
          Move
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setDetailsTarget({ type, id: item._id })}
        >
          Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={Boolean(item.deleteRequest)}
          className="text-tone-bad-fg focus:text-tone-bad-fg"
          onClick={() => setDeleteTarget({ type, item })}
        >
          {item.deleteRequest ? "Deletion requested" : deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const requestedBadge = (item) =>
    item.deleteRequest ? (
      <Badge variant="warn" className="mt-1 text-[10px]">
        Deletion requested
      </Badge>
    ) : null;

  return (
    <Shell onBack={handleBack}>
      <p className="-mb-1 truncate text-small text-ink-3">{summary?.projectName || branchName || "Project"}</p>

      {/* Compact stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Files", summary?.totalDocuments ?? 0],
          ["Folders", summary?.totalFolders ?? 0],
          ["Storage", formatBytes(summary?.totalSize ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line-card bg-surface px-2 py-2.5 text-center">
            <p className="text-sm font-semibold text-ink-1">{value}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-3">{label}</p>
          </div>
        ))}
      </div>

      <div className="pb-24">
        {/* Search + filter */}
        <div className="bg-surface rounded-[14px] border border-line-card p-3 space-y-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
              size={14}
            />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 h-10 text-sm"
            />
            {search && (
              <Button
                variant="ghost" type="button"
                className="!h-auto font-normal hover:bg-transparent absolute right-3 top-1/2 -translate-y-1/2 p-0 text-ink-4"
                onClick={() => setSearch("")}
                title="Clear"
              >
                <X size={12} />
              </Button>
            )}
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 text-sm">
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

        {/* Breadcrumbs (horizontal scroll) */}
        <nav
          className="mt-4 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs pb-1"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.length === 0 ? (
            <span className="font-semibold text-ink-1">All Documents</span>
          ) : (
            <Button
              variant="ghost" type="button"
              className="!h-auto font-normal hover:bg-transparent p-0 text-primary"
              onClick={() => openFolder(null)}
            >
              All Documents
            </Button>
          )}
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b._id}>
              <ChevronRight size={8} className="text-ink-4 shrink-0" />
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-ink-1">{b.name}</span>
              ) : (
                <Button
                  variant="ghost" type="button"
                  className="!h-auto font-normal hover:bg-transparent p-0 text-primary"
                  onClick={() => openFolder(b._id)}
                >
                  {b.name}
                </Button>
              )}
            </React.Fragment>
          ))}
        </nav>

        {isFiltering && (
          <p className="mt-2 text-[11px] text-ink-3">
            Showing matches from all folders. Clear search and filter to browse
            folders.
          </p>
        )}

        {/* List */}
        <div className="mt-3 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-line-card p-3"
              >
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : empty ? (
            <EmptyState
              icon={Folder}
              title={isFiltering ? "No files match your search" : "This folder is empty"}
              description={isFiltering ? "Try a different search or file type." : "Upload files or create a folder to get started."}
            />
          ) : (
            <>
              {folders.map((f) => (
                <div
                  key={`f-${f._id}`}
                  className="flex items-center gap-1 rounded-xl border border-line-card bg-surface pr-1"
                >
                  <Button
                    variant="ghost" type="button"
                    onClick={() => openFolder(f._id)}
                    className="!h-auto justify-start whitespace-normal font-normal hover:bg-transparent flex flex-1 min-w-0 items-center gap-3 p-3 text-left active:bg-surface-subtle rounded-xl"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-tone-warn-soft flex items-center justify-center">
                      <Folder className="text-tone-warn-fg" size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-1">
                        {f.name}
                      </p>
                      <p className="truncate text-[11px] text-ink-3">
                        Folder · {formatDate(f.createdAt)}
                      </p>
                      {requestedBadge(f)}
                    </div>
                  </Button>
                  {renderMenu("folder", f)}
                </div>
              ))}

              {docs.items.map((d) => {
                const { Icon, className } = getFileIcon(d.extension);
                return (
                  <div
                    key={`d-${d._id}`}
                    className="flex items-center gap-1 rounded-xl border border-line-card bg-surface pr-1"
                  >
                    <Button
                      variant="ghost" type="button"
                      onClick={() => setPreviewDoc(d)}
                      className="!h-auto justify-start whitespace-normal font-normal hover:bg-transparent flex flex-1 min-w-0 items-center gap-3 p-3 text-left active:bg-surface-subtle rounded-xl"
                    >
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-surface-subtle flex items-center justify-center">
                        <Icon className={className} size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-1">
                          {d.originalName}
                        </p>
                        <p className="truncate text-[11px] text-ink-3">
                          <span className="uppercase">{d.extension}</span> ·{" "}
                          {formatBytes(d.fileSize)} · {formatDate(d.createdAt)}
                        </p>
                        <p className="truncate text-[11px] text-ink-4">
                          by {d.uploadedBy?.name || "-"}
                        </p>
                        {requestedBadge(d)}
                      </div>
                    </Button>
                    {renderMenu("document", d)}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Pagination */}
        {docs.total > PAGE_SIZE && (
          <PaginationBar variant="simple" className="mt-4" currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {/* Floating actions (kept inside the max-w-md column) */}
      <div className="fixed bottom-0 inset-x-0 pointer-events-none">
        <div className="max-w-md mx-auto px-5 pb-5 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setNewFolderOpen(true)}
            className="pointer-events-auto h-12 w-12 rounded-full bg-surface p-0"
            title="New folder"
          >
            <FolderPlus size={16} />
          </Button>
          <Button
            onClick={() => setUploadOpen(true)}
            className="pointer-events-auto h-12 rounded-full gap-2 px-5"
          >
            <Upload size={13} /> Upload
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
        folderId={folderId}
        folderName={currentFolderName}
        config={config}
        initialFiles={null}
        existingNames={docs.items.map((d) => d.originalName)}
        onUploaded={refresh}
      />

      <NameDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New folder"
        description={`Create a folder in ${
          currentFolderName || "All Documents"
        }`}
        label="Folder name"
        submitLabel="Create"
        onSubmit={async (name) => {
          await documentsApi.createFolder(projectId, name, folderId);
          toast.success("Folder created");
          refresh();
        }}
      />

      <NameDialog
        open={Boolean(renameTarget)}
        onOpenChange={(o) => !o && setRenameTarget(null)}
        title={
          renameTarget?.type === "folder" ? "Rename folder" : "Rename file"
        }
        label="Name"
        initialValue={
          renameTarget
            ? renameTarget.item.name || renameTarget.item.originalName
            : ""
        }
        selectBaseOnly={renameTarget?.type === "document"}
        submitLabel="Rename"
        onSubmit={async (name) => {
          if (renameTarget.type === "folder")
            await documentsApi.renameFolder(
              projectId,
              renameTarget.item._id,
              name,
            );
          else await documentsApi.renameDocument(renameTarget.item._id, name);
          toast.success("Renamed");
          refresh();
          if (renameTarget.type === "folder")
            setBreadcrumbs((b) =>
              b.map((x) =>
                x._id === renameTarget.item._id ? { ...x, name } : x,
              ),
            );
        }}
      />

      <MoveDialog
        open={Boolean(moveTarget)}
        onOpenChange={(o) => !o && setMoveTarget(null)}
        projectId={projectId}
        item={moveTarget}
        onMoved={() => {
          toast.success("Moved");
          refresh();
        }}
      />

      <DetailsDialog
        open={Boolean(detailsTarget)}
        onOpenChange={(o) => !o && setDetailsTarget(null)}
        projectId={projectId}
        item={detailsTarget}
        isAdmin={user.isAdmin}
      />

      <PreviewDialog
        open={Boolean(previewDoc)}
        onOpenChange={(o) => !o && setPreviewDoc(null)}
        doc={previewDoc}
        onDownload={downloadDocument}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && !deleting && closeDelete()}
        title={`${user.isAdmin ? "Delete" : "Request deletion of"} "${deleteTarget?.item?.name || deleteTarget?.item?.originalName}"?`}
        description={
          cascadeInfo
            ? `This folder contains ${cascadeInfo.folders} subfolder(s) and ${cascadeInfo.documents} file(s). Everything inside will be permanently deleted. This cannot be undone.`
            : user.isAdmin
            ? deleteTarget?.type === "folder"
              ? "The folder will be deleted. This cannot be undone."
              : "The file will be permanently deleted from storage. This cannot be undone."
            : "Your request will be sent to an admin. Nothing is deleted until they approve it."
        }
        confirmLabel={deleting ? "Working..." : cascadeInfo ? "Delete everything" : user.isAdmin ? "Delete" : "Send request"}
        tone="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      >
        {!user.isAdmin && (
          <Textarea
            placeholder="Reason (optional)"
            maxLength={500}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        )}
      </ConfirmDialog>
    </Shell>
  );
};

export default SupervisorProjectDocuments;
