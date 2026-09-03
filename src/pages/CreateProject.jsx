import React, { useEffect, useState, useRef } from 'react';
import axios from '../utils/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import SmartTowerBuilder from '../components/SmartTowerBuilder';
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
  FaChartLine
} from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_LIBS = ['places'];

const CreateProject = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
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
  const token = localStorage.getItem('token');

  // Google Places Autocomplete
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
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
    const addr = place?.formatted_address || place?.name || '';
    if (addr) {
      setFormData((prev) => ({ ...prev, address: addr }));
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/branches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = (res.data || []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      setBranches(sorted);
    } catch (err) {
      console.error('Failed to fetch branches', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const getId = (value) => {
    if (!value) return '';
    return typeof value === 'object' ? value._id : value;
  };

  const getProjectTeam = (project) => {
    const projectBranchIds = new Set((project?.branches || []).map(getId).filter(Boolean));

    return users.filter((user) => {
      if (!['supervisor', 'subcontractor'].includes(user.role)) return false;
      if (getId(user.project) === project?._id) return true;
      return (user.assignedBranches || []).some((branch) => projectBranchIds.has(getId(branch)));
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

  const getTaskProgress = (tasks) => {
    const counts = {
      pending: 0,
      'in-progress': 0,
      completed: 0,
      verified: 0,
      approved: 0,
      rejected: 0,
    };

    tasks.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
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

  const groupTasksBy = (tasks, keyPath, fallback = 'Unassigned') => {
    const groups = new Map();

    tasks.forEach((task) => {
      const key = keyPath.split('.').reduce((value, key) => value?.[key], task) || fallback;
      const current = groups.get(key) || { name: key, total: 0, done: 0, pending: 0, inProgress: 0, rejected: 0 };
      current.total += 1;
      if (['completed', 'verified', 'approved'].includes(task.status)) current.done += 1;
      if (task.status === 'pending') current.pending += 1;
      if (task.status === 'in-progress') current.inProgress += 1;
      if (task.status === 'rejected') current.rejected += 1;
      groups.set(key, current);
    });

    return Array.from(groups.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  };

  const handleViewDetails = async (project) => {
    setDetailsProject(project);
    setProjectTasks([]);
    setDetailsLoading(true);

    try {
      const res = await axios.get('/tasks', {
        params: { project: project._id, limit: 1000 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjectTasks(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch project tasks', err);
      alert('Failed to fetch project details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsProject(null);
    setProjectTasks([]);
    setDetailsLoading(false);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.address) {
        alert('Please fill in all required fields');
        return;
      }

      if (formData.buildings.length === 0) {
        alert('Please add at least one tower with floors and flats');
        return;
      }

      // Count total flats for validation
      const totalFlats = formData.buildings.reduce((sum, tower) => {
        return sum + (tower.wings?.[0]?.floors?.reduce((fSum, floor) => 
          fSum + (floor.flats?.length || 0), 0) || 0);
      }, 0);

      if (totalFlats === 0) {
        alert('Please add at least one flat to your project structure');
        return;
      }

      // Warn if structure is very large
      if (totalFlats > 5000) {
        const confirmed = window.confirm(
          `This project has ${totalFlats.toLocaleString()} flats. This is a large structure. Continue?`
        );
        if (!confirmed) return;
      }

      const projectData = {
        ...formData,
        buildings: formData.buildings
      };

      if (editingId) {
        await axios.put(`/projects/${editingId}`, projectData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Project updated successfully!');
      } else {
        await axios.post('/projects', projectData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Project created successfully!');
      }
      setFormData({ name: '', address: '', branches: [], buildings: [] });
      setEditingId(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to save project', err);
      if (err.response?.status === 413) {
        alert('Project structure too large. Please reduce the number of floors, flats, or buildings.');
      } else {
        alert(err.response?.data?.message || 'Failed to save project');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({ name: '', address: '', branches: [], buildings: [] });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await axios.delete(`/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchProjects();
      } catch (err) {
        console.error('Failed to delete project', err);
        alert('Failed to delete project');
      }
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchBranches();
    fetchUsers();
  }, []);

  const totalBranches = projects.reduce((acc, proj) => acc + (proj.branches?.length || 0), 0);
  const detailStructure = countProjectStructure(detailsProject);
  const detailProgress = getTaskProgress(projectTasks);
  const detailTeam = detailsProject ? getProjectTeam(detailsProject) : [];
  const buildingProgress = groupTasksBy(projectTasks, 'building.name');
  const supervisorProgress = groupTasksBy(projectTasks, 'supervisor.name');

  return (
    <DashboardLayout title="Projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Project Management</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage your projects</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Projects</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{projects.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FaProjectDiagram className="text-orange-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Branches</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{totalBranches}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FaBuilding className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Available Branches</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{branches.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaMapMarkerAlt className="text-green-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? 'Edit Project' : 'Create New Project'}
            </h2>
            {editingId && (
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cancel"
              >
                <FaTimes size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Project Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaProjectDiagram size={14} />
                </div>
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Address <span className="text-red-500">*</span>
              </label>
              {mapsLoaded ? (
                <Autocomplete
                  onLoad={onAutocompleteLoad}
                  onPlaceChanged={onPlaceChanged}
                  options={{ componentRestrictions: { country: 'in' } }}
                >
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                      <FaMapMarkerAlt size={14} />
                    </div>
                    <input
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Enter project address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </Autocomplete>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                    <FaMapMarkerAlt size={14} />
                  </div>
                  <input
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Enter project address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Assign Branches
              </label>
              <select
                multiple
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-40 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={formData.branches}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branches: Array.from(e.target.selectedOptions, (opt) => opt.value),
                  })
                }
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Hold Ctrl (Cmd on Mac) to select multiple branches
              </p>
            </div>
          </div>

          {/* Smart Tower Builder */}
          <div className="mt-6">
            <SmartTowerBuilder
              buildings={formData.buildings}
              onChange={(buildings) => setFormData({ ...formData, buildings })}
            />
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button
              onClick={handleSubmit}
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
            >
              {editingId ? (
                <>
                  <FaCheck size={14} />
                  Update Project
                </>
              ) : (
                <>
                  <FaPlus size={14} />
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
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Projects List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your existing projects</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Project Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Address</th>
                  <th className="text-left px-6 py-3 font-semibold">Branches</th>
                  <th className="text-left px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-6 text-center text-gray-500">
                      Loading projects...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-6 text-center text-gray-500">
                      No projects found. Create your first project above.
                    </td>
                  </tr>
                ) : (
                  projects.map((proj) => (
                    <tr key={proj._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{proj.name}</td>
                      <td className="px-6 py-4 text-gray-600">{proj.address}</td>
                      <td className="px-6 py-4">
                        {proj.branches?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {proj.branches.map((b, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                              >
                                <FaMapMarkerAlt size={10} />
                                {b.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                            onClick={() => handleViewDetails(proj)}
                            title="View project details"
                          >
                            <FaEye size={14} />
                            View
                          </button>
                          <button
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            onClick={() => handleEdit(proj)}
                            title="Edit"
                          >
                            <FaEdit size={14} />
                            Edit
                          </button>
                          <button
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium transition-colors"
                            onClick={() => handleDelete(proj._id)}
                            title="Delete"
                          >
                            <FaTrash size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {detailsProject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{detailsProject.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{detailsProject.address || 'No address added'}</p>
                </div>
                <button
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  title="Close"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-76px)] space-y-6">
                {detailsLoading ? (
                  <div className="py-16 text-center text-gray-500">Loading project details...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{detailProgress.total}</p>
                            </div>
                            <FaTasks className="text-blue-600" size={22} />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500 font-medium">Work Done</p>
                              <p className="text-2xl font-bold text-green-700 mt-1">{detailProgress.percent}%</p>
                            </div>
                            <FaChartLine className="text-green-600" size={22} />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500 font-medium">Assigned Team</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{detailTeam.length}</p>
                            </div>
                            <FaUsers className="text-purple-600" size={22} />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500 font-medium">Rooms Planned</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{detailStructure.rooms}</p>
                            </div>
                            <FaLayerGroup className="text-orange-600" size={22} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600 transition-all"
                          style={{ width: `${detailProgress.percent}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(detailProgress.counts).map(([status, count]) => (
                          <Badge key={status} variant="secondary" className="capitalize">
                            {status.replace('-', ' ')}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <h3 className="font-semibold text-gray-900">Project Info</h3>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Branches</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {detailsProject.branches?.length > 0 ? (
                                detailsProject.branches.map((branch) => (
                                  <span
                                    key={branch._id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                  >
                                    <FaMapMarkerAlt size={10} />
                                    {branch.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-gray-400">No branches assigned</span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">Buildings</p>
                              <p className="text-lg font-bold text-gray-900">{detailStructure.buildings}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">Floors</p>
                              <p className="text-lg font-bold text-gray-900">{detailStructure.floors}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">Flats</p>
                              <p className="text-lg font-bold text-gray-900">{detailStructure.flats}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">Rooms</p>
                              <p className="text-lg font-bold text-gray-900">{detailStructure.rooms}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <h3 className="font-semibold text-gray-900">Assigned Supervisors</h3>
                        </div>
                        <div className="p-4">
                          {detailTeam.length > 0 ? (
                            <div className="space-y-2">
                              {detailTeam.map((member) => (
                                <div key={member._id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                  <div>
                                    <p className="font-medium text-gray-900">{member.name}</p>
                                    <p className="text-xs text-gray-500">@{member.username || 'user'}</p>
                                  </div>
                                  <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No supervisors assigned to this project</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                          <FaBuilding className="text-gray-500" />
                          <h3 className="font-semibold text-gray-900">Work By Building</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-white text-gray-600">
                              <tr>
                                <th className="text-left px-4 py-2 font-semibold">Building</th>
                                <th className="text-center px-4 py-2 font-semibold">Total</th>
                                <th className="text-center px-4 py-2 font-semibold">Done</th>
                                <th className="text-center px-4 py-2 font-semibold">Pending</th>
                              </tr>
                            </thead>
                            <tbody>
                              {buildingProgress.length > 0 ? (
                                buildingProgress.map((row) => (
                                  <tr key={row.name} className="border-t border-gray-100">
                                    <td className="px-4 py-2 font-medium text-gray-900">{row.name}</td>
                                    <td className="px-4 py-2 text-center">{row.total}</td>
                                    <td className="px-4 py-2 text-center text-green-700">{row.done}</td>
                                    <td className="px-4 py-2 text-center text-orange-600">{row.pending}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="px-4 py-6 text-center text-gray-400">No tasks created yet</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                          <FaUsers className="text-gray-500" />
                          <h3 className="font-semibold text-gray-900">Work By Supervisor</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-white text-gray-600">
                              <tr>
                                <th className="text-left px-4 py-2 font-semibold">Supervisor</th>
                                <th className="text-center px-4 py-2 font-semibold">Total</th>
                                <th className="text-center px-4 py-2 font-semibold">Done</th>
                                <th className="text-center px-4 py-2 font-semibold">Open</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supervisorProgress.length > 0 ? (
                                supervisorProgress.map((row) => (
                                  <tr key={row.name} className="border-t border-gray-100">
                                    <td className="px-4 py-2 font-medium text-gray-900">{row.name}</td>
                                    <td className="px-4 py-2 text-center">{row.total}</td>
                                    <td className="px-4 py-2 text-center text-green-700">{row.done}</td>
                                    <td className="px-4 py-2 text-center text-orange-600">{row.pending + row.inProgress}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="px-4 py-6 text-center text-gray-400">No tasks created yet</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <FaClock className="text-gray-500" />
                        <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white text-gray-600">
                            <tr>
                              <th className="text-left px-4 py-2 font-semibold">Location</th>
                              <th className="text-left px-4 py-2 font-semibold">Activity</th>
                              <th className="text-left px-4 py-2 font-semibold">Supervisor</th>
                              <th className="text-left px-4 py-2 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectTasks.slice(0, 8).map((task) => (
                              <tr key={task._id} className="border-t border-gray-100">
                                <td className="px-4 py-2 text-gray-900">
                                  {[task.building?.name, task.floor?.name, task.flat?.name, task.room?.name].filter(Boolean).join(' / ')}
                                </td>
                                <td className="px-4 py-2 text-gray-600">{task.level3Activity?.name || '-'}</td>
                                <td className="px-4 py-2 text-gray-900">{task.supervisor?.name || 'N/A'}</td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                    ['completed', 'verified', 'approved'].includes(task.status)
                                      ? 'bg-green-100 text-green-700'
                                      : task.status === 'rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {['completed', 'verified', 'approved'].includes(task.status) ? <FaCheckCircle size={10} /> : <FaClock size={10} />}
                                    {task.status?.replace('-', ' ') || 'pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {projectTasks.length === 0 && (
                              <tr>
                                <td colSpan="4" className="px-4 py-6 text-center text-gray-400">No tasks created yet</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreateProject;
