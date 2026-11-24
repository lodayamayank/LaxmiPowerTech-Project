// src/pages/team/AdminMyTeam.jsx  (route: My team)
// Data, role loading, confirmations and the edit-save cache update live in components/useMyTeam.js (moved unchanged);
// this file lays out the page. Adding a member opens a side panel (also reached from /admin/my-team/new).
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { SlidersHorizontal, Upload, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import useDebounce from "@/hooks/useDebounce";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import AttendanceGraphModal from "@/pages/attendance/components/AttendanceGraphModal";
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
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import AddEmployeeModal from "./components/AddEmployeeModal";
import EditUserModal from "./components/EditUserModal";
import useMyTeam, { roleLabel, roleValue } from "./components/useMyTeam";
import { getMemberColumns, getMemberMobileCard } from "./components/memberColumns";

const ALL = "all"; // shadcn SelectItem / segmented value can't be ""
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const idOf = (b) => (b?._id || b)?.toString?.() || "";

const AdminMyTeam = () => {
  const t = useMyTeam();
  const {
    users, loading, branches, projects, roleOptions, filterRole, setFilterRole, searchTerm, setSearchTerm, editingUser, setEditingUser,
    attendanceUser, setAttendanceUser, confirmDialog, setConfirmDialog, confirming, requestDelete, requestResetPassword, handleConfirm, handleUserUpdated,
  } = t;

  const location = useLocation();
  const [addOpen, setAddOpen] = useState(Boolean(location.state?.addMember));
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [selected, setSelected] = useState([]); // row selection (select-all checkbox in the design; no bulk action yet)

  // Search (name, username, mobile) and the branch filter run on the loaded list; the role tab filter is the existing one.
  const dSearch = useDebounce(searchTerm, 300);
  const filtered = useMemo(() => {
    const q = dSearch.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!filterRole || u.role === filterRole) &&
        (branchFilter === ALL || (Array.isArray(u.assignedBranches) ? u.assignedBranches : []).some((b) => idOf(b) === branchFilter)) &&
        (!q || (u.name || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q) || String(u.mobileNumber || "").includes(q)),
    );
  }, [users, filterRole, branchFilter, dSearch]);

  const roles = Array.isArray(roleOptions) ? roleOptions.map(roleValue) : [];
  const tabs = [{ value: ALL, label: "All", count: users.length }, ...roles.map((r) => ({ value: r, label: roleLabel(r), count: users.filter((u) => u.role === r).length }))];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => {
    setPage(1);
  }, [filtered, pageSize]);
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize]);

  const handlers = useMemo(
    () => ({ onAttendance: setAttendanceUser, onEdit: setEditingUser, onReset: requestResetPassword, onDelete: requestDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const columns = useMemo(() => getMemberColumns(handlers), [handlers]);
  const mobileCard = useMemo(() => getMemberMobileCard(handlers), [handlers]);
  const hasFilters = Boolean(filterRole) || Boolean(searchTerm) || branchFilter !== ALL;
  const deleting = confirmDialog?.type === "delete";

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="People / My team"
        title="My team"
        description="Manage logins, roles and branch access for everyone on site."
        actions={
          <>
            <Button variant="outline" onClick={() => toast.info("Importing members is not available yet")}>
              <Upload /> Import
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Add member
            </Button>
          </>
        }
      />

      <SectionCard flush>
        <div className="overflow-x-auto px-5">
          <UnderlineTabs aria-label="Filter by role" value={filterRole || ALL} onChange={(v) => setFilterRole(v === ALL ? "" : v)} options={tabs} />
        </div>

        <FilterBar
          onClear={() => {
            setFilterRole("");
            setSearchTerm("");
            setBranchFilter(ALL);
          }}
          showClear={hasFilters}
        >
          <FilterField htmlFor="team-filter-search" style={{ flex: "2 1 260px" }}>
            <SearchInput id="team-filter-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm("")} placeholder="Search by name, username or mobile" />
          </FilterField>
          <FilterField label="Branch" htmlFor="team-filter-branch" style={{ flex: "1 1 200px" }}>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger id="team-filter-branch">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <Button type="button" variant="outline" onClick={() => toast.info("No additional filters yet")}>
            <SlidersHorizontal /> More filters
          </Button>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey="_id"
          loading={loading}
          mobileCard={mobileCard}
          selectable
          density="list"
          selectedKeys={selected}
          onSelectionChange={setSelected}
          rowLabel={(u) => u.name}
          emptyState={<EmptyState icon={Users} title="No team members found" description={hasFilters ? "Try a different search, role or branch." : "Add your first member to get started."} />}
          footer={
            <PaginationBar
              variant="compact"
              itemNoun="members"
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

      <AddEmployeeModal open={addOpen} onOpenChange={setAddOpen} />

      {editingUser && <EditUserModal user={editingUser} branches={branches} projects={projects} onClose={() => setEditingUser(null)} onSave={handleUserUpdated} />}

      {attendanceUser && <AttendanceGraphModal user={attendanceUser} onClose={() => setAttendanceUser(null)} />}

      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open && !confirming) setConfirmDialog(null);
        }}
        title={deleting ? "Delete this user?" : "Reset password?"}
        description={
          deleting
            ? `Are you sure you want to delete ${confirmDialog?.user?.name} (${confirmDialog?.user?.username})? This action cannot be undone.`
            : `Reset password for ${confirmDialog?.user?.username} to default123?`
        }
        confirmLabel={confirming ? "Processing..." : deleting ? "Delete User" : "Reset Password"}
        tone={deleting ? "destructive" : "default"}
        loading={confirming}
        onConfirm={handleConfirm}
      />
    </DashboardLayout>
  );
};

export default AdminMyTeam;
