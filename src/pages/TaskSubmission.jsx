import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../utils/axios";
import { submitOffline } from "../utils/offlineSubmit";
import logo from "../assets/logo.png";
import {
  FaArrowLeft,
  FaPlus,
  FaCheckCircle,
  FaHistory,
  FaImage,
  FaSpinner,
} from "react-icons/fa";
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
      className={`w-full h-12 rounded-xl border-gray-300 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${triggerClassName} ${className}`}
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
  const user = JSON.parse(localStorage.getItem("user"));
  const selectedBranchName = localStorage.getItem("selectedBranchName");

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
        const projectsRes = await axios.get("/projects");
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

  const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <img
              src={logo}
              alt="Logo"
              className="h-16 w-50 bg-white box-shadow rounded-2xl"
            />
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mobile-back-button px-4 py-2"
            >
              <FaArrowLeft size={14} />
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
                <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
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
                    <SelectTrigger className="w-full h-12 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white font-semibold focus:ring-0 focus:border-white/50 focus:bg-white/20 [&_svg]:text-white [&_svg]:opacity-80">
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
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-md">
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
                    <Badge className="bg-white/20 text-white text-xs rounded-full hover:bg-white/20">
                      1 Project
                    </Badge>
                  )}
                </div>
              </div>

              {/* Multi-select Buildings Filter */}
              {!loading && hierarchy.buildings.length > 0 && (
                <Card className="gap-0 py-0 rounded-xl border-2 border-indigo-200 shadow-sm">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
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
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
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
                          <span className="text-sm font-semibold text-gray-700">
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
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-indigo-50 cursor-pointer"
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
                              <span className="text-sm font-normal text-gray-700">
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
                        <p className="text-xs text-gray-500 pt-2">
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
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">
                  {taskStats.total}
                </p>
                <p className="text-xs text-gray-600 mt-1">Total Tasks</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">
                  {taskStats.buildings.size}
                </p>
                <p className="text-xs text-gray-600 mt-1">Buildings</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <p className="text-2xl font-bold text-green-600">
                  {taskStats.floors.size}
                </p>
                <p className="text-xs text-gray-600 mt-1">Floors Covered</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <p className="text-xs font-bold text-purple-600">
                  {taskStats.latest
                    ? new Date(taskStats.latest.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )
                    : "-"}
                </p>
                <p className="text-xs text-gray-600 mt-1">Latest Update</p>
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
                  className="w-full h-auto flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-base px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                >
                  <FaPlus size={20} />
                  <span>Add New Task</span>
                </Button>
              </div>

              {/* Task History Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    Recent Tasks
                  </h3>
                  <Button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="h-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm"
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
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FaHistory className="text-gray-300 text-4xl mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No tasks submitted yet
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
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
                        className="gap-0 py-0 rounded-xl border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-orange-300"
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <img
                              src={task.photoUrl}
                              alt="Task"
                              className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="secondary"
                                  className="bg-indigo-100 text-indigo-700 text-xs font-semibold rounded hover:bg-indigo-100"
                                >
                                  {task.building.name}
                                </Badge>
                                <span className="text-gray-400">→</span>
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-100 text-purple-700 text-xs font-semibold rounded hover:bg-purple-100"
                                >
                                  {task.wing.name}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                                <span className="font-medium">📍</span>
                                <span>{task.floor.name}</span>
                                <span className="text-gray-300">•</span>
                                <span>{task.flat.name}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-orange-600 font-medium">
                                  {task.room.name}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
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
                              <p className="text-xs text-gray-600 line-clamp-2 pt-3">
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
            <DialogHeader className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-left space-y-0">
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
                                ? "border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700"
                                : isDisabled
                                ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "border-gray-300 text-gray-700 hover:border-orange-300 hover:bg-white"
                            }`}
                          >
                            {areaType.label}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
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
                      triggerClassName="bg-yellow-50"
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
                      triggerClassName="bg-cyan-50"
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
                      triggerClassName="bg-purple-50"
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
                      <span className="text-gray-400 text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <FieldSelect
                      value={selectedLevel3Activity || NO_ACTIVITY}
                      placeholder="Skip / No Activity"
                      triggerClassName="bg-blue-50"
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
                    <p className="text-xs text-gray-500 mt-1">
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
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-generated based on flat configuration
                    </p>
                  </div>
                )}

                {/* Photo Upload */}
                <div>
                  <Label className={labelClass}>
                    Upload Photo <span className="text-red-500">*</span>
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
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors"
                  >
                    <FaImage className="text-gray-400" />
                    <span className="text-sm font-normal text-gray-600 truncate">
                      {photo ? photo.name : "Choose photo"}
                    </span>
                  </Label>
                  {photoPreview && (
                    <div className="mt-3">
                      <img
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500 outline-none resize-none"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full h-auto bg-gradient-to-r from-green-500 to-green-600 text-white text-base py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" size={18} />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle size={18} />
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
              <DialogHeader className="shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-left space-y-0">
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
                  <img
                    src={selectedTask.photoUrl}
                    alt="Task Photo"
                    className="w-full h-64 object-cover rounded-xl shadow-lg"
                  />
                </div>

                {/* Project Info */}
                <Card className="gap-0 py-0 mb-6 border-0 shadow-none rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">
                      Project Information
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Project:</span>{" "}
                        {selectedTask.project?.name || "N/A"}
                      </p>
                      {selectedTask.project?.address && (
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Address:</span>{" "}
                          {selectedTask.project.address}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Hierarchy Details */}
                <Card className="gap-0 py-0 mb-6 border-0 shadow-none rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">
                      Location Hierarchy
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Building:</span>{" "}
                          {selectedTask.building.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Wing:</span>{" "}
                          {selectedTask.wing.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-8">
                        <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Floor:</span>{" "}
                          {selectedTask.floor.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-12">
                        <div className="w-2 h-2 rounded-full bg-blue-200"></div>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Flat:</span>{" "}
                          {selectedTask.flat.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-16">
                        <div className="w-2 h-2 rounded-full bg-blue-100"></div>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Room:</span>{" "}
                          {selectedTask.room.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Supervisor & Timestamp */}
                <Card className="gap-0 py-0 mb-6 border-0 shadow-none rounded-xl bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">
                      Submission Details
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Supervisor:</span>{" "}
                        {selectedTask.supervisor?.name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Status:</span>
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-green-200 text-green-800 rounded-full text-xs font-medium hover:bg-green-200"
                        >
                          {selectedTask.status}
                        </Badge>
                      </p>
                      <p className="text-sm text-gray-800">
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
                  <Card className="gap-0 py-0 border-0 shadow-none rounded-xl bg-gray-50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-bold text-gray-700 mb-2">
                        Notes
                      </h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {selectedTask.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons - Only show if task is pending */}
                {selectedTask.status === "pending" &&
                  user?.role === "admin" && (
                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={() =>
                          setConfirmAction({
                            taskId: selectedTask._id,
                            status: "approved",
                          })
                        }
                        disabled={updatingStatus}
                        className="flex-1 py-3 h-auto bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 shadow-md"
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
                        className="flex-1 py-3 h-auto bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 shadow-md"
                      >
                        ✗ Reject Task
                      </Button>
                    </div>
                  )}

                {/* Status Badge for completed/rejected tasks */}
                {selectedTask.status !== "pending" && (
                  <div className="mt-6 p-4 bg-gray-100 rounded-xl text-center">
                    <p className="text-sm text-gray-600">
                      This task has been{" "}
                      <span
                        className={`font-bold ${
                          selectedTask.status === "approved"
                            ? "text-green-600"
                            : "text-red-600"
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
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
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
