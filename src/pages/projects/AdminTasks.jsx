// src/pages/projects/AdminTasks.jsx
// Data and handlers live in components/useAdminTasks.js (moved unchanged); this file lays out the page.
import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, ClipboardList, Plus, UserCog } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import TaskDetailsDialog from "./components/TaskDetailsDialog";
import TaskFormDialog from "./components/TaskFormDialog";
import useAdminTasks from "./components/useAdminTasks";
import { getTaskColumns, getTaskMobileCard } from "./components/taskColumns";

// shadcn SelectItem can't have value="", so "no selection" options use a sentinel
const ALL = "all";
const PAGE_SIZE = 20;
const TEXT_FILTERS = [
  ["building", "Building"],
  ["wing", "Wing"],
  ["floor", "Floor"],
  ["flat", "Flat"],
];

const AdminTasks = () => {
  const t = useAdminTasks();
  const {
    tasks, projects, supervisors, loading, currentPage, setCurrentPage, totalPages, totalItems, filters, handleFilterChange,
    clearFilters, fetchTasks, selectedTask, showModal, setShowModal, showDeleteModal, setShowDeleteModal, taskToDelete,
    setTaskToDelete, submitting, viewTaskDetails, openCreateModal, openEditModal, openDeleteModal, handleDeleteTask,
    handleApproveTask,
  } = t;

  // Text filters are typed locally and sent after a short pause (same params, fewer requests while typing).
  const [typed, setTyped] = useState({ building: "", wing: "", floor: "", flat: "" });
  const dBuilding = useDebounce(typed.building, 300);
  const dWing = useDebounce(typed.wing, 300);
  const dFloor = useDebounce(typed.floor, 300);
  const dFlat = useDebounce(typed.flat, 300);
  const debounced = { building: dBuilding, wing: dWing, floor: dFloor, flat: dFlat };
  useEffect(() => {
    TEXT_FILTERS.forEach(([field]) => {
      if (debounced[field] !== filters[field]) handleFilterChange(field, debounced[field]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dBuilding, dWing, dFloor, dFlat]);

  const hasFilters = Object.values(filters).some(Boolean) || Object.values(typed).some(Boolean);
  const onClear = () => {
    setTyped({ building: "", wing: "", floor: "", flat: "" });
    clearFilters();
  };

  const createdThisMonth = useMemo(
    () => tasks.filter((x) => new Date(x.createdAt).getMonth() === new Date().getMonth()).length,
    [tasks],
  );

  const handlers = useMemo(
    () => ({ onView: viewTaskDetails, onEdit: openEditModal, onDelete: openDeleteModal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const columns = useMemo(() => getTaskColumns(handlers), [handlers]);
  const mobileCard = useMemo(() => getTaskMobileCard(handlers), [handlers]);

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Projects / Tasks"
        title="Tasks"
        description="Room-level work assigned to supervisors and subcontractors."
        actions={
          <Button onClick={openCreateModal}>
            <Plus /> Create task
          </Button>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Total tasks" value={totalItems} icon={ClipboardList} tone="info" />
        <StatCard label="Active projects" value={projects.length} icon={Building2} tone="ok" />
        <StatCard label="Supervisors" value={supervisors.length} icon={UserCog} tone="purple" />
        <StatCard label="Created this month" value={createdThisMonth} sub="on this page" icon={CalendarDays} tone="highlight" />
      </div>

      <SectionCard flush>
        <FilterBar onClear={onClear} showClear={hasFilters}>
          <FilterField label="Project" htmlFor="task-filter-project" grow={16} minWidth={160} maxWidth={240}>
            <Select value={filters.project || ALL} onValueChange={(val) => handleFilterChange("project", val === ALL ? "" : val)}>
              <SelectTrigger id="task-filter-project">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          {TEXT_FILTERS.map(([field, label]) => (
            <FilterField key={field} label={label} htmlFor={`task-filter-${field}`} grow={10} minWidth={130} maxWidth={200}>
              <Input
                id={`task-filter-${field}`}
                type="text"
                value={typed[field]}
                onChange={(e) => setTyped((prev) => ({ ...prev, [field]: e.target.value }))}
                placeholder={`Filter by ${field}...`}
              />
            </FilterField>
          ))}
          <FilterField label="Assigned to" htmlFor="task-filter-supervisor" grow={16} minWidth={160} maxWidth={240}>
            <Select value={filters.supervisor || ALL} onValueChange={(val) => handleFilterChange("supervisor", val === ALL ? "" : val)}>
              <SelectTrigger id="task-filter-supervisor">
                <SelectValue placeholder="All Supervisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Supervisors</SelectItem>
                {supervisors.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Start date" htmlFor="task-filter-start-date" grow={12} minWidth={150} maxWidth={180}>
            <Input id="task-filter-start-date" type="date" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
          </FilterField>
          <FilterField label="End date" htmlFor="task-filter-end-date" grow={12} minWidth={150} maxWidth={180}>
            <Input id="task-filter-end-date" type="date" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
          </FilterField>
          <Button type="button" variant="outline" onClick={fetchTasks}>
            Apply
          </Button>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={tasks}
          rowKey="_id"
          loading={loading}
          mobileCard={mobileCard}
          emptyState={<EmptyState icon={ClipboardList} title="No tasks found" description="No tasks match these filters." />}
          footer={
            <PaginationBar currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
          }
        />
      </SectionCard>

      <TaskDetailsDialog
        open={showModal}
        onOpenChange={setShowModal}
        task={selectedTask}
        submitting={submitting}
        onApprove={handleApproveTask}
        onEdit={(task) => {
          setShowModal(false);
          openEditModal(task);
        }}
      />

      <TaskFormDialog t={t} />

      <ConfirmDialog
        open={showDeleteModal && !!taskToDelete}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setShowDeleteModal(false);
            setTaskToDelete(null);
          }
        }}
        title="Delete this task?"
        description={`This action cannot be undone. ${taskToDelete?.project?.name || "N/A"}: ${taskToDelete?.building?.name} → ${taskToDelete?.flat?.name} → ${taskToDelete?.room?.name} (supervisor ${taskToDelete?.supervisor?.name || "N/A"}).`}
        confirmLabel={submitting ? "Deleting..." : "Delete Task"}
        tone="destructive"
        loading={submitting}
        onConfirm={handleDeleteTask}
      />
    </DashboardLayout>
  );
};

export default AdminTasks;
