// src/pages/attendance/components/AttendanceRegister.jsx
// The one attendance-register table: stat cards, a SectionCard with tabs + filter bar, a DataTable and a
// client-side PaginationBar. Data comes in as normalized rows (see normalizeRow), so the project/month
// summary (AttendanceSummary) and the date-range role dashboards (RoleAttendanceDashboard) share it.
import { memo, useEffect, useMemo, useState } from "react";
import { Clock, UserCheck, UserX, Users } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { UserAvatar } from "@/components/common/UserAvatar";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Leave fields a row may carry, with their one-letter labels. Only fields present on the row are shown. */
const LEAVE_PARTS = [
  ["paidLeave", "P", "Paid"],
  ["unpaidLeave", "U", "Unpaid"],
  ["sickLeave", "S", "Sick"],
  ["casualLeave", "C", "Casual"],
];

// present / (present + absent): the old pages showed no percentage, so it is computed from the same row.
const attendancePct = (r) => {
  const total = (r.present || 0) + (r.absent || 0);
  return total > 0 ? Math.round(((r.present || 0) / total) * 100) : null;
};

const leavesText = (r) => {
  const parts = LEAVE_PARTS.filter(([field]) => r[field] !== undefined && r[field] !== null).map(
    ([field, letter]) => `${letter} ${r[field]}`,
  );
  return parts.length ? parts.join(" · ") : "-";
};
const LEAVES_TITLE = "P paid · U unpaid · S sick · C casual";

const num = (field) => (r) => <span className="tabular-nums">{r[field]}</span>;

const COLUMNS = [
  {
    key: "name",
    header: "Name",
    cell: (r) => (
      <div className="flex items-center gap-2.5">
        <UserAvatar name={r.name} size="sm" />
        <span className="font-medium text-ink-1">{r.name}</span>
      </div>
    ),
  },
  { key: "employeeId", header: "Employee ID", cell: (r) => r.employeeId || "-" },
  { key: "present", header: "Present", align: "right", cell: num("present") },
  { key: "absent", header: "Absent", align: "right", cell: num("absent") },
  {
    key: "attendance",
    header: "Attendance",
    cell: (r) => {
      const pct = attendancePct(r);
      if (pct === null) return <span className="text-ink-4">-</span>;
      return (
        <div className="flex items-center gap-2">
          <Progress value={pct} className="w-20" aria-label={`Attendance ${pct}%`} />
          <span className="text-small tabular-nums text-ink-2">{pct}%</span>
        </div>
      );
    },
  },
  { key: "halfDay", header: "Half day", align: "right", cell: num("halfDay") },
  { key: "weekOff", header: "Week off", align: "right", cell: num("weekOff") },
  {
    key: "leaves",
    header: "Leaves",
    cell: (r) => (
      <span className="tabular-nums text-ink-3" title={LEAVES_TITLE}>
        {leavesText(r)}
      </span>
    ),
  },
  { key: "overtime", header: "Overtime", align: "right", cell: num("overtime") },
];

const mobileCard = (r) => {
  const pct = attendancePct(r);
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar name={r.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-medium leading-tight text-ink-1">{r.name}</div>
            <div className="text-caption-lg text-ink-3">{r.employeeId || "-"}</div>
          </div>
        </div>
        <span className="text-small font-medium tabular-nums text-ink-2">{pct === null ? "-" : `${pct}%`}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-small text-ink-3">
        <span>Present <b className="font-medium tabular-nums text-ink-1">{r.present}</b></span>
        <span>Absent <b className="font-medium tabular-nums text-ink-1">{r.absent}</b></span>
        <span>Half day <b className="font-medium tabular-nums text-ink-1">{r.halfDay}</b></span>
        <span>Week off <b className="font-medium tabular-nums text-ink-1">{r.weekOff}</b></span>
        <span className="col-span-2">Leaves <b className="font-medium tabular-nums text-ink-1">{leavesText(r)}</b></span>
        <span>Overtime <b className="font-medium tabular-nums text-ink-1">{r.overtime}</b></span>
      </div>
    </>
  );
};

/**
 * Props:
 * - rows {object[]}: normalized rows (normalizeRow)
 * - loading {boolean}
 * - search {string}: name filter applied here (the parent owns the input)
 * - tabs {node}: tab strip shown at the top of the card
 * - filters {node}: FilterBar content
 * - onClear / showClear: forwarded to FilterBar (Clear filters)
 * - emptyState {node}
 */
function AttendanceRegister({ rows, loading, search, tabs, filters, onClear, showClear, emptyState }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filtered = useMemo(
    () => rows.filter((r) => (r.name || "").toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  // Totals over the filtered rows (as the old dashboards did).
  const totals = useMemo(
    () =>
      filtered.reduce(
        (t, r) => ({ present: t.present + (r.present || 0), absent: t.absent + (r.absent || 0), overtime: t.overtime + (r.overtime || 0) }),
        { present: 0, absent: 0, overtime: 0 },
      ),
    [filtered],
  );

  // Back to page 1 when the list, the search or the page size changes (as before).
  useEffect(() => {
    setPage(1);
  }, [rows, search, pageSize]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard label="Headcount" value={formatNumber(filtered.length)} icon={Users} tone="info" />
        <StatCard label="Present days" value={formatNumber(totals.present)} icon={UserCheck} tone="ok" />
        <StatCard label="Absent days" value={formatNumber(totals.absent)} icon={UserX} tone="bad" />
        <StatCard label="Overtime" value={formatNumber(totals.overtime)} icon={Clock} tone="highlight" />
      </div>

      <SectionCard flush>
        {tabs}
        <FilterBar onClear={onClear} showClear={showClear}>
          {filters}
        </FilterBar>
        <DataTable
          columns={COLUMNS}
          rows={pageRows}
          rowKey="key"
          loading={loading}
          emptyState={emptyState}
          mobileCard={mobileCard}
          footer={
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </SectionCard>
    </>
  );
}

export default memo(AttendanceRegister);
