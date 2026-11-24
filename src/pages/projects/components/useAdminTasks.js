// src/pages/projects/components/useAdminTasks.js
// All data, requests and handlers of the Tasks page, moved here UNCHANGED from AdminTasks.jsx
// (the local date formatter and the review-status class mapping stayed with the markup).
import { useMemo, useState, useEffect, useCallback } from 'react';
import { isFieldRole } from '@/lib/roles';
import { useUsers } from '@/hooks/useUsers';
import { useProjects } from '@/hooks/useProjects';
import axios from '@/api/client';
import { toast } from 'sonner';

export default function useAdminTasks() {
  const [tasks, setTasks] = useState([]);
  const { data: projects } = useProjects();
  const { data: allUsers } = useUsers();
  const supervisors = useMemo(
    () => allUsers.filter((u) => isFieldRole(u.role)),
    [allUsers]
  );
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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

  const isEditing = showEditModal;
  return {
    tasks, projects, supervisors, loading, currentPage, setCurrentPage, totalPages, totalItems,
    filters, handleFilterChange, clearFilters, fetchTasks,
    selectedTask, showModal, setShowModal, showCreateModal, showEditModal, showDeleteModal, setShowDeleteModal,
    taskToDelete, setTaskToDelete, submitting,
    hierarchy, selectedBuilding, setSelectedBuilding, selectedFloor, setSelectedFloor, selectedFlat, setSelectedFlat,
    selectedRoom, setSelectedRoom, selectedLevel3Activity, setSelectedLevel3Activity, setHierarchy,
    formData, fileInputKey, formSupervisors, getFloors, getFlats, getRooms, fetchHierarchy, handleFormChange,
    viewTaskDetails, openCreateModal, openEditModal, closeFormModal, openDeleteModal,
    handleCreateTask, handleUpdateTask, handleDeleteTask, handleApproveTask, isEditing,
  };
}
