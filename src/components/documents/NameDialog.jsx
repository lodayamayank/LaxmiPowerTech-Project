import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '../../utils/documentUtils';

// Used for: new folder, rename folder, rename document.
// onSubmit(name) should throw on failure; the message is shown inline.
export default function NameDialog({ open, onOpenChange, title, description, label = 'Name', initialValue = '', submitLabel = 'Save', selectBaseOnly = false, onSubmit }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError('');
      setSaving(false);
    }
  }, [open, initialValue]);

  const submit = async (e) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) return setError('Name is required');
    setSaving(true);
    setError('');
    try {
      await onSubmit(name);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="block mb-1.5 font-semibold">{label}</Label>
            <Input
              autoFocus
              value={value}
              maxLength={255}
              onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => {
                const dot = e.target.value.lastIndexOf('.');
                if (selectBaseOnly && dot > 0) e.target.setSelectionRange(0, dot);
                else e.target.select();
              }}
            />
            {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
