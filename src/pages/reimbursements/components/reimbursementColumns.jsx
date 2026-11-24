// src/pages/reimbursements/components/reimbursementColumns.jsx
// DataTable columns and mobile card for the admin reimbursement list.
import { memo } from "react";
import { Check, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatCurrency, formatDate } from "@/lib/format";

const itemsLabel = (r) => {
  const n = r.items?.length || 0;
  return `${n} ${n === 1 ? "item" : "items"}`;
};

/** View for every row; Approve / Reject for pending; Mark paid for approved (same actions as before). */
const ReimbursementActions = memo(function ReimbursementActions({ row, onView, onApprove, onReject, onMarkPaid, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-2"}>
      <Button
        variant="ghost"
        size="icon"
        className={full ? "shrink-0" : "h-control-sm w-control-sm"}
        aria-label="View details"
        title="View details"
        onClick={() => onView(row._id)}
      >
        <Eye />
      </Button>
      {row.status === "pending" ? (
        <>
          <Button variant="reject" size="sm" className={full ? "flex-1 whitespace-nowrap" : "whitespace-nowrap"} onClick={() => onReject(row._id)}>
            <X /> Reject
          </Button>
          <Button variant="approve" size="sm" className={full ? "flex-1 whitespace-nowrap" : "whitespace-nowrap"} onClick={() => onApprove(row._id)}>
            <Check /> Approve
          </Button>
        </>
      ) : null}
      {row.status === "approved" ? (
        <Button variant="outline" size="sm" className={full ? "flex-1 whitespace-nowrap" : "whitespace-nowrap"} onClick={() => onMarkPaid(row._id)}>
          Mark paid
        </Button>
      ) : null}
    </div>
  );
});

export function getReimbursementColumns(handlers) {
  return [
    {
      key: "user",
      header: "Submitted by",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={r.user?.name} size="sm" />
          <div className="min-w-0">
            <div className="font-medium leading-tight text-ink-1">{r.user?.name || "Unknown"}</div>
            <div className="text-caption-lg capitalize text-ink-3">{r.user?.role || "-"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (r) => <span className="font-semibold tabular-nums text-ink-1">{formatCurrency(r.totalAmount)}</span>,
    },
    { key: "items", header: "Items", cell: (r) => <span className="text-ink-3">{itemsLabel(r)}</span> },
    { key: "submitted", header: "Submitted", cell: (r) => <span className="tabular-nums">{formatDate(r.submittedAt)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "approver", header: "Approver", cell: (r) => <span className="text-caption-lg text-ink-3">{r.approver?.name || "-"}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      sticky: "right",
      cell: (r) => <ReimbursementActions row={r} {...handlers} />,
    },
  ];
}

/** Stacked card for one claim (DataTable `mobileCard`, below md). */
export function getReimbursementMobileCard(handlers) {
  return function ReimbursementMobileCard(r) {
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <UserAvatar name={r.user?.name} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium leading-tight text-ink-1">{r.user?.name || "Unknown"}</div>
              <div className="text-caption-lg capitalize text-ink-3">{r.user?.role || "-"}</div>
            </div>
          </div>
          <StatusBadge status={r.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-3">
          <span className="font-semibold tabular-nums text-ink-1">{formatCurrency(r.totalAmount)}</span>
          <span>· {itemsLabel(r)}</span>
          <span>· {formatDate(r.submittedAt)}</span>
        </div>
        {r.approver?.name ? <div className="text-caption-lg text-ink-3">Approver: {r.approver.name}</div> : null}
        <ReimbursementActions row={r} full {...handlers} />
      </>
    );
  };
}
