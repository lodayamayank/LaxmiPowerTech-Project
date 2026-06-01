import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import logo from '../assets/logo.png';
import { FaArrowLeft, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaUsers, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';

const statusBadgeClass = {
  in:         'bg-green-100 text-green-800',
  out:        'bg-blue-100 text-blue-800',
  absent:     'bg-red-100 text-red-800',
  'half-day': 'bg-yellow-100 text-yellow-800',
  present:    'bg-green-100 text-green-800',
};

// Build an ISO datetime string for a given date (YYYY-MM-DD) and time (HH:MM)
// Uses explicit year/month/day construction to avoid UTC-midnight parsing issues
const buildDateTime = (date, time) => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0).toISOString();
};

const TeamAttendance = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const token = localStorage.getItem('token');
  const projectName = localStorage.getItem('selectedBranchName') || 'Project';

  // ── Tab: 'summary' | 'mark' ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('summary');

  // ── Summary tab state ────────────────────────────────────────────────────
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    totalLabours: 0, totalPresent: 0, totalAbsent: 0, totalLeaves: 0, totalOvertimeHours: 0,
  });

  // ── Mark tab state ───────────────────────────────────────────────────────
  const [markDate, setMarkDate] = useState(new Date().toISOString().split('T')[0]);
  // each member: { ...user, inTime, outTime, isAbsent, savedIn, savedOut }
  const [markMembers, setMarkMembers] = useState([]);
  const [markLoading, setMarkLoading] = useState(false);

  // ────────────────────────────────────────────────────────────────────────
  // SUMMARY: fetch labours + attendance for date range
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (branchId && activeTab === 'summary') fetchTeamAttendance();
  }, [viewDate, branchId, activeTab]);

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);

      const [usersRes, attendanceRes] = await Promise.all([
        axios.get('/users', { params: { role: 'labour' }, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/attendance/by-date', { params: { branch: branchId, date: viewDate }, headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const branchLabours = (usersRes.data || []).filter(user =>
        Array.isArray(user.assignedBranches) &&
        user.assignedBranches.some(b => (typeof b === 'object' ? b._id : b) === branchId)
      );

      if (branchLabours.length === 0) {
        setLabours([]);
        setLoading(false);
        return;
      }

      const allAttendance = attendanceRes.data || [];

      let totalPresent = 0, totalPunchedIn = 0, totalAbsent = 0, totalHalf = 0, totalOvertimeHours = 0;

      const laboursWithStats = branchLabours.map(labour => {
        const recs = allAttendance.filter(a => (a.user?._id || a.user) === labour._id);

        const inRec  = recs.find(a => a.punchType === 'in');
        const outRec = recs.find(a => a.punchType === 'out');
        const isAbsent = recs.some(a => a.punchType === 'absent');

        // Calculate duration from actual punch times
        let durationMinutes = 0;
        let overtimeHours = 0;
        if (inRec && outRec) {
          const inTime  = new Date(inRec.punchTime  || inRec.createdAt);
          const outTime = new Date(outRec.punchTime || outRec.createdAt);
          durationMinutes = (outTime - inTime) / (1000 * 60);
          const durationHours = durationMinutes / 60;
          overtimeHours = Math.max(0, durationHours - 9);
        }

        // Classify based on duration — mirrors salary service exactly
        const hasIn  = !!inRec;
        const hasOut = !!outRec;
        const isFullDay       = hasIn && hasOut && durationMinutes >= 480;
        const isHalfDay       = recs.some(a => ['half', 'half-day'].includes(a.punchType)) ||
                                (hasIn && hasOut && durationMinutes >= 240 && durationMinutes < 480);
        const isTooShort      = hasIn && hasOut && durationMinutes < 240; // < 4 hrs → absent
        const isPunchedInOnly = hasIn && !hasOut;

        if (isFullDay)            totalPresent++;
        else if (isPunchedInOnly) totalPunchedIn++;
        if (isAbsent || isTooShort) totalAbsent++;
        if (isHalfDay)            totalHalf++;
        totalOvertimeHours += overtimeHours;

        let status = null;
        if (isAbsent || isTooShort) status = 'absent';
        else if (isFullDay)         status = 'present';
        else if (isHalfDay)         status = 'half-day';
        else if (isPunchedInOnly)   status = 'in';

        return { ...labour, isPresent: isFullDay, isPunchedInOnly, isAbsent, isHalf: isHalfDay, overtimeHours, status };
      });

      setLabours(laboursWithStats);
      setSummary({ totalLabours: branchLabours.length, totalPresent, totalPunchedIn, totalAbsent, totalHalf, totalOvertimeHours });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team attendance data');
      setLabours([]);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // MARK: fetch labours + today's existing attendance
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (branchId && activeTab === 'mark') fetchMarkData();
  }, [branchId, markDate, activeTab]);

  const fetchMarkData = async () => {
    setMarkLoading(true);
    try {
      const [usersRes, attendanceRes] = await Promise.all([
        axios.get('/users', { params: { role: 'labour' }, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/attendance/by-date', { params: { branch: branchId, date: markDate }, headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const branchMembers = (usersRes.data || []).filter(u =>
        Array.isArray(u.assignedBranches) &&
        u.assignedBranches.some(b => (typeof b === 'object' ? b._id : b) === branchId)
      );

      // Group existing records by user
      const byUser = {};
      (attendanceRes.data || []).forEach(a => {
        const uid = a.user?._id || a.user;
        if (!byUser[uid]) byUser[uid] = [];
        byUser[uid].push(a);
      });

      const toTime = (isoStr) => {
        if (!isoStr) return null;
        const d = new Date(isoStr);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      setMarkMembers(branchMembers.map(u => {
        const recs = byUser[u._id] || [];
        const inRec  = recs.find(r => r.punchType === 'in');
        const outRec = recs.find(r => r.punchType === 'out');
        const absRec = recs.find(r => r.punchType === 'absent');
        return {
          ...u,
          inTime:   toTime(inRec?.punchTime || inRec?.createdAt) || '09:00',
          outTime:  toTime(outRec?.punchTime || outRec?.createdAt) || '18:00',
          isAbsent: !!absRec,
          savedIn:  !!inRec,
          savedOut: !!outRec,
        };
      }));
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setMarkLoading(false);
    }
  };

  const updateMember = (userId, patch) =>
    setMarkMembers(prev => prev.map(m => m._id === userId ? { ...m, ...patch } : m));

  const [savingMap, setSavingMap] = useState({}); // { userId_in: true, userId_out: true, userId_absent: true }

  const punchMember = async (member, direction) => {
    if (direction === 'out' && !member.savedIn) {
      toast.error(`${member.name} has no Punch In — record punch in first`);
      return;
    }
    if (direction === 'out') {
      const inDt  = buildDateTime(markDate, member.inTime);
      const outDt = buildDateTime(markDate, member.outTime);
      if (new Date(outDt) <= new Date(inDt)) {
        toast.error(`Punch Out time must be after Punch In time (${member.inTime})`);
        return;
      }
    }
    const key = `${member._id}_${direction}`;
    setSavingMap(prev => ({ ...prev, [key]: true }));
    try {
      const record = direction === 'absent'
        ? { user: member._id, branch: branchId, status: 'absent', date: markDate }
        : { user: member._id, branch: branchId, status: direction, date: markDate, punchTime: buildDateTime(markDate, direction === 'in' ? member.inTime : member.outTime) };

      await axios.post('/attendance/bulk', { records: [record] }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`${member.name} — ${direction === 'in' ? 'Punch In' : direction === 'out' ? 'Punch Out' : 'Absent'} saved`);
      // Update local state immediately without full refetch
      setMarkMembers(prev => prev.map(m => {
        if (m._id !== member._id) return m;
        if (direction === 'in')      return { ...m, savedIn: true, isAbsent: false };
        if (direction === 'out')     return { ...m, savedOut: true, isAbsent: false };
        if (direction === 'absent')  return { ...m, isAbsent: true, savedIn: false, savedOut: false };
        return m;
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  // Compute mark-tab counts based on saved punch times
  const markStats = {
    total:    markMembers.length,
    present:  markMembers.filter(m => m.savedIn && m.savedOut).length,
    absent:   markMembers.filter(m => m.isAbsent).length,
    punchedIn:  markMembers.filter(m => m.savedIn).length,
    punchedOut: markMembers.filter(m => m.savedOut).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto min-h-screen bg-white shadow-xl">

        {/* ── Header (unchanged design) ── */}
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
          <div className="mt-6">
            <h2 className="text-white text-2xl font-bold">Team Attendance</h2>
            <p className="text-white/80 text-sm mt-1">Project: {projectName}</p>
          </div>

          {/* ── Tab switcher inside header ── */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'summary'
                  ? 'bg-white text-orange-600 shadow'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('mark')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'mark'
                  ? 'bg-white text-orange-600 shadow'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <FaEdit size={13} />
              Mark Attendance
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB: SUMMARY (existing UI, unchanged)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'summary' && (
          <>
            {/* Single Date Filter */}
            <div className="px-6 py-4 bg-white border-b">
              <label className="text-xs font-medium text-gray-600 mb-1 block">View Date</label>
              <input
                type="date"
                value={viewDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setViewDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>

            {/* Summary Cards */}
            {!loading && labours.length > 0 && (
              <div className="px-6 py-6 bg-gradient-to-r from-gray-50 to-white border-b">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Overview Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                    <FaUsers className="text-blue-500 mx-auto mb-2" size={24} />
                    <p className="text-2xl font-bold text-blue-600">{summary.totalLabours}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                    <FaCheckCircle className="text-green-500 mx-auto mb-2" size={24} />
                    <p className="text-2xl font-bold text-green-600">{summary.totalPresent}</p>
                    <p className="text-xs text-gray-600">Present</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                    <FaClock className="text-orange-500 mx-auto mb-2" size={24} />
                    <p className="text-2xl font-bold text-orange-500">{summary.totalPunchedIn || 0}</p>
                    <p className="text-xs text-gray-600">Punched In</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                    <FaTimesCircle className="text-red-500 mx-auto mb-2" size={24} />
                    <p className="text-2xl font-bold text-red-600">{summary.totalAbsent}</p>
                    <p className="text-xs text-gray-600">Absent</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                    <FaClock className="text-yellow-500 mx-auto mb-2" size={24} />
                    <p className="text-2xl font-bold text-yellow-600">{summary.totalHalf || 0}</p>
                    <p className="text-xs text-gray-600">Half Day</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
                    <FaClock className="text-purple-500 mx-auto mb-2" size={24} />
                    <p className="text-2xl font-bold text-purple-600">{(summary.totalOvertimeHours || 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-600">OT Hours</p>
                  </div>
                </div>
              </div>
            )}

            {/* Labour Cards */}
            <div className="px-6 py-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
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
                  {labours.map(labour => {
                    const labelMap = { in: 'Punched In', out: 'Punched Out', present: 'Present', absent: 'Absent', 'half-day': 'Half Day', half: 'Half Day', paidleave: 'Paid Leave', unpaidleave: 'Unpaid Leave' };
                    const statusLabel = labour.status ? (labelMap[labour.status] || labour.status) : 'Not Marked';
                    const statusClass = labour.status
                      ? statusBadgeClass[labour.status] || 'bg-gray-100 text-gray-600'
                      : 'bg-gray-100 text-gray-400';
                    return (
                      <div key={labour._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                              {labour.name?.charAt(0)?.toUpperCase() || 'L'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{labour.name}</h3>
                              <p className="text-sm text-gray-500">{labour.jobTitle || 'Labour'} · {labour.employeeId || labour.username}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-sm">
                          {labour.standardDailyHours && (
                            <div><span className="text-gray-400">Std Hours:</span> <span className="font-medium">{labour.standardDailyHours} hrs</span></div>
                          )}
                          {labour.ctcAmount > 0 && (
                            <div><span className="text-gray-400">Daily Wage:</span> <span className="font-medium">₹{labour.ctcAmount}</span></div>
                          )}
                          <div>
                            <span className="text-gray-400">OT Hours:</span>{' '}
                            <span className={`font-semibold ${labour.overtimeHours > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                              {labour.overtimeHours > 0 ? `${labour.overtimeHours.toFixed(1)} hrs` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: MARK ATTENDANCE
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'mark' && (
          <>
            {/* Date picker */}
            <div className="px-6 py-4 bg-white border-b">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Attendance Date</label>
              <input
                type="date"
                value={markDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setMarkDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>

            {/* Mini summary strip */}
            {!markLoading && markMembers.length > 0 && (
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-blue-600">{markStats.total}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-green-600">{markStats.present}</p>
                    <p className="text-xs text-gray-600">Present</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-red-600">{markStats.absent}</p>
                    <p className="text-xs text-gray-600">Absent</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-orange-500">{markStats.punchedIn}</p>
                    <p className="text-xs text-gray-600">Punch In</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-blue-400">{markStats.punchedOut}</p>
                    <p className="text-xs text-gray-600">Punch Out</p>
                  </div>
                </div>
              </div>
            )}

            {/* Member list */}
            <div className="px-6 py-6">
              {markLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
                  <p className="text-gray-500">Loading team...</p>
                </div>
              ) : markMembers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <FaUsers className="text-gray-400" size={40} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Team Members</h3>
                  <p className="text-sm text-gray-500">No labours are assigned to this branch</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {markMembers.map((member, idx) => (
                    <div
                      key={member._id}
                      className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                        member.isAbsent ? 'border-red-200 bg-red-50/40' :
                        member.savedIn && member.savedOut ? 'border-green-200 bg-green-50/40' :
                        member.savedIn ? 'border-orange-200 bg-orange-50/40' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Member info row */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold">
                            {member.name?.charAt(0)?.toUpperCase() || 'L'}
                          </div>
                          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.jobTitle || 'Labour'} · {member.employeeId || member.username}</p>
                        </div>
                        {/* Status badge */}
                        {member.isAbsent && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">Absent</span>
                        )}
                        {!member.isAbsent && member.savedIn && member.savedOut && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Present</span>
                        )}
                        {!member.isAbsent && member.savedIn && !member.savedOut && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700">Punched In</span>
                        )}
                      </div>

                      {/* Punch In row */}
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="time"
                          value={member.inTime}
                          onChange={e => updateMember(member._id, { inTime: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <button
                          onClick={() => punchMember(member, 'in')}
                          disabled={!!savingMap[`${member._id}_in`]}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all min-w-[100px] ${
                            member.savedIn
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-green-600 border-green-400 hover:bg-green-50'
                          } disabled:opacity-50`}
                        >
                          {savingMap[`${member._id}_in`] ? '...' : member.savedIn ? '✓ In' : 'Punch In'}
                        </button>
                      </div>

                      {/* Punch Out row */}
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="time"
                          value={member.outTime}
                          onChange={e => updateMember(member._id, { outTime: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => punchMember(member, 'out')}
                          disabled={!!savingMap[`${member._id}_out`]}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all min-w-[100px] ${
                            member.savedOut
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-blue-600 border-blue-400 hover:bg-blue-50'
                          } disabled:opacity-50`}
                        >
                          {savingMap[`${member._id}_out`] ? '...' : member.savedOut ? '✓ Out' : 'Punch Out'}
                        </button>
                      </div>

                      {/* Absent button */}
                      <button
                        onClick={() => punchMember(member, 'absent')}
                        disabled={!!savingMap[`${member._id}_absent`]}
                        className={`w-full py-2 rounded-lg text-sm font-semibold border-2 transition-all disabled:opacity-50 ${
                          member.isAbsent
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-500'
                        }`}
                      >
                        {savingMap[`${member._id}_absent`] ? 'Saving...' : member.isAbsent ? '✓ Absent' : 'Mark Absent'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <p className="text-xs text-gray-400 text-center">Powered by Laxmi Power Tech</p>
        </div>
      </div>
    </div>
  );
};

export default TeamAttendance;
