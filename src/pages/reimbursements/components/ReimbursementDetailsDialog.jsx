// src/pages/reimbursements/components/ReimbursementDetailsDialog.jsx
// Details of one reimbursement (loaded by the page via GET /reimbursements/:id) with the same actions as the list.
import { Banknote, Check, X } from "lucide-react";
import axios from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getRoleTone } from "@/lib/status";

export default function ReimbursementDetailsDialog({ reimbursement, onClose, onApprove, onReject, onMarkPaid }) {
  const r = reimbursement;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 py-4 text-left">
          <DialogTitle>Reimbursement details</DialogTitle>
          <DialogDescription>Expense items, receipts and decision for this claim.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="rounded-card bg-surface-subtle p-4">
                <h3 className="mb-2 text-small font-semibold text-ink-3">Submitted by</h3>
                <p className="text-card-title text-ink-1">{r.user?.name}</p>
                <p className="text-small text-ink-3">{r.user?.email}</p>
                <p className="text-small text-ink-3">{r.user?.mobileNumber}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={getRoleTone(r.user?.role)} className="capitalize">
                    {r.user?.role}
                  </Badge>
                  <span className="text-caption text-ink-3">{formatDate(r.submittedAt, { withTime: true })}</span>
                </div>
              </div>

              <div className="rounded-card border border-tone-ok-border bg-tone-ok-soft p-4">
                <p className="mb-1 text-small text-ink-3">Total amount</p>
                <p className="text-kpi tabular-nums text-tone-ok-fg">{formatCurrency(r.totalAmount)}</p>
                <p className="mt-1 text-small text-ink-3">{r.items.length} item(s)</p>
              </div>

              {r.note ? (
                <div className="rounded-card border border-tone-info-fg/30 bg-tone-info-soft p-4">
                  <p className="mb-1 text-small font-semibold text-ink-2">Additional note</p>
                  <p className="text-small text-ink-3">{r.note}</p>
                </div>
              ) : null}

              {r.status !== "pending" ? (
                <div className="rounded-card bg-surface-subtle p-4">
                  <p className="mb-2 text-small font-semibold text-ink-2">Status information</p>
                  <div className="flex flex-col gap-1 text-small text-ink-3">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Status:</span> <StatusBadge status={r.status} />
                    </p>
                    {r.approver ? (
                      <p>
                        <span className="font-medium">Approved by:</span> {r.approver.name}
                      </p>
                    ) : null}
                    {r.approvedAt ? (
                      <p>
                        <span className="font-medium">Date:</span> {formatDate(r.approvedAt, { withTime: true })}
                      </p>
                    ) : null}
                    {r.rejectionReason ? (
                      <p className="mt-2 text-tone-bad-fg">
                        <span className="font-medium">Reason:</span> {r.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="mb-3 text-card-title text-ink-1">Expense items</h3>
              <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-2">
                {r.items.map((item, index) => (
                  <div key={index} className="rounded-card border border-line bg-surface-subtle p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-card-title tabular-nums text-ink-1">{formatCurrency(item.amount)}</span>
                        <Badge variant="highlight" className="capitalize">
                          {item.category}
                        </Badge>
                      </div>
                      <span className="text-caption text-ink-3">{formatDate(item.expenseDate)}</span>
                    </div>
                    <p className="mb-3 text-small text-ink-3">{item.description}</p>

                    {item.receipts && item.receipts.length > 0 ? (
                      <div>
                        <p className="mb-2 text-caption font-semibold text-ink-3">Receipts:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {item.receipts.map((receipt, idx) => (
                            <a key={idx} href={`${axios.defaults.baseURL}${receipt}`} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                loading="lazy"
                                decoding="async"
                                src={`${axios.defaults.baseURL}${receipt}`}
                                alt={`Receipt ${idx + 1}`}
                                className="h-20 w-full cursor-pointer rounded-control border border-line-card object-cover hover:border-primary"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-line px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {r.status === "pending" ? (
            <>
              <Button variant="reject" onClick={() => onReject(r._id)}>
                <X /> Reject
              </Button>
              <Button variant="approve" onClick={() => onApprove(r._id)}>
                <Check /> Approve
              </Button>
            </>
          ) : null}
          {r.status === "approved" ? (
            <Button onClick={() => onMarkPaid(r._id)}>
              <Banknote /> Mark as paid
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
