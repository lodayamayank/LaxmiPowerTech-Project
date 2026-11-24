// src/pages/documents/components/documentColumns.jsx
// DataTable columns and mobile card for the project documents list (folders first, then files).
import { memo } from "react";
import { ArrowDown, ArrowUp, Folder, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatBytes, formatDate, getFileIcon } from "@/lib/documentUtils";

const isFolder = (row) => row.__kind === "folder";
const rowName = (row) => (isFolder(row) ? row.name : row.originalName);

const NameCell = memo(function NameCell({ row, onOpen }) {
  const folder = isFolder(row);
  const { Icon, className } = folder ? { Icon: Folder, className: "text-tone-warn-fg" } : getFileIcon(row.extension);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-muted">
        <Icon className={className} size={16} aria-hidden="true" />
      </div>
      <Button variant="ghost" className="!h-auto min-w-0 justify-start p-0 font-medium text-ink-1 hover:bg-transparent hover:text-primary" onClick={() => onOpen(row)}>
        <span className="max-w-[280px] truncate">{rowName(row)}</span>
      </Button>
      {row.deleteRequest ? <Badge variant="warn">Deletion requested</Badge> : null}
    </div>
  );
});

const Uploader = memo(function Uploader({ row }) {
  const name = isFolder(row) ? row.createdBy?.name : row.uploadedBy?.name;
  if (!name) return <span className="text-ink-3">-</span>;
  return (
    <div className="flex items-center gap-2">
      <UserAvatar name={name} size="sm" />
      <span className="text-ink-2">{name}</span>
    </div>
  );
});

const RowMenu = memo(function RowMenu({ row, h }) {
  const type = isFolder(row) ? "folder" : "document";
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-control-sm w-control-sm" title="Actions" aria-label={`Actions for ${rowName(row)}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {type === "folder" ? (
          <DropdownMenuItem onClick={() => h.openFolder(row._id)}>Open</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => h.setPreviewDoc(row)}>{row.previewable ? "Preview" : "View info"}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => h.downloadDocument(row)}>Download</DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => h.setRenameTarget({ type, item: row })}>Rename</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            h.setMoveTarget({
              type,
              id: row._id,
              name: type === "folder" ? row.name : row.originalName,
              parentId: type === "folder" ? row.parentFolderId : row.folderId,
            })
          }
        >
          Move
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => h.setDetailsTarget({ type, id: row._id })}>Details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={Boolean(row.deleteRequest)} className="text-tone-bad-fg focus:text-tone-bad-fg" onClick={() => h.setDeleteTarget({ type, item: row })}>
          {row.deleteRequest ? "Deletion requested" : h.deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const SortHeader = ({ label, by, sort, onSort }) => (
  <Button variant="ghost" size="sm" className="-ml-2 h-auto px-2 py-1 font-semibold" onClick={() => onSort(by)}>
    {label}
    {sort.by === by ? sort.order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
  </Button>
);

export const documentRowKey = (row) => `${isFolder(row) ? "f" : "d"}-${row._id}`;

/** Folders first, then files, tagged so one table can show both. */
export const toDocumentRows = (folders, items) => [
  ...folders.map((f) => ({ ...f, __kind: "folder" })),
  ...items.map((d) => ({ ...d, __kind: "document" })),
];

export function getDocumentColumns(h, sort, onSort) {
  const open = (row) => (isFolder(row) ? h.openFolder(row._id) : h.setPreviewDoc(row));
  return [
    { key: "name", header: <SortHeader label="Name" by="name" sort={sort} onSort={onSort} />, cell: (row) => <NameCell row={row} onOpen={open} /> },
    { key: "type", header: "Type", cell: (row) => <span className="uppercase text-ink-3">{isFolder(row) ? "Folder" : row.extension}</span> },
    { key: "size", header: <SortHeader label="Size" by="size" sort={sort} onSort={onSort} />, cell: (row) => <span className="text-ink-3">{isFolder(row) ? "-" : formatBytes(row.fileSize)}</span> },
    { key: "by", header: "Uploaded by", cell: (row) => <Uploader row={row} /> },
    { key: "date", header: <SortHeader label="Uploaded date" by="date" sort={sort} onSort={onSort} />, cell: (row) => <span className="tabular-nums text-ink-3">{formatDate(row.createdAt)}</span> },
    { key: "actions", header: "Actions", align: "right", sticky: "right", cell: (row) => <RowMenu row={row} h={h} /> },
  ];
}

/** Stacked card for one folder/file (DataTable `mobileCard`, below md). */
export function getDocumentMobileCard(h) {
  const open = (row) => (isFolder(row) ? h.openFolder(row._id) : h.setPreviewDoc(row));
  return function DocumentMobileCard(row) {
    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <NameCell row={row} onOpen={open} />
          <RowMenu row={row} h={h} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption-lg text-ink-3">
          <span className="uppercase">{isFolder(row) ? "Folder" : `${row.extension} · ${formatBytes(row.fileSize)}`}</span>
          <span className="tabular-nums">{formatDate(row.createdAt)}</span>
        </div>
        <Uploader row={row} />
      </>
    );
  };
}
