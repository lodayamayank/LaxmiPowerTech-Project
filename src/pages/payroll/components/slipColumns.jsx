// src/pages/payroll/components/slipColumns.jsx
// DataTable columns and mobile card for the salary history list.
import { memo } from "react";
import { CheckCircle2, Lock, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatRupees, SHORT_MONTH_NAMES } from "../payrollFormat";

// Payment status -> badge tone (pending falls back as before).
const PAYMENT_TONES = { pending: "warn", processing: "info", paid: "ok", failed: "bad" };
const paymentTone = (status) => PAYMENT_TONES[status] || PAYMENT_TONES.pending;

const periodText = (slip) => `${SHORT_MONTH_NAMES[slip.month - 1]} ${slip.year}`;
const canAct = (slip) => slip.paymentStatus === "pending" && !slip.locked;

const EmployeeCell = memo(function EmployeeCell({ slip }) {
  return (
    <div className="flex items-center gap-2.5">
      <UserAvatar name={slip.employeeDetails.name} size="sm" />
      <div className="min-w-0">
        <div className="font-medium leading-tight text-ink-1">{slip.employeeDetails.name}</div>
        <div className="text-caption-lg text-ink-3">@{slip.employeeDetails.username}</div>
      </div>
    </div>
  );
});

const PeriodCell = ({ slip }) => (
  <span className="inline-flex items-center gap-1.5 tabular-nums">
    {periodText(slip)}
    {slip.locked ? <Lock className="size-3 text-ink-3" aria-label="Locked" /> : null}
  </span>
);

/** "Slip" opens the slip; the menu holds the other row actions (only for pending, unlocked slips). */
const SlipActions = memo(function SlipActions({ slip, onView, onConfirm, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-1"}>
      <Button variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onView(slip)}>
        Slip
      </Button>
      {canAct(slip) ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-control-sm w-control-sm" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onConfirm({ type: "paid", slipId: slip._id })}>
              <CheckCircle2 /> Mark as paid
            </DropdownMenuItem>
            <DropdownMenuItem className="text-tone-bad-fg focus:text-tone-bad-fg" onSelect={() => onConfirm({ type: "delete", slipId: slip._id })}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
});

export function getSlipColumns(handlers) {
  return [
    { key: "employee", header: "Employee", cell: (slip) => <EmployeeCell slip={slip} /> },
    {
      key: "empId",
      header: "Emp. ID",
      cell: (slip) =>
        slip.employeeDetails.employeeId ? (
          <span className="font-data text-caption-lg text-ink-3">{slip.employeeDetails.employeeId}</span>
        ) : (
          <span className="text-ink-4">-</span>
        ),
    },
    { key: "period", header: "Period", cell: (slip) => <PeriodCell slip={slip} /> },
    { key: "gross", header: "Gross", align: "right", cell: (slip) => <span className="tabular-nums">{formatRupees(slip.grossSalary)}</span> },
    {
      key: "deductions",
      header: "Deductions",
      align: "right",
      cell: (slip) => <span className="tabular-nums text-tone-bad-fg">{formatRupees(slip.deductions.total)}</span>,
    },
    {
      key: "net",
      header: "Net",
      align: "right",
      cell: (slip) => <span className="font-semibold tabular-nums text-ink-1">{formatRupees(slip.netSalary)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (slip) => <StatusBadge status={slip.paymentStatus} tone={paymentTone(slip.paymentStatus)} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      sticky: "right",
      cell: (slip) => <SlipActions slip={slip} {...handlers} />,
    },
  ];
}

/** Stacked card for one slip (DataTable `mobileCard`, below md). */
export function getSlipMobileCard(handlers) {
  return function SlipMobileCard(slip) {
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <EmployeeCell slip={slip} />
          <StatusBadge status={slip.paymentStatus} tone={paymentTone(slip.paymentStatus)} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-3">
          <PeriodCell slip={slip} />
          {slip.employeeDetails.employeeId ? <span className="font-data">{slip.employeeDetails.employeeId}</span> : null}
        </div>
        <div className="grid grid-cols-3 gap-2 text-small">
          <div>
            <div className="text-caption-lg text-ink-3">Gross</div>
            <div className="tabular-nums text-ink-1">{formatRupees(slip.grossSalary)}</div>
          </div>
          <div>
            <div className="text-caption-lg text-ink-3">Deductions</div>
            <div className="tabular-nums text-tone-bad-fg">{formatRupees(slip.deductions.total)}</div>
          </div>
          <div>
            <div className="text-caption-lg text-ink-3">Net</div>
            <div className="font-semibold tabular-nums text-ink-1">{formatRupees(slip.netSalary)}</div>
          </div>
        </div>
        <SlipActions slip={slip} full {...handlers} />
      </>
    );
  };
}
