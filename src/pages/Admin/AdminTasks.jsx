import React, { useMemo, useState, useEffect, useCallback } from "react";
import axios from "../../utils/axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  FaFilter,
  FaSearch,
  FaEye,
  FaCalendarAlt,
  FaUserTie,
  FaBuilding,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
} from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LEVEL_3_ACTIVITIES = [
  "Slab Conduiting",
  "Box Fixing",
  "Wiring",
  "Switch Plate",
  "Testing And Commissioning",
];

// shadcn SelectItem can't have value="", so "no selection" options use sentinels
const ALL = "all";
const NO_ACTIVITY = "none";

/**
 * Thin wrapper around shadcn Select so every dropdown is built the same way.
 * items: [{ value: string, label: string }]
 */
const FieldSelect = ({
  id,
  value,
  onValueChange,
  placeholder,
  items,
  disabled = false,
  className = "",
}) => (
  <Select value={value || ""} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger id={id} className={`w-full text-sm ${className}`}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const filterLabelClass =
  "block text-sm font-medium leading-5 text-gray-700 mb-1";
const formLabelClass = "block text-sm font-medium text-gray-700 mb-1";
const thClass =
  "h-auto px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";

const AdminTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [filters, setFilters] = useState({
    project: "",
    building: "",
    wing: "",
    floor: "",
    flat: "",
    supervisor: "",
    startDate: "",
    endDate: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [hierarchy, setHierarchy] = useState({ buildings: [] });
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedLevel3Activity, setSelectedLevel3Activity] = useState(null);

  const emptyForm = {
    project: "",
    branch: "",
    supervisor: "",
    notes: "",
    photo: null,
  };
  const [formData, setFormData] = useState(emptyForm);
  const [fileInputKey, setFileInputKey] = useState(0); // clears the file input when the form is reopened

  const getId = (value) => {
    if (!value) return "";
    return typeof value === "object" ? value._id : value;
  };

  const selectedProject = projects.find(
    (project) => project._id === formData.project
  );

  const formSupervisors = useMemo(() => {
    if (!formData.project) return [];

    const projectBranchIds = new Set(
      (selectedProject?.branches || [])
        .map((branch) => getId(branch))
        .filter(Boolean)
    );

    return supervisors.filter((supervisor) => {
      const supervisorProjectId = getId(supervisor.project);
      if (supervisorProjectId === formData.project) return true;

      return (supervisor.assignedBranches || []).some((branch) =>
        projectBranchIds.has(getId(branch))
      );
    });
  }, [formData.project, selectedProject, supervisors]);

  const getFloors = () => selectedBuilding?.wings?.[0]?.floors || [];
  const getFlats = () => selectedFloor?.flats || [];
  const getRooms = () => selectedFlat?.rooms || [];

  const fetchHierarchy = async (projectId) => {
    try {
      const res = await axios.get(`/projects/${projectId}/hierarchy`);
      setHierarchy(res.data || { buildings: [] });
    } catch (err) {
      console.error("Error fetching hierarchy:", err);
      setHierarchy({ buildings: [] });
    }
  };

  useEffect(() => {
    if (
      formData.project &&
      formData.supervisor &&
      !formSupervisors.some(
        (supervisor) => supervisor._id === formData.supervisor
      )
    ) {
      handleFormChange("supervisor", "");
    }
  }, [formData.project, formData.supervisor, formSupervisors]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const res = await axios.get("/tasks", { params });
      setTasks(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, []);

  const fetchSupervisors = useCallback(async () => {
    try {
      const res = await axios.get("/users");
      const supervisorList = res.data.filter(
        (u) => u.role === "supervisor" || u.role === "subcontractor"
      );
      setSupervisors(supervisorList);
    } catch (err) {
      console.error("Error fetching supervisors:", err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchSupervisors();
  }, [fetchTasks, fetchProjects, fetchSupervisors]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      project: "",
      building: "",
      wing: "",
      floor: "",
      flat: "",
      supervisor: "",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  const viewTaskDetails = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isSupervisorSubmittedTask = (task) =>
    Boolean(
      task?.photoUrl ||
        task?.photoPublicId ||
        task?.capturedAt ||
        task?.syncedOffline
    );

  const getReviewStatus = (task) => {
    if (task?.status === "approved")
      return { label: "Approved", className: "bg-green-100 text-green-700" };
    if (task?.status === "rejected")
      return { label: "Rejected", className: "bg-red-100 text-red-700" };
    if (isSupervisorSubmittedTask(task))
      return {
        label: "Pending Approval",
        className: "bg-orange-100 text-orange-700",
      };
    return {
      label: task?.status?.replace("-", " ") || "pending",
      className: "bg-gray-100 text-gray-700",
    };
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setFileInputKey((k) => k + 1);
    setHierarchy({ buildings: [] });
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setSelectedFlat(null);
    setSelectedRoom(null);
    setSelectedLevel3Activity(null);
    setShowCreateModal(true);
  };

  const openEditModal = async (task) => {
    setSelectedTask(task);
    setFileInputKey((k) => k + 1);
    setFormData({
      project: task.project?._id || "",
      branch: task.branch?._id || "",
      supervisor: task.supervisor?._id || "",
      notes: task.notes || "",
      photo: null,
    });
    setSelectedLevel3Activity(task.level3Activity?.name || null);
    // Fetch hierarchy for this project and try to match selections
    if (task.project?._id) {
      try {
        const res = await axios.get(`/projects/${task.project._id}/hierarchy`);
        const h = res.data || { buildings: [] };
        setHierarchy(h);
        const bldg =
          h.buildings?.find((b) => b.name === task.building?.name) || null;
        setSelectedBuilding(bldg);
        const flr =
          bldg?.wings?.[0]?.floors?.find((f) => f.name === task.floor?.name) ||
          null;
        setSelectedFloor(flr);
        const flt = flr?.flats?.find((f) => f.name === task.flat?.name) || null;
        setSelectedFlat(flt);
        const rm = flt?.rooms?.find((r) => r.name === task.room?.name) || null;
        setSelectedRoom(rm);
      } catch {
        setHierarchy({ buildings: [] });
        setSelectedBuilding(null);
        setSelectedFloor(null);
        setSelectedFlat(null);
        setSelectedRoom(null);
      }
    }
    setShowEditModal(true);
  };

  const closeFormModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const openDeleteModal = (task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("project", formData.project);
    if (formData.branch) fd.append("branch", formData.branch);
    fd.append("supervisor", formData.supervisor);
    fd.append("notes", formData.notes);
    fd.append(
      "building",
      JSON.stringify({
        id: selectedBuilding?._id || "default",
        name: selectedBuilding?.name,
      })
    );
    fd.append("wing", JSON.stringify({ id: "default", name: "Default" }));
    fd.append(
      "floor",
      JSON.stringify({
        id: selectedFloor?._id || "default",
        name: selectedFloor?.name,
      })
    );
    fd.append(
      "flat",
      JSON.stringify({
        id: selectedFlat?._id || "default",
        name: selectedFlat?.name,
      })
    );
    fd.append(
      "room",
      JSON.stringify({
        id: selectedRoom?._id || "default",
        name: selectedRoom?.name,
      })
    );
    if (selectedLevel3Activity) {
      fd.append(
        "level3Activity",
        JSON.stringify({
          id: selectedLevel3Activity,
          name: selectedLevel3Activity,
        })
      );
    }
    if (formData.photo) fd.append("photo", formData.photo);
    return fd;
  };

  const validateForm = () => {
    if (!formData.project) {
      toast.error("Please select a project");
      return false;
    }
    if (!formData.supervisor) {
      toast.error("Please select a supervisor");
      return false;
    }
    if (!selectedBuilding) {
      toast.error("Please select a building");
      return false;
    }
    if (!selectedFloor) {
      toast.error("Please select a floor");
      return false;
    }
    if (!selectedFlat) {
      toast.error("Please select a flat");
      return false;
    }
    if (!selectedRoom) {
      toast.error("Please select a room");
      return false;
    }
    return true;
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      await axios.post("/tasks/admin", buildFormData(), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Task created successfully");
      setShowCreateModal(false);
      setFormData(emptyForm);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!validateForm() || !selectedTask) return;
    try {
      setSubmitting(true);
      await axios.put(`/tasks/${selectedTask._id}`, buildFormData(), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Task updated successfully");
      setShowEditModal(false);
      setSelectedTask(null);
      setFormData(emptyForm);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setSubmitting(true);
      await axios.delete(`/tasks/${taskToDelete._id}`);
      toast.success("Task deleted successfully");
      setShowDeleteModal(false);
      setTaskToDelete(null);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveTask = async (task) => {
    if (!task) return;

    try {
      setSubmitting(true);
      const res = await axios.patch(`/tasks/${task._id}/status`, {
        status: "approved",
      });
      const updatedTask = res.data?.data || { ...task, status: "approved" };

      setSelectedTask(updatedTask);
      setTasks((prev) =>
        prev.map((item) => (item._id === task._id ? updatedTask : item))
      );
      toast.success("Task approved successfully");
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve task");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewStatus = selectedTask ? getReviewStatus(selectedTask) : null;
  const isEditing = showEditModal;

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Task Management
            </h1>
            <p className="text-gray-600">View and manage all tasks</p>
          </div>
          <Button
            onClick={openCreateModal}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <FaPlus className="mr-2" /> Create Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {totalItems}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaBuilding className="text-blue-600 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {projects.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FaBuilding className="text-green-600 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Supervisors</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {supervisors.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <FaUserTie className="text-purple-600 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {
                      tasks.filter(
                        (t) =>
                          new Date(t.createdAt).getMonth() ===
                          new Date().getMonth()
                      ).length
                    }
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <FaCalendarAlt className="text-orange-600 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-600" />
                <h3 className="font-semibold text-gray-800">Filters</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600"
              >
                {showFilters ? "Hide" : "Show"}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label
                    htmlFor="task-filter-project"
                    className={filterLabelClass}
                  >
                    Project
                  </Label>
                  <FieldSelect
                    id="task-filter-project"
                    value={filters.project || ALL}
                    placeholder="All Projects"
                    items={[
                      { value: ALL, label: "All Projects" },
                      ...projects.map((p) => ({ value: p._id, label: p.name })),
                    ]}
                    onValueChange={(val) =>
                      handleFilterChange("project", val === ALL ? "" : val)
                    }
                  />
                </div>

                <div>
                  <Label
                    htmlFor="task-filter-building"
                    className={filterLabelClass}
                  >
                    Building
                  </Label>
                  <Input
                    id="task-filter-building"
                    type="text"
                    value={filters.building}
                    onChange={(e) =>
                      handleFilterChange("building", e.target.value)
                    }
                    placeholder="Filter by building..."
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="task-filter-wing"
                    className={filterLabelClass}
                  >
                    Wing
                  </Label>
                  <Input
                    id="task-filter-wing"
                    type="text"
                    value={filters.wing}
                    onChange={(e) => handleFilterChange("wing", e.target.value)}
                    placeholder="Filter by wing..."
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="task-filter-floor"
                    className={filterLabelClass}
                  >
                    Floor
                  </Label>
                  <Input
                    id="task-filter-floor"
                    type="text"
                    value={filters.floor}
                    onChange={(e) =>
                      handleFilterChange("floor", e.target.value)
                    }
                    placeholder="Filter by floor..."
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="task-filter-flat"
                    className={filterLabelClass}
                  >
                    Flat
                  </Label>
                  <Input
                    id="task-filter-flat"
                    type="text"
                    value={filters.flat}
                    onChange={(e) => handleFilterChange("flat", e.target.value)}
                    placeholder="Filter by flat..."
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="task-filter-supervisor"
                    className={filterLabelClass}
                  >
                    Supervisor
                  </Label>
                  <FieldSelect
                    id="task-filter-supervisor"
                    value={filters.supervisor || ALL}
                    placeholder="All Supervisors"
                    items={[
                      { value: ALL, label: "All Supervisors" },
                      ...supervisors.map((s) => ({
                        value: s._id,
                        label: s.name,
                      })),
                    ]}
                    onValueChange={(val) =>
                      handleFilterChange("supervisor", val === ALL ? "" : val)
                    }
                  />
                </div>

                <div>
                  <Label
                    htmlFor="task-filter-start-date"
                    className={filterLabelClass}
                  >
                    Start Date
                  </Label>
                  <Input
                    id="task-filter-start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="task-filter-end-date"
                    className={filterLabelClass}
                  >
                    End Date
                  </Label>
                  <Input
                    id="task-filter-end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                    className="w-full text-sm"
                  />
                </div>

                <div className="md:col-span-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Button size="sm" onClick={fetchTasks}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3" aria-label="Loading tasks">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <FaSearch className="text-gray-400 text-4xl mx-auto mb-4" />
                <p className="text-gray-500">No tasks found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="w-full text-base">
                    <TableHeader className="bg-gray-50 [&_tr]:border-b-0">
                      <TableRow className="border-b border-gray-200 hover:bg-transparent">
                        <TableHead className={thClass}>Project</TableHead>
                        <TableHead className={thClass}>Location</TableHead>
                        <TableHead className={thClass}>Supervisor</TableHead>
                        <TableHead className={thClass}>Date</TableHead>
                        <TableHead className={thClass}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white">
                      {tasks.map((task) => (
                        <TableRow
                          key={task._id}
                          className="border-gray-200 hover:bg-gray-50"
                        >
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {task.project?.name || "N/A"}
                            </div>
                            {task.branch && (
                              <div className="text-xs text-gray-500">
                                {task.branch.name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {task.building.name} → {task.wing.name}
                              {task.level3Activity?.name && (
                                <Badge
                                  variant="secondary"
                                  className="ml-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-100"
                                >
                                  {task.level3Activity.name}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {task.floor.name} → {task.flat.name} →{" "}
                              {task.room.name}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {task.supervisor?.name || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {task.supervisor?.role}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(task.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewTaskDetails(task)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FaEye className="mr-1" /> View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(task)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <FaEdit className="mr-1" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteModal(task)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <FaTrash className="mr-1" /> Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <Separator />
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * 20 + 1} to{" "}
                    {Math.min(currentPage * 20, totalItems)} of {totalItems}{" "}
                    tasks
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Task Details Dialog */}
        <Dialog open={showModal && !!selectedTask} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Task Details
              </DialogTitle>
              <DialogDescription className="sr-only">
                Photo, location and review status for this task.
              </DialogDescription>
            </DialogHeader>

            {selectedTask && (
              <>
                <div className="space-y-4">
                  {selectedTask.photoUrl && (
                    <div>
                      <img
                        src={selectedTask.photoUrl}
                        alt="Task"
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Project
                      </p>
                      <p className="text-gray-900">
                        {selectedTask.project?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Branch
                      </p>
                      <p className="text-gray-900">
                        {selectedTask.branch?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Building
                      </p>
                      <p className="text-gray-900">
                        {selectedTask.building?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Wing
                      </p>
                      <p className="text-gray-900">{selectedTask.wing?.name}</p>
                    </div>
                    {selectedTask.level3Activity?.name && (
                      <div>
                        <p className="text-sm font-semibold text-gray-600">
                          Level 3 Activity
                        </p>
                        <Badge
                          variant="secondary"
                          className="mt-1 bg-blue-100 text-blue-700 text-sm rounded-full hover:bg-blue-100"
                        >
                          {selectedTask.level3Activity.name}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Floor
                      </p>
                      <p className="text-gray-900">
                        {selectedTask.floor?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Flat
                      </p>
                      <p className="text-gray-900">{selectedTask.flat?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Room
                      </p>
                      <p className="text-gray-900">{selectedTask.room?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Supervisor
                      </p>
                      <p className="text-gray-900">
                        {selectedTask.supervisor?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Status
                      </p>
                      <Badge
                        variant="outline"
                        className={`mt-1 border-transparent px-3 py-1 rounded-full text-sm font-semibold capitalize ${reviewStatus.className}`}
                      >
                        {reviewStatus.label}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-gray-600">
                        Submitted On
                      </p>
                      <p className="text-gray-900">
                        {formatDate(selectedTask.createdAt)}
                      </p>
                    </div>
                    {selectedTask.notes && (
                      <div className="col-span-2">
                        <p className="text-sm font-semibold text-gray-600">
                          Notes
                        </p>
                        <p className="text-gray-900">{selectedTask.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Close
                  </Button>
                  {selectedTask.status !== "approved" &&
                    selectedTask.status !== "rejected" && (
                      <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => handleApproveTask(selectedTask)}
                        disabled={submitting}
                      >
                        <FaCheckCircle className="mr-2" />
                        {submitting ? "Approving..." : "Approve Task"}
                      </Button>
                    )}
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setShowModal(false);
                      openEditModal(selectedTask);
                    }}
                  >
                    <FaEdit className="mr-2" /> Edit Task
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create / Edit Task Dialog */}
        <Dialog
          open={showCreateModal || showEditModal}
          onOpenChange={(open) => {
            if (!open) closeFormModal();
          }}
        >
          <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Task" : "Create New Task"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Choose the project, supervisor and work location, then save the
                task.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={isEditing ? handleUpdateTask : handleCreateTask}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-project" className={formLabelClass}>
                    Project <span className="text-red-500">*</span>
                  </Label>
                  <FieldSelect
                    id="task-project"
                    value={formData.project}
                    placeholder="Select Project"
                    items={projects.map((p) => ({
                      value: p._id,
                      label: p.name,
                    }))}
                    onValueChange={(val) => {
                      handleFormChange("project", val);
                      handleFormChange("supervisor", "");
                      setSelectedBuilding(null);
                      setSelectedFloor(null);
                      setSelectedFlat(null);
                      setSelectedRoom(null);
                      setSelectedLevel3Activity(null);
                      if (val) fetchHierarchy(val);
                      else setHierarchy({ buildings: [] });
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="task-supervisor" className={formLabelClass}>
                    Supervisor <span className="text-red-500">*</span>
                  </Label>
                  <FieldSelect
                    id="task-supervisor"
                    value={formData.supervisor}
                    disabled={!formData.project}
                    placeholder={
                      !formData.project
                        ? "Select project first"
                        : formSupervisors.length === 0
                        ? "No assigned supervisors"
                        : "Select Supervisor"
                    }
                    items={formSupervisors.map((s) => ({
                      value: s._id,
                      label: `${s.name} (${s.role})`,
                    }))}
                    onValueChange={(val) => handleFormChange("supervisor", val)}
                  />
                </div>
              </div>

              {/* Building + Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-building" className={formLabelClass}>
                    Building / Tower <span className="text-red-500">*</span>
                  </Label>
                  <FieldSelect
                    id="task-building"
                    value={selectedBuilding?._id}
                    disabled={
                      !formData.project || hierarchy.buildings.length === 0
                    }
                    placeholder={
                      !formData.project
                        ? "Select a project first"
                        : hierarchy.buildings.length === 0
                        ? "No buildings found"
                        : "Select Building"
                    }
                    items={(hierarchy.buildings || []).map((b) => ({
                      value: b._id,
                      label: b.name,
                    }))}
                    onValueChange={(val) => {
                      const bldg =
                        hierarchy.buildings?.find((b) => b._id === val) || null;
                      setSelectedBuilding(bldg);
                      setSelectedFloor(null);
                      setSelectedFlat(null);
                      setSelectedRoom(null);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="task-activity" className={formLabelClass}>
                    Activity{" "}
                    <span className="text-gray-400 text-xs font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <FieldSelect
                    id="task-activity"
                    value={selectedLevel3Activity || NO_ACTIVITY}
                    placeholder="No Activity"
                    items={[
                      { value: NO_ACTIVITY, label: "No Activity" },
                      ...LEVEL_3_ACTIVITIES.map((a) => ({
                        value: a,
                        label: a,
                      })),
                    ]}
                    onValueChange={(val) =>
                      setSelectedLevel3Activity(
                        val === NO_ACTIVITY ? null : val
                      )
                    }
                  />
                </div>
              </div>

              {/* Floor / Flat / Room */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="task-floor" className={formLabelClass}>
                    Floor <span className="text-red-500">*</span>
                  </Label>
                  <FieldSelect
                    id="task-floor"
                    value={selectedFloor?._id}
                    disabled={!selectedBuilding}
                    placeholder={
                      !selectedBuilding
                        ? "Select building first"
                        : "Select Floor"
                    }
                    items={getFloors().map((f) => ({
                      value: f._id,
                      label: f.name,
                    }))}
                    onValueChange={(val) => {
                      setSelectedFloor(
                        getFloors().find((f) => f._id === val) || null
                      );
                      setSelectedFlat(null);
                      setSelectedRoom(null);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="task-flat" className={formLabelClass}>
                    Flat <span className="text-red-500">*</span>
                  </Label>
                  <FieldSelect
                    id="task-flat"
                    value={selectedFlat?._id}
                    disabled={!selectedFloor}
                    placeholder={
                      !selectedFloor ? "Select floor first" : "Select Flat"
                    }
                    items={getFlats().map((f) => ({
                      value: f._id,
                      label: `${f.name}${f.flatType ? ` (${f.flatType})` : ""}`,
                    }))}
                    onValueChange={(val) => {
                      setSelectedFlat(
                        getFlats().find((f) => f._id === val) || null
                      );
                      setSelectedRoom(null);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="task-room" className={formLabelClass}>
                    Room <span className="text-red-500">*</span>
                  </Label>
                  <FieldSelect
                    id="task-room"
                    value={selectedRoom?._id}
                    disabled={!selectedFlat}
                    placeholder={
                      !selectedFlat ? "Select flat first" : "Select Room"
                    }
                    items={getRooms().map((r) => ({
                      value: r._id,
                      label: r.name,
                    }))}
                    onValueChange={(val) =>
                      setSelectedRoom(
                        getRooms().find((r) => r._id === val) || null
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="task-photo" className={formLabelClass}>
                  Photo {isEditing ? "(Upload new to replace)" : "(Optional)"}
                </Label>
                <Input
                  key={fileInputKey}
                  id="task-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFormChange("photo", e.target.files[0] || null)
                  }
                  className="w-full text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              </div>

              <div>
                <Label htmlFor="task-notes" className={formLabelClass}>
                  Notes
                </Label>
                <Textarea
                  id="task-notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Add any additional notes..."
                  className="w-full text-sm"
                />
              </div>

              <Separator />

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeFormModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting
                    ? isEditing
                      ? "Updating..."
                      : "Creating..."
                    : isEditing
                    ? "Update Task"
                    : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={showDeleteModal && !!taskToDelete}
          onOpenChange={(open) => {
            if (!open && !submitting) {
              setShowDeleteModal(false);
              setTaskToDelete(null);
            }
          }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-gray-800">
                <FaTrash className="text-red-500" />
                Delete this task?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24 shrink-0">
                  Project:
                </span>
                <span className="text-gray-900">
                  {taskToDelete?.project?.name || "N/A"}
                </span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24 shrink-0">
                  Location:
                </span>
                <span className="text-gray-900">
                  {taskToDelete?.building?.name} → {taskToDelete?.flat?.name} →{" "}
                  {taskToDelete?.room?.name}
                </span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24 shrink-0">
                  Supervisor:
                </span>
                <span className="text-gray-900">
                  {taskToDelete?.supervisor?.name || "N/A"}
                </span>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={submitting}
                onClick={(e) => {
                  // keep the dialog open until the request finishes
                  e.preventDefault();
                  handleDeleteTask();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? "Deleting..." : "Delete Task"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminTasks;
