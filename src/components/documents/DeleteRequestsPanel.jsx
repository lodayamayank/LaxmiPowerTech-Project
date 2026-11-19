import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaFolder } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { documentsApi } from '../../api/projectDocuments';
import { errorMessage, formatDateTime, getFileIcon } from '../../utils/documentUtils';

// Admin-only queue of delete requests from other users, across all projects.
export default function DeleteRequestsPanel({ open, onOpenChange, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // row awaiting approval

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentsApi.listDeleteRequests();
      const all = [
        ...res.folders.map((f) => ({ kind: 'folder', id: f._id, name: f.name, projectId: f.projectId?._id, projectName: f.projectId?.name, request: f.deleteRequest })),
        ...res.documents.map((d) => ({ kind: 'document', id: d._id, name: d.originalName, extension: d.extension, projectId: d.projectId?._id, projectName: d.projectId?.name, request: d.deleteRequest })),
      ].sort((a, b) => new Date(a.request.requestedAt) - new Date(b.request.requestedAt));
      setRows(all);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load delete requests'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const act = async (row, action) => {
    setBusyId(row.id);
    try {
      if (row.kind === 'folder') {
        await (action === 'approve' ? documentsApi.approveFolderDelete(row.projectId, row.id) : documentsApi.rejectFolderDelete(row.projectId, row.id));
      } else {
        await (action === 'approve' ? documentsApi.approveDocumentDelete(row.id) : documentsApi.rejectDocumentDelete(row.id));
      }
      toast.success(action === 'approve' ? 'Deleted' : 'Request rejected');
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, 'Action failed'));
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle>Delete requests</DialogTitle>
            <DialogDescription>Items other users asked to delete. Nothing is removed until you approve.</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No pending delete requests.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg">
              {rows.map((row) => {
                const { Icon, className } = row.kind === 'folder' ? { Icon: FaFolder, className: 'text-yellow-500' } : getFileIcon(row.extension);
                return (
                  <div key={`${row.kind}-${row.id}`} className="flex flex-wrap items-center gap-3 p-3">
                    <Icon className={className} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {row.name} {row.kind === 'folder' && <Badge variant="secondary" className="ml-1">Folder</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.projectName} · requested by {row.request.requestedBy?.name || 'unknown'} · {formatDateTime(row.request.requestedAt)}
                      </p>
                      {row.request.reason && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Reason: {row.request.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => act(row, 'reject')}>
                        Reject
                      </Button>
                      <Button size="sm" disabled={busyId === row.id} onClick={() => setConfirm(row)} className="bg-red-600 hover:bg-red-700 text-white">
                        Approve & delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirm?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'folder'
                ? 'This permanently deletes the folder, all its subfolders, and every file inside them. This cannot be undone.'
                : 'This permanently deletes the file from storage. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                act(confirm, 'approve');
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
