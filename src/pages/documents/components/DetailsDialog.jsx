import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { documentsApi } from '@/api/projectDocuments';
import { errorMessage, formatBytes, formatDateTime, getFileIcon } from '@/lib/documentUtils';
import { Folder } from 'lucide-react';

const ACTION_LABELS = {
  created: 'Created',
  uploaded: 'Uploaded',
  renamed: 'Renamed',
  moved: 'Moved',
  delete_requested: 'Delete requested',
  delete_rejected: 'Delete rejected',
  deleted: 'Deleted',
};

const Row = ({ label, children }) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b border-line last:border-b-0 text-sm">
    <dt className="text-ink-3">{label}</dt>
    <dd className="col-span-2 text-ink-1 break-words">{children || '-'}</dd>
  </div>
);

// item: { type: 'folder' | 'document', id }
export default function DetailsDialog({ open, onOpenChange, projectId, item, isAdmin }) {
const [state, setState] = useState({
  loading: false,
  error: "",
  record: null,
  breadcrumbs: [],
  type: null,
});

useEffect(() => {
  if (!open || !item) return;
  let cancelled = false;
  const type = item.type;
  setState({ loading: true, error: "", record: null, breadcrumbs: [], type });
  const request =
    type === "folder"
      ? documentsApi.getFolder(projectId, item.id)
      : documentsApi.getDocument(projectId, item.id);
  request
    .then((res) => {
      if (!cancelled)
        setState({
          loading: false,
          error: "",
          record: res.folder || res.document,
          breadcrumbs: res.breadcrumbs || [],
          type,
        });
    })
    .catch((err) => {
      if (!cancelled)
        setState({
          loading: false,
          error: errorMessage(err, "Failed to load details"),
          record: null,
          breadcrumbs: [],
          type,
        });
    });
  return () => {
    cancelled = true;
  };
}, [open, item, projectId]);

const { loading, error, record, breadcrumbs, type } = state;
const isFolder = type === "folder";
  const doc = !isFolder ? record : null;
  const Icon = doc ? getFileIcon(doc.extension).Icon : Folder;
  const iconClass = doc ? getFileIcon(doc.extension).className : 'text-tone-warn-fg';
  const location = ['All Documents', ...breadcrumbs.slice(0, isFolder ? -1 : undefined).map((b) => b.name)].join(' / ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Icon className={iconClass} />
            <span className="truncate">
              {record?.originalName || record?.name || "Details"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isFolder ? "Folder details" : "File details"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-tone-bad-fg">{error}</p>}

        {record && (
          <>
            <dl>
              <Row label="Location">{location}</Row>
              {doc && (
                <>
                  <Row label="Type">{`${(doc.extension || "").toUpperCase()} (${doc.fileType || "-"})`}</Row>
                  <Row label="Size">{`${formatBytes(doc.fileSize || 0)} (${(doc.fileSize || 0).toLocaleString()} bytes)`}</Row>
                  <Row label="Description">{doc.description}</Row>
                </>
              )}
              <Row label={isFolder ? "Created by" : "Uploaded by"}>
                {(record.uploadedBy || record.createdBy)?.name}
              </Row>
              <Row label={isFolder ? "Created" : "Uploaded"}>
                {formatDateTime(record.createdAt)}
              </Row>
              <Row label="Last modified">
                {formatDateTime(record.updatedAt)}
                {record.updatedBy?.name ? ` by ${record.updatedBy.name}` : ""}
              </Row>
              {record.deleteRequest && (
                <Row label="Status">
                  <Badge variant="warn">
                    Deletion requested{" "}
                    {formatDateTime(record.deleteRequest.requestedAt)}
                  </Badge>
                </Row>
              )}
            </dl>

            {isAdmin && record.audit?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-ink-1 mb-2">
                  Activity history
                </h4>
                <ul className="space-y-1.5 text-sm border border-line rounded-lg p-3 max-h-48 overflow-y-auto">
                  {[...record.audit].reverse().map((a, i) => (
                    <li key={i} className="flex flex-col">
                      <span>
                        <span className="font-medium">
                          {ACTION_LABELS[a.action] || a.action}
                        </span>
                        <span className="text-ink-3">
                          {" "}
                          by {a.by?.name || "unknown"} · {formatDateTime(a.at)}
                        </span>
                      </span>
                      {a.detail && (
                        <span className="text-xs text-ink-3 break-words">
                          {a.detail}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
