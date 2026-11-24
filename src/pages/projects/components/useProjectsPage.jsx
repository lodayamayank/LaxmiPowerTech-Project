// src/pages/projects/components/useProjectsPage.jsx
// Data, validation and save/delete handlers of the Projects page (moved unchanged from CreateProject.jsx).
// UI-only additions: sheetOpen/openCreate (side panel), search/branchFilter (list filters), branchesInUse.
import { useMemo, useRef, useState } from "react";
import { isFieldRole } from "@/lib/roles";
import { getToken } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import { useUsers } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { useProjects, PROJECTS_KEY } from "@/hooks/useProjects";
import axios from "@/api/client";
import { useJsApiLoader } from "@react-google-maps/api";
import { toast } from "sonner";

const GOOGLE_LIBS = ["places"];

export default function useProjectsPage() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    branches: [],
    buildings: [],
  });
  const { data: projects, isLoading: loading } = useProjects({ lite: true });
  const { data: branchesRaw } = useBranches();
  const branches = useMemo(
    () =>
      branchesRaw
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
    [branchesRaw]
  );
  const { data: users } = useUsers();
  const [editingId, setEditingId] = useState(null);
  const [detailsProject, setDetailsProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [largeProjectDialogOpen, setLargeProjectDialogOpen] = useState(false);
  const [largeProjectUnits, setLargeProjectUnits] = useState(0);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  // UI only: side panel + list filters
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const token = getToken();

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

  const getId = (value) => {
    if (!value) return "";
    return typeof value === "object" ? value._id : value;
  };

  const getProjectTeam = (project) => {
    const projectBranchIds = new Set(
      (project?.branches || []).map(getId).filter(Boolean)
    );

    return users.filter((user) => {
      if (!isFieldRole(user.role)) return false;
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
      const headers = { Authorization: `Bearer ${token}` };
      const [projRes, taskRes] = await Promise.all([
        axios.get(`/projects/${project._id}`, { headers }),
        axios.get("/tasks", {
          params: { project: project._id, limit: 1000 },
          headers,
        }),
      ]);
      setDetailsProject(projRes.data);
      setProjectTasks(taskRes.data?.data || []);
    } catch {
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
      setSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
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

  const handleEdit = async (project) => {
    try {
      const { data: full } = await axios.get(`/projects/${project._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFormData({
        name: full.name,
        address: full.address,
        branches: full.branches?.map((b) => b._id) || [],
        buildings: full.buildings || [],
      });
      setEditingId(full._id);
      setSheetOpen(true);
    } catch {
      toast.error("Failed to load project for editing");
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", address: "", branches: [], buildings: [] });
    setEditingId(null);
    setSheetOpen(false);
  };

  // UI only: open the side panel for a new project
  const openCreate = () => {
    setFormData({ name: "", address: "", branches: [], buildings: [] });
    setEditingId(null);
    setSheetOpen(true);
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
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    } catch (err) {
      console.error("Failed to delete project", err);
      toast.error(err.response?.data?.message || "Failed to delete project");
    }
  };


  const branchesInUse = new Set(projects.flatMap((proj) => (proj.branches || []).map(getId).filter(Boolean))).size;
  const detailStructure = countProjectStructure(detailsProject);
  const completedProjectTasks = projectTasks.filter(isApprovedSupervisorTask);
  const detailProgress = getTaskProgress(completedProjectTasks);
  const detailTeam = detailsProject ? getProjectTeam(detailsProject) : [];
  const buildingProgress = groupTasksBy(completedProjectTasks, "building.name");
  const supervisorProgress = groupTasksBy(
    completedProjectTasks,
    "supervisor.name"
  );
  return {
    formData, setFormData, projects, loading, branches, users, editingId, detailsProject, projectTasks, detailsLoading,
    largeProjectDialogOpen, setLargeProjectDialogOpen, largeProjectUnits, deleteProjectId, setDeleteProjectId,
    sheetOpen, setSheetOpen, search, setSearch, branchFilter, setBranchFilter, openCreate,
    mapsLoaded, onAutocompleteLoad, onPlaceChanged, getId, getEffectiveTaskStatus,
    handleViewDetails, closeDetails, handleSubmit, saveProject, handleEdit, handleCancel, handleDelete, confirmDelete,
    branchesInUse, detailStructure, completedProjectTasks, detailProgress, detailTeam, buildingProgress, supervisorProgress,
  };
}
