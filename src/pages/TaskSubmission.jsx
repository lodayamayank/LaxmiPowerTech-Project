import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import logo from '../assets/logo.png';
import { FaArrowLeft, FaPlus, FaTimes, FaCheckCircle, FaHistory, FaImage } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TaskSubmission = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const selectedBranchName = localStorage.getItem('selectedBranchName');
  
  const [projectId, setProjectId] = useState('');
  const [hierarchy, setHierarchy] = useState({ buildings: [] });
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [taskStats, setTaskStats] = useState({
    total: 0,
    buildings: new Set(),
    floors: new Set(),
    latest: null
  });
  
  // Form state
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedWing, setSelectedWing] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjectAndHierarchy();
    fetchTaskHistory();
  }, []);

  const fetchProjectAndHierarchy = async () => {
    try {
      setLoading(true);
      
      if (branchId) {
        const projectsRes = await axios.get('/projects');
        const project = projectsRes.data.find(p => 
          p.branches.some(b => b._id === branchId)
        );
        
        if (project) {
          setProjectId(project._id);
          setProjectName(project.name);
          
          // Fetch project hierarchy
          const hierarchyRes = await axios.get(`/projects/${project._id}/hierarchy`);
          setHierarchy(hierarchyRes.data);
        } else {
          toast.error('Project not found for this branch');
        }
      } else {
        toast.error('Branch ID not found');
      }
    } catch (err) {
      console.error('Error fetching project hierarchy:', err);
      toast.error('Failed to load project structure');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get('/tasks', {
        params: { 
          project: projectId,
          branch: branchId,
          page: 1, 
          limit: 50 
        }
      });
      const taskData = res.data.data || [];
      setTasks(taskData);
      
      // Calculate statistics
      const buildings = new Set();
      const floors = new Set();
      taskData.forEach(task => {
        buildings.add(task.building.name);
        floors.add(task.floor.name);
      });
      
      setTaskStats({
        total: taskData.length,
        buildings,
        floors,
        latest: taskData.length > 0 ? taskData[0] : null
      });
    } catch (err) {
      console.error('Error fetching task history:', err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedBuilding || !selectedWing || !selectedFloor || !selectedFlat || !selectedRoom || !photo) {
      toast.error('Please fill all required fields and upload a photo');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('branch', branchId);
      formData.append('building', JSON.stringify({ id: selectedBuilding._id, name: selectedBuilding.name }));
      formData.append('wing', JSON.stringify({ id: selectedWing._id, name: selectedWing.name }));
      formData.append('floor', JSON.stringify({ id: selectedFloor._id, name: selectedFloor.name }));
      formData.append('flat', JSON.stringify({ id: selectedFlat._id, name: selectedFlat.name }));
      formData.append('room', JSON.stringify({ id: selectedRoom._id, name: selectedRoom.name }));
      formData.append('photo', photo);
      formData.append('notes', notes);

      await axios.post('/tasks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Task submitted successfully!');
      
      // Reset form
      setSelectedBuilding(null);
      setSelectedWing(null);
      setSelectedFloor(null);
      setSelectedFlat(null);
      setSelectedRoom(null);
      setPhoto(null);
      setPhotoPreview('');
      setNotes('');
      setShowAddTaskModal(false);
      
      // Refresh task history
      fetchTaskHistory();
    } catch (err) {
      console.error('Error submitting task:', err);
      toast.error(err.response?.data?.message || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedBuilding(null);
    setSelectedWing(null);
    setSelectedFloor(null);
    setSelectedFlat(null);
    setSelectedRoom(null);
    setPhoto(null);
    setPhotoPreview('');
    setNotes('');
  };

  const handleTaskStatusUpdate = async (taskId, status) => {
    try {
      setUpdatingStatus(true);
      await axios.patch(`/tasks/${taskId}/status`, { status });
      
      toast.success(`Task ${status === 'approved' ? 'accepted' : 'rejected'} successfully!`);
      
      // Close modal and refresh task list
      setShowTaskDetail(false);
      setSelectedTask(null);
      fetchTaskHistory();
    } catch (err) {
      console.error('Error updating task status:', err);
      toast.error(err.response?.data?.message || 'Failed to update task status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getWings = () => selectedBuilding?.wings || [];
  const getFloors = () => selectedWing?.floors || [];
  const getFlats = () => selectedFloor?.flats || [];
  const getRooms = () => selectedFlat?.rooms || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Logo" className="h-16 w-50 bg-white box-shadow rounded-2xl" />
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
              <FaArrowLeft size={14} />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-white text-2xl font-bold">Task Submission</h2>
            <p className="text-white/80 text-sm mt-1">{selectedBranchName || 'Submit work progress'}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Project Info Badge */}
          {projectName && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-md">
              <p className="text-white text-sm font-semibold">📍 {projectName}</p>
              <p className="text-white/80 text-xs mt-0.5">{selectedBranchName}</p>
            </div>
          )}

          {/* Task Summary Statistics */}
          {!loading && tasks.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">{taskStats.total}</p>
                <p className="text-xs text-gray-600 mt-1">Total Tasks</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">{taskStats.buildings.size}</p>
                <p className="text-xs text-gray-600 mt-1">Buildings</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <p className="text-2xl font-bold text-green-600">{taskStats.floors.size}</p>
                <p className="text-xs text-gray-600 mt-1">Floors Covered</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <p className="text-xs font-bold text-purple-600">{taskStats.latest ? new Date(taskStats.latest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</p>
                <p className="text-xs text-gray-600 mt-1">Latest Update</p>
              </div>
            </div>
          )}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Loading project structure...</p>
            </div>
          ) : (
            <>
              {/* Add Task Button */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    if (hierarchy.buildings.length === 0) {
                      toast.error('Please contact admin to set up project hierarchy first');
                      return;
                    }
                    setShowAddTaskModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                >
                  <FaPlus size={20} />
                  <span>Add New Task</span>
                </button>
              </div>

              {/* Task History Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Recent Tasks</h3>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm"
                  >
                    {showHistory ? 'Show Less' : 'Show All'}
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FaHistory className="text-gray-300 text-4xl mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No tasks submitted yet</p>
                    <p className="text-gray-400 text-xs mt-1">Click "Add New Task" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(showHistory ? tasks : tasks.slice(0, 3)).map((task) => (
                      <div 
                        key={task._id} 
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDetail(true);
                        }}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-orange-300"
                      >
                        <div className="flex gap-3">
                          <img
                            src={task.photoUrl}
                            alt="Task"
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-800">
                              {task.building.name} → {task.wing.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {task.floor.name} → {task.flat.name} → {task.room.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(task.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        {task.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-600 line-clamp-2">{task.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add Task Modal */}
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                <h3 className="text-white text-xl font-bold">Add New Task</h3>
                <button
                  onClick={() => {
                    setShowAddTaskModal(false);
                    resetForm();
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Building Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Level 1 - Building Name
                    </label>
                    <select
                      value={selectedBuilding?._id || ''}
                      onChange={(e) => {
                        const building = hierarchy.buildings.find(b => b._id === e.target.value);
                        setSelectedBuilding(building);
                        setSelectedWing(null);
                        setSelectedFloor(null);
                        setSelectedFlat(null);
                        setSelectedRoom(null);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    >
                      <option value="">Select Building</option>
                      {hierarchy.buildings.map((building) => (
                        <option key={building._id} value={building._id}>
                          {building.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Wing Selection */}
                  {selectedBuilding && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Level 2 - Wing
                      </label>
                      <select
                        value={selectedWing?._id || ''}
                        onChange={(e) => {
                          const wing = getWings().find(w => w._id === e.target.value);
                          setSelectedWing(wing);
                          setSelectedFloor(null);
                          setSelectedFlat(null);
                          setSelectedRoom(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      >
                        <option value="">Select Wing</option>
                        {getWings().map((wing) => (
                          <option key={wing._id} value={wing._id}>
                            {wing.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Floor Selection */}
                  {selectedWing && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Level 3 - Floor
                      </label>
                      <select
                        value={selectedFloor?._id || ''}
                        onChange={(e) => {
                          const floor = getFloors().find(f => f._id === e.target.value);
                          setSelectedFloor(floor);
                          setSelectedFlat(null);
                          setSelectedRoom(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      >
                        <option value="">Select Floor</option>
                        {getFloors().map((floor) => (
                          <option key={floor._id} value={floor._id}>
                            {floor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Flat Selection */}
                  {selectedFloor && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Level 4 - Flat
                      </label>
                      <select
                        value={selectedFlat?._id || ''}
                        onChange={(e) => {
                          const flat = getFlats().find(f => f._id === e.target.value);
                          setSelectedFlat(flat);
                          setSelectedRoom(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      >
                        <option value="">Select Flat</option>
                        {getFlats().map((flat) => (
                          <option key={flat._id} value={flat._id}>
                            {flat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Room Selection */}
                  {selectedFlat && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Level 5 - Room
                      </label>
                      <select
                        value={selectedRoom?._id || ''}
                        onChange={(e) => {
                          const room = getRooms().find(r => r._id === e.target.value);
                          setSelectedRoom(room);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      >
                        <option value="">Select Room</option>
                        {getRooms().map((room) => (
                          <option key={room._id} value={room._id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Photo <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors"
                      >
                        <FaImage className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {photo ? photo.name : 'Choose photo'}
                        </span>
                      </label>
                    </div>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional notes..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                      rows="3"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!selectedBuilding || !selectedWing || !selectedFloor || !selectedFlat || !selectedRoom || !photo || submitting}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle size={18} />
                        <span>Submit Task</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        {showTaskDetail && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                <h3 className="text-white text-xl font-bold">Task Details</h3>
                <button
                  onClick={() => {
                    setShowTaskDetail(false);
                    setSelectedTask(null);
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Photo */}
                <div className="mb-6">
                  <img
                    src={selectedTask.photoUrl}
                    alt="Task Photo"
                    className="w-full h-64 object-cover rounded-xl shadow-lg"
                  />
                </div>

                {/* Project Info */}
                <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Project Information</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Project:</span> {selectedTask.project?.name || 'N/A'}
                    </p>
                    {selectedTask.project?.address && (
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold">Address:</span> {selectedTask.project.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Hierarchy Details */}
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Location Hierarchy</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Building:</span> {selectedTask.building.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Wing:</span> {selectedTask.wing.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-8">
                      <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Floor:</span> {selectedTask.floor.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-12">
                      <div className="w-2 h-2 rounded-full bg-blue-200"></div>
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Flat:</span> {selectedTask.flat.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-16">
                      <div className="w-2 h-2 rounded-full bg-blue-100"></div>
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">Room:</span> {selectedTask.room.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Supervisor & Timestamp */}
                <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Submission Details</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Supervisor:</span> {selectedTask.supervisor?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Status:</span> 
                      <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                        {selectedTask.status}
                      </span>
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Submitted:</span> {new Date(selectedTask.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {selectedTask.notes && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.notes}</p>
                  </div>
                )}

                {/* Action Buttons - Only show if task is pending */}
                {selectedTask.status === 'pending' && user?.role === 'admin' && (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleTaskStatusUpdate(selectedTask._id, 'approved')}
                      disabled={updatingStatus}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingStatus ? 'Processing...' : '✓ Accept Task'}
                    </button>
                    <button
                      onClick={() => handleTaskStatusUpdate(selectedTask._id, 'rejected')}
                      disabled={updatingStatus}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingStatus ? 'Processing...' : '✗ Reject Task'}
                    </button>
                  </div>
                )}

                {/* Status Badge for completed/rejected tasks */}
                {selectedTask.status !== 'pending' && (
                  <div className="mt-6 p-4 bg-gray-100 rounded-xl text-center">
                    <p className="text-sm text-gray-600">
                      This task has been <span className={`font-bold ${selectedTask.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{selectedTask.status}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSubmission;
