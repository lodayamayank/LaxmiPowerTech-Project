// src/pages/attendance/components/DeleteConfirmDialog.jsx
// Type-to-confirm dialog for the bulk attendance delete (same wording and rules as the old fixed overlay).
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/FormField";
import { CONFIRMATION_PHRASE } from "./useDeleteAttendance";

export default function DeleteConfirmDialog({ d }) {
  const { confirmOpen, closeConfirm, preview, deleteFromDatabase, deleteFromCloudinary, endDate, startDate, confirmText, setConfirmText, deleting, handleDelete } = d;
  return (
    <Dialog open={confirmOpen} onOpenChange={(open) => !open && closeConfirm()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tone-bad-soft">
              <TriangleAlert className="size-[18px] text-tone-bad-fg" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Confirm permanent deletion</DialogTitle>
              <p className="mt-1 text-small text-ink-3">
                You are about to permanently delete{' '}
                {deleteFromDatabase && (
                  <>
                    <span className="font-semibold text-ink-1">{preview?.count}</span>{' '}
                    attendance record{preview?.count === 1 ? '' : 's'} from the database
                  </>
                )}
                {deleteFromDatabase && deleteFromCloudinary && ' and '}
                {deleteFromCloudinary && (
                  <>
                    <span className="font-semibold text-ink-1">{preview?.withSelfies}</span>{' '}
                    selfie{preview?.withSelfies === 1 ? '' : 's'} from Cloudinary
                  </>
                )}
                {endDate && endDate !== startDate ? ` for ${startDate} to ${endDate}` : ` for ${startDate}`}
                . This action cannot be undone.
              </p>
            </div>
          </div>
        </DialogHeader>

        <FormField
          label={
            <>
              Type <span className="font-data text-tone-bad-fg">{CONFIRMATION_PHRASE}</span> to confirm
            </>
          }
          htmlFor="delete-attendance-confirm-text"
        >
          <Input
            id="delete-attendance-confirm-text"
            type="text"
            autoFocus
            className="font-data"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRMATION_PHRASE}
            disabled={deleting}
          />
        </FormField>

        <DialogFooter>
          <Button variant="outline" onClick={closeConfirm} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={confirmText !== CONFIRMATION_PHRASE || deleting} onClick={handleDelete}>
            {deleting ? "Deleting…" : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
