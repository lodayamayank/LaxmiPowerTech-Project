// src/pages/reimbursements/components/reimbursementColumns.jsx
// DataTable columns and mobile card for the admin reimbursement list. The list is read-only: every claim opens in the
// details dialog (ReimbursementDetailsDialog), which holds the items, receipts and the Approve / Reject / Mark paid actions.
import { memo } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatCurrency, formatDate } from "@/lib/format";

const itemsLabel = (r) => {
  const n = r.items?.length || 0;
  return `${n} ${n === 1 ? "item" : "items"}`;
};

/** One "View" button per row (every status): opens the details dialog. */
const ReimbursementActions = memo(function ReimbursementActions({ row, onView, full }) {
  return (
    <Button variant="outline" size="sm" className={full ? "w-full" : "whitespace-nowrap"} onClick={() => onView(row._id)}>
      <Eye /> View
    </Button>
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
    { key: "submitted", header: "Submitted", cell: (r) => <span className="tabular-nums">{formatDate(r.submittedAt)}</span> },
    { key: "items", header: "Items", cell: (r) => <span className="text-ink-3">{itemsLabel(r)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    // Approver is hidden below xl so the table never needs a horizontal scrollbar; it is in the details dialog.
    { key: "approver", header: "Approver", className: "hidden xl:table-cell", cell: (r) => <span className="text-small text-ink-3">{r.approver?.name || "—"}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (r) => <span className="font-semibold tabular-nums text-ink-1">{formatCurrency(r.totalAmount)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => <ReimbursementActions row={r} onView={handlers.onView} />,
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
        <ReimbursementActions row={r} onView={handlers.onView} full />
      </>
    );
  };
}
