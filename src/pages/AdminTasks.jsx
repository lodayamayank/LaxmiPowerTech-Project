import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import { FaFilter, FaSearch, FaEye, FaCalendarAlt, FaUserTie, FaBuilding, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AdminTasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [filters, setFilters] = useState({
    project: '',
    building: '',
    wing: '',
    floor: '',
    flat: '',
    supervisor: '',
    startDate: '',
    endDate: ''
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

  const LEVEL_3_ACTIVITIES = [
    'Slab Conduiting', 'Box Fixing', 'Wiring', 'Switch Plate', 'Testing And Commissioning'
  ];

  const emptyForm = { project: '', branch: '', supervisor: '', notes: '', photo: null };
  const [formData, setFormData] = useState(emptyForm);

  const getFloors = () => selectedBuilding?.wings?.[0]?.floors || [];
  const getFlats = () => selectedFloor?.flats || [];
  const getRooms = () => selectedFlat?.rooms || [];

  const fetchHierarchy = async (projectId) => {
    try {
      const res = await axios.get(`/projects/${projectId}/hierarchy`);
      setHierarchy(res.data || { buildings: [] });
    } catch (err) {
      console.error('Error fetching hierarchy:', err);
      setHierarchy({ buildings: [] });
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchSupervisors();
  }, [currentPage, filters]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const res = await axios.get('/tasks', { params });
      setTasks(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/projects');
      setProjects(res.data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const res = await axios.get('/users');
      const supervisorList = res.data.filter(
        u => u.role === 'supervisor' || u.role === 'subcontractor'
      );
      setSupervisors(supervisorList);
    } catch (err) {
      console.error('Error fetching supervisors:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      project: '',
      building: '',
      wing: '',
      floor: '',
      flat: '',
      supervisor: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const viewTaskDetails = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
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
    setFormData({
      project: task.project?._id || '',
      branch: task.branch?._id || '',
      supervisor: task.supervisor?._id || '',
      notes: task.notes || '',
      photo: null
    });
    setSelectedLevel3Activity(task.level3Activity?.name || null);
    // Fetch hierarchy for this project and try to match selections
    if (task.project?._id) {
      try {
        const res = await axios.get(`/projects/${task.project._id}/hierarchy`);
        const h = res.data || { buildings: [] };
        setHierarchy(h);
        const bldg = h.buildings?.find(b => b.name === task.building?.name) || null;
        setSelectedBuilding(bldg);
        const flr = bldg?.wings?.[0]?.floors?.find(f => f.name === task.floor?.name) || null;
        setSelectedFloor(flr);
        const flt = flr?.flats?.find(f => f.name === task.flat?.name) || null;
        setSelectedFlat(flt);
        const rm = flt?.rooms?.find(r => r.name === task.room?.name) || null;
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

  const openDeleteModal = (task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('project', formData.project);
    if (formData.branch) fd.append('branch', formData.branch);
    fd.append('supervisor', formData.supervisor);
    fd.append('notes', formData.notes);
    fd.append('building', JSON.stringify({ id: selectedBuilding?._id || 'default', name: selectedBuilding?.name }));
    fd.append('wing', JSON.stringify({ id: 'default', name: 'Default' }));
    fd.append('floor', JSON.stringify({ id: selectedFloor?._id || 'default', name: selectedFloor?.name }));
    fd.append('flat', JSON.stringify({ id: selectedFlat?._id || 'default', name: selectedFlat?.name }));
    fd.append('room', JSON.stringify({ id: selectedRoom?._id || 'default', name: selectedRoom?.name }));
    if (selectedLevel3Activity) {
      fd.append('level3Activity', JSON.stringify({ id: selectedLevel3Activity, name: selectedLevel3Activity }));
    }
    if (formData.photo) fd.append('photo', formData.photo);
    return fd;
  };

  const validateForm = () => {
    if (!formData.project) { toast.error('Please select a project'); return false; }
    if (!formData.supervisor) { toast.error('Please select a supervisor'); return false; }
    if (!selectedBuilding) { toast.error('Please select a building'); return false; }
    if (!selectedFloor) { toast.error('Please select a floor'); return false; }
    if (!selectedFlat) { toast.error('Please select a flat'); return false; }
    if (!selectedRoom) { toast.error('Please select a room'); return false; }
    return true;
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      await axios.post('/tasks/admin', buildFormData(), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Task created successfully');
      setShowCreateModal(false);
      setFormData(emptyForm);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
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
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Task updated successfully');
      setShowEditModal(false);
      setSelectedTask(null);
      setFormData(emptyForm);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setSubmitting(true);
      await axios.delete(`/tasks/${taskToDelete._id}`);
      toast.success('Task deleted successfully');
      setShowDeleteModal(false);
      setTaskToDelete(null);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Task Management</h1>
            <p className="text-gray-600">View and manage all tasks</p>
          </div>
          <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white">
            <FaPlus className="mr-2" /> Create Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FaBuilding className="text-blue-600 text-xl" />
              </div>
            </div>
            </CardContent>
          </Card>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaBuilding className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Supervisors</p>
                <p className="text-2xl font-bold text-gray-800">{supervisors.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FaUserTie className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-800">
                  {tasks.filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth()).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FaCalendarAlt className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6"><CardContent className="p-4">
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
              {showFilters ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={filters.project}
                  onChange={(e) => handleFilterChange('project', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                <input
                  type="text"
                  value={filters.building}
                  onChange={(e) => handleFilterChange('building', e.target.value)}
                  placeholder="Filter by building..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wing</label>
                <input
                  type="text"
                  value={filters.wing}
                  onChange={(e) => handleFilterChange('wing', e.target.value)}
                  placeholder="Filter by wing..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <input
                  type="text"
                  value={filters.floor}
                  onChange={(e) => handleFilterChange('floor', e.target.value)}
                  placeholder="Filter by floor..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flat</label>
                <input
                  type="text"
                  value={filters.flat}
                  onChange={(e) => handleFilterChange('flat', e.target.value)}
                  placeholder="Filter by flat..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                <select
                  value={filters.supervisor}
                  onChange={(e) => handleFilterChange('supervisor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Supervisors</option>
                  {supervisors.map(supervisor => (
                    <option key={supervisor._id} value={supervisor._id}>{supervisor.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </CardContent></Card>

        {/* Tasks Table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <FaSearch className="text-gray-400 text-4xl mx-auto mb-4" />
              <p className="text-gray-500">No tasks found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supervisor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {task.project?.name || 'N/A'}
                          </div>
                          {task.branch && (
                            <div className="text-xs text-gray-500">{task.branch.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {task.building.name} → {task.wing.name}
                            {task.level3Activity?.name && (
                              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {task.level3Activity.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {task.floor.name} → {task.flat.name} → {task.room.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{task.supervisor?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500 capitalize">{task.supervisor?.role}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(task.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalItems)} of {totalItems} tasks
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

        {/* Task Details Modal */}
        {showModal && selectedTask && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Task Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    <FaTimes />
                  </button>
                </div>

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
                      <p className="text-sm font-semibold text-gray-600">Project</p>
                      <p className="text-gray-900">{selectedTask.project?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Branch</p>
                      <p className="text-gray-900">{selectedTask.branch?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Building</p>
                      <p className="text-gray-900">{selectedTask.building?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Wing</p>
                      <p className="text-gray-900">{selectedTask.wing?.name}</p>
                    </div>
                    {selectedTask.level3Activity?.name && (
                      <div>
                        <p className="text-sm font-semibold text-gray-600">Level 3 Activity</p>
                        <p className="text-gray-900">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                            {selectedTask.level3Activity.name}
                          </span>
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Floor</p>
                      <p className="text-gray-900">{selectedTask.floor?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Flat</p>
                      <p className="text-gray-900">{selectedTask.flat?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Room</p>
                      <p className="text-gray-900">{selectedTask.room?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Supervisor</p>
                      <p className="text-gray-900">{selectedTask.supervisor?.name || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-gray-600">Submitted On</p>
                      <p className="text-gray-900">{formatDate(selectedTask.createdAt)}</p>
                    </div>
                    {selectedTask.notes && (
                      <div className="col-span-2">
                        <p className="text-sm font-semibold text-gray-600">Notes</p>
                        <p className="text-gray-900">{selectedTask.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Close
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => { setShowModal(false); openEditModal(selectedTask); }}
                  >
                    <FaEdit className="mr-2" /> Edit Task
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Task Modal */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {showEditModal ? 'Edit Task' : 'Create New Task'}
                  </h2>
                  <button
                    onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={showEditModal ? handleUpdateTask : handleCreateTask} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.project}
                        onChange={(e) => {
                          handleFormChange('project', e.target.value);
                          setSelectedBuilding(null);
                          setSelectedFloor(null);
                          setSelectedFlat(null);
                          setSelectedRoom(null);
                          setSelectedLevel3Activity(null);
                          if (e.target.value) fetchHierarchy(e.target.value);
                          else setHierarchy({ buildings: [] });
                        }}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Select Project</option>
                        {projects.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supervisor <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.supervisor}
                        onChange={(e) => handleFormChange('supervisor', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Select Supervisor</option>
                        {supervisors.map(s => (
                          <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Building Dropdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Building / Tower <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedBuilding?._id || ''}
                        onChange={(e) => {
                          const bldg = hierarchy.buildings?.find(b => b._id === e.target.value) || null;
                          setSelectedBuilding(bldg);
                          setSelectedFloor(null);
                          setSelectedFlat(null);
                          setSelectedRoom(null);
                        }}
                        disabled={!formData.project || hierarchy.buildings.length === 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!formData.project ? 'Select a project first' : hierarchy.buildings.length === 0 ? 'No buildings found' : 'Select Building'}
                        </option>
                        {hierarchy.buildings?.map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Level 3 Activity (Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Activity <span className="text-gray-400 text-xs">(Optional)</span>
                      </label>
                      <select
                        value={selectedLevel3Activity || ''}
                        onChange={(e) => setSelectedLevel3Activity(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">No Activity</option>
                        {LEVEL_3_ACTIVITIES.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Floor / Flat / Room Cascading Dropdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Floor <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedFloor?._id || ''}
                        onChange={(e) => {
                          const flr = getFloors().find(f => f._id === e.target.value) || null;
                          setSelectedFloor(flr);
                          setSelectedFlat(null);
                          setSelectedRoom(null);
                        }}
                        disabled={!selectedBuilding}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">{!selectedBuilding ? 'Select building first' : 'Select Floor'}</option>
                        {getFloors().map(f => (
                          <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Flat <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedFlat?._id || ''}
                        onChange={(e) => {
                          const flt = getFlats().find(f => f._id === e.target.value) || null;
                          setSelectedFlat(flt);
                          setSelectedRoom(null);
                        }}
                        disabled={!selectedFloor}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">{!selectedFloor ? 'Select floor first' : 'Select Flat'}</option>
                        {getFlats().map(f => (
                          <option key={f._id} value={f._id}>{f.name}{f.flatType ? ` (${f.flatType})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Room <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedRoom?._id || ''}
                        onChange={(e) => {
                          const rm = getRooms().find(r => r._id === e.target.value) || null;
                          setSelectedRoom(rm);
                        }}
                        disabled={!selectedFlat}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">{!selectedFlat ? 'Select flat first' : 'Select Room'}</option>
                        {getRooms().map(r => (
                          <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Photo {showEditModal ? '(Upload new to replace)' : '(Optional)'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFormChange('photo', e.target.files[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      rows={3}
                      placeholder="Add any additional notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {submitting
                        ? (showEditModal ? 'Updating...' : 'Creating...')
                        : (showEditModal ? 'Update Task' : 'Create Task')
                      }
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && taskToDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Delete Task</h2>
                <button
                  onClick={() => { setShowDeleteModal(false); setTaskToDelete(null); }}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <FaTrash className="text-red-500 text-xl flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Are you sure you want to delete this task?</p>
                    <p className="text-sm text-gray-600">This action cannot be undone.</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
                  <div className="flex">
                    <span className="font-semibold text-gray-700 w-24">Project:</span>
                    <span className="text-gray-900">{taskToDelete.project?.name || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 w-24">Location:</span>
                    <span className="text-gray-900">
                      {taskToDelete.building?.name} → {taskToDelete.flat?.name} → {taskToDelete.room?.name}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold text-gray-700 w-24">Supervisor:</span>
                    <span className="text-gray-900">{taskToDelete.supervisor?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setTaskToDelete(null); }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteTask}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {submitting ? 'Deleting...' : 'Delete Task'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminTasks;
