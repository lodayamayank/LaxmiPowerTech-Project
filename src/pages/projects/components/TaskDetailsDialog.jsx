// src/pages/projects/components/TaskDetailsDialog.jsx
// Read-only task details with the Approve / Edit actions (same conditions as before).
import { CheckCircle2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";

const isSupervisorSubmittedTask = (task) =>
  Boolean(task?.photoUrl || task?.photoPublicId || task?.capturedAt || task?.syncedOffline);

// Review status label and tone (same rules as before; tones instead of color classes).
const getReviewStatus = (task) => {
  if (task?.status === "approved") return { label: "Approved", tone: "ok" };
  if (task?.status === "rejected") return { label: "Rejected", tone: "bad" };
  if (isSupervisorSubmittedTask(task)) return { label: "Pending Approval", tone: "warn" };
  return { label: task?.status?.replace("-", " ") || "pending", tone: "neutral" };
};

const Field = ({ label, children, wide }) => (
  <div className={wide ? "col-span-2" : undefined}>
    <p className="text-small font-semibold text-ink-3">{label}</p>
    <div className="text-ink-1">{children}</div>
  </div>
);

export default function TaskDetailsDialog({ open, onOpenChange, task, submitting, onApprove, onEdit }) {
  const reviewStatus = task ? getReviewStatus(task) : null;
  return (
    <Dialog open={open && !!task} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription className="sr-only">Photo, location and review status for this task.</DialogDescription>
        </DialogHeader>

        {task ? (
          <>
            <div className="space-y-4">
              {task.photoUrl ? (
                <img loading="lazy" decoding="async" src={task.photoUrl} alt="Task" className="w-full rounded-card" />
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Project">{task.project?.name || "N/A"}</Field>
                <Field label="Branch">{task.branch?.name || "N/A"}</Field>
                <Field label="Building">{task.building?.name}</Field>
                <Field label="Wing">{task.wing?.name}</Field>
                {task.level3Activity?.name ? (
                  <Field label="Level 3 Activity">
                    <Badge variant="info" className="mt-1">
                      {task.level3Activity.name}
                    </Badge>
                  </Field>
                ) : null}
                <Field label="Floor">{task.floor?.name}</Field>
                <Field label="Flat">{task.flat?.name}</Field>
                <Field label="Room">{task.room?.name}</Field>
                <Field label="Supervisor">{task.supervisor?.name || "N/A"}</Field>
                <Field label="Status">
                  <StatusBadge status={reviewStatus.label} tone={reviewStatus.tone} className="mt-1" />
                </Field>
                <Field label="Submitted On" wide>
                  {formatDate(task.createdAt, { withTime: true })}
                </Field>
                {task.notes ? (
                  <Field label="Notes" wide>
                    {task.notes}
                  </Field>
                ) : null}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {task.status !== "approved" && task.status !== "rejected" && (
                <Button onClick={() => onApprove(task)} disabled={submitting}>
                  <CheckCircle2 />
                  {submitting ? "Approving..." : "Approve Task"}
                </Button>
              )}
              <Button variant="outline" onClick={() => onEdit(task)}>
                <Pencil /> Edit Task
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
