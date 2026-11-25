// src/pages/material/transfers/AdminSiteTransfer.jsx  (route: /dashboard/material/site-transfers)
// Laid out like the Site transfers design. State and requests live in components/useSiteTransfers.js,
// the details / edit dialog in components/TransferDetailsDialog.jsx.
import { ArrowRight } from "lucide-react";
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
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatDate } from "@/lib/format";
import TransferDetailsDialog from "./components/TransferDetailsDialog";
import useSiteTransfers from "./components/useSiteTransfers";

const ALL = "all";
const STATUS_FILTERS = [
  ["pending", "Pending"],
  ["in-transit", "In transit"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

export default function AdminSiteTransfer() {
  const t = useSiteTransfers();
  const { filteredTransfers, loading, error, search, setSearch, filterSite, setFilterSite, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, currentPage, setCurrentPage, totalPages, confirm } = t;
  const hasFilters = Boolean(search || filterSite || filterStatus || filterDateFrom || filterDateTo);
  const clearFilters = () => {
    setSearch("");
    setFilterSite("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const columns = [
    { key: "id", header: "Transfer", cell: (r) => <span className="font-data font-semibold text-ink-1">{r.siteTransferId}</span> },
    {
      key: "route",
      header: "Route",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span>{r.fromSite}</span>
          <ArrowRight className="size-4 text-ink-4" />
          <span>{r.toSite}</span>
        </div>
      ),
    },
    {
      key: "by",
      header: "Requested by",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={r.requestedBy || "?"} tone="purple" />
          <span className="font-medium text-ink-1">{r.requestedBy}</span>
        </div>
      ),
    },
    { key: "materials", header: "Materials", cell: (r) => `${r.materials?.length || 0} item${r.materials?.length === 1 ? "" : "s"}` },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "date", header: "Date", cell: (r) => <span className="text-small text-ink-3">{formatDate(r.createdAt, { withTime: true })}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" onClick={() => t.handleViewDetails(r._id)}>
            Open
          </Button>
          <Button variant="ghost" size="sm" className="text-tone-bad-fg" onClick={() => t.requestDelete(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Site Transfers">
      <PageHeader eyebrow="Inventory / Materials / Site transfers" title="Materials" description="Indents, purchase orders, transfers and goods receipts." />

      {error ? (
        <Notice
          tone="bad"
          title="Error"
          action={
            <Button variant="outline" size="sm" onClick={t.fetchTransfers}>
              Try again
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}

      <SectionCard flush>
        <FilterBar onClear={clearFilters} showClear={hasFilters}>
          <FilterField label="Search transfers" htmlFor="st-search" grow={22} minWidth={220}>
            <SearchInput id="st-search" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search by ST ID, site, or person..." />
          </FilterField>
          <FilterField label="Site" htmlFor="st-site" grow={14} minWidth={160} maxWidth={260}>
            <Select value={filterSite || ALL} onValueChange={(v) => setFilterSite(v === ALL ? "" : v)}>
              <SelectTrigger id="st-site">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sites</SelectItem>
                {t.sites.map((site) => (
                  <SelectItem key={site} value={site}>
                    {site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Status" htmlFor="st-status-filter" grow={10} minWidth={150} maxWidth={200}>
            <Select value={filterStatus || ALL} onValueChange={(v) => setFilterStatus(v === ALL ? "" : v)}>
              <SelectTrigger id="st-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUS_FILTERS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="From date" htmlFor="st-from-date" grow={8} minWidth={150} maxWidth={190}>
            <Input id="st-from-date" type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </FilterField>
          <FilterField label="To date" htmlFor="st-to-date" grow={8} minWidth={150} maxWidth={190}>
            <Input id="st-to-date" type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </FilterField>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={filteredTransfers}
          rowKey="_id"
          loading={loading}
          density="list"
          emptyState={<EmptyState title={search ? "No matching transfers found" : "No site transfers found"} description="Try a different search or clear the filters." />}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-small text-ink-3">
              <span>
                Showing {filteredTransfers.length} transfer{filteredTransfers.length === 1 ? "" : "s"}
              </span>
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          }
        />
      </SectionCard>

      <TransferDetailsDialog t={t} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && t.setConfirm(null)}
        title={confirm?.kind === "attachment" ? "Delete this attachment?" : "Delete this site transfer?"}
        description={
          confirm?.kind === "attachment"
            ? "The file will be permanently removed from the server."
            : `Are you sure you want to delete Site Transfer ${confirm?.label}? All associated images will also be deleted from the server.`
        }
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={t.runConfirm}
      />
    </DashboardLayout>
  );
}
