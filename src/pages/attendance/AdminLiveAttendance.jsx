// src/pages/attendance/AdminLiveAttendance.jsx
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Download, MapPin, RefreshCw, UserX, UserCheck, UserMinus, Users } from "lucide-react";
import usePolling from "@/hooks/usePolling";
import { useBranches } from "@/hooks/useBranches";
import axios from "@/api/client";
import { getRoleTone } from "@/lib/status";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";

const POLL_MS = 30000; // refresh interval (paused while the tab is hidden)
const ALL = "__all__"; // Radix SelectItem cannot use ""; mapped back to "" before touching filters

const ROLE_OPTIONS = [
  ["staff", "Staff"],
  ["labour", "Labour"],
  ["subcontractor", "Subcontractor"],
  ["supervisor", "Supervisor"],
];

// API status value -> label the page shows (tones live in lib/status.js).
const STATUS_LABELS = { in: "Punched In", out: "Punched Out", paidleave:"Paid Leave", unpaidleave: "Unpaid Leave", no_punch:"No Punch In", };

const formatTime = (date) =>
  date ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "-";

/** One person's live status card. */
const PersonCard = memo(function PersonCard({ user }) {
  const hasTime = user.status === "in" || user.status === "out";
  return (
    <div className="flex items-center gap-3 rounded-card border border-line-card p-3">
      {user.avatar ? (
        <img
          loading="lazy"
          decoding="async"
          src={user.avatar}
          alt={`${user.name || "Staff"} avatar`}
          className="h-8 w-8 shrink-0 rounded-full border border-line-card object-cover"
        />
      ) : (
        <UserAvatar name={user.name} size="md" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink-1">{user.name}</div>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          {user.role ? (
            <Badge variant={getRoleTone(user.role)} className="capitalize">
              {user.role}
            </Badge>
          ) : null}
        </div>
        {user.branch ? (
          <div className="mt-1 flex min-w-0 items-center gap-1 text-caption-lg text-ink-3">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{user.branch}</span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={STATUS_LABELS[user.status] || STATUS_LABELS.no_punch} />
        {hasTime ? (<span className="text-caption-lg text-ink-3">{user.punchTime || "-"}{user.status === "out" ? ` → ${user.punchOutTime || "-"}` : ""}</span> ) : null}
      </div>
    </div>
  );
});

const AdminLiveAttendance = () => {
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    role: "",
    branch: "",
  });

  const { data: branches } = useBranches();

  // Fetch live attendance with role and branch filters
  const fetchData = useCallback(async () => {
    try {
      const params = {};

      if (filters.role) {
        params.role = filters.role;
      }

      if (filters.branch) {
        params.branch = filters.branch;
      }

      const res = await axios.get("/attendance/live", { params });

      if (Array.isArray(res.data)) {
        setStaffData(res.data);
      } else {
        console.warn("Live response not an array", res.data);
        setStaffData([]);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch live attendance", err);
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load on mount and whenever the filters change, then refresh every 30 s (paused while the tab is hidden)
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  usePolling(fetchData, POLL_MS);

  // Apply search and status filters
  const filteredData = useMemo(
    () =>
      staffData.filter((user) => {
        const matchesStatus = statusFilter === "all" || user.status === statusFilter;
        const matchesSearch = (user.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [staffData, statusFilter, searchQuery],
  );

  // Calculate status counts
  const statusCounts = useMemo(
    () =>
      staffData.reduce(
        (acc, user) => {
          acc[user.status] = (acc[user.status] || 0) + 1;
          return acc;
        },
        { in: 0, out: 0, paidleave: 0, unpaidleave: 0, no_punch: 0 },
      ),
    [staffData],
  );

  // Export attendance data to CSV
const downloadCSV = () => {
  const csvHeader =
    "Name,Status,Punch In Time,Punch Out Time,Overtime Hours,Role,Branch";

  const csvRows = filteredData.map((user) =>
    [
      user.name || "-",
      STATUS_LABELS[user.status] || "-",
      user.punchInTime || "-",
      user.punchOutTime || "-",
      user.overtimeHours ?? "-",
      user.role || "-",
      user.branch || "-",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
    const totalOT = filteredData.reduce((sum, u) => sum + (u.overtimeHours || 0), 0);
  const totalRow = `"Total","","","","${totalOT.toFixed(2)}","",""`;
  const csvContent = [csvHeader, ...csvRows, totalRow].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `live_attendance_${
    new Date().toISOString().split("T")[0]
  }.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

  const statusOptions = [
    { value: "all", label: "All", count: staffData.length },
    { value: "in", label: "Punched in", count: statusCounts.in || 0 },
    { value: "out", label: "Punched out", count: statusCounts.out || 0 },
    { value: "no_punch", label: "Not in", count: statusCounts.no_punch || 0 },
    { value: "paidleave", label: "Paid leave", count: statusCounts.paidleave || 0 },
    { value: "unpaidleave", label: "Unpaid leave", count: statusCounts.unpaidleave || 0 }, 
  ];

  const hasFilters = Boolean(searchQuery || filters.role || filters.branch || statusFilter !== "all");
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFilters({ role: "", branch: "" });
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Overview / Live attendance"
        title="Live attendance"
        description={
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-tone-ok-fg" aria-hidden="true" />
            Live · refreshes every {POLL_MS / 1000} seconds
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => fetchData()}>
              <RefreshCw /> Refresh
            </Button>
            <Button variant="outline" onClick={downloadCSV}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Total staff" value={staffData.length} icon={Users} tone="info" />
        <StatCard label="Punched in" value={statusCounts.in || 0} icon={UserCheck} tone="ok" />
        <StatCard label="Punched out" value={statusCounts.out || 0} icon={UserMinus} tone="info" />
        <StatCard
          label="Not punched in"
          value={statusCounts.no_punch || 0}
          sub={`As of ${formatTime(lastUpdated)}`}
          icon={UserX}
          tone="neutral"
        />
      </div>

      <SectionCard flush>
        <div className="overflow-x-auto border-b border-line px-5 py-3">
          <SegmentedControl aria-label="Filter by punch status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        </div>
        <FilterBar onClear={clearFilters} showClear={hasFilters}>
          <FilterField label="Search people" htmlFor="attendance-search" grow={22} minWidth={220}>
            <SearchInput
              id="attendance-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search by name..."
            />
          </FilterField>
          <FilterField label="Role" htmlFor="attendance-role" grow={14} minWidth={140} maxWidth={240}>
            <Select
              value={filters.role || ALL}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, role: value === ALL ? "" : value }))}
            >
              <SelectTrigger id="attendance-role">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Roles</SelectItem>
                {ROLE_OPTIONS.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Branch" htmlFor="attendance-branch" grow={16} minWidth={140} maxWidth={240}>
            <Select
              value={filters.branch || ALL}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, branch: value === ALL ? "" : value }))}
            >
              <SelectTrigger id="attendance-branch">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-card border border-line-card p-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff found"
            description="Try adjusting your filters or search query"
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 p-4">
            {filteredData.map((user) => (
              <PersonCard key={user._id} user={user} />
            ))}
          </div>
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

export default AdminLiveAttendance;
