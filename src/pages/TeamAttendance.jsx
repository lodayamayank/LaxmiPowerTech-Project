import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import logo from '../assets/logo.png';
import { FaArrowLeft, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TeamAttendance = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    totalLabours: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLeaves: 0,
    totalOvertimeHours: 0
  });
  const projectName = localStorage.getItem('selectedBranchName') || 'Project';
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (branchId) {
      fetchTeamAttendance();
    }
  }, [startDate, endDate, branchId]);

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);
      
      // Fetch all labours for this branch
      const usersRes = await axios.get('/users', {
        params: { role: 'labour' },
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter labours by branch
      const branchLabours = usersRes.data.filter(user => {
        if (Array.isArray(user.assignedBranches)) {
          return user.assignedBranches.some(branch => 
            (typeof branch === 'object' ? branch._id : branch) === branchId
          );
        }
        return false;
      });

      if (branchLabours.length === 0) {
        setLabours([]);
        setLoading(false);
        return;
      }

      // Fetch attendance data for date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const allAttendance = [];
      
      // Fetch attendance for each date in range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        try {
          const attendanceRes = await axios.get('/attendance/by-date', {
            params: { 
              branch: branchId,
              date: dateStr
            },
            headers: { Authorization: `Bearer ${token}` }
          });
          if (attendanceRes.data && Array.isArray(attendanceRes.data)) {
            allAttendance.push(...attendanceRes.data);
          }
        } catch (err) {
          // Continue if no attendance for this date
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate stats for each labour
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLeaves = 0;
      let totalOvertimeHours = 0;

      const laboursWithStats = branchLabours.map(labour => {
        const labourAttendance = allAttendance.filter(
          att => {
            const userId = att.user?._id || att.user;
            return userId === labour._id;
          }
        );

        const presentDays = labourAttendance.filter(att => att.punchType === 'present').length;
        const absentDays = labourAttendance.filter(att => att.punchType === 'absent').length;
        const halfDays = labourAttendance.filter(att => att.punchType === 'half-day').length;
        const leaves = labourAttendance.filter(att => att.punchType === 'leave').length;

        // Calculate overtime hours
        const overtimeHours = labourAttendance.reduce((total, att) => {
          return total + (att.overtimeHours || 0);
        }, 0);

        totalPresent += presentDays;
        totalAbsent += absentDays;
        totalLeaves += leaves;
        totalOvertimeHours += overtimeHours;

        return {
          ...labour,
          presentDays,
          absentDays,
          halfDays,
          leaves,
          overtimeHours,
          totalDays: labourAttendance.length,
          attendance: labourAttendance
        };
      });

      setLabours(laboursWithStats);
      setSummary({
        totalLabours: branchLabours.length,
        totalPresent,
        totalAbsent,
        totalLeaves,
        totalOvertimeHours
      });
    } catch (err) {
      console.error('Failed to fetch team attendance:', err);
      toast.error(err.response?.data?.message || 'Failed to load team attendance data');
      setLabours([]);
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto min-h-screen bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Logo" className="h-16 w-50 bg-white box-shadow rounded-2xl" />
            <button
              onClick={() => navigate(`/branch/${branchId}/labour-dashboard`)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
              <FaArrowLeft size={14} />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-white text-2xl font-bold">Team Attendance</h2>
            <p className="text-white/80 text-sm mt-1">Project: {projectName}</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="px-6 py-4 bg-white border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && labours.length > 0 && (
          <div className="px-6 py-6 bg-gradient-to-r from-gray-50 to-white border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Overview Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                <FaUsers className="text-blue-500 mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold text-blue-600">{summary.totalLabours}</p>
                <p className="text-xs text-gray-600">Total Labours</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                <FaCheckCircle className="text-green-500 mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold text-green-600">{summary.totalPresent}</p>
                <p className="text-xs text-gray-600">Total Present</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                <FaTimesCircle className="text-red-500 mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold text-red-600">{summary.totalAbsent}</p>
                <p className="text-xs text-gray-600">Total Absent</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                <FaCalendarAlt className="text-blue-500 mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold text-blue-600">{summary.totalLeaves}</p>
                <p className="text-xs text-gray-600">Total Leaves</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                <FaClock className="text-purple-500 mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold text-purple-600">{summary.totalOvertimeHours.toFixed(1)}</p>
                <p className="text-xs text-gray-600">OT Hours</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading attendance data...</p>
            </div>
          ) : labours.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FaUsers className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Attendance Data Found</h3>
              <p className="text-sm text-gray-500">No labours or attendance records found for the selected date range</p>
            </div>
          ) : (
            <div className="space-y-4">
              {labours.map((labour) => (
                <div
                  key={labour._id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                        {labour.name?.charAt(0)?.toUpperCase() || 'L'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{labour.name}</h3>
                        <p className="text-sm text-gray-500">{labour.jobTitle || 'Labour'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <FaCheckCircle className="text-green-500 mx-auto mb-1" size={20} />
                      <p className="text-2xl font-bold text-green-600">{labour.presentDays}</p>
                      <p className="text-xs text-gray-600">Present</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <FaTimesCircle className="text-red-500 mx-auto mb-1" size={20} />
                      <p className="text-2xl font-bold text-red-600">{labour.absentDays}</p>
                      <p className="text-xs text-gray-600">Absent</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <FaClock className="text-yellow-500 mx-auto mb-1" size={20} />
                      <p className="text-2xl font-bold text-yellow-600">{labour.halfDays}</p>
                      <p className="text-xs text-gray-600">Half Day</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <FaCalendarAlt className="text-blue-500 mx-auto mb-1" size={20} />
                      <p className="text-2xl font-bold text-blue-600">{labour.leaves}</p>
                      <p className="text-xs text-gray-600">Leaves</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <FaClock className="text-purple-500 mx-auto mb-1" size={20} />
                      <p className="text-2xl font-bold text-purple-600">{labour.overtimeHours.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">OT Hours</p>
                    </div>
                  </div>

                  {/* Working Details */}
                  {labour.standardDailyHours && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Working Hours:</span>
                          <span className="ml-2 font-medium">{labour.standardDailyHours} hrs/day</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Daily Wage:</span>
                          <span className="ml-2 font-medium">₹{labour.ctcAmount || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

export default TeamAttendance;
