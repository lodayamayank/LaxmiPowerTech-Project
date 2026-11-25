// src/pages/leaves/components/LeaveDetailsDialog.jsx
// Details of one leave request: who, type and dates, reason, the proof, who decided and when.
// Approve / Reject are offered only while the request is pending. The request itself is sent by the page.
import { Check, ExternalLink, ImageOff, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatDate } from "@/lib/format";
import { getLeaveTypeTone } from "@/lib/status";
import { branchList, dayCount, decidedBy, getProofUrl } from "./leaveColumns";

const Info = ({ label, children }) => (
  <div>
    <div className="text-small text-ink-3">{label}</div>
    <div className="mt-0.5 text-body font-medium text-ink-1">{children}</div>
  </div>
);

export default function LeaveDetailsDialog({ leave, onClose, onAction }) {
  if (!leave) return null;
  const pending = leave.status === "pending";
  const decided = decidedBy(leave);
  const branches = branchList(leave.user);
  const days = dayCount(leave);
  const proof = getProofUrl(leave.proofUrl);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-line px-6 py-4 text-left">
          <DialogTitle>Leave request</DialogTitle>
          <DialogDescription>Details, proof and decision for this request.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar name={leave.user?.username} />
              <div>
                <div className="text-body font-semibold text-ink-1">{leave.user?.username}</div>
                <div className="text-small capitalize text-ink-3">{leave.user?.role}</div>
              </div>
            </div>
            <StatusBadge status={leave.status} />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Leave type">
              {leave.type ? (
                <Badge variant={getLeaveTypeTone(leave.type)} className="capitalize">
                  {leave.type}
                </Badge>
              ) : (
                "—"
              )}
            </Info>
            <Info label="Duration">
              {days} {days === 1 ? "day" : "days"}
            </Info>
            <Info label="From">{formatDate(leave.startDate)}</Info>
            <Info label="To">{formatDate(leave.endDate)}</Info>
            <div className="sm:col-span-2">
              <Info label="Branches">{branches.length ? branches.join(", ") : "—"}</Info>
            </div>
            <div className="sm:col-span-2">
              <Info label="Reason">
                <span className="whitespace-pre-wrap font-normal text-ink-2">{leave.reason || "—"}</span>
              </Info>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-line pb-2 text-h3 font-semibold text-ink-1">Proof</h3>
            {proof ? (
              <div className="space-y-2">
                <a href={proof} target="_blank" rel="noreferrer" title="Open proof in a new tab" className="block overflow-hidden rounded-card border border-line-card bg-surface-subtle">
                  <img loading="lazy" decoding="async" src={proof} alt="Leave proof" className="mx-auto max-h-80 w-auto max-w-full object-contain" />
                </a>
                <Button variant="outline" size="sm" asChild>
                  <a href={proof} target="_blank" rel="noreferrer">
                    <ExternalLink /> Open full size
                  </a>
                </Button>
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-line-input">
                <EmptyState icon={ImageOff} title="No proof attached" description="No document was uploaded for this request." />
              </div>
            )}
          </section>

          {!pending ? (
            <section className="rounded-card bg-surface-muted p-4 text-small">
              <p className="text-ink-3">Decision</p>
              <p className="mt-0.5 font-medium text-ink-1">
                {decided ? (
                  <>
                    {leave.status === "approved" ? "Approved" : "Rejected"} by {decided.name} · {decided.at}
                  </>
                ) : (
                  "Finalized"
                )}
              </p>
            </section>
          ) : null}
        </div>

        <DialogFooter className="border-t border-line px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {pending ? (
            <>
              <Button variant="reject" onClick={() => onAction(leave._id, "rejected")}>
                <X /> Reject
              </Button>
              <Button variant="approve" onClick={() => onAction(leave._id, "approved")}>
                <Check /> Approve
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
