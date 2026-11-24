import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, CircleAlert, CloudUpload, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uploadFile } from '@/api/projectDocuments';
import { errorMessage, formatBytes, getFileIcon } from '@/lib/documentUtils';

const MAX_PARALLEL = 3;
let counter = 0;
const nextId = () => `u${Date.now()}-${counter++}`;
const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

export default function UploadDialog({
  open,
  onOpenChange,
  projectId,
  folderId,
  folderName,
  config,
  initialFiles,
  existingNames = [],
  onUploaded,
}) {
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const consumedRef = useRef(false);

  const patch = (id, changes) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));

  const addFiles = (fileList) => {
    const maxBytes = config?.maxUploadBytes;
    const allowed = config?.allowedExtensions;
    const taken = new Set(existingNames.map((n) => n.toLowerCase()));
    setItems((prev) => {
      const next = [...prev];
      for (const file of Array.from(fileList || [])) {
        if (next.some((it) => it.file.name === file.name && it.file.size === file.size && it.status !== 'done')) continue;
        let error = null;
        if (allowed && !allowed.includes(extOf(file.name))) error = `".${extOf(file.name) || '?'}" files are not allowed`;
        else if (!file.size) error = 'File is empty';
        else if (maxBytes && file.size > maxBytes) error = `Larger than the ${formatBytes(maxBytes)} limit`;
        next.push({
          id: nextId(),
          file,
          status: error ? 'rejected' : 'queued',
          progress: 0,
          error,
          duplicate: !error && taken.has(file.name.toLowerCase()),
        });
      }
      return next;
    });
  };

  // Files dropped on the page arrive via initialFiles.
  useEffect(() => {
    if (open && initialFiles?.length && !consumedRef.current) {
      consumedRef.current = true;
      addFiles(initialFiles);
    }
    if (!open) consumedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open && !running) setItems([]);
  }, [open, running]);

  const uploadOne = async (item, signal) => {
    patch(item.id, { status: 'uploading', progress: 0, error: null });
    try {
      const doc = await uploadFile({
        projectId,
        folderId,
        file: item.file,
        signal,
        onProgress: (pct) => patch(item.id, { progress: pct }),
      });
      patch(item.id, { status: 'done', progress: 100, savedName: doc.originalName });
      return true;
    } catch (err) {
      if (axios.isCancel(err)) patch(item.id, { status: 'queued', progress: 0, error: 'Canceled' });
      else patch(item.id, { status: 'error', error: errorMessage(err, 'Upload failed') });
      return false;
    }
  };

  const startUpload = async () => {
    const targets = items.filter((it) => it.status === 'queued' || it.status === 'error');
    if (!targets.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);

    let ok = 0;
    const queue = [...targets];
    const workers = Array.from({ length: Math.min(MAX_PARALLEL, queue.length) }, async () => {
      while (queue.length && !controller.signal.aborted) {
        if (await uploadOne(queue.shift(), controller.signal)) ok += 1;
      }
    });
    await Promise.all(workers);

    setRunning(false);
    abortRef.current = null;
    if (ok > 0) {
      onUploaded?.();
      toast.success(`${ok} file${ok > 1 ? 's' : ''} uploaded`);
    }
  };

  const handleOpenChange = (next) => {
    if (!next && running) return; // uploads in progress: use Cancel
    onOpenChange(next);
  };

  const waiting = items.filter((it) => it.status === 'queued' || it.status === 'error').length;
  const allDone = items.length > 0 && items.every((it) => it.status === 'done' || it.status === 'rejected');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>Uploading to: {folderName || 'All Documents'}</DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          onClick={() => !running && inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && !running && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!running) addFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary-soft' : 'border-line-input bg-surface-subtle hover:bg-primary-soft'
          }`}
        >
          <CloudUpload size={30} className="text-primary" />
          <p className="text-sm font-medium text-ink-1">Drag and drop files here, or click to browse</p>
          <p className="text-xs text-ink-3">
            {config
              ? `Up to ${formatBytes(config.maxUploadBytes)} per file. ${config.allowedExtensions.map((e) => e.toUpperCase()).join(', ')}`
              : 'Loading limits...'}
          </p>
          <Input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={config ? config.allowedExtensions.map((e) => `.${e}`).join(',') : undefined}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {items.length > 0 && (
          <div className="max-h-64 overflow-y-auto divide-y divide-line border border-line rounded-lg">
            {items.map((it) => {
              const { Icon, className } = getFileIcon(extOf(it.file.name));
              const failed = it.status === 'error' || it.status === 'rejected';
              return (
                <div key={it.id} className="flex items-center gap-3 p-3">
                  <Icon className={className} size={18} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-1">{it.file.name}</p>
                    <p className="text-xs text-ink-3">
                      {formatBytes(it.file.size)}
                      {it.status === 'done' && it.savedName !== it.file.name && ` · saved as "${it.savedName}"`}
                      {it.duplicate && it.status === 'queued' && ' · name exists here, it will be renamed automatically'}
                    </p>
                    {it.status === 'uploading' && <Progress value={it.progress} className="h-1.5 mt-1.5" />}
                    {failed && it.error && <p className="text-xs text-tone-bad-fg mt-0.5">{it.error}</p>}
                    {it.status === 'queued' && it.error && <p className="text-xs text-tone-warn-fg mt-0.5">{it.error}</p>}
                  </div>
                  {it.status === 'done' && <CheckCircle2 className="size-4 text-tone-ok-fg" />}
                  {failed && <CircleAlert className="size-4 text-tone-bad-fg" />}
                  {it.status === 'uploading' && <span className="text-xs text-ink-3 w-9 text-right">{it.progress}%</span>}
                  {!running && it.status === 'error' && (
                    <Button variant="ghost" size="icon" title="Retry" onClick={() => uploadOne(it, new AbortController().signal).then((ok) => ok && onUploaded?.())}>
                      <RotateCw size={12} />
                    </Button>
                  )}
                  {!running && it.status !== 'done' && it.status !== 'uploading' && (
                    <Button variant="ghost" size="icon" title="Remove" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}>
                      <X size={12} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {running ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              Cancel uploads
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {allDone ? 'Done' : 'Close'}
            </Button>
          )}
          <Button disabled={running || waiting === 0} onClick={startUpload}>
            {running ? 'Uploading...' : `Upload ${waiting || ''} file${waiting === 1 ? '' : 's'}`.replace('  ', ' ')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
