// src/pages/payroll/components/salaryRunColumns.jsx
// DataTable columns and mobile card for the Salary run list. Values are exactly the ones the page received.
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/common/UserAvatar";
import { getRoleTone } from "@/lib/status";
import { formatRupees } from "../payrollFormat";

const workedPct = (item) => {
  const total = Number(item.attendance?.workingDays) || 0;
  const worked = Number(item.payableDays) || 0;
  return total > 0 ? Math.max(0, Math.min(100, (worked / total) * 100)) : 0;
};

const EmployeeCell = memo(function EmployeeCell({ item }) {
  return (
    <div className="flex items-center gap-2.5">
      <UserAvatar name={item.name} size="sm" />
      <div className="min-w-0">
        <div className="font-medium leading-tight text-ink-1">{item.name}</div>
        <div className="text-caption-lg text-ink-3">
          @{item.username}
          {item.employeeId ? <span className="font-data"> · {item.employeeId}</span> : null}
        </div>
      </div>
    </div>
  );
});

const DaysCell = memo(function DaysCell({ item }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={workedPct(item)} className="w-16" aria-label="Days worked" />
      <span className="text-small tabular-nums text-ink-2">
        {item.payableDays}/{item.attendance?.workingDays}
      </span>
    </div>
  );
});

export function getSalaryColumns({ onDetails }) {
  return [
    { key: "employee", header: "Employee", cell: (item) => <EmployeeCell item={item} /> },
    {
      key: "role",
      header: "Role",
      cell: (item) => (
        <Badge variant={getRoleTone(item.role)} className="capitalize">
          {item.role}
        </Badge>
      ),
    },
    {
      key: "ctc",
      header: "CTC",
      align: "right",
      cell: (item) => (
        <div>
          <div className="tabular-nums text-ink-1">{formatRupees(item.ctcAmount)}</div>
          <div className="text-caption-lg capitalize text-ink-3">{item.salaryType}</div>
        </div>
      ),
    },
    { key: "days", header: "Days worked", cell: (item) => <DaysCell item={item} /> },
    { key: "gross", header: "Gross", align: "right", cell: (item) => <span className="tabular-nums">{formatRupees(item.grossSalary)}</span> },
    {
      key: "deductions",
      header: "Deductions",
      align: "right",
      cell: (item) => <span className="tabular-nums text-tone-bad-fg">{formatRupees(item.deductions.total)}</span>,
    },
    {
      key: "net",
      header: "Net salary",
      align: "right",
      cell: (item) => <span className="font-semibold tabular-nums text-ink-1">{formatRupees(item.netSalary)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      sticky: "right",
      cell: (item) => (
        <Button variant="outline" size="sm" onClick={() => onDetails(item)}>
          Details
        </Button>
      ),
    },
  ];
}

/** Stacked card for one employee (DataTable `mobileCard`, below md). */
export function getSalaryMobileCard({ onDetails }) {
  return function SalaryMobileCard(item) {
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <EmployeeCell item={item} />
          <Badge variant={getRoleTone(item.role)} className="capitalize">
            {item.role}
          </Badge>
        </div>
        <DaysCell item={item} />
        <div className="grid grid-cols-3 gap-2 text-small">
          <div>
            <div className="text-caption-lg text-ink-3">Gross</div>
            <div className="tabular-nums text-ink-1">{formatRupees(item.grossSalary)}</div>
          </div>
          <div>
            <div className="text-caption-lg text-ink-3">Deductions</div>
            <div className="tabular-nums text-tone-bad-fg">{formatRupees(item.deductions.total)}</div>
          </div>
          <div>
            <div className="text-caption-lg text-ink-3">Net salary</div>
            <div className="font-semibold tabular-nums text-ink-1">{formatRupees(item.netSalary)}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onDetails(item)}>
          Details
        </Button>
      </>
    );
  };
}
