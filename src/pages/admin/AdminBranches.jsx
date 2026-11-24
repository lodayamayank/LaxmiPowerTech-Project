// src/pages/admin/AdminBranches.jsx  (route: Branches)
// Data, map handlers and save/delete live in components/useBranchesPage.js (moved unchanged); this file lays out the page.
import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import BranchForm from "./components/BranchForm";
import useBranchesPage from "./components/useBranchesPage";
import { getBranchColumns, getBranchMobileCard } from "./components/branchColumns";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const AdminBranches = () => {
  const b = useBranchesPage();
  const { branches, loading, handleEdit, handleDelete, deleteId, setDeleteId, confirmDelete } = b;

  // Client-side search over the loaded list (same list request as before).
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 300);
  const filtered = useMemo(() => {
    const q = dSearch.trim().toLowerCase();
    return q ? branches.filter((x) => `${x.name || ""} ${x.address || ""}`.toLowerCase().includes(q)) : branches;
  }, [branches, dSearch]);

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
  const columns = useMemo(() => getBranchColumns(handlers), [handlers]);
  const mobileCard = useMemo(() => getBranchMobileCard(handlers), [handlers]);

  return (
    <DashboardLayout>
      <PageHeader eyebrow="Admin / Branches" title="Branches" description="Site locations and the geofence used for punch-in." />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Total branches" value={branches.length} icon={MapPin} tone="highlight" />
      </div>

      <BranchForm b={b} />

      <SectionCard title="All branches" description={`${branches.length} branches`} flush>
        <FilterBar onClear={() => setSearch("")} showClear={Boolean(search)}>
          <FilterField label="Search branches" htmlFor="branch-filter-search" grow={22} minWidth={220}>
            <SearchInput id="branch-filter-search" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search branches" />
          </FilterField>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey="_id"
          loading={loading}
          mobileCard={mobileCard}
          emptyState={<EmptyState icon={MapPin} title="No branches found" description={search ? "Try a different search." : "Add your first branch above."} />}
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

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete branch?"
        description="Are you sure you want to delete this branch?"
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
};

export default AdminBranches;
