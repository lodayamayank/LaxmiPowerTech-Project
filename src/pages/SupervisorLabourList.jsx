import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import logo from '../assets/logo.png';
import { FaArrowLeft, FaPlus, FaPhone, FaSearch, FaTrash, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SupervisorLabourList = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [labours, setLabours] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'attendance'
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchLabours();
    fetchProjectName();
  }, [branchId]);

  // Fetch existing attendance when date changes or when switching to attendance tab
  useEffect(() => {
    if (activeTab === 'attendance' && branchId && selectedDate) {
      fetchExistingAttendance(selectedDate);
    }
  }, [activeTab, selectedDate, branchId]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const fetchProjectName = () => {
    const storedBranchName = localStorage.getItem('selectedBranchName');
    if (storedBranchName) {
      setProjectName(storedBranchName);
    }
  };

  const fetchLabours = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          role: 'labour',
          branch: branchId
        }
      });
      
      // Filter labours assigned to this branch
      const filteredLabours = res.data.filter(labour => 
        labour.role === 'labour' && 
        labour.assignedBranches?.some(branch => 
          typeof branch === 'object' ? branch._id === branchId : branch === branchId
        )
      );
      
      setLabours(filteredLabours);
    } catch (err) {
      console.error('Failed to fetch labours', err);
      setLabours([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabour = async (labourId, labourName) => {
    if (!window.confirm(`Are you sure you want to delete ${labourName}?`)) {
      return;
    }

    try {
      await axios.delete(`/users/${labourId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Labour deleted successfully');
      // Remove from local state immediately
      setLabours(labours.filter(l => l._id !== labourId));
    } catch (err) {
      console.error('Failed to delete labour:', err);
      toast.error('Failed to delete labour');
    }
  };

  const handleAttendanceChange = (labourId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [labourId]: status
    }));
  };

  const fetchExistingAttendance = async (date) => {
    try {
      const res = await axios.get('/attendance/by-date', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          branch: branchId,
          date: date
        }
      });
      
      // Convert attendance records to state format
      const existingData = {};
      res.data.forEach(record => {
        // Handle both populated and non-populated user field
        const userId = record.user?._id || record.user;
        const status = record.punchType; // 'present', 'absent', 'half-day'
        existingData[userId] = status;
      });
      setAttendanceData(existingData);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      // Reset attendance data if fetch fails
      setAttendanceData({});
    }
  };

  const handleMarkAttendance = async () => {
    try {
      const attendanceRecords = Object.entries(attendanceData).map(([labourId, status]) => ({
        user: labourId,
        branch: branchId,
        status,
        date: selectedDate
      }));

      await axios.post('/attendance/bulk', { records: attendanceRecords }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Attendance marked for ${new Date(selectedDate).toLocaleDateString()}`);
      // Refresh attendance data after saving
      fetchExistingAttendance(selectedDate);
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      toast.error('Failed to mark attendance');
    }
  };

  const filteredLabours = labours.filter(labour =>
    labour.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    labour.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    labour.mobileNumber?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl relative">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Logo" className="h-16 w-50 bg-white box-shadow rounded-2xl" />
            <Button
              variant="ghost"
              onClick={() => navigate(`/branch/${branchId}/labour-dashboard`)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 h-auto"
            >
              <FaArrowLeft size={14} />
              <span className="text-sm font-medium">Back</span>
            </Button>
          </div>

          {/* Title Section */}
          <div className="mt-6">
            <h2 className="text-white text-2xl font-bold">Labour Management</h2>
            <p className="text-white/80 text-sm mt-1">Project: {projectName || 'Loading...'}</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              All Labours
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'attendance'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Labour Attendance
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-6 py-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search labours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* All Labours Tab */}
          {activeTab === 'all' && (
            <>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm">Loading labours...</p>
                </div>
              ) : filteredLabours.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">👷</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Labours Found</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {searchTerm ? 'Try a different search term' : 'No labours assigned to this project yet'}
                  </p>
                  <Button
                    onClick={() => navigate(`/branch/${branchId}/labours/add`)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                  >
                    Add First Labour
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pb-20">
                  {filteredLabours.map((labour) => (
                    <div
                      key={labour._id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => navigate(`/branch/${branchId}/labours/${labour._id}`)}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                        >
                          {labour.name?.charAt(0)?.toUpperCase() || 'L'}
                        </div>
                        <div 
                          onClick={() => navigate(`/branch/${branchId}/labours/${labour._id}`)}
                          className="flex-1 cursor-pointer"
                        >
                          <h3 className="font-semibold text-gray-800 text-sm">
                            {labour.name || 'Unnamed Labour'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {labour.username || 'No username'}
                          </p>
                          {labour.mobileNumber && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              📞 {labour.mobileNumber}
                            </p>
                          )}
                          {labour.jobTitle && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {labour.jobTitle}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLabour(labour._id, labour.name)}
                          className="text-red-500 hover:bg-red-50 h-9 w-9"
                          title="Delete Labour"
                        >
                          <FaTrash size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Labour Attendance Tab */}
          {activeTab === 'attendance' && (
            <>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm">Loading labours...</p>
                </div>
              ) : filteredLabours.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Labours Available</h3>
                  <p className="text-sm text-gray-500 mb-4">Add labours first to mark attendance</p>
                </div>
              ) : (
                <div className="space-y-4 pb-24">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                    <label className="text-sm text-orange-800 font-semibold mb-2 block">
                      📅 Select Date for Attendance
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full bg-white border border-orange-300 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 cursor-pointer"
                        style={{
                          colorScheme: 'light'
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {filteredLabours.map((labour) => (
                    <div
                      key={labour._id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                    >
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-800 text-base text-orange-600">
                          {labour.name || 'Unnamed Labour'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {labour.jobTitle || 'No designation'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAttendanceChange(labour._id, 'present')}
                          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                            attendanceData[labour._id] === 'present'
                              ? 'bg-orange-500 text-white shadow-md'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(labour._id, 'half-day')}
                          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                            attendanceData[labour._id] === 'half-day'
                              ? 'bg-orange-500 text-white shadow-md'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Half Day
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(labour._id, 'absent')}
                          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                            attendanceData[labour._id] === 'absent'
                              ? 'bg-orange-500 text-white shadow-md'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Mark Attendance Button */}
                  {Object.keys(attendanceData).length > 0 && (
                    <div className="sticky bottom-20 bg-white pt-4 pb-6 -mx-6 px-6 border-t border-gray-100">
                      <button
                        onClick={handleMarkAttendance}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-base hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                      >
                        Mark Attendance ({Object.keys(attendanceData).length} labour{Object.keys(attendanceData).length > 1 ? 's' : ''})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Action Button - Fixed for mobile view */}
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-50">
          <div className="max-w-md mx-auto relative h-20">
            <button
              onClick={() => navigate(`/branch/${branchId}/labours/add`)}
              className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center pointer-events-auto"
              title="Add Labour"
            >
              <FaPlus size={20} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorLabourList;
