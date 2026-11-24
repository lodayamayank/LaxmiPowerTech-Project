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

const branchList = (user) =>
  Array.isArray(user?.assignedBranches) ? user.assignedBranches.map((b) => b?.name || "—") : [];

/** First branch + a "+N more" chip; the full list is in the title. */
const renderBranches = (user) => {
  const names = branchList(user);
  if (!names.length) return <span className="text-ink-4">—</span>;
  const extra = names.length - 1;
  return (
    <div className="flex max-w-[190px] items-center gap-1.5" title={names.join(", ")}>
      <span className="truncate text-small text-ink-2">{names[0]}</span>
      {extra > 0 ? (
        <span className="shrink-0 rounded-control bg-surface-muted px-1.5 py-0.5 text-caption font-medium text-ink-3">+{extra} more</span>
      ) : null}
    </div>
  );
};

const decidedBy = (r) => (r.approver?.username ? { name: r.approver.username, at: formatDate(r.approvedAt, { withTime: true }) } : null);

/** Approve / Reject for pending rows; decided rows show "Finalized" (as before). */
const LeaveActions = memo(function LeaveActions({ id, status, onAction }) {
  if (status !== "pending") {
    return <span className="text-small text-ink-3">Finalized</span>;
  }
  return (
    <div className="flex justify-end gap-2">
      <Button variant="reject" size="sm" className="whitespace-nowrap" onClick={() => onAction(id, "rejected")}>
        <X /> Reject
      </Button>
      <Button variant="approve" size="sm" className="whitespace-nowrap" onClick={() => onAction(id, "approved")}>
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
            <div className="font-medium leading-tight text-ink-1">{r.user?.username}</div>
            <div className="text-caption-lg capitalize text-ink-3">{r.user?.role}</div>
          </div>
        </div>
      ),
    },
    { key: "branches", header: "Branches", cell: (r) => renderBranches(r.user) },
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
        <div className="whitespace-nowrap leading-snug tabular-nums">
          <div>{formatDate(r.startDate)}</div>
          <div className="text-ink-3">→ {formatDate(r.endDate)}</div>
        </div>
      ),
    },
    { key: "days", header: "Days", align: "center", cell: (r) => <span className="tabular-nums">{dayCount(r)}</span> },
    { key: "reason", header: "Reason", truncate: true, maxWidth: 160, className: "text-ink-3", cell: (r) => r.reason || "-" },
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
              className="h-8 w-8 rounded-control border border-line-card object-cover"
            />
          </a>
        ) : (
          "—"
        ),
    },
    { key: "status", header: "Status", align: "center", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "decidedBy",
      header: "Decided by",
      cell: (r) => {
        const d = decidedBy(r);
        if (!d) return <span className="text-ink-4">—</span>;
        return (
          <div className="whitespace-nowrap text-caption-lg text-ink-3">
            <div className="font-medium text-ink-2">{d.name}</div>
            <div>{d.at}</div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      sticky: "right",
      cell: (r) => <LeaveActions id={r._id} status={r.status} onAction={onAction} />,
    },
  ];
}

/** Stacked card for one leave request (DataTable `mobileCard`, below md). */
export function getLeaveMobileCard(onAction) {
  return function LeaveMobileCard(r) {
    const d = decidedBy(r);
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <UserAvatar name={r.user?.username} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium leading-tight text-ink-1">{r.user?.username}</div>
              <div className="text-caption-lg capitalize text-ink-3">{r.user?.role}</div>
            </div>
          </div>
          <StatusBadge status={r.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-2">
          {r.type ? (
            <Badge variant={getStatusTone(r.type)} className="capitalize">
              {r.type}
            </Badge>
          ) : null}
          <span className="tabular-nums">
            {formatDate(r.startDate)} → {formatDate(r.endDate)}
          </span>
          <span className="text-ink-3">· {dayCount(r)} {dayCount(r) === 1 ? "day" : "days"}</span>
        </div>
        {r.reason ? <p className="text-small text-ink-3">{r.reason}</p> : null}
        {d ? <div className="text-caption-lg text-ink-3">Decided by {d.name} · {d.at}</div> : null}
        {r.status === "pending" ? (
          <div className="flex gap-2">
            <Button variant="reject" size="sm" className="flex-1 whitespace-nowrap" onClick={() => onAction(r._id, "rejected")}>
              <X /> Reject
            </Button>
            <Button variant="approve" size="sm" className="flex-1 whitespace-nowrap" onClick={() => onAction(r._id, "approved")}>
              <Check /> Approve
            </Button>
          </div>
        ) : null}
      </>
    );
  };
}
