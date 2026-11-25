// src/pages/material/deliveries/AdminUpcomingDeliveries.jsx  (route: /dashboard/material/upcoming-deliveries)
// Laid out like the Deliveries design. State and requests live in components/useAdminDeliveries.js,
// the details / receive dialog in components/DeliveryDetailsDialog.jsx.
import { Clock, MapPin, PackageCheck, PackageOpen } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";
import DeliveryDetailsDialog from "./components/DeliveryDetailsDialog";
import useAdminDeliveries from "./components/useAdminDeliveries";

const ALL = "all";
const PAGE_SIZE = 20; // fixed by the hook (ITEMS_PER_PAGE)

export default function AdminUpcomingDeliveries() {
  const d = useAdminDeliveries();
  const { deliveries, openSummary, loading, error, search, setSearch, filterSite, setFilterSite, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, currentPage, setCurrentPage, totalPages, totalRecords, confirm } = d;
  const hasFilters = Boolean(search || filterSite || filterStatus || filterDateFrom || filterDateTo);
  const reset = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };
  const clearFilters = () => {
    setSearch("");
    setFilterSite("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setCurrentPage(1);
  };

  const columns = [
    { key: "ref", header: "Reference", cell: (r) => <span className="font-data font-semibold text-ink-1">{r.transfer_number}</span> },
    { key: "date", header: "Date", cell: (r) => <span className="text-small text-ink-3">{formatDate(r.date)}</span> },
    {
      key: "route",
      header: "From → to",
      cell: (r) => (
        <div className="flex flex-col gap-0.5">
          <span>{r.from}</span>
          <span className="inline-flex items-center gap-1 text-small text-ink-3">
            <MapPin className="size-3.5" />
            {r.to}
          </span>
        </div>
      ),
    },
    { key: "items", header: "Items", cell: (r) => `${r.items?.length || 0} item${r.items?.length === 1 ? "" : "s"}` },
    {
      key: "outstanding",
      header: "Outstanding",
      cell: (r) => (
        <span>
          <span className="font-semibold tabular-nums text-ink-1">{d.getDeliveryQuantitySummary(r).pending}</span> <span className="text-small text-ink-3">to receive</span>
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" onClick={() => d.handleViewDetails(r._id)}>
            <PackageCheck /> Receive
          </Button>
          <Button variant="ghost" size="sm" className="text-tone-bad-fg" disabled={d.deleting} onClick={() => d.requestDelete(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Upcoming Deliveries">
      <PageHeader eyebrow="Inventory / Materials / Deliveries" title="Materials" description="Indents, purchase orders, transfers and goods receipts." />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard icon={PackageOpen} tone="info" label="Open deliveries" value={openSummary.open} />
        <StatCard icon={Clock} tone="warn" label="Partially received" value={openSummary.partial} />
        <StatCard icon={PackageOpen} tone="neutral" label="Not started" value={openSummary.pending} />
      </div>

      {error ? (
        <Notice
          tone="bad"
          title="Error"
          action={
            <Button variant="outline" size="sm" onClick={d.fetchDeliveries}>
              Try again
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}

      <SectionCard flush>
        <FilterBar onClear={clearFilters} showClear={hasFilters}>
          <FilterField label="Search PO or transfer" htmlFor="dl-search" grow={22} minWidth={220}>
            <SearchInput id="dl-search" value={search} onChange={(e) => reset(setSearch)(e.target.value)} onClear={() => reset(setSearch)("")} placeholder="Search by transfer number..." />
          </FilterField>
          <FilterField label="Site" htmlFor="dl-site" grow={14} minWidth={160} maxWidth={260}>
            <Select value={filterSite || ALL} onValueChange={(v) => reset(setFilterSite)(v === ALL ? "" : v)}>
              <SelectTrigger id="dl-site">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sites</SelectItem>
                {d.sites.map((site) => (
                  <SelectItem key={site} value={site}>
                    {site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Status" htmlFor="dl-status" grow={10} minWidth={150} maxWidth={200}>
            <Select value={filterStatus || ALL} onValueChange={(v) => reset(setFilterStatus)(v === ALL ? "" : v)}>
              <SelectTrigger id="dl-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="From date" htmlFor="dl-from" grow={8} minWidth={150} maxWidth={190}>
            <Input id="dl-from" type="date" value={filterDateFrom} onChange={(e) => reset(setFilterDateFrom)(e.target.value)} />
          </FilterField>
          <FilterField label="To date" htmlFor="dl-to" grow={8} minWidth={150} maxWidth={190}>
            <Input id="dl-to" type="date" value={filterDateTo} onChange={(e) => reset(setFilterDateTo)(e.target.value)} />
          </FilterField>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={deliveries}
          rowKey="_id"
          loading={loading}
          density="list"
          emptyState={<EmptyState title="No upcoming deliveries found" description="Try a different search or clear the filters." />}
          footer={
            totalRecords > 0 ? (
              <PaginationBar variant="compact" itemNoun="deliveries" currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalRecords} pageSize={PAGE_SIZE} />
            ) : null
          }
        />
      </SectionCard>

      <DeliveryDetailsDialog d={d} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && d.setConfirm(null)}
        title={confirm?.kind === "attachment" ? "Delete this attachment?" : "Delete this delivery?"}
        description={confirm?.kind === "attachment" ? "The file will be permanently removed." : `Are you sure you want to delete Upcoming Delivery ${confirm?.label}?`}
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={d.runConfirm}
      />
    </DashboardLayout>
  );
}
