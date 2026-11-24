import React, { useEffect, useMemo, useState } from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { documentsApi } from '@/api/projectDocuments';
import { errorMessage } from '@/lib/documentUtils';

// item: { type: 'folder' | 'document', id, name, parentId }  (parentId null = project root)
export default function MoveDialog({ open, onOpenChange, projectId, item, onMoved }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState('root');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setTarget('root');
    setError('');
    setLoading(true);
    documentsApi
      .listFolders(projectId)
      .then(setFolders)
      .catch((e) => setError(errorMessage(e, 'Failed to load folders')))
      .finally(() => setLoading(false));
  }, [open, item, projectId]);

  // Flatten the tree depth-first. A folder cannot be moved into itself or its own subfolders.
  const rows = useMemo(() => {
    const byParent = new Map();
    folders.forEach((f) => {
      const key = f.parentFolderId || 'root';
      byParent.set(key, [...(byParent.get(key) || []), f]);
    });
    const out = [];
    const walk = (parent, depth, blocked) => {
      (byParent.get(parent) || []).forEach((f) => {
        const isBlocked = blocked || (item?.type === 'folder' && f._id === item.id);
        out.push({ folder: f, depth, blocked: isBlocked });
        walk(f._id, depth + 1, isBlocked);
      });
    };
    walk('root', 0, false);
    return out;
  }, [folders, item]);

  const currentParent = item?.parentId || 'root';
  const unchanged = target === currentParent;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const dest = target === 'root' ? null : target;
      if (item.type === 'folder') await documentsApi.moveFolder(projectId, item.id, dest);
      else await documentsApi.moveDocument(item.id, dest);
      onMoved?.();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'Failed to move'));
    } finally {
      setSaving(false);
    }
  };

  const rowClass = (selected, disabled) =>
    `!h-auto w-full justify-start gap-2 rounded-control px-3 py-2 text-left text-small font-normal ${
      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-muted cursor-pointer'
    } ${selected ? 'bg-primary-soft ring-1 ring-primary' : ''}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Move {item?.type === 'folder' ? 'folder' : 'file'}</DialogTitle>
          <DialogDescription className="truncate">Choose a destination for "{item?.name}"</DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-line p-1">
          {loading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              <Button type="button" variant="ghost" className={rowClass(target === 'root', false)} onClick={() => setTarget('root')}>
                <FolderOpen className="text-primary" /> All Documents (project root)
              </Button>
              {rows.map(({ folder, depth, blocked }) => (
                <Button
                  key={folder._id}
                  type="button"
                  variant="ghost"
                  disabled={blocked}
                  className={rowClass(target === folder._id, blocked)}
                  style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}
                  onClick={() => setTarget(folder._id)}
                >
                  <Folder className="text-tone-warn-fg" />
                  <span className="truncate">{folder.name}</span>
                </Button>
              ))}
            </>
          )}
        </div>
        {unchanged && !loading && <p className="text-xs text-ink-3">It is already in this location.</p>}
        {error && <p className="text-sm text-tone-bad-fg">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving || loading || unchanged} onClick={submit}>
            {saving ? 'Moving...' : 'Move here'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
