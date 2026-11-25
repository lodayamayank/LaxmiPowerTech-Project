// src/pages/projects/CreateProject.jsx  (route: Projects)
// Data, validation and save/delete handlers live in components/useProjectsPage.jsx (moved unchanged); this file lays out the page.
import { Suspense, useEffect, useMemo, useState } from "react";
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useNavigate } from "react-router-dom";
import { Building2, FolderKanban, Plus } from "lucide-react";
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
import ProjectDetailsDialog from "./components/ProjectDetailsDialog";
import useProjectsPage from "./components/useProjectsPage";
import { getProjectColumns, getProjectMobileCard } from "./components/projectColumns";

// The side panel (form + tower builders) is only needed once someone opens it.
const ProjectSheet = lazyWithRetry(() => import("./components/ProjectSheet"));

// shadcn SelectItem can't use value="", so "All" uses a sentinel
const ALL = "all";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const CreateProject = () => {
  const p = useProjectsPage();
  const {
    projects, loading, branches, search, setSearch, branchFilter, setBranchFilter, openCreate, sheetOpen, handleViewDetails, handleEdit,
    handleDelete, branchesInUse, detailsProject, largeProjectDialogOpen, setLargeProjectDialogOpen, largeProjectUnits,
    saveProject, deleteProjectId, setDeleteProjectId, confirmDelete,
  } = p;
  const navigate = useNavigate();

  // Client-side search + branch filter over the loaded list (same list request as before).
  const dSearch = useDebounce(search, 300);
  const filtered = useMemo(() => {
    const q = dSearch.trim().toLowerCase();
    return projects.filter((proj) => {
      if (branchFilter !== ALL && !(proj.branches || []).some((b) => (b?._id ?? b) === branchFilter)) return false;
      return !q || `${proj.name || ""} ${proj.address || ""}`.toLowerCase().includes(q);
    });
  }, [projects, dSearch, branchFilter]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => {
    setPage(1);
  }, [filtered, pageSize]);
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize]);

  const handlers = useMemo(
    () => ({ onDocuments: (proj) => navigate(`/projects/${proj._id}/documents`), onView: handleViewDetails, onEdit: handleEdit, onDelete: handleDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );
  const columns = useMemo(() => getProjectColumns(handlers), [handlers]);
  const mobileCard = useMemo(() => getProjectMobileCard(handlers), [handlers]);
  const hasFilters = Boolean(search) || branchFilter !== ALL;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Projects"
        title="Projects"
        description="Sites, their branches and tower structure."
        actions={
          <Button onClick={openCreate}>
            <Plus /> New project
          </Button>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Projects" value={projects.length} icon={FolderKanban} tone="info" />
        <StatCard label="Branches in use" value={branchesInUse} sub={`of ${branches.length} branches`} icon={Building2} tone="ok" />
      </div>

      <SectionCard flush>
        <FilterBar
          onClear={() => {
            setSearch("");
            setBranchFilter(ALL);
          }}
          showClear={hasFilters}
        >
          <FilterField label="Search projects" htmlFor="project-filter-search" grow={22} minWidth={220}>
            <SearchInput
              id="project-filter-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Project name or address..."
            />
          </FilterField>
          <FilterField label="Branch" htmlFor="project-filter-branch" grow={14} minWidth={160} maxWidth={260}>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger id="project-filter-branch">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
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
              icon={FolderKanban}
              title="No projects found"
              description={hasFilters ? "Try a different search or branch." : 'Click "New project" to create your first project.'}
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

      {detailsProject && <ProjectDetailsDialog p={p} />}

      {sheetOpen && (
        <Suspense fallback={null}>
          <ProjectSheet p={p} />
        </Suspense>
      )}

      <ConfirmDialog
        open={largeProjectDialogOpen}
        onOpenChange={setLargeProjectDialogOpen}
        title="Confirm large project"
        description={`This project contains ${largeProjectUnits.toLocaleString()} units. This is a large structure and may take longer to process. Do you want to continue?`}
        confirmLabel="Continue"
        onConfirm={() => {
          setLargeProjectDialogOpen(false);
          saveProject();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteProjectId)}
        onOpenChange={(open) => {
          if (!open) setDeleteProjectId(null);
        }}
        title="Delete project?"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
};

export default CreateProject;
