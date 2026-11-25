import React, { useState, useEffect } from "react";
import { ArrowLeft, CircleCheck, History, Image, LoaderCircle, Plus } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import { getSelectedBranchName } from '@/lib/branchContext';
import { getUser } from '@/lib/session';
import { fetchProjectsCached } from '@/hooks/useProjects';
import { useNavigate, useParams } from "react-router-dom";
import axios from "@/api/client";
import { submitOffline } from "@/pwa/offlineSubmit";
import Logo from "@/components/common/Logo";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Level 3 Activities
const LEVEL_3_ACTIVITIES = [
  "Slab Conduiting",
  "Box Fixing",
  "Wiring",
  "Switch Plate",
  "Testing And Commissioning",
];

// Area Types for Level 2
const AREA_TYPES = [
  { value: "floor", label: "Floor" },
  { value: "podium", label: "Podium" },
  { value: "common_area", label: "Common Area" },
  { value: "staircase", label: "Staircase" },
];

// Sentinel for the "no activity" option (shadcn SelectItem can't use value="")
const NO_ACTIVITY = "none";

/**
 * Small wrapper around shadcn Select so every dropdown in the form
 * is built the same way.
 * items: [{ value: string, label: string }]
 */
const FieldSelect = ({
  value,
  onValueChange,
  placeholder,
  items,
  className = "",
  triggerClassName = "",
}) => (
  <Select value={value || ""} onValueChange={onValueChange}>
    <SelectTrigger
      className={`w-full h-12 rounded-xl border-line-input text-sm focus:ring-2 focus-visible:ring-ring focus-visible:border-primary ${triggerClassName} ${className}`}
    >
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

const TaskSubmission = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const user = getUser();
  const selectedBranchName = getSelectedBranchName();

  const [availableProjects, setAvailableProjects] = useState([]); // All projects in this branch
  const [selectedProject, setSelectedProject] = useState(null); // Currently selected project
  const [projectId, setProjectId] = useState("");
  const [hierarchy, setHierarchy] = useState({ buildings: [] });
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { taskId, status }
  const [projectName, setProjectName] = useState("");
  const [selectedBuildings, setSelectedBuildings] = useState([]); // Multi-select buildings
  const [taskStats, setTaskStats] = useState({
    total: 0,
    buildings: new Set(),
    floors: new Set(),
    latest: null,
  });

  // Form state
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedAreaType, setSelectedAreaType] = useState("floor"); // Default to floor
  const [selectedPodium, setSelectedPodium] = useState(null);
  const [selectedCommonArea, setSelectedCommonArea] = useState(null);
  const [selectedStaircase, setSelectedStaircase] = useState(null);
  const [selectedLevel3Activity, setSelectedLevel3Activity] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0); // forces the file input to clear on reset
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjectsForBranch();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectHierarchy(selectedProject._id);
    }
  }, [selectedProject]);

  // Single place that refreshes the task list (project or building filter changes)
  useEffect(() => {
    if (projectId) {
      fetchTaskHistory();
    }
  }, [selectedBuildings, projectId]);

  const fetchProjectsForBranch = async () => {
    try {
      setLoading(true);

      if (branchId) {
        const projectsRes = { data: await fetchProjectsCached() };
        // Get ALL projects that belong to this branch
        const branchProjects = projectsRes.data.filter((p) =>
          p.branches.some((b) => b._id === branchId)
        );

        if (branchProjects.length > 0) {
          setAvailableProjects(branchProjects);
          // Auto-select first project
          setSelectedProject(branchProjects[0]);
          setProjectId(branchProjects[0]._id);
          setProjectName(branchProjects[0].name);
        } else {
          toast.error("No projects found for this branch");
        }
      } else {
        toast.error("Branch ID not found");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectHierarchy = async (projectId) => {
    try {
      const hierarchyRes = await axios.get(`/projects/${projectId}/hierarchy`);
      setHierarchy(hierarchyRes.data);
      setSelectedBuildings([]); // Reset building selection when project changes
      // Task history is refreshed by the [selectedBuildings, projectId] effect
    } catch (err) {
      console.error("Error fetching project hierarchy:", err);
      toast.error("Failed to load project structure");
    }
  };

  const handleProjectChange = (project) => {
    setSelectedProject(project);
    setProjectId(project._id);
    setProjectName(project.name);
  };

  const fetchTaskHistory = async () => {
    try {
      setLoadingHistory(true);
      const params = {
        project: projectId,
        branch: branchId,
        page: 1,
        limit: 50,
      };

      const res = await axios.get("/tasks", { params });
      let taskData = res.data.data || [];

      // Filter by selected buildings if any (client side)
      if (selectedBuildings.length > 0) {
        taskData = taskData.filter((task) =>
          selectedBuildings.some(
            (b) => b._id === task.building.id || b.name === task.building.name
          )
        );
      }

      setTasks(taskData);

      // Calculate statistics
      const buildings = new Set();
      const floors = new Set();
      taskData.forEach((task) => {
        buildings.add(task.building.name);
        floors.add(task.floor.name);
      });

      setTaskStats({
        total: taskData.length,
        buildings,
        floors,
        latest: taskData.length > 0 ? taskData[0] : null,
      });
    } catch (err) {
      console.error("Error fetching task history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setSelectedBuilding(null);
    setSelectedAreaType("floor");
    setSelectedPodium(null);
    setSelectedCommonArea(null);
    setSelectedStaircase(null);
    setSelectedLevel3Activity(null);
    setSelectedFloor(null);
    setSelectedFlat(null);
    setSelectedRoom(null);
    setPhoto(null);
    setPhotoPreview("");
    setFileInputKey((k) => k + 1);
    setNotes("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation based on area type
    if (!selectedBuilding || !photo) {
      toast.error("Please select building and upload a photo");
      return;
    }

    if (selectedAreaType === "floor") {
      if (!selectedFloor || !selectedFlat || !selectedRoom) {
        toast.error("Please select Floor, Flat, and Room");
        return;
      }
    } else if (selectedAreaType === "podium") {
      if (!selectedPodium) {
        toast.error("Please select a Podium");
        return;
      }
    } else if (selectedAreaType === "common_area") {
      if (!selectedCommonArea) {
        toast.error("Please select a Common Area");
        return;
      }
    } else if (selectedAreaType === "staircase") {
      if (!selectedStaircase) {
        toast.error("Please select a Staircase");
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("project", projectId);
      formData.append("branch", branchId);
      formData.append(
        "building",
        JSON.stringify({
          id: selectedBuilding._id,
          name: selectedBuilding.name,
        })
      );

      // Add area type
      formData.append("areaType", selectedAreaType);

      // Add specific area based on type
      if (selectedAreaType === "floor") {
        formData.append(
          "wing",
          JSON.stringify({ id: "default", name: "Default" })
        ); // Backend compatibility
        formData.append(
          "floor",
          JSON.stringify({ id: selectedFloor._id, name: selectedFloor.name })
        );
        formData.append(
          "flat",
          JSON.stringify({ id: selectedFlat._id, name: selectedFlat.name })
        );
        formData.append(
          "room",
          JSON.stringify({ id: selectedRoom._id, name: selectedRoom.name })
        );
      } else if (selectedAreaType === "podium") {
        formData.append(
          "podium",
          JSON.stringify({ id: selectedPodium._id, name: selectedPodium.name })
        );
        // Add dummy values for backend compatibility
        formData.append(
          "wing",
          JSON.stringify({ id: "podium", name: "Podium Area" })
        );
        formData.append(
          "floor",
          JSON.stringify({ id: "podium", name: selectedPodium.name })
        );
        formData.append("flat", JSON.stringify({ id: "na", name: "N/A" }));
        formData.append("room", JSON.stringify({ id: "na", name: "N/A" }));
      } else if (selectedAreaType === "common_area") {
        formData.append(
          "commonArea",
          JSON.stringify({
            id: selectedCommonArea._id,
            name: selectedCommonArea.name,
          })
        );
        formData.append(
          "wing",
          JSON.stringify({ id: "common", name: "Common Area" })
        );
        formData.append(
          "floor",
          JSON.stringify({ id: "common", name: selectedCommonArea.name })
        );
        formData.append("flat", JSON.stringify({ id: "na", name: "N/A" }));
        formData.append("room", JSON.stringify({ id: "na", name: "N/A" }));
      } else if (selectedAreaType === "staircase") {
        formData.append(
          "staircase",
          JSON.stringify({
            id: selectedStaircase._id,
            name: selectedStaircase.name,
          })
        );
        formData.append(
          "wing",
          JSON.stringify({ id: "staircase", name: "Staircase Area" })
        );
        formData.append(
          "floor",
          JSON.stringify({ id: "staircase", name: selectedStaircase.name })
        );
        formData.append("flat", JSON.stringify({ id: "na", name: "N/A" }));
        formData.append("room", JSON.stringify({ id: "na", name: "N/A" }));
      }

      // Add Level 3 Activity if selected (optional field)
      if (selectedLevel3Activity) {
        formData.append(
          "level3Activity",
          JSON.stringify({
            id: selectedLevel3Activity,
            name: selectedLevel3Activity,
          })
        );
      }

      formData.append("photo", photo);
      formData.append("notes", notes);

      // Goes out now if there is signal, otherwise the whole submission —
      // photo included — waits in IndexedDB and replays on reconnect.
      const result = await submitOffline({
        module: "task",
        endpoint: "/tasks",
        formData,
        label: `Task – ${selectedBuilding.name}`,
        meta: { projectId, branchId },
      });

      if (result.offline) {
        toast.info("📴 Offline – task saved and will sync when you reconnect.");
      } else {
        toast.success("Task submitted successfully!");
      }

      // Reset form and close modal
      resetForm();
      setShowAddTaskModal(false);

      // Refresh task history (pointless offline – the request would just fail
      // and the queued task is not on the server to list yet).
      if (!result.offline) {
        fetchTaskHistory();
      }
    } catch (err) {
      console.error("Error submitting task:", err);
      toast.error(err.response?.data?.message || "Failed to submit task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId, status) => {
    try {
      setUpdatingStatus(true);
      await axios.patch(`/tasks/${taskId}/status`, { status });

      toast.success(
        `Task ${status === "approved" ? "accepted" : "rejected"} successfully!`
      );

      // Close dialogs and refresh task list
      setConfirmAction(null);
      setShowTaskDetail(false);
      setSelectedTask(null);
      fetchTaskHistory();
    } catch (err) {
      console.error("Error updating task status:", err);
      toast.error(
        err.response?.data?.message || "Failed to update task status"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Helper functions to get areas from building
  const getPodiums = () => selectedBuilding?.podiums || [];
  const getCommonAreas = () => selectedBuilding?.commonAreas || [];
  const getStaircases = () => selectedBuilding?.staircases || [];
  const getFloors = () => selectedBuilding?.wings?.[0]?.floors || []; // Get from default wing
  const getFlats = () => selectedFloor?.flats || [];
  const getRooms = () => selectedFlat?.rooms || [];

  const isSubmitDisabled =
    !selectedBuilding ||
    !photo ||
    submitting ||
    (selectedAreaType === "floor" &&
      (!selectedFloor || !selectedFlat || !selectedRoom)) ||
    (selectedAreaType === "podium" && !selectedPodium) ||
    (selectedAreaType === "common_area" && !selectedCommonArea) ||
    (selectedAreaType === "staircase" && !selectedStaircase);

  const labelClass = "block text-sm font-semibold text-ink-2 mb-2";

  return (
    <div className="min-h-screen bg-tone-highlight-soft">
      <div className="max-w-md mx-auto min-h-screen bg-surface shadow-xl">
        {/* Header */}
        <div className="bg-primary text-primary-foreground hover:bg-primary-strong px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Logo width={179} height={64} priority plate={false} className="h-16 w-50 bg-logo-plate box-shadow rounded-2xl" />
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mobile-back-button px-4 py-2"
            >
              <ArrowLeft size={14} />
              <span className="text-sm font-medium">Back</span>
            </Button>
          </div>

          <div className="mt-6">
            <h2 className="text-white text-2xl font-bold">Task Submission</h2>
            <p className="text-white/80 text-sm mt-1">
              {selectedBranchName || "Submit work progress"}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Project Selection & Info */}
          {projectName && (
            <div className="mb-4 space-y-3">
              {/* Project Selector Dropdown */}
              {availableProjects.length > 1 && (
                <div className="p-4 bg-primary text-primary-foreground hover:bg-primary-strong rounded-xl shadow-lg">
                  <Label className="text-white text-xs font-semibold mb-2 block">
                    🏗️ SELECT PROJECT
                  </Label>
                  <Select
                    value={selectedProject?._id || ""}
                    onValueChange={(val) => {
                      const project = availableProjects.find(
                        (p) => p._id === val
                      );
                      if (project) handleProjectChange(project);
                    }}
                  >
                    <SelectTrigger className="w-full h-12 rounded-lg border-2 border-white/30 bg-surface/80 backdrop-blur-sm text-white font-semibold focus:ring-0 focus:border-white/50 focus:bg-white/20 [&_svg]:text-white [&_svg]:opacity-80">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((project) => (
                        <SelectItem key={project._id} value={project._id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-white/70 text-xs mt-2">
                    {availableProjects.length} projects available in{" "}
                    {selectedBranchName}
                  </p>
                </div>
              )}

              {/* Current Project Info Badge */}
              <div className="p-3 bg-primary text-primary-foreground hover:bg-primary-strong rounded-xl shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">
                      📍 {projectName}
                    </p>
                    <p className="text-white/80 text-xs mt-0.5">
                      {selectedBranchName}
                    </p>
                  </div>
                  {availableProjects.length === 1 && (
                    <Badge className="bg-surface/80 text-white text-xs rounded-full hover:bg-white/20">
                      1 Project
                    </Badge>
                  )}
                </div>
              </div>

              {/* Multi-select Buildings Filter */}
              {!loading && hierarchy.buildings.length > 0 && (
                <Card className="gap-0 py-0 rounded-xl border-2 border-line-card shadow-sm">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold text-ink-2 mb-2 block">
                      🏢 Select Buildings to View:
                    </Label>
                    <ScrollArea
                      className={
                        hierarchy.buildings.length > 4 ? "h-40" : undefined
                      }
                    >
                      <div className="space-y-2">
                        <Label
                          htmlFor="building-all"
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-muted cursor-pointer"
                        >
                          <Checkbox
                            id="building-all"
                            checked={
                              selectedBuildings.length ===
                              hierarchy.buildings.length
                            }
                            onCheckedChange={(checked) => {
                              setSelectedBuildings(
                                checked === true ? hierarchy.buildings : []
                              );
                            }}
                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white"
                          />
                          <span className="text-sm font-semibold text-ink-2">
                            All Buildings
                          </span>
                        </Label>
                        {hierarchy.buildings.map((building) => {
                          const id = `building-${
                            building._id || building.name
                          }`;
                          return (
                            <Label
                              key={building._id || building.name}
                              htmlFor={id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-tone-info-soft cursor-pointer"
                            >
                              <Checkbox
                                id={id}
                                checked={selectedBuildings.some(
                                  (b) => b.name === building.name
                                )}
                                onCheckedChange={(checked) => {
                                  setSelectedBuildings((prev) =>
                                    checked === true
                                      ? [...prev, building]
                                      : prev.filter(
                                          (b) => b.name !== building.name
                                        )
                                  );
                                }}
                                className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white"
                              />
                              <span className="text-sm font-normal text-ink-2">
                                {building.name}
                              </span>
                            </Label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {selectedBuildings.length > 0 && (
                      <>
                        <Separator className="mt-2" />
                        <p className="text-xs text-ink-3 pt-2">
                          Selected:{" "}
                          {selectedBuildings.map((b) => b.name).join(", ")}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Task Summary Statistics */}
          {!loading && tasks.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="bg-tone-highlight-soft p-4 rounded-xl border border-line-card">
                <p className="text-2xl font-bold text-tone-highlight-fg">
                  {taskStats.total}
                </p>
                <p className="text-xs text-ink-3 mt-1">Total Tasks</p>
              </div>
              <div className="bg-tone-info-soft p-4 rounded-xl border border-line-card">
                <p className="text-2xl font-bold text-tone-info-fg">
                  {taskStats.buildings.size}
                </p>
                <p className="text-xs text-ink-3 mt-1">Buildings</p>
              </div>
              <div className="bg-tone-ok-soft p-4 rounded-xl border border-tone-ok-border">
                <p className="text-2xl font-bold text-tone-ok-fg">
                  {taskStats.floors.size}
                </p>
                <p className="text-xs text-ink-3 mt-1">Floors Covered</p>
              </div>
              <div className="bg-tone-purple-soft p-4 rounded-xl border border-line-card">
                <p className="text-xs font-bold text-tone-purple-fg">
                  {taskStats.latest
                    ? new Date(taskStats.latest.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )
                    : "-"}
                </p>
                <p className="text-xs text-ink-3 mt-1">Latest Update</p>
              </div>
            </div>
          )}

          {loading ? (
            <div
              className="space-y-4 py-6"
              aria-label="Loading project structure"
            >
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Add Task Button */}
              <div className="mb-6">
                <Button
                  type="button"
                  onClick={() => {
                    if (hierarchy.buildings.length === 0) {
                      toast.error(
                        "Please contact admin to set up project hierarchy first"
                      );
                      return;
                    }
                    setShowAddTaskModal(true);
                  }}
                  className="w-full h-auto flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary-strong text-white text-base px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                >
                  <Plus size={20} />
                  <span>Add New Task</span>
                </Button>
              </div>

              {/* Task History Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-ink-1">
                    Recent Tasks
                  </h3>
                  <Button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="h-auto px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-strong text-white text-sm font-medium rounded-lg   transition-all shadow-sm"
                  >
                    {showHistory ? "Show Less" : "Show All"}
                  </Button>
                </div>

                {loadingHistory ? (
                  <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 bg-surface-subtle rounded-xl">
                    <History className="text-ink-4 text-4xl mx-auto mb-3" />
                    <p className="text-ink-3 text-sm">
                      No tasks submitted yet
                    </p>
                    <p className="text-ink-4 text-xs mt-1">
                      Click "Add New Task" to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(showHistory ? tasks : tasks.slice(0, 3)).map((task) => (
                      <Card
                        key={task._id}
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDetail(true);
                        }}
                        className="gap-0 py-0 rounded-xl border-line-card shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary"
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <img loading="lazy" decoding="async"
                              src={task.photoUrl}
                              alt="Task"
                              className="w-20 h-20 rounded-lg object-cover border-2 border-line-card"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="secondary"
                                  className="bg-tone-info-soft text-tone-info-fg text-xs font-semibold rounded hover:bg-tone-info-soft"
                                >
                                  {task.building.name}
                                </Badge>
                                <span className="text-ink-4">→</span>
                                <Badge
                                  variant="secondary"
                                  className="bg-tone-purple-soft text-tone-purple-fg text-xs font-semibold rounded hover:bg-tone-purple-soft"
                                >
                                  {task.wing.name}
                                </Badge>
                              </div>
                              <div className="text-xs text-ink-3 mt-1.5 flex items-center gap-1">
                                <span className="font-medium">📍</span>
                                <span>{task.floor.name}</span>
                                <span className="text-ink-4">•</span>
                                <span>{task.flat.name}</span>
                                <span className="text-ink-4">•</span>
                                <span className="text-tone-highlight-fg font-medium">
                                  {task.room.name}
                                </span>
                              </div>
                              <div className="text-xs text-ink-4 mt-2 flex items-center gap-1">
                                <span>🕐</span>
                                <span>
                                  {new Date(task.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          {task.notes && (
                            <>
                              <Separator className="mt-3" />
                              <p className="text-xs text-ink-3 line-clamp-2 pt-3">
                                {task.notes}
                              </p>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add Task Dialog */}
        <Dialog
          open={showAddTaskModal}
          onOpenChange={(open) => {
            setShowAddTaskModal(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col rounded-2xl [&>button]:text-white [&>button]:opacity-100 [&>button]:top-4 [&>button]:right-4 [&>button:hover]:bg-white/20">
            <DialogHeader className="shrink-0 bg-primary text-primary-foreground hover:bg-primary-strong px-6 py-4 text-left space-y-0">
              <DialogTitle className="text-white text-xl font-bold">
                Add New Task
              </DialogTitle>
              <DialogDescription className="sr-only">
                Select the work location, upload a photo and submit the task.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Building Selection */}
                <div>
                  <Label className={labelClass}>
                    Level 1 - Tower / Building
                  </Label>
                  <FieldSelect
                    value={selectedBuilding?._id}
                    placeholder="Select Tower/Building"
                    items={hierarchy.buildings.map((b) => ({
                      value: b._id,
                      label: b.name,
                    }))}
                    onValueChange={(val) => {
                      const building = hierarchy.buildings.find(
                        (b) => b._id === val
                      );
                      setSelectedBuilding(building || null);
                      setSelectedAreaType("floor");
                      setSelectedPodium(null);
                      setSelectedCommonArea(null);
                      setSelectedStaircase(null);
                      setSelectedFloor(null);
                      setSelectedFlat(null);
                      setSelectedRoom(null);
                    }}
                  />
                </div>

                {/* Area Type Selection */}
                {selectedBuilding && (
                  <div>
                    <Label className={labelClass}>Level 2 - Area Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AREA_TYPES.map((areaType) => {
                        const isDisabled =
                          (areaType.value === "podium" &&
                            getPodiums().length === 0) ||
                          (areaType.value === "common_area" &&
                            getCommonAreas().length === 0) ||
                          (areaType.value === "staircase" &&
                            getStaircases().length === 0);
                        const isActive = selectedAreaType === areaType.value;

                        return (
                          <Button
                            key={areaType.value}
                            type="button"
                            variant="outline"
                            disabled={isDisabled}
                            aria-pressed={isActive}
                            onClick={() => {
                              setSelectedAreaType(areaType.value);
                              setSelectedPodium(null);
                              setSelectedCommonArea(null);
                              setSelectedStaircase(null);
                              setSelectedFloor(null);
                              setSelectedFlat(null);
                              setSelectedRoom(null);
                            }}
                            className={`h-auto px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                              isActive
                                ? "border-line-card bg-tone-highlight-soft text-tone-highlight-fg hover:bg-tone-highlight-soft hover:text-primary-strong"
                                : isDisabled
                                ? "border-line-card bg-surface-muted text-ink-4 cursor-not-allowed"
                                : "border-line-input text-ink-2 hover:border-primary hover:bg-white"
                            }`}
                          >
                            {areaType.label}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-ink-3 mt-2">
                      Select the area where work was performed
                    </p>
                  </div>
                )}

                {/* Podium Selection */}
                {selectedBuilding && selectedAreaType === "podium" && (
                  <div>
                    <Label className={labelClass}>Select Podium</Label>
                    <FieldSelect
                      value={selectedPodium?._id}
                      placeholder="Select Podium"
                      triggerClassName="bg-tone-warn-soft"
                      items={getPodiums().map((p) => ({
                        value: p._id,
                        label: `${p.name}${
                          p.description ? ` - ${p.description}` : ""
                        }`,
                      }))}
                      onValueChange={(val) =>
                        setSelectedPodium(
                          getPodiums().find((p) => p._id === val) || null
                        )
                      }
                    />
                  </div>
                )}

                {/* Common Area Selection */}
                {selectedBuilding && selectedAreaType === "common_area" && (
                  <div>
                    <Label className={labelClass}>Select Common Area</Label>
                    <FieldSelect
                      value={selectedCommonArea?._id}
                      placeholder="Select Common Area"
                      triggerClassName="bg-tone-info-soft"
                      items={getCommonAreas().map((a) => ({
                        value: a._id,
                        label: `${a.name}${
                          a.description ? ` - ${a.description}` : ""
                        }`,
                      }))}
                      onValueChange={(val) =>
                        setSelectedCommonArea(
                          getCommonAreas().find((c) => c._id === val) || null
                        )
                      }
                    />
                  </div>
                )}

                {/* Staircase Selection */}
                {selectedBuilding && selectedAreaType === "staircase" && (
                  <div>
                    <Label className={labelClass}>Select Staircase</Label>
                    <FieldSelect
                      value={selectedStaircase?._id}
                      placeholder="Select Staircase"
                      triggerClassName="bg-tone-purple-soft"
                      items={getStaircases().map((s) => ({
                        value: s._id,
                        label: `${s.name}${s.type ? ` - ${s.type}` : ""}`,
                      }))}
                      onValueChange={(val) =>
                        setSelectedStaircase(
                          getStaircases().find((s) => s._id === val) || null
                        )
                      }
                    />
                  </div>
                )}

                {/* Level 3 Activities (Optional) */}
                {selectedBuilding && (
                  <div>
                    <Label className={labelClass}>
                      Level 3 - Activity{" "}
                      <span className="text-ink-4 text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <FieldSelect
                      value={selectedLevel3Activity || NO_ACTIVITY}
                      placeholder="Skip / No Activity"
                      triggerClassName="bg-tone-info-soft"
                      items={[
                        { value: NO_ACTIVITY, label: "Skip / No Activity" },
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
                    <p className="text-xs text-ink-3 mt-1">
                      Select if task is related to: Slab Conduiting, Box Fixing,
                      Wiring, Switch Plate, or Testing
                    </p>
                  </div>
                )}

                {/* Floor Selection - Only for Floor Area Type */}
                {selectedBuilding && selectedAreaType === "floor" && (
                  <div>
                    <Label className={labelClass}>Level 4 - Floor</Label>
                    <FieldSelect
                      value={selectedFloor?._id}
                      placeholder="Select Floor"
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
                )}

                {/* Flat Selection - Only for Floor Area Type */}
                {selectedFloor && selectedAreaType === "floor" && (
                  <div>
                    <Label className={labelClass}>Level 5 - Flat / Unit</Label>
                    <FieldSelect
                      value={selectedFlat?._id}
                      placeholder="Select Flat"
                      items={getFlats().map((f) => ({
                        value: f._id,
                        label: `${f.name}${
                          f.flatType ? ` (${f.flatType})` : ""
                        }`,
                      }))}
                      onValueChange={(val) => {
                        setSelectedFlat(
                          getFlats().find((f) => f._id === val) || null
                        );
                        setSelectedRoom(null);
                      }}
                    />
                  </div>
                )}

                {/* Room Selection - Only for Floor Area Type */}
                {selectedFlat && selectedAreaType === "floor" && (
                  <div>
                    <Label className={labelClass}>Level 6 - Room</Label>
                    <FieldSelect
                      value={selectedRoom?._id}
                      placeholder="Select Room"
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
                    <p className="text-xs text-ink-3 mt-1">
                      Auto-generated based on flat configuration
                    </p>
                  </div>
                )}

                {/* Photo Upload */}
                <div>
                  <Label className={labelClass}>
                    Upload Photo <span className="text-tone-bad-fg">*</span>
                  </Label>
                  <Input
                    key={fileInputKey}
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="photo-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-line-input rounded-xl cursor-pointer hover:border-primary transition-colors"
                  >
                    <Image className="text-ink-4" />
                    <span className="text-sm font-normal text-ink-3 truncate">
                      {photo ? photo.name : "Choose photo"}
                    </span>
                  </Label>
                  {photoPreview && (
                    <div className="mt-3">
                      <img loading="lazy" decoding="async"
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl"
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="task-notes" className={labelClass}>
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="task-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes..."
                    className="w-full px-4 py-3 border border-line-input rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary outline-none resize-none"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full h-auto bg-primary text-primary-foreground hover:bg-primary-strong text-white text-base py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="animate-spin" size={18} />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CircleCheck size={18} />
                      <span>Submit Task</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Detail Dialog */}
        {selectedTask && (
          <Dialog
            open={showTaskDetail}
            onOpenChange={(open) => {
              if (!open) {
                setShowTaskDetail(false);
                setSelectedTask(null);
              }
            }}
          >
            <DialogContent className="w-[calc(100%-2rem)] max-w-2xl sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col rounded-2xl [&>button]:text-white [&>button]:opacity-100 [&>button]:top-4 [&>button]:right-4 [&>button:hover]:bg-white/20">
              <DialogHeader className="shrink-0 bg-primary text-primary-foreground hover:bg-primary-strong px-6 py-4 text-left space-y-0">
                <DialogTitle className="text-white text-xl font-bold">
                  Task Details
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Photo, location and submission details for this task.
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-y-auto p-6">
                {/* Photo */}
                <div className="mb-6">
                  <img loading="lazy" decoding="async"
                    src={selectedTask.photoUrl}
                    alt="Task Photo"
                    className="w-full h-64 object-cover rounded-xl shadow-lg"
                  />
                </div>

                {/* Project Info */}
                <Card className="gap-0 py-0 mb-6 border-0 shadow-none rounded-xl bg-tone-highlight-soft">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-bold text-ink-2 mb-2">
                      Project Information
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm text-ink-1">
                        <span className="font-semibold">Project:</span>{" "}
                        {selectedTask.project?.name || "N/A"}
                      </p>
                      {selectedTask.project?.address && (
                        <p className="text-xs text-ink-3">
                          <span className="font-semibold">Address:</span>{" "}
                          {selectedTask.project.address}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Hierarchy Details */}
                <Card className="gap-0 py-0 mb-6 border-0 shadow-none rounded-xl bg-tone-info-soft">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-bold text-ink-2 mb-3">
                      Location Hierarchy
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <p className="text-sm text-ink-1">
                          <span className="font-semibold">Building:</span>{" "}
                          {selectedTask.building.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <p className="text-sm text-ink-1">
                          <span className="font-semibold">Wing:</span>{" "}
                          {selectedTask.wing.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-8">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <p className="text-sm text-ink-1">
                          <span className="font-semibold">Floor:</span>{" "}
                          {selectedTask.floor.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-12">
                        <div className="w-2 h-2 rounded-full bg-tone-info-soft"></div>
                        <p className="text-sm text-ink-1">
                          <span className="font-semibold">Flat:</span>{" "}
                          {selectedTask.flat.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-16">
                        <div className="w-2 h-2 rounded-full bg-tone-info-soft"></div>
                        <p className="text-sm text-ink-1">
                          <span className="font-semibold">Room:</span>{" "}
                          {selectedTask.room.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Supervisor & Timestamp */}
                <Card className="gap-0 py-0 mb-6 border-0 shadow-none rounded-xl bg-tone-ok-soft">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-bold text-ink-2 mb-2">
                      Submission Details
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm text-ink-1">
                        <span className="font-semibold">Supervisor:</span>{" "}
                        {selectedTask.supervisor?.name || "N/A"}
                      </p>
                      <p className="text-sm text-ink-1">
                        <span className="font-semibold">Status:</span>
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-tone-ok-soft text-tone-ok-fg rounded-full text-xs font-medium hover:bg-tone-ok-soft"
                        >
                          {selectedTask.status}
                        </Badge>
                      </p>
                      <p className="text-sm text-ink-1">
                        <span className="font-semibold">Submitted:</span>{" "}
                        {new Date(selectedTask.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedTask.notes && (
                  <Card className="gap-0 py-0 border-0 shadow-none rounded-xl bg-surface-subtle">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-bold text-ink-2 mb-2">
                        Notes
                      </h4>
                      <p className="text-sm text-ink-3 whitespace-pre-wrap">
                        {selectedTask.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons - Only show if task is pending */}
                {selectedTask.status === "pending" &&
                  user?.role === ROLES.admin && (
                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={() =>
                          setConfirmAction({
                            taskId: selectedTask._id,
                            status: "approved",
                          })
                        }
                        disabled={updatingStatus}
                        className="flex-1 py-3 h-auto bg-primary text-primary-foreground hover:bg-primary-strong text-white rounded-xl font-semibold   shadow-md"
                      >
                        ✓ Accept Task
                      </Button>
                      <Button
                        onClick={() =>
                          setConfirmAction({
                            taskId: selectedTask._id,
                            status: "rejected",
                          })
                        }
                        disabled={updatingStatus}
                        className="flex-1 py-3 h-auto bg-primary text-primary-foreground hover:bg-primary-strong text-white rounded-xl font-semibold   shadow-md"
                      >
                        ✗ Reject Task
                      </Button>
                    </div>
                  )}

                {/* Status Badge for completed/rejected tasks */}
                {selectedTask.status !== "pending" && (
                  <div className="mt-6 p-4 bg-surface-muted rounded-xl text-center">
                    <p className="text-sm text-ink-3">
                      This task has been{" "}
                      <span
                        className={`font-bold ${
                          selectedTask.status === "approved"
                            ? "text-tone-ok-fg"
                            : "text-tone-bad-fg"
                        }`}
                      >
                        {selectedTask.status}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Accept / Reject confirmation */}
        <AlertDialog
          open={!!confirmAction}
          onOpenChange={(open) => {
            if (!open && !updatingStatus) setConfirmAction(null);
          }}
        >
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.status === "approved"
                  ? "Accept this task?"
                  : "Reject this task?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.status === "approved"
                  ? "The task will be marked as approved."
                  : "The task will be marked as rejected."}{" "}
                This can't be undone from this screen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updatingStatus}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={updatingStatus}
                onClick={(e) => {
                  // keep the dialog open until the request finishes
                  e.preventDefault();
                  handleTaskStatusUpdate(
                    confirmAction.taskId,
                    confirmAction.status
                  );
                }}
                className={
                  confirmAction?.status === "approved"
                    ? "bg-tone-ok-fg hover:bg-primary-strong text-white"
                    : "bg-tone-bad-solid hover:bg-primary-strong text-white"
                }
              >
                {updatingStatus
                  ? "Processing..."
                  : confirmAction?.status === "approved"
                  ? "Accept"
                  : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TaskSubmission;
