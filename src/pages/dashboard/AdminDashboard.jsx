// src/pages/dashboard/AdminDashboard.jsx  (route: /admindashboard)
// Laid out like the dashboard design. All data, filters and the CSV export live in components/useAdminDashboard.js
// (moved unchanged); this file is the layout.
import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Clock, FileText, MapPin, Package, Plus, Receipt, TriangleAlert, UserCheck, UserX, Users } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { IconTile } from "@/components/common/IconTile";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { ProgressRow } from "@/components/common/ProgressRow";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import AddEmployeeModal from "@/pages/team/components/AddEmployeeModal";
import { ROUTES } from "@/lib/routes";
import { getUserRaw } from "@/lib/session";
import useAdminDashboard from "./components/useAdminDashboard";
import useDashboardAttention from "./components/useDashboardAttention";

const ALL = "all";
const PUNCH_TYPES = {
  in: ["ok", "in"],
  out: ["neutral", "out"],
  half: ["warn", "half"],
  absent: ["bad", "absent"],
  weekoff: ["info", "week off"],
  paidleave: ["purple", "paid leave"],
  unpaidleave: ["pink", "unpaid leave"],
  overtime: ["highlight", "overtime"],
};
const CHART = [
  ["bg-tone-ok-fg", "Present"],
  ["bg-tone-bad-fg", "Absent"],
  ["bg-tone-warn-fg", "Late"],
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
const currentUserName = () => {
  try {
    const u = JSON.parse(getUserRaw() || "null");
    return u?.name || u?.username || "";
  } catch {
    return "";
  }
};

const WeeklyChart = ({ days }) => {
  const max = Math.max(1, ...days.map((d) => d.present + d.absent + d.late));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => Math.round(max * t));
  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-44 flex-col justify-between text-caption text-ink-4">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="grid h-44 flex-1 grid-cols-7 items-end gap-3 border-b border-line">
          {days.map((d) => (
            <div key={d.label} className="mx-auto flex h-full w-full max-w-14 flex-col-reverse justify-start" title={`${d.label}: ${d.present} present, ${d.absent} absent, ${d.late} late`}>
              <div className="rounded-b-sm bg-tone-ok-fg" style={{ height: `${(d.present / max) * 100}%` }} />
              <div className="bg-tone-bad-fg" style={{ height: `${(d.absent / max) * 100}%` }} />
              <div className="rounded-t-sm bg-tone-warn-fg" style={{ height: `${(d.late / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="ml-8 mt-2 grid grid-cols-7 gap-3 text-center text-caption text-ink-3">
        {days.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-5 text-small text-ink-2">
        {CHART.map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${c}`} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const d = useAdminDashboard();
  const extra = useDashboardAttention();
  const { stats, loading, filtered, currentItems, totalItems, totalPages, currentPage, goToPage, itemsPerPage, setItemsPerPage } = d;
  const { searchStaff, setSearchStaff, role, setRole, month, setMonth, year, setYear, startDate, endDate, hasCustomRange, today } = d;
  const [addOpen, setAddOpen] = useState(false);
  const name = currentUserName();
  const hasFilters = Boolean(searchStaff || role || startDate || endDate);

  const attention = [
    { key: "leaves", n: stats.pendingLeaves, title: "Leave requests pending approval", sub: "Waiting for a decision", tone: "highlight", icon: CalendarCheck, to: ROUTES.attendance.leaves, cta: "Review" },
    ...(extra.reimbursements ? [{ key: "reimb", n: extra.reimbursements, title: `Reimbursement${extra.reimbursements === 1 ? "" : "s"} pending approval`, sub: "Waiting for a decision", tone: "highlight", icon: Receipt, to: ROUTES.adminReimbursements, cta: "Review" }] : []),
    ...extra.retention.map((r) => ({ key: r.id, title: r.title, sub: r.sub, tone: r.overdue ? "bad" : "warn", icon: TriangleAlert, to: ROUTES.workOrders, cta: "Open" })),
    ...(extra.deliveries.open ? [{ key: "deliv", title: `${extra.deliveries.open} deliveries still open`, sub: `${extra.deliveries.partial} partially received, ${extra.deliveries.pending} pending`, tone: "warn", icon: Package, to: ROUTES.adminMaterial.upcomingDeliveries, cta: "View" }] : []),
    { key: "absent", n: stats.absent, title: "Marked absent today", sub: "Check the records below", tone: "bad", icon: UserX, to: "#records", cta: "Open" },
    { key: "incomplete", n: stats.incomplete, title: "Employees with incomplete punch-out", sub: "Punched in but not out", tone: "warn", icon: Clock, to: "#records", cta: "Open" },
  ];

  const columns = [
    {
      key: "name",
      header: "Employee",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={r.user?.name || "N/A"} size="sm" />
          <span className="font-medium text-ink-1">{r.user?.name || "N/A"}</span>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (r) => <span className="capitalize">{r.user?.role || "-"}</span> },
    {
      key: "type",
      header: "Type",
      nowrap: false,
      cell: (r) =>
        r.punchTypes.length ? (
          <div className="flex flex-col items-start gap-1">
            {r.punchTypes.map((t) => (
              <StatusBadge key={t} status={t} tone={(PUNCH_TYPES[t] || ["neutral"])[0]} label={(PUNCH_TYPES[t] || [])[1] || t} className="capitalize" />
            ))}
          </div>
        ) : (
          "-"
        ),
    },
    { key: "date", header: "Date", cell: (r) => r.dateString },
    {
      key: "time",
      header: "Time",
      cell: (r) =>
        r.punchIn || r.punchOut ? (
          <div className="space-y-1">
            {r.punchIn ? <div>In: {new Date(r.punchIn).toLocaleTimeString()}</div> : null}
            {r.punchOut ? <div>Out: {new Date(r.punchOut).toLocaleTimeString()}</div> : null}
          </div>
        ) : (
          <span className="text-ink-4">-</span>
        ),
    },
    {
      key: "branch",
      header: "Branch",
      cell: (r) => (
        <Badge variant={r.branch ? "info" : "neutral"} className="gap-1">
          <MapPin className="size-3" />
          {r.branch || "Outside Assigned Branch"}
        </Badge>
      ),
    },
    {
      key: "selfie",
      header: "Selfie",
      cell: (r) =>
        r.selfieIn || r.selfieOut ? (
          <div className="flex items-center gap-2">
            {r.selfieIn ? <img loading="lazy" decoding="async" src={r.selfieIn} alt="Punch in selfie" className="size-10 rounded object-cover" /> : null}
            {r.selfieOut ? <img loading="lazy" decoding="async" src={r.selfieOut} alt="Punch out selfie" className="size-10 rounded object-cover" /> : null}
          </div>
        ) : (
          <span className="text-small text-ink-3">{r.markedByIn || r.markedByOut || "N/A"}</span>
        ),
    },
    { key: "note", header: "Note", cell: (r) => <span className="italic text-ink-3">{r.note || "-"}</span> },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`${greeting()}${name ? `, ${name}` : ""}. Here’s what’s happening across your sites today.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={ROUTES.reports}>
                <FileText /> Generate report
              </Link>
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Add member
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatCard icon={Users} tone="neutral" label="Total workforce" value={stats.known} sub={`Across ${stats.branches.length} branches`} />
        <StatCard
          icon={UserCheck}
          tone="highlight"
          label="Punched in today"
          value={
            <>
              {stats.present} <span className="text-body font-medium text-ink-3">/ {stats.known}</span>
            </>
          }
          sub={stats.present ? `${stats.pctPresent.toFixed(1)}% attendance${stats.trends.present != null ? ` · ${stats.trends.present >= 0 ? "↑" : "↓"} ${Math.abs(stats.trends.present)}% vs yesterday` : ""}` : "No punches yet today"}
        />
        <StatCard icon={UserX} tone="bad" label="Absent today" value={stats.absent} sub={`${stats.pctAbsent.toFixed(1)}% of employees${stats.trends.absent != null ? ` · ${stats.trends.absent >= 0 ? "↑" : "↓"} ${Math.abs(stats.trends.absent)}%` : ""}`} />
        <StatCard icon={Clock} tone="warn" label="Late arrivals" value={stats.late} sub={`${stats.pctLate.toFixed(1)}% of present${stats.trends.late != null ? ` · ${stats.trends.late >= 0 ? "↑" : "↓"} ${Math.abs(stats.trends.late)}%` : ""}`} />
        <StatCard icon={CalendarCheck} tone="warn" label="Pending leaves" value={stats.pendingLeaves} sub={extra.reimbursements ? `${extra.reimbursements} reimbursement${extra.reimbursements === 1 ? "" : "s"} also pending` : "Awaiting approval"} />
        <StatCard icon={Package} tone="info" label="Open deliveries" value={extra.deliveries.open} sub="Awaiting GRN" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4">
        <SectionCard flush title="Needs your attention" description="Approvals and open items from today’s attendance">
          <ul>
            {attention.map((a) => (
              <li key={a.key} className="flex items-center gap-3.5 border-b border-line px-5 py-3.5 last:border-b-0">
                <IconTile icon={a.icon} tone={a.tone} />
                <div className="min-w-0 flex-1">
                  <div className="text-body font-semibold text-ink-1">
                    {a.n != null ? `${a.n} · ` : ""}
                    {a.title}
                  </div>
                  <div className="text-small text-ink-3">{a.sub}</div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  {a.to.startsWith("#") ? <a href={a.to}>{a.cta}</a> : <Link to={a.to}>{a.cta}</Link>}
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Attendance by branch"
          description="Present out of headcount today"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.attendance.live}>Live view</Link>
            </Button>
          }
        >
          {stats.branches.length === 0 ? (
            <p className="py-4 text-center text-body text-ink-3">No branch data</p>
          ) : (
            <div className="flex max-h-72 flex-col gap-3.5 overflow-y-auto pr-1">
              {stats.branches.map((b) => (
                <ProgressRow key={b.branch} className="grid-cols-[150px_1fr_64px]" label={b.branch} value={b.pct} trailing={`${b.present} / ${b.employees}`} title={`${b.pct.toFixed(1)}%`} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Weekly attendance overview" description="Present, absent and late employees over the last 7 days">
        <WeeklyChart days={stats.days} />
      </SectionCard>

      <SectionCard
        id="records"
        flush
        title="Attendance records"
        description="Check-in and check-out records for the selected period"
        actions={
          <Button variant="outline" size="sm" onClick={d.downloadCSV}>
            Export CSV
          </Button>
        }
      >
        <form onSubmit={d.onSearch}>
          <FilterBar onClear={d.resetFilters} showClear={hasFilters}>
            <FilterField label="Search" htmlFor="dash-search" grow={22} minWidth={220}>
              <SearchInput id="dash-search" value={searchStaff} onChange={(e) => setSearchStaff(e.target.value)} onClear={() => setSearchStaff("")} placeholder="Search staff..." />
            </FilterField>
            <FilterField label="Role" htmlFor="dash-role" grow={12} minWidth={140} maxWidth={220}>
              <Select value={role || ALL} onValueChange={(v) => setRole(v === ALL ? "" : v)}>
                <SelectTrigger id="dash-role">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Roles</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="labour">Labour</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Month" htmlFor="dash-month" grow={12} minWidth={140} maxWidth={200}>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))} disabled={hasCustomRange}>
                <SelectTrigger id="dash-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, m) => (
                    <SelectItem key={m} value={String(m + 1)}>
                      {new Date(0, m).toLocaleString("default", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Year" htmlFor="dash-year" grow={8} minWidth={110} maxWidth={140}>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))} disabled={hasCustomRange}>
                <SelectTrigger id="dash-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Start date" htmlFor="dash-start" grow={10} minWidth={150} maxWidth={190}>
              <Input id="dash-start" type="date" value={startDate} max={endDate || today} onChange={(e) => d.handleStartDateChange(e.target.value)} />
            </FilterField>
            <FilterField label="End date" htmlFor="dash-end" grow={10} minWidth={150} maxWidth={190}>
              <Input id="dash-end" type="date" value={endDate} min={startDate || undefined} max={today} onChange={(e) => d.handleEndDateChange(e.target.value)} />
            </FilterField>
            <Button type="submit">Apply</Button>
          </FilterBar>
        </form>

        <DataTable
          columns={columns}
          rows={currentItems}
          rowKey="_id"
          loading={loading}
          density="list"
          emptyState={<EmptyState title="No records found" description="Try a different period or clear the filters to see earlier attendance." />}
          footer={
            !loading && filtered.length > 0 ? (
              <PaginationBar
                variant="compact"
                itemNoun="records"
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                totalItems={totalItems}
                pageSize={itemsPerPage}
                onPageSizeChange={setItemsPerPage}
                pageSizeOptions={[25, 50, 100, 200]}
              />
            ) : null
          }
        />
      </SectionCard>

      <AddEmployeeModal open={addOpen} onOpenChange={setAddOpen} onCreated={d.fetchData} />
    </DashboardLayout>
  );
};

export default AdminDashboard;
