import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import { FaFilter, FaSearch, FaEye, FaCalendarAlt, FaUserTie, FaBuilding } from 'react-icons/fa';
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

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Task Management</h1>
          <p className="text-gray-600">View and track all submitted tasks</p>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewTaskDetails(task)}
                            className="text-blue-600"
                          >
                            <FaEye /> View
                          </Button>
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
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Photo */}
                  <div>
                    <img
                      src={selectedTask.photoUrl}
                      alt="Task"
                      className="w-full rounded-lg"
                    />
                  </div>

                  {/* Details Grid */}
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
                      <p className="text-gray-900">{selectedTask.building.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Wing</p>
                      <p className="text-gray-900">{selectedTask.wing.name}</p>
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
                      <p className="text-gray-900">{selectedTask.floor.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Flat</p>
                      <p className="text-gray-900">{selectedTask.flat.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Room</p>
                      <p className="text-gray-900">{selectedTask.room.name}</p>
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

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminTasks;
