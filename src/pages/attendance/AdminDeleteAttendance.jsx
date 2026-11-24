// src/pages/attendance/AdminDeleteAttendance.jsx  (route: Delete records)
// State, the delete-preview request and the bulk delete live in components/useDeleteAttendance.js (moved unchanged); this file lays out the page.
import { Image as ImageIcon, Trash2 } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/FormField";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { cn } from "@/lib/utils";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import useDeleteAttendance, { todayStr } from "./components/useDeleteAttendance";

const MODES = [
  ["cloudinary", "Delete from Cloudinary"],
  ["both", "Delete from Cloudinary + Database"],
];

const AdminDeleteAttendance = () => {
  const d = useDeleteAttendance();
  const { startDate, setStartDate, endDate, setEndDate, preview, previewLoading, previewError, deleteMode, setDeleteMode, openConfirm } = d;

  return (
    <DashboardLayout>
      <PageHeader eyebrow="Admin / Data tools" title="Delete attendance records" description="Free up storage by removing old selfies, or clear attendance for a period." />

      <Notice tone="bad" title="This permanently deletes data">
        Permanently remove attendance records — and their selfies on Cloudinary — for a specific date or date range. This cannot be undone.
      </Notice>

      <SectionCard title="1. Choose the period">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Start Date" htmlFor="delete-attendance-start-date" required>
            <Input id="delete-attendance-start-date" type="date" value={startDate} max={todayStr()} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="End Date (optional)" htmlFor="delete-attendance-end-date" hint="Leave blank to target a single day">
            <Input id="delete-attendance-end-date" type="date" value={endDate} min={startDate} max={todayStr()} onChange={(e) => setEndDate(e.target.value)} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="2. What should be deleted?">
        <p id="delete-attendance-mode-label" className="mb-2 text-small font-medium text-ink-1">
          Delete from
        </p>
        <div role="radiogroup" aria-labelledby="delete-attendance-mode-label" className="flex flex-col gap-3 sm:flex-row">
          {MODES.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              role="radio"
              aria-checked={deleteMode === value}
              onClick={() => setDeleteMode(value)}
              className={cn(
                "h-auto flex-1 justify-start whitespace-normal px-3 py-2.5 text-left font-normal",
                deleteMode === value ? "border-tone-bad-fg bg-tone-bad-soft text-ink-1" : "text-ink-2"
              )}
            >
              <span aria-hidden="true" className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", deleteMode === value ? "border-tone-bad-fg" : "border-line-input")}>
                {deleteMode === value ? <span className="size-2 rounded-full bg-tone-bad-fg" /> : null}
              </span>
              {label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-caption-lg text-ink-3">
          {deleteMode === "cloudinary"
            ? "Only the selfie images are removed from Cloudinary — the attendance records stay in the database."
            : "The selfie images and the attendance records themselves are both permanently removed."}
        </p>
      </SectionCard>

      <SectionCard title="3. Review and confirm">
        <div className="space-y-3">
          {previewError && <p className="text-small text-tone-bad-fg">{previewError}</p>}
          {previewLoading && <p className="text-small text-ink-3">Checking matching records…</p>}
          {!previewLoading && preview && (
            <Notice tone={preview.count === 0 ? "neutral" : "warn"}>
              {preview.count === 0 ? (
                <p>No attendance records found in the selected period.</p>
              ) : (
                <>
                  <p className="font-semibold">
                    {preview.count} attendance record{preview.count === 1 ? "" : "s"} will be permanently deleted.
                  </p>
                  <p className="mt-1 flex items-center gap-1.5">
                    <ImageIcon className="size-3" aria-hidden="true" />
                    {preview.withSelfies} of them have a selfie stored on Cloudinary — those images will be deleted too.
                  </p>
                </>
              )}
            </Notice>
          )}
          <Button variant="destructive" disabled={!preview || preview.count === 0 || previewLoading} onClick={openConfirm}>
            <Trash2 /> Delete Records
          </Button>
        </div>
      </SectionCard>

      <DeleteConfirmDialog d={d} />
    </DashboardLayout>
  );
};

export default AdminDeleteAttendance;
