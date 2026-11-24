// src/pages/leaves/AdminLeaves.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarOff, FilterX, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import axios from "@/api/client";
import { EVENTS } from "@/lib/events";
import { ROUTES } from "@/lib/routes";
import { useBranches } from "@/hooks/useBranches";
import useDebounce from "@/hooks/useDebounce";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PaginationBar } from "@/components/common/PaginationBar";
import LeaveFilters from "./components/LeaveFilters";
import { getLeaveColumns } from "./components/leaveColumns";

const INITIAL_FILTERS = { role: "", branchId: "", status: "", type: "", from: "", to: "", search: "" };

// Status tabs. "all" is only the tab's own value (Radix tabs need a non-empty one); it maps to no status filter.
const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function AdminLeaves() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const { data: branches } = useBranches();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(Math.ceil(total / limit), 1), [total, limit]);

  // Typing in the search box updates the `search` filter (and so the request) after a short pause.
  const debouncedSearch = useDebounce(searchInput, 300);
  useEffect(() => {
    setFilters((f) => (f.search === debouncedSearch ? f : { ...f, search: debouncedSearch }));
  }, [debouncedSearch]);

  const updateFilter = useCallback((patch) => setFilters((f) => ({ ...f, ...patch })), []);

  // 🔹 Load leave requests
  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/leaves", { params: { ...filters, page, limit } });
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
    loadLeaves();
  };

  const handleAction = useCallback(async (id, status) => {
    try {
      await axios.patch(`/leaves/${id}/status`, { status }); // ✅ correct endpoint
      window.dispatchEvent(new Event(EVENTS.pendingCountsRefresh));
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
      toast.success(`Leave ${status} successfully`);

      // 🔹 optional: broadcast event for AdminDashboard & MyAttendance
      window.dispatchEvent(new CustomEvent(EVENTS.leaveUpdated, { detail: { id, status } }));
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    }
  }, []);

  const columns = useMemo(() => getLeaveColumns(handleAction), [handleAction]);

  // Filters other than the status tab (the tab has its own control).
  const hasActiveFilters = Boolean(
    filters.role || filters.branchId || filters.type || filters.from || filters.to || searchInput,
  );
  const clearFilters = () => {
    setSearchInput("");
    setFilters((f) => ({ ...INITIAL_FILTERS, status: f.status }));
  };
  const activeTab = TABS.find((t) => t.value === (filters.status || "all")) || TABS[3];

  const emptyState = (
    <EmptyState
      icon={CalendarOff}
      title="No leave requests"
      description={
        hasActiveFilters
          ? `No ${filters.status ? activeTab.label.toLowerCase() + " " : ""}leave requests match these filters.`
          : filters.status
            ? `There are no ${activeTab.label.toLowerCase()} leave requests.`
            : "There are no leave requests yet."
      }
      action={
        hasActiveFilters ? (
          <Button variant="outline" onClick={clearFilters}>
            <FilterX /> Clear filters
          </Button>
        ) : null
      }
    />
  );

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="People / Leaves"
        title="Leaves"
        description="Review and decide leave requests. Approved leave flows into the salary run."
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.salary.policy}>
              <ShieldCheck /> Leave policy
            </Link>
          </Button>
        }
      />

      <SectionCard flush>
        <Tabs
          value={filters.status || "all"}
          onValueChange={(v) => updateFilter({ status: v === "all" ? "" : v })}
          className="px-5"
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.label} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <LeaveFilters
          filters={filters}
          onFilter={updateFilter}
          branches={branches}
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          onSubmit={onSearch}
        />

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          emptyState={emptyState}
          footer={
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          }
        />
      </SectionCard>
    </DashboardLayout>
  );
}
