// src/pages/projects/ManageWorkOrder.jsx  (route: Work orders)
// Data, validations and handlers live in components/useWorkOrders.js (moved unchanged); this file lays out the page.
import { useEffect, useMemo, useState } from "react";
import { Banknote, ClipboardList, Hourglass, Plus, Wallet } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { BillsDialog, CreateWorkOrderDialog, TriggerWorkOrderDialog } from "./components/WorkOrderDialogs";
import useWorkOrders from "./components/useWorkOrders";
import { getWorkOrderColumns, getWorkOrderMobileCard } from "./components/workOrderColumns";

// shadcn SelectItem can't use value="", so "All" options use a sentinel
const ALL = "all";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const STATUS_OPTIONS = [
  ["active", "Active"],
  ["completed", "Completed"],
  ["on-hold", "On Hold"],
  ["cancelled", "Cancelled"],
  ["triggered", "Triggered"],
];
const PERIOD_TRIGGER = "h-control-sm w-auto gap-2 px-2.5 text-small";

export default function ManageWorkOrder() {
  const w = useWorkOrders();
  const {
    projects, selectedProject, setSelectedProject, workOrders, loading, filters, setFilters, handleSearch, clearFilters,
    handleAddWorkOrder, handleViewBills, openTriggerModal, remainingFor, getRetentionState, formatCurrency, formatDate,
  } = w;

  // Client-side paging: the API returns every work order of the project.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => {
    setPage(1);
  }, [workOrders, pageSize]);
  const totalPages = Math.max(Math.ceil(workOrders.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => workOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize), [workOrders, currentPage, pageSize]);

  // Simple sums over the loaded work orders (the old page showed no totals).
  const sums = useMemo(() => {
    const value = workOrders.reduce((s, o) => s + (Number(o.totalValue) || 0), 0);
    const billed = workOrders.reduce((s, o) => s + (Number(o.totalBillsAmount) || 0), 0);
    const remaining = workOrders.reduce((s, o) => s + remainingFor(o), 0);
    const overdue = workOrders.filter((o) => getRetentionState(o)?.label === "Retention Overdue");
    return { value, billed, remaining, overdueAmount: overdue.reduce((s, o) => s + (Number(o.retentionAmount) || 0), 0), overdueCount: overdue.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders]);

  const handlers = { onBills: handleViewBills, onTrigger: openTriggerModal, remainingFor, getRetentionState, formatCurrency, formatDate };
  const columns = useMemo(() => getWorkOrderColumns(handlers), [handleViewBills, openTriggerModal]);
  const mobileCard = useMemo(() => getWorkOrderMobileCard(handlers), [handleViewBills, openTriggerModal]);

  const retentionBadge = (order, fallback) => {
    const state = getRetentionState(order);
    return <Badge variant={state?.tone || "neutral"}>{state?.label || fallback}</Badge>;
  };

  const money = "[&_.text-kpi]:break-words [&_.text-kpi]:text-xl";
  const pct = sums.value > 0 ? Math.round((sums.billed / sums.value) * 100) : 0;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Projects / Work orders"
        title="Work orders"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Project
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className={PERIOD_TRIGGER} aria-label="Project" id="wo-project-select">
                <SelectValue placeholder="-- Select Project --" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        }
        actions={
          <Button onClick={handleAddWorkOrder}>
            <Plus /> Add work order
          </Button>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Work order value" value={formatCurrency(sums.value)} sub={`${workOrders.length} work orders`} icon={ClipboardList} tone="info" className={money} />
        <StatCard label="Billed so far" value={formatCurrency(sums.billed)} sub={`${pct}% of value`} icon={Banknote} tone="ok" className={money} />
        <StatCard label="Remaining" value={formatCurrency(sums.remaining)} icon={Wallet} tone="highlight" className={money} />
        <StatCard
          label="Retention overdue"
          value={formatCurrency(sums.overdueAmount)}
          sub={`${sums.overdueCount} work order${sums.overdueCount === 1 ? "" : "s"}`}
          icon={Hourglass}
          tone="bad"
        />
      </div>

      <SectionCard flush>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <FilterBar onClear={clearFilters} showClear={Boolean(filters.search || filters.status)}>
            <FilterField label="Search work orders" htmlFor="wo-filter-search" grow={22} minWidth={220}>
              <SearchInput
                id="wo-filter-search"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onClear={() => setFilters({ ...filters, search: "" })}
                placeholder="Work Order No, Name..."
              />
            </FilterField>
            <FilterField label="Status" htmlFor="wo-filter-status" grow={14} minWidth={150} maxWidth={240}>
              <Select value={filters.status || ALL} onValueChange={(val) => setFilters({ ...filters, status: val === ALL ? "" : val })}>
                <SelectTrigger id="wo-filter-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Status</SelectItem>
                  {STATUS_OPTIONS.map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <Button type="submit">Search</Button>
          </FilterBar>
        </form>

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey="_id"
          loading={loading}
          mobileCard={mobileCard}
          emptyState={
            !selectedProject ? (
              <EmptyState icon={ClipboardList} title="Select a project" description="Please select a project to view work orders" />
            ) : (
              <EmptyState icon={ClipboardList} title="No work orders found" description='Click "Add work order" to create your first work order' />
            )
          }
          footer={
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={workOrders.length}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </SectionCard>

      <CreateWorkOrderDialog w={w} />
      <TriggerWorkOrderDialog w={w} />
      <BillsDialog w={w} retentionBadge={retentionBadge} />
    </DashboardLayout>
  );
}
