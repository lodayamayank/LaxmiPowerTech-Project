// src/pages/attendance/components/AttendanceSummary.jsx
// Monthly attendance summary for one role: stat cards + filters + table. Shared by AdminAttendance
// (role tabs) and AttendancePage (?role=). One request: GET /attendance/summary (same URL and headers as before).
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Clock, UserCheck, UserX, Users } from "lucide-react";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { useProjects } from "@/hooks/useProjects";
import { formatNumber } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { UserAvatar } from "@/components/common/UserAvatar";

const PAGE_SIZE = 25;
const NO_PROJECT = "__none__"; // Radix SelectItem cannot use ""; mapped back to "" below

const monthValue = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;

// present / (present + absent): the old page showed no percentage, so this is computed from the same row.
const attendancePct = (r) => {
  const total = (r.present || 0) + (r.absent || 0);
  return total > 0 ? Math.round(((r.present || 0) / total) * 100) : null;
};

const COLUMNS = [
  {
    key: "name",
    header: "Name",
    cell: (r) => (
      <div className="flex items-center gap-2.5">
        <UserAvatar name={r.user?.name} size="sm" />
        <span className="font-medium text-ink-1">{r.user?.name}</span>
      </div>
    ),
  },
  { key: "employeeId", header: "Employee ID", cell: (r) => r.user?.employeeId || "-" },
  { key: "present", header: "Present", align: "right", cell: (r) => <span className="tabular-nums">{r.present}</span> },
  { key: "absent", header: "Absent", align: "right", cell: (r) => <span className="tabular-nums">{r.absent}</span> },
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
  { key: "halfDay", header: "Half day", align: "right", cell: (r) => <span className="tabular-nums">{r.halfDay}</span> },
  { key: "weekOff", header: "Week off", align: "right", cell: (r) => <span className="tabular-nums">{r.weekOff}</span> },
  {
    key: "leaves",
    header: "Leaves",
    cell: (r) => (
      <span className="tabular-nums text-ink-3" title="Paid leave · Unpaid leave">
        P {r.paidLeave} · U {r.unpaidLeave}
      </span>
    ),
  },
  { key: "overtime", header: "Overtime", align: "right", cell: (r) => <span className="tabular-nums">{r.overtime}</span> },
];

const mobileCard = (r) => {
  const pct = attendancePct(r);
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar name={r.user?.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-medium leading-tight text-ink-1">{r.user?.name}</div>
            <div className="text-caption-lg text-ink-3">{r.user?.employeeId || "-"}</div>
          </div>
        </div>
        <span className="text-small font-medium tabular-nums text-ink-2">{pct === null ? "-" : `${pct}%`}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-small text-ink-3">
        <span>Present <b className="font-medium tabular-nums text-ink-1">{r.present}</b></span>
        <span>Absent <b className="font-medium tabular-nums text-ink-1">{r.absent}</b></span>
        <span>Half day <b className="font-medium tabular-nums text-ink-1">{r.halfDay}</b></span>
        <span>Week off <b className="font-medium tabular-nums text-ink-1">{r.weekOff}</b></span>
        <span>Leaves <b className="font-medium tabular-nums text-ink-1">P {r.paidLeave} · U {r.unpaidLeave}</b></span>
        <span>Overtime <b className="font-medium tabular-nums text-ink-1">{r.overtime}</b></span>
      </div>
    </>
  );
};

function AttendanceSummary({ role, tabs }) {
  const [summary, setSummary] = useState([]);
  const { data: projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const token = getToken();

  const fetchAttendanceSummary = useCallback(async () => {
    try {
      setLoading(true);
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const res = await axios.get(
        `/attendance/summary?project=${selectedProject}&month=${month}&year=${year}&role=${role}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to fetch attendance summary", err);
    } finally {
      setLoading(false);
    }
  }, [role, selectedMonth, selectedProject, token]);

  useEffect(() => {
    if (selectedProject && selectedMonth) {
      fetchAttendanceSummary();
    }
  }, [fetchAttendanceSummary, selectedProject, selectedMonth]);

  const filtered = useMemo(
    () => summary.filter((item) => (item.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase())),
    [summary, searchTerm],
  );

  // Totals over the loaded rows (the whole month for this role, not just the current page).
  const totals = useMemo(
    () =>
      summary.reduce(
        (t, r) => ({ present: t.present + (r.present || 0), absent: t.absent + (r.absent || 0), overtime: t.overtime + (r.overtime || 0) }),
        { present: 0, absent: 0, overtime: 0 },
      ),
    [summary],
  );

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const emptyState = selectedProject ? (
    <EmptyState icon={CalendarOff} title="No attendance records found" description="Nothing matches this project, month and search." />
  ) : (
    <EmptyState icon={CalendarOff} title="Select a project" description="Pick a project and month to see the attendance summary." />
  );

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard label="Headcount" value={formatNumber(summary.length)} icon={Users} tone="info" />
        <StatCard label="Present days" value={formatNumber(totals.present)} icon={UserCheck} tone="ok" />
        <StatCard label="Absent days" value={formatNumber(totals.absent)} icon={UserX} tone="bad" />
        <StatCard label="Overtime" value={formatNumber(totals.overtime)} icon={Clock} tone="highlight" />
      </div>

      <SectionCard flush>
        {tabs}
        <FilterBar
          onClear={() => {
            setSearchTerm("");
            setPage(1);
          }}
          showClear={Boolean(searchTerm)}
        >
          <FilterField label="Project" htmlFor="att-project" grow={16} minWidth={200} maxWidth={280}>
            <Select value={selectedProject || NO_PROJECT} onValueChange={(v) => setSelectedProject(v === NO_PROJECT ? "" : v)}>
              <SelectTrigger id="att-project" aria-label="Select project">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>Select Project</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj._id} value={String(proj._id)}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Month" htmlFor="att-month" grow={10} minWidth={160} maxWidth={200}>
            <Input
              id="att-month"
              type="month"
              value={monthValue(selectedMonth)}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
            />
          </FilterField>
          <FilterField label="Search" htmlFor="att-search" grow={22} minWidth={220}>
            <SearchInput
              id="att-search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              onClear={() => {
                setSearchTerm("");
                setPage(1);
              }}
              placeholder="Search staff name"
            />
          </FilterField>
        </FilterBar>

        <DataTable
          columns={COLUMNS}
          rows={pageRows}
          rowKey={(r) => r.user?._id}
          loading={loading}
          emptyState={emptyState}
          mobileCard={mobileCard}
          footer={
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          }
        />
      </SectionCard>
    </>
  );
}

export default memo(AttendanceSummary);
