// src/pages/leaves/components/leaveColumns.jsx
// DataTable columns for the admin leave list.
import { memo } from "react";
import { Check, X } from "lucide-react";
import axios from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatDate } from "@/lib/format";
import { getStatusTone } from "@/lib/status";

const getProofUrl = (proofUrl) => {
  if (!proofUrl) return "";
  if (/^https?:\/\//i.test(proofUrl)) return proofUrl;
  const backendUrl = (axios.defaults.baseURL || window.location.origin).replace(/\/api\/?$/, "");
  return `${backendUrl}${proofUrl}`;
};

const dayCount = (r) =>
  Math.max(1, (new Date(r.endDate) - new Date(r.startDate)) / (1000 * 60 * 60 * 24) + 1);

const branchNames = (user) =>
  Array.isArray(user?.assignedBranches) && user.assignedBranches.length
    ? user.assignedBranches.map((b) => b?.name || "—").join(", ")
    : "—";

/** Approve / Reject for pending rows; decided rows show "Finalized" (as before). */
const LeaveActions = memo(function LeaveActions({ id, status, onAction }) {
  if (status !== "pending") {
    return <span className="text-caption-lg font-medium text-ink-3">Finalized</span>;
  }
  return (
    <div className="flex justify-end gap-2">
      <Button variant="reject" size="sm" onClick={() => onAction(id, "rejected")}>
        <X /> Reject
      </Button>
      <Button variant="approve" size="sm" onClick={() => onAction(id, "approved")}>
        <Check /> Approve
      </Button>
    </div>
  );
});

export function getLeaveColumns(onAction) {
  return [
    {
      key: "employee",
      header: "Employee",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={r.user?.username} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-ink-1">{r.user?.username}</div>
            <div className="text-caption-lg capitalize text-ink-3">{r.user?.role}</div>
          </div>
        </div>
      ),
    },
    { key: "branches", header: "Branches", cell: (r) => <span className="text-caption-lg text-ink-3">{branchNames(r.user)}</span> },
    {
      key: "type",
      header: "Type",
      cell: (r) =>
        r.type ? (
          <Badge variant={getStatusTone(r.type)} className="capitalize">
            {r.type}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "dates",
      header: "Dates",
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDate(r.startDate)} → {formatDate(r.endDate)}
        </span>
      ),
    },
    { key: "days", header: "Days", align: "right", cell: (r) => <span className="tabular-nums">{dayCount(r)}</span> },
    { key: "reason", header: "Reason", className: "min-w-[180px] max-w-xs whitespace-pre-wrap text-ink-3", cell: (r) => r.reason || "-" },
    {
      key: "proof",
      header: "Proof",
      cell: (r) =>
        r.proofUrl ? (
          <a href={getProofUrl(r.proofUrl)} target="_blank" rel="noreferrer" title="Open medical proof">
            <img
              loading="lazy"
              decoding="async"
              src={getProofUrl(r.proofUrl)}
              alt="Medical proof"
              className="h-12 w-12 rounded-control border border-line-card object-cover"
            />
          </a>
        ) : (
          "—"
        ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "decidedBy",
      header: "Decided by",
      cell: (r) => (
        <span className="whitespace-nowrap text-caption-lg text-ink-3">
          {r.approver?.username ? `${r.approver.username} · ${formatDate(r.approvedAt, { withTime: true })}` : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (r) => <LeaveActions id={r._id} status={r.status} onAction={onAction} />,
    },
  ];
}
