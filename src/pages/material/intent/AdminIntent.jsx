// src/pages/material/intent/AdminIntent.jsx  (route: /dashboard/material/intent, the "Purchase orders" tab)
// Laid out like the Purchase orders design. State and requests live in components/useAdminIntent.js,
// the details / edit dialog in components/IntentDetailsDialog.jsx.
import { useState } from "react";
import { CheckCircle2, Eye, ImageIcon, MoreHorizontal, Plus, RefreshCw, Trash2 } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatDate } from "@/lib/format";
import IntentDetailsDialog from "./components/IntentDetailsDialog";
import useAdminIntent, { ITEMS_PER_PAGE, resolveFileUrl } from "./components/useAdminIntent";

const ALL = "all";
const STATUS_FILTERS = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["cancelled", "Cancelled"],
];

// Photo thumbnail; falls back to an icon tile when the file cannot be loaded
function PhotoCell({ url, onOpen }) {
  const [failed, setFailed] = useState(false);
  if (!url) return <span className="text-small text-ink-4">No image</span>;
  if (failed) {
    return (
      <span className="flex size-12 items-center justify-center rounded-control border border-line bg-surface-muted text-ink-3">
        <ImageIcon className="size-5" />
      </span>
    );
  }
  return (
    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={onOpen} aria-label="Open image">
      <img loading="lazy" decoding="async" src={resolveFileUrl(url)} alt="Intent" className="size-12 rounded-control border border-line object-cover hover:opacity-80" onError={() => setFailed(true)} />
    </Button>
  );
}

export default function AdminIntent() {
  const t = useAdminIntent();
  const { indents, loading, error, search, setSearch, filterSite, setFilterSite, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, currentPage, setCurrentPage, totalPages, totalRecords, confirmation, materialToDelete, deletingMaterial, latestUploadedIndent } = t;
  const hasFilters = Boolean(search || t.activeFilterCount > 0);
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
    { key: "po", header: "PO number", cell: (r) => <span className="font-data font-semibold text-ink-1">{r.indentId || r.purchaseOrderId || "N/A"}</span> },
    { key: "photo", header: "Photo", cell: (r) => <PhotoCell url={r.imageUrl} onOpen={() => t.handleViewImage(r.imageUrl)} /> },
    { key: "site", header: "Site", cell: (r) => r.deliverySite || "N/A" },
    {
      key: "by",
      header: "Requested by",
      cell: (r) => {
        const name = r.requestedBy?.name || r.requestedBy || "N/A";
        return (
          <div className="flex items-center gap-2.5">
            <UserAvatar name={name} tone="pink" />
            <span className="font-medium text-ink-1">{name}</span>
          </div>
        );
      },
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "date", header: "Raised", cell: (r) => <span className="text-small text-ink-3">{formatDate(r.createdAt, { withTime: true })}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => {
        const pending = r.status?.toLowerCase() === "pending";
        return (
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="sm" onClick={() => t.handleViewDetails(r._id)}>
              Open
            </Button>
            {pending ? (
              <Button variant="approve" size="sm" disabled={t.saving} onClick={() => t.handleApproveIntent(r)}>
                <CheckCircle2 /> Approve
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`More actions for ${r.indentId}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {pending ? (
                  <DropdownMenuItem onSelect={() => t.handleQuickAddMaterial(r._id)} className="gap-2 text-small">
                    <Plus className="size-4" /> Add material
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem disabled={t.deleting} onSelect={() => t.requestDelete(r)} className="gap-2 text-small text-tone-bad-fg focus:text-tone-bad-fg">
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Intent (PO)">
      <PageHeader
        eyebrow="Inventory / Materials / Purchase orders"
        title="Materials"
        description="Indents, purchase orders, transfers and goods receipts."
        actions={
          <>
            <Button variant="outline" onClick={t.fetchIndents} disabled={loading} aria-label="Refresh">
              <RefreshCw className={loading ? "animate-spin" : undefined} /> <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" disabled={!latestUploadedIndent} onClick={() => latestUploadedIndent && t.handleViewDetails(latestUploadedIndent._id)}>
              <Eye /> Open latest
            </Button>
            <Button disabled={!latestUploadedIndent} onClick={() => latestUploadedIndent && t.handleQuickAddMaterial(latestUploadedIndent._id)}>
              <Plus /> Add to latest PO
            </Button>
          </>
        }
      />

      {error ? (
        <Notice
          tone="bad"
          title="Error"
          action={
            <Button variant="outline" size="sm" onClick={t.fetchIndents}>
              Try again
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}

      <SectionCard flush>
        <FilterBar onClear={clearFilters} showClear={hasFilters}>
          <FilterField label="Search PO number" htmlFor="po-search" grow={22} minWidth={220}>
            <SearchInput id="po-search" value={search} onChange={(e) => reset(setSearch)(e.target.value)} onClear={() => reset(setSearch)("")} placeholder="Search by PO ID..." />
          </FilterField>
          <FilterField label="Site" htmlFor="po-site-filter" grow={14} minWidth={160} maxWidth={260}>
            <Select value={filterSite || ALL} onValueChange={(v) => reset(setFilterSite)(v === ALL ? "" : v)}>
              <SelectTrigger id="po-site-filter">
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
          <FilterField label="Status" htmlFor="po-status-filter" grow={10} minWidth={150} maxWidth={200}>
            <Select value={filterStatus || ALL} onValueChange={(v) => reset(setFilterStatus)(v === ALL ? "" : v)}>
              <SelectTrigger id="po-status-filter">
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
          <FilterField label="From date" htmlFor="po-from" grow={8} minWidth={150} maxWidth={190}>
            <Input id="po-from" type="date" value={filterDateFrom} onChange={(e) => reset(setFilterDateFrom)(e.target.value)} />
          </FilterField>
          <FilterField label="To date" htmlFor="po-to" grow={8} minWidth={150} maxWidth={190}>
            <Input id="po-to" type="date" value={filterDateTo} onChange={(e) => reset(setFilterDateTo)(e.target.value)} />
          </FilterField>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={indents}
          rowKey="_id"
          loading={loading}
          density="list"
          emptyState={<EmptyState title={search ? "No purchase orders found matching your search" : "No purchase orders found"} description="Try a different search or clear the filters." />}
          footer={totalRecords > 0 ? <PaginationBar variant="compact" itemNoun="purchase orders" currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalRecords} pageSize={ITEMS_PER_PAGE} /> : null}
        />
      </SectionCard>

      <IntentDetailsDialog t={t} />

      <ConfirmDialog open={!!confirmation} onOpenChange={(open) => !open && t.setConfirmation(null)} title={confirmation?.title} description={confirmation?.description} confirmLabel="Confirm" tone="destructive" onConfirm={t.runConfirm} />

      <ConfirmDialog
        open={!!materialToDelete}
        onOpenChange={(open) => !open && !deletingMaterial && t.setMaterialToDelete(null)}
        title="Delete material"
        description={`Are you sure you want to delete "${materialToDelete?.itemName || materialToDelete?.category || "the selected material"}"? Only this material will be removed. The Intent PO and uploaded image will stay unchanged.`}
        confirmLabel={deletingMaterial ? "Deleting..." : "Delete material"}
        tone="destructive"
        loading={deletingMaterial}
        onConfirm={t.handleDeleteManualMaterial}
      />
    </DashboardLayout>
  );
}
