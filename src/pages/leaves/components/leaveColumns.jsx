// src/pages/leaves/components/leaveColumns.jsx
// DataTable columns for the admin leave list. The list is read-only: every request opens in the details dialog
// (LeaveDetailsDialog), which holds the full details, the proof and the Approve / Reject actions.
import { memo } from "react";
import { Eye, Paperclip } from "lucide-react";
import axios from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatDate } from "@/lib/format";
import { getLeaveTypeTone } from "@/lib/status";

export const getProofUrl = (proofUrl) => {
  if (!proofUrl) return "";
  if (/^https?:\/\//i.test(proofUrl)) return proofUrl;
  const backendUrl = (axios.defaults.baseURL || window.location.origin).replace(/\/api\/?$/, "");
  return `${backendUrl}${proofUrl}`;
};

export const dayCount = (r) =>
  Math.max(1, (new Date(r.endDate) - new Date(r.startDate)) / (1000 * 60 * 60 * 24) + 1);

/** "28 Nov → 30 Nov 2026" (the year is shown once when both dates share it). */
export const dateRange = (r) => {
  const start = formatDate(r.startDate);
  const end = formatDate(r.endDate);
  const sameYear = start.slice(-4) === end.slice(-4);
  return `${sameYear ? start.slice(0, -5) : start} → ${end}`;
};

export const branchList = (user) =>
  Array.isArray(user?.assignedBranches) ? user.assignedBranches.map((b) => b?.name || "—") : [];

/** First branch + a "+N" chip; the full list is in the title. */
const renderBranches = (user) => {
  const names = branchList(user);
  if (!names.length) return <span className="text-ink-4">—</span>;
  const extra = names.length - 1;
  return (
    <div className="flex max-w-[130px] items-center gap-1.5" title={names.join(", ")}>
      <span className="truncate text-small text-ink-2">{names[0]}</span>
      {extra > 0 ? (
        <span className="shrink-0 rounded-control bg-surface-muted px-1.5 py-0.5 text-caption font-medium text-ink-3">+{extra}</span>
      ) : null}
    </div>
  );
};

export const decidedBy = (r) => (r.approver?.username ? { name: r.approver.username, at: formatDate(r.approvedAt, { withTime: true }) } : null);

/** One "View" button per row (every status): opens the details dialog. */
const LeaveActions = memo(function LeaveActions({ row, onView, full }) {
  return (
    <Button variant="outline" size="sm" className={full ? "w-full" : "whitespace-nowrap"} onClick={() => onView(row)}>
      <Eye /> View
    </Button>
  );
});

export function getLeaveColumns(onView) {
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
    // Branches and Reason are hidden below xl so the table never needs a horizontal scrollbar; both are in the details dialog.
    { key: "branches", header: "Branches", className: "hidden xl:table-cell", cell: (r) => renderBranches(r.user) },
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          {r.type ? (
            <Badge variant={getLeaveTypeTone(r.type)} className="capitalize">
              {r.type}
            </Badge>
          ) : (
            "—"
          )}
          {r.proofUrl ? <Paperclip className="size-3.5 text-ink-3" aria-label="Proof attached" /> : null}
        </div>
      ),
    },
    {
      key: "dates",
      header: "Dates",
      cell: (r) => (
        <div className="whitespace-nowrap leading-snug tabular-nums">
          <div>{dateRange(r)}</div>
          <div className="text-caption-lg text-ink-3">
            {dayCount(r)} {dayCount(r) === 1 ? "day" : "days"}
          </div>
        </div>
      ),
    },
    { key: "reason", header: "Reason", truncate: true, maxWidth: 130, className: "hidden text-ink-3 xl:table-cell", cell: (r) => r.reason || "-" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => <LeaveActions row={r} onView={onView} />,
    },
  ];
}

/** Stacked card for one leave request (DataTable `mobileCard`, below md). */
export function getLeaveMobileCard(onView) {
  return function LeaveMobileCard(r) {
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
            <Badge variant={getLeaveTypeTone(r.type)} className="capitalize">
              {r.type}
            </Badge>
          ) : null}
          <span className="tabular-nums">{dateRange(r)}</span>
          <span className="text-ink-3">
            · {dayCount(r)} {dayCount(r) === 1 ? "day" : "days"}
          </span>
          {r.proofUrl ? <Paperclip className="size-3.5 text-ink-3" aria-label="Proof attached" /> : null}
        </div>
        {r.reason ? <p className="line-clamp-2 text-small text-ink-3">{r.reason}</p> : null}
        <LeaveActions row={r} onView={onView} full />
      </>
    );
  };
}
