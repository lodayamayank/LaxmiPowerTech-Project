// src/pages/payroll/components/GenerateSlipsDialog.jsx
// Confirmation before creating the permanent salary slips for the selected period.
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Notice } from "@/components/common/Notice";
import { formatRupees } from "../payrollFormat";

export default function GenerateSlipsDialog({ open, onOpenChange, generating, periodLabel, count, totalNet, onGenerate }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!generating) onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(event) => generating && event.preventDefault()}
        onInteractOutside={(event) => generating && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Generate Salary Slips</DialogTitle>
          <DialogDescription>Create permanent salary records for {periodLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Notice tone="warn" icon={Info} title="What happens when you generate slips?">
            <ul className="mt-1 list-inside list-disc space-y-1 text-caption-lg">
              <li>
                Permanent salary records will be created for <strong>{count} employee(s)</strong>
              </li>
              <li>Records include attendance, deductions, and benefits</li>
              <li>You can mark them as paid after generation</li>
              <li>Existing slips for this period will be skipped</li>
            </ul>
          </Notice>

          <div className="rounded-card border border-line-card bg-surface-subtle p-4">
            <h4 className="mb-2 text-small font-semibold text-ink-1">Summary</h4>
            <div className="space-y-1 text-small">
              <div className="flex justify-between">
                <span className="text-ink-3">Period:</span>
                <span className="font-medium text-ink-1">{periodLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Employees:</span>
                <span className="font-medium tabular-nums text-ink-1">{count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Total Payable:</span>
                <span className="font-medium tabular-nums text-tone-ok-fg">{formatRupees(totalNet)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button onClick={() => onOpenChange(false)} disabled={generating} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={onGenerate} disabled={generating || count === 0} className="flex-1">
            {generating ? (
              <>
                <Loader2 className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <CheckCircle2 />
                Generate {count} Slip(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
