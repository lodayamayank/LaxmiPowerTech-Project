import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import logo from '../assets/logo.png';
import { FaArrowLeft, FaCamera, FaCheckCircle, FaHistory } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TaskSubmission = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const user = JSON.parse(localStorage.getItem('user'));
  const selectedBranchName = localStorage.getItem('selectedBranchName');
  
  // Get project from user's assigned branches
  const [projectId, setProjectId] = useState('');
  const [hierarchy, setHierarchy] = useState({ buildings: [] });
  const [loading, setLoading] = useState(true);
  
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
  
  // Task history state
  const [tasks, setTasks] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchProjectAndHierarchy();
    fetchTaskHistory();
  }, []);

  const fetchProjectAndHierarchy = async () => {
    try {
      setLoading(true);
      // Get user's project
      const userRes = await axios.get('/users/me');
      const projectId = userRes.data.project;
      setProjectId(projectId);

      if (projectId) {
        // Fetch project hierarchy
        const hierarchyRes = await axios.get(`/projects/${projectId}/hierarchy`);
        setHierarchy(hierarchyRes.data);
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
        params: { page: 1, limit: 10 }
      });
      setTasks(res.data.data || []);
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

    // Validation
    if (!selectedBuilding || !selectedWing || !selectedFloor || !selectedFlat || !selectedRoom) {
      toast.error('Please select all hierarchy levels');
      return;
    }

    if (!photo) {
      toast.error('Please upload a photo');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('project', projectId);
      formData.append('branch', branchId || '');
      formData.append('building', JSON.stringify({ 
        id: selectedBuilding._id, 
        name: selectedBuilding.name 
      }));
      formData.append('wing', JSON.stringify({ 
        id: selectedWing._id, 
        name: selectedWing.name 
      }));
      formData.append('floor', JSON.stringify({ 
        id: selectedFloor._id, 
        name: selectedFloor.name 
      }));
      formData.append('flat', JSON.stringify({ 
        id: selectedFlat._id, 
        name: selectedFlat.name 
      }));
      formData.append('room', JSON.stringify({ 
        id: selectedRoom._id, 
        name: selectedRoom.name 
      }));
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
      
      // Refresh task history
      fetchTaskHistory();
      setShowHistory(true);
    } catch (err) {
      console.error('Error submitting task:', err);
      toast.error(err.response?.data?.message || 'Failed to submit task');
    } finally {
      setSubmitting(false);
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
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Loading project structure...</p>
            </div>
          ) : hierarchy.buildings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Structure Defined</h3>
              <p className="text-sm text-gray-500">
                Please contact admin to set up project hierarchy
              </p>
            </div>
          ) : (
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
              {selectedRoom && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Photo
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
                      {photoPreview ? (
                        <div className="relative">
                          <img src={photoPreview} alt="Preview" className="w-full rounded-lg" />
                          <button
                            type="button"
                            onClick={() => {
                              setPhoto(null);
                              setPhotoPreview('');
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center cursor-pointer">
                          <FaCamera className="text-gray-400 text-4xl mb-2" />
                          <span className="text-sm text-gray-600">Click to upload photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
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
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'SAVE'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* View History Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            <FaHistory />
            {showHistory ? 'Hide History' : 'View Task History'}
          </button>

          {/* Task History */}
          {showHistory && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Tasks</h3>
              {loadingHistory ? (
                <p className="text-center text-gray-500 text-sm">Loading...</p>
              ) : tasks.length === 0 ? (
                <p className="text-center text-gray-500 text-sm">No tasks submitted yet</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <img
                          src={task.photoUrl}
                          alt="Task"
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {task.building.name} → {task.wing.name} → {task.floor.name} → {task.flat.name} → {task.room.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString()}
                          </p>
                          {task.notes && (
                            <p className="text-xs text-gray-600 mt-1">{task.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskSubmission;
