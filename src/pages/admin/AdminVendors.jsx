// src/pages/admin/AdminVendors.jsx  (route: Vendors)
// Data, validation and handlers live in components/useVendorsPage.js (moved unchanged); this file lays out the page.
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import useVendorsPage from "./components/useVendorsPage";
import { getVendorColumns, getVendorMobileCard } from "./components/vendorColumns";

// The form panel is only needed once someone opens it.
const VendorSheet = lazy(() => import("./components/VendorSheet"));

const ANY = "any"; // shadcn SelectItem can't use value=""
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const AdminVendors = () => {
  const v = useVendorsPage();
  const { vendors, loading, sheetOpen, openCreate, handleEdit, handleDelete, deleteId, setDeleteId, confirmDelete } = v;

  // Client-side search + GST filter over the loaded list (same list request as before).
  const [search, setSearch] = useState("");
  const [gst, setGst] = useState(ANY);
  const dSearch = useDebounce(search, 300);
  const filtered = useMemo(() => {
    const q = dSearch.trim().toLowerCase();
    return vendors.filter((x) => {
      if (gst === "has" && !x.gst) return false;
      if (gst === "none" && x.gst) return false;
      return !q || `${x.companyName || ""} ${x.contact || ""} ${x.mobile || ""} ${x.email || ""} ${x.gst || ""}`.toLowerCase().includes(q);
    });
  }, [vendors, dSearch, gst]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => {
    setPage(1);
  }, [filtered, pageSize]);
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize]);

  const handlers = useMemo(
    () => ({ onEdit: handleEdit, onDelete: handleDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const columns = useMemo(() => getVendorColumns(handlers), [handlers]);
  const mobileCard = useMemo(() => getVendorMobileCard(handlers), [handlers]);
  const hasFilters = Boolean(search) || gst !== ANY;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Admin / Vendors"
        title="Vendors"
        description="Suppliers used on purchase orders and GRNs."
        actions={
          <Button onClick={openCreate}>
            <Plus /> Add vendor
          </Button>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Total vendors" value={vendors.length} icon={Building2} tone="highlight" />
      </div>

      <SectionCard flush>
        <FilterBar
          onClear={() => {
            setSearch("");
            setGst(ANY);
          }}
          showClear={hasFilters}
        >
          <FilterField label="Search vendors" htmlFor="vendor-filter-search" grow={22} minWidth={220}>
            <SearchInput id="vendor-filter-search" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search vendors" />
          </FilterField>
          <FilterField label="GST" htmlFor="vendor-filter-gst" grow={10} minWidth={140} maxWidth={200}>
            <Select value={gst} onValueChange={setGst}>
              <SelectTrigger id="vendor-filter-gst">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                <SelectItem value="has">Has GST number</SelectItem>
                <SelectItem value="none">No GST number</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey="_id"
          loading={loading}
          mobileCard={mobileCard}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No vendors found"
              description={hasFilters ? "Try a different search or GST filter." : 'Click "Add vendor" to add your first vendor.'}
            />
          }
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

      {sheetOpen && (
        <Suspense fallback={null}>
          <VendorSheet v={v} />
        </Suspense>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete vendor?"
        description="Are you sure you want to delete this vendor?"
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
};

export default AdminVendors;
