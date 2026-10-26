import React, { useEffect, useState, useRef } from "react";
import axios from "@/utils/axios";
import DashboardLayout from "@/layouts/DashboardLayout";
import SmartTowerBuilder from "@/components/SmartTowerBuilder";
import {
  FaProjectDiagram,
  FaMapMarkerAlt,
  FaBuilding,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaTimes,
  FaCheck,
  FaTasks,
  FaUsers,
  FaLayerGroup,
  FaCheckCircle,
  FaClock,
  FaChartLine,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import EmptyTableRow from "@/components/common/EmptyTableRow";  
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import StatCard from "@/components/common/StatCard";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const GOOGLE_LIBS = ["places"];

const CreateProject = () => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    branches: [],
    buildings: [],
  });
  const [projects, setProjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsProject, setDetailsProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [largeProjectDialogOpen, setLargeProjectDialogOpen] = useState(false);
  const [largeProjectUnits, setLargeProjectUnits] = useState(0);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const token = localStorage.getItem("token");
  const formRef = useRef(null);

  // Google Places Autocomplete
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_LIBS,
  });
  const autocompleteWidgetRef = useRef(null);

  const onAutocompleteLoad = (ac) => {
    autocompleteWidgetRef.current = ac;
  };

  const onPlaceChanged = () => {
    const ac = autocompleteWidgetRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    const addr = place?.formatted_address || place?.name || "";
    if (addr) {
      setFormData((prev) => ({ ...prev, address: addr }));
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get("/branches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = (res.data || [])
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
      setBranches(sorted);
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const getId = (value) => {
    if (!value) return "";
    return typeof value === "object" ? value._id : value;
  };

  const getProjectTeam = (project) => {
    const projectBranchIds = new Set(
      (project?.branches || []).map(getId).filter(Boolean)
    );

    return users.filter((user) => {
      if (!["supervisor", "subcontractor"].includes(user.role)) return false;
      if (getId(user.project) === project?._id) return true;
      return (user.assignedBranches || []).some((branch) =>
        projectBranchIds.has(getId(branch))
      );
    });
  };

  const countProjectStructure = (project) => {
    const buildings = project?.buildings || [];
    let floors = 0;
    let flats = 0;
    let rooms = 0;

    buildings.forEach((building) => {
      (building.wings || []).forEach((wing) => {
        floors += wing.floors?.length || 0;
        (wing.floors || []).forEach((floor) => {
          flats += floor.flats?.length || 0;
          (floor.flats || []).forEach((flat) => {
            rooms += flat.rooms?.length || 0;
          });
        });
      });
    });

    return { buildings: buildings.length, floors, flats, rooms };
  };

  const isSupervisorUploadedTask = (task) =>
    Boolean(
      task?.photoUrl ||
        task?.photoPublicId ||
        task?.capturedAt ||
        task?.syncedOffline
    );

  const isApprovedSupervisorTask = (task) =>
    isSupervisorUploadedTask(task) && task?.status === "approved";

  const getEffectiveTaskStatus = (task) => {
    if (task?.status === "approved") {
      return "completed";
    }

    return task?.status || "pending";
  };

  const getTaskProgress = (tasks) => {
    const counts = {
      pending: 0,
      "in-progress": 0,
      completed: 0,
      verified: 0,
      approved: 0,
      rejected: 0,
    };

    tasks.forEach((task) => {
      const status = getEffectiveTaskStatus(task);
      counts[status] = (counts[status] || 0) + 1;
    });

    const done = counts.completed + counts.verified + counts.approved;
    const total = tasks.length;
    return {
      counts,
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  };

  const groupTasksBy = (tasks, keyPath, fallback = "Unassigned") => {
    const groups = new Map();

    tasks.forEach((task) => {
      const key =
        keyPath.split(".").reduce((value, key) => value?.[key], task) ||
        fallback;
      const current = groups.get(key) || {
        name: key,
        total: 0,
        done: 0,
        pending: 0,
        inProgress: 0,
        rejected: 0,
      };
      const status = getEffectiveTaskStatus(task);
      current.total += 1;
      if (["completed", "verified", "approved"].includes(status))
        current.done += 1;
      if (status === "pending") current.pending += 1;
      if (status === "in-progress") current.inProgress += 1;
      if (status === "rejected") current.rejected += 1;
      groups.set(key, current);
    });

    return Array.from(groups.values()).sort(
      (a, b) => b.total - a.total || a.name.localeCompare(b.name)
    );
  };

  const handleViewDetails = async (project) => {
    setDetailsProject(project);
    setProjectTasks([]);
    setDetailsLoading(true);

    try {
      const res = await axios.get("/tasks", {
        params: { project: project._id, limit: 1000 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjectTasks(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch project tasks", err);
      toast.error("Failed to fetch project details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsProject(null);
    setProjectTasks([]);
    setDetailsLoading(false);
  };

  const getTotalUnits = () =>
    formData.buildings.reduce((sum, tower) => {
      return (
        sum +
        (tower.wings?.[0]?.floors?.reduce(
          (floorSum, floor) => floorSum + (floor.flats?.length || 0),
          0
        ) || 0)
      );
    }, 0);

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.buildings.length === 0) {
      toast.error("Please add at least one tower with floors and units");
      return;
    }

    // Residential flats and commercial shops/offices/godowns share the same persisted slot.
    const totalUnits = getTotalUnits();

    if (totalUnits === 0) {
      toast.error("Please add at least one unit to your project structure");
      return;
    }

    if (totalUnits > 5000) {
      setLargeProjectUnits(totalUnits);
      setLargeProjectDialogOpen(true);
      return;
    }

    await saveProject();
  };

  const saveProject = async () => {
    try {
      const projectData = {
        ...formData,
        buildings: formData.buildings,
      };

      if (editingId) {
        await axios.put(`/projects/${editingId}`, projectData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Project updated successfully!");
      } else {
        await axios.post("/projects", projectData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Project created successfully!");
      }

      setFormData({ name: "", address: "", branches: [], buildings: [] });
      setEditingId(null);
      setLargeProjectDialogOpen(false);
      fetchProjects();
    } catch (err) {
      console.error("Failed to save project", err);
      if (err.response?.status === 413) {
        toast.error(
          "Project structure too large. Please reduce the number of floors, flats, or buildings."
        );
      } else {
        toast.error(err.response?.data?.message || "Failed to save project");
      }
    }
  };

  const handleEdit = (project) => {
    setFormData({
      name: project.name,
      address: project.address,
      branches: project.branches?.map((b) => b._id) || [],
      buildings: project.buildings || [],
    });

    setEditingId(project._id);

    // Scroll directly to the edit form
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleCancel = () => {
    setFormData({ name: "", address: "", branches: [], buildings: [] });
    setEditingId(null);
  };

  const handleDelete = (id) => {
    setDeleteProjectId(id);
  };

  const confirmDelete = async () => {
    if (!deleteProjectId) return;

    try {
      await axios.delete(`/projects/${deleteProjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Project deleted successfully");
      setDeleteProjectId(null);
      fetchProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
      toast.error(err.response?.data?.message || "Failed to delete project");
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchBranches();
    fetchUsers();
  }, []);

  const totalBranches = projects.reduce(
    (acc, proj) => acc + (proj.branches?.length || 0),
    0
  );
  const detailStructure = countProjectStructure(detailsProject);
  const completedProjectTasks = projectTasks.filter(isApprovedSupervisorTask);
  const detailProgress = getTaskProgress(completedProjectTasks);
  const detailTeam = detailsProject ? getProjectTeam(detailsProject) : [];
  const buildingProgress = groupTasksBy(completedProjectTasks, "building.name");
  const supervisorProgress = groupTasksBy(
    completedProjectTasks,
    "supervisor.name"
  );

  return (
    <DashboardLayout title="Projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Project Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage your projects
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Projects"
            value={projects.length}
            icon={FaProjectDiagram}
            color="orange"
          />
          <StatCard
            title="Total Branches"
            value={totalBranches}
            icon={FaBuilding}
            color="blue"
          />
          <StatCard
            title="Available Branches"
            value={branches.length}
            icon={FaMapMarkerAlt}
            color="green"
          />
        </div>

        {/* Form */}
        
        <Card ref={formRef} id="project-form">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {editingId ? "Edit Project" : "Create New Project"}
            </CardTitle>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Cancel"
              >
                <FaTimes size={16} />
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block mb-1.5 font-semibold">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <FaProjectDiagram size={14} />
                  </div>
                  <Input
                    className="pl-2"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="block mb-1.5 font-semibold">
                  Address <span className="text-destructive">*</span>
                </Label>
                {mapsLoaded ? (
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{ componentRestrictions: { country: "in" } }}
                  >
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                        <FaMapMarkerAlt size={14} />
                      </div>
                      <Input
                        className="pl-10"
                        placeholder="Enter project address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                      />
                    </div>
                  </Autocomplete>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                      <FaMapMarkerAlt size={14} />
                    </div>
                    <Input
                      className="pl-10"
                      placeholder="Enter project address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <Label className="block mb-1.5 font-semibold">
                  Assign Branches
                </Label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {formData.branches.length > 0
                        ? `${formData.branches.length} branch(es) selected`
                        : "Select branches..."}

                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {branches.map((branch) => {
                        const isSelected = formData.branches.includes(
                          branch._id
                        );

                        return (
                          <div
                            key={branch._id}
                            className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                branches: isSelected
                                  ? prev.branches.filter(
                                      (id) => id !== branch._id
                                    )
                                  : [...prev.branches, branch._id],
                              }));
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  branches: checked
                                    ? prev.branches.includes(branch._id)
                                      ? prev.branches
                                      : [...prev.branches, branch._id]
                                    : prev.branches.filter(
                                        (id) => id !== branch._id
                                      ),
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />

                            <span className="text-sm">{branch.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                <p className="text-xs text-muted-foreground mt-1.5">
                  {formData.branches.length > 0
                    ? `${formData.branches.length} branch(es) selected`
                    : "Select one or more branches."}
                </p>
              </div>
            </div>

            {/* Smart Tower Builder */}
            <div className="mt-6">
              <SmartTowerBuilder
                buildings={formData.buildings}
                onChange={(buildings) =>
                  setFormData({ ...formData, buildings })
                }
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
              >
                {editingId ? (
                  <>
                    <FaCheck size={14} className="mr-1" />
                    Update Project
                  </>
                ) : (
                  <>
                    <FaPlus size={14} className="mr-1" />
                    Create Project
                  </>
                )}
              </Button>

              {editingId && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader className="border-b border-gray-100 dark:border-gray-700">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Projects List
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your existing projects
            </p>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                    Project Name
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                    Address
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                    Branches
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : projects.length === 0 ? (
                  <EmptyTableRow
                    colSpan={4}
                    message="No projects found. Create your first project above."
                  />
                ) : (
                  projects.map((proj) => (
                    <TableRow
                      key={proj._id}
                      className="dark:border-gray-700 dark:hover:bg-gray-700/60"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {proj.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {proj.address}
                      </TableCell>
                      <TableCell>
                        {proj.branches?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {proj.branches.map((b, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 gap-1 text-xs font-medium"
                              >
                                <FaMapMarkerAlt size={10} />
                                {b.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-600 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800 gap-1 font-medium"
                            onClick={() => handleViewDetails(proj)}
                            title="View project details"
                          >
                            <FaEye size={14} />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 font-medium"
                            onClick={() => handleEdit(proj)}
                            title="Edit"
                          >
                            <FaEdit size={14} />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1 font-medium"
                            onClick={() => handleDelete(proj._id)}
                            title="Delete"
                          >
                            <FaTrash size={14} />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {detailsProject && (
          <Dialog
            open={Boolean(detailsProject)}
            onOpenChange={(open) => {
              if (!open) closeDetails();
            }}
          >
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
              <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 text-left">
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {detailsProject.name}
                </DialogTitle>
                <DialogDescription>
                  {detailsProject.address || "No address added"}
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
                {detailsLoading ? (
                  <div
                    className="space-y-6 py-2"
                    aria-label="Loading project details"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={`detail-skeleton-${index}`}>
                          <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-16" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-48 w-full" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Completed Tasks
                              </p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                {detailProgress.total}
                              </p>
                            </div>
                            <FaTasks
                              className="text-blue-600 dark:text-blue-400"
                              size={22}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Work Done
                              </p>
                              <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
                                {detailProgress.percent}%
                              </p>
                            </div>
                            <FaChartLine
                              className="text-green-600 dark:text-green-400"
                              size={22}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Assigned Team
                              </p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                {detailTeam.length}
                              </p>
                            </div>
                            <FaUsers
                              className="text-purple-600 dark:text-purple-400"
                              size={22}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Rooms Planned
                              </p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                {detailStructure.rooms}
                              </p>
                            </div>
                            <FaLayerGroup
                              className="text-orange-600 dark:text-orange-400"
                              size={22}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <Progress
                        value={detailProgress.percent}
                        className="h-3 [&>div]:bg-green-600"
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(detailProgress.counts).map(
                          ([status, count]) => (
                            <Badge
                              key={status}
                              variant="secondary"
                              className="capitalize"
                            >
                              {status.replace("-", " ")}: {count}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Project Info
                          </h3>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                              Branches
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {detailsProject.branches?.length > 0 ? (
                                detailsProject.branches.map((branch) => (
                                  <Badge
                                    key={branch._id}
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 gap-1 text-xs font-medium"
                                  >
                                    <FaMapMarkerAlt size={10} />
                                    {branch.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  No branches assigned
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <p className="text-xs text-muted-foreground">
                                Buildings
                              </p>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {detailStructure.buildings}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <p className="text-xs text-muted-foreground">
                                Floors
                              </p>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {detailStructure.floors}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <p className="text-xs text-muted-foreground">
                                Flats
                              </p>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {detailStructure.flats}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <p className="text-xs text-muted-foreground">
                                Rooms
                              </p>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {detailStructure.rooms}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Assigned Supervisors
                          </h3>
                        </div>
                        <div className="p-4">
                          {detailTeam.length > 0 ? (
                            <div className="space-y-2">
                              {detailTeam.map((member) => (
                                <div
                                  key={member._id}
                                  className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {member.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      @{member.username || "user"}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="capitalize"
                                  >
                                    {member.role}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No supervisors assigned to this project
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                          <FaBuilding className="text-gray-500" />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Work By Building
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="dark:border-gray-700">
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                                  Building
                                </TableHead>
                                <TableHead className="font-semibold text-center text-gray-700 dark:text-gray-300">
                                  Total
                                </TableHead>
                                <TableHead className="font-semibold text-center text-gray-700 dark:text-gray-300">
                                  Done
                                </TableHead>
                                <TableHead className="font-semibold text-center text-gray-700 dark:text-gray-300">
                                  Pending
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {buildingProgress.length > 0 ? (
                                buildingProgress.map((row) => (
                                  <TableRow
                                    key={row.name}
                                    className="dark:border-gray-700"
                                  >
                                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                      {row.name}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {row.total}
                                    </TableCell>
                                    <TableCell className="text-center text-green-700 dark:text-green-400 font-medium">
                                      {row.done}
                                    </TableCell>
                                    <TableCell className="text-center text-orange-600 dark:text-orange-400 font-medium">
                                      {row.pending}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <EmptyTableRow
                                  colSpan={4}
                                  message="No approved tasks yet"
                                />
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                          <FaUsers className="text-gray-500" />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Work By Supervisor
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="dark:border-gray-700">
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                                  Supervisor
                                </TableHead>
                                <TableHead className="font-semibold text-center text-gray-700 dark:text-gray-300">
                                  Total
                                </TableHead>
                                <TableHead className="font-semibold text-center text-gray-700 dark:text-gray-300">
                                  Done
                                </TableHead>
                                <TableHead className="font-semibold text-center text-gray-700 dark:text-gray-300">
                                  Open
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {supervisorProgress.length > 0 ? (
                                supervisorProgress.map((row) => (
                                  <TableRow
                                    key={row.name}
                                    className="dark:border-gray-700"
                                  >
                                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                      {row.name}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {row.total}
                                    </TableCell>
                                    <TableCell className="text-center text-green-700 dark:text-green-400 font-medium">
                                      {row.done}
                                    </TableCell>
                                    <TableCell className="text-center text-orange-600 dark:text-orange-400 font-medium">
                                      {row.pending + row.inProgress}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <EmptyTableRow
                                  colSpan={4}
                                  message="No approved tasks yet"
                                />
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <FaClock className="text-gray-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          Recent Tasks
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="dark:border-gray-700">
                              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                                Location
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                                Activity
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                                Supervisor
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                                Status
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {completedProjectTasks.slice(0, 8).map((task) => {
                              const status = getEffectiveTaskStatus(task);
                              const isDone = [
                                "completed",
                                "verified",
                                "approved",
                              ].includes(status);

                              return (
                                <TableRow
                                  key={task._id}
                                  className="dark:border-gray-700"
                                >
                                  <TableCell className="text-gray-900 dark:text-gray-100">
                                    {[
                                      task.building?.name,
                                      task.floor?.name,
                                      task.flat?.name,
                                      task.room?.name,
                                    ]
                                      .filter(Boolean)
                                      .join(" / ")}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {task.level3Activity?.name || "-"}
                                  </TableCell>
                                  <TableCell className="text-gray-900 dark:text-gray-100">
                                    {task.supervisor?.name || "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={`gap-1 capitalize font-semibold ${
                                        isDone
                                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
                                          : status === "rejected"
                                          ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                                          : "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                                      }`}
                                    >
                                      {isDone ? (
                                        <FaCheckCircle size={10} />
                                      ) : (
                                        <FaClock size={10} />
                                      )}
                                      {status.replace("-", " ")}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {completedProjectTasks.length === 0 && (
                              <EmptyTableRow
                                colSpan={4}
                                message="No approved tasks yet"
                              />
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <AlertDialog
          open={largeProjectDialogOpen}
          onOpenChange={setLargeProjectDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm large project</AlertDialogTitle>
              <AlertDialogDescription>
                This project contains {largeProjectUnits.toLocaleString()}{" "}
                units. This is a large structure and may take longer to process.
                Do you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  setLargeProjectDialogOpen(false);
                  saveProject();
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(deleteProjectId)}
          onOpenChange={(open) => {
            if (!open) setDeleteProjectId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this project? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
                  confirmDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default CreateProject;
