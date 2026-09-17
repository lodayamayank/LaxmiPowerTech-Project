import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { computeDailyStatuses } from "../utils/attendanceCalculations";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaList,
  FaChartBar,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUmbrellaBeach,
  FaEdit,
} from "react-icons/fa";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  CalendarGrid,
  Legend,
  StatusBadge,
  YearAttendanceChart,
  buildYearlySummary,
} from "../components/AttendanceVisuals";

const MyAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("calendar"); // calendar | summary | list
  const [selectedDay, setSelectedDay] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // localStorage can legitimately be empty (logged-out state, cleared
  // storage, etc.) — guard against JSON.parse(null) blowing up downstream
  // whenever user._id is read.
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/attendance/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecords(res.data || []);
      } catch (err) {
        console.error("Failed to load attendance", err);
        setError("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const refresh = () => fetchData();
    window.addEventListener("leave-updated", refresh);
    return () => window.removeEventListener("leave-updated", refresh);
  }, [token]);

  // --- daily aggregation for the currently selected month
  const dailySummary = useMemo(
    () => computeDailyStatuses(records, month, year),
    [records, month, year]
  );

  // summary counts
  const counts = useMemo(
    () => ({
      present: dailySummary.filter((d) => d.status === "Present").length,
      half: dailySummary.filter((d) => d.status === "Half Day").length,
      absent: dailySummary.filter((d) => d.status === "Absent").length,
      off: dailySummary.filter((d) => d.status === "Week Off").length,
      leave: dailySummary.filter((d) => d.status.includes("Leave")).length,
    }),
    [dailySummary]
  );

  // --- yearly aggregation (12 months) for the "Year Graph" bar + trend line
  const yearlySummary = useMemo(
    () => buildYearlySummary(computeDailyStatuses, records, year),
    [records, year]
  );

  const overallYearPct = useMemo(() => {
    const withData = yearlySummary.filter((m) => m.pct > 0 || m.present + m.absent > 0);
    if (!withData.length) return 0;
    return Math.round(withData.reduce((a, b) => a + b.pct, 0) / withData.length);
  }, [yearlySummary]);

  // --- donut data for the currently selected month ("Month Graph")
  const monthDonutData = useMemo(() => {
    const present = dailySummary.filter((d) => d.status === "Present").length;
    const other = dailySummary.filter(
      (d) => !["Present", "Week Off", "Future", "Pending"].includes(d.status)
    ).length;
    return [
      { name: "Present", value: present },
      { name: "Absent/Other", value: other },
    ];
  }, [dailySummary]);

  const totalTrackedDays = dailySummary.filter(
    (d) => !["Week Off", "Future", "Pending"].includes(d.status)
  ).length;

  const openDayDetail = async (day) => {
    if (!user?._id) {
      setSelectedDay({ ...day, note: "" });
      return;
    }
    try {
      const res = await axios.get(`/attendance/notes/${user._id}/${day.date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedDay({ ...day, note: res.data?.note || "" });
    } catch {
      setSelectedDay({ ...day, note: "" });
    }
  };

  const saveNote = async () => {
    if (!selectedDay || !user?._id) {
      setSelectedDay(null);
      return;
    }
    setSavingNote(true);
    try {
      await axios.post(
        `/attendance/notes/${user._id}/${selectedDay.date}`,
        { note: selectedDay.note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedDay(null);
    } catch (err) {
      console.error("Failed to save note", err);
      toast.error("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <FaTimesCircle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <Button
            className="mobile-back-button absolute top-6 left-6"
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="text-orange-600" size={16} />
            <span className="text-sm font-medium text-orange-600">Back</span>
          </Button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">My Attendance</h1>
            <p className="text-white/80 text-sm">{user?.name}</p>
          </div>

          {/* View Toggle */}
          <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-2xl p-1.5 flex gap-1">
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                view === "calendar"
                  ? "bg-white text-orange-600 shadow-lg"
                  : "text-gray-300 hover:bg-white/10"
              }`}
              onClick={() => setView("calendar")}
            >
              <FaCalendarAlt size={14} />
              <span>Calendar</span>
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                view === "summary"
                  ? "bg-white text-orange-600 shadow-lg"
                  : "text-gray-300 hover:bg-white/10"
              }`}
              onClick={() => setView("summary")}
            >
              <FaChartBar size={14} />
              <span>Summary</span>
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                view === "list"
                  ? "bg-white text-orange-600 shadow-lg"
                  : "text-gray-300 hover:bg-white/10"
              }`}
              onClick={() => setView("list")}
            >
              <FaList size={14} />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard icon={FaCheckCircle} label="Present" count={counts.present} color="green" />
            <StatCard icon={FaClock} label="Half Day" count={counts.half} color="yellow" />
            <StatCard icon={FaTimesCircle} label="Absent" count={counts.absent} color="red" />
            <StatCard icon={FaUmbrellaBeach} label="Leaves" count={counts.leave} color="blue" />
          </div>

          {/* Calendar view */}
          {view === "calendar" && (
            <div>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 shadow-sm">
                <Button
                  className="w-10 h-10 rounded-full bg-white shadow hover:shadow-md transition-all flex items-center justify-center text-orange-600"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (month === 0) { setMonth(11); setYear(year - 1); }
                    else setMonth(month - 1);
                  }}
                >
                  <FaChevronLeft className="text-orange-600" size={16} />
                </Button>
                <div className="text-center">
                  <div className="font-bold text-gray-800 text-lg">{months[month]}</div>
                  <div className="text-sm text-gray-600">{year}</div>
                </div>
                <Button
                  className="w-10 h-10 rounded-full bg-white shadow hover:shadow-md transition-all flex items-center justify-center text-orange-600"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (month === 11) { setMonth(0); setYear(year + 1); }
                    else setMonth(month + 1);
                  }}
                >
                  <FaChevronRight className="text-orange-600" size={16} />
                </Button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid (shared with the admin attendance modal) */}
              <div className="mb-6">
                <CalendarGrid dailySummary={dailySummary} onDayClick={openDayDetail} month={month} year={year} />
              </div>

              <Legend />
            </div>
          )}

          {/* Summary view */}
          {view === "summary" && (
            <div className="space-y-6">
              {/* Year Graph: bar + trend line, per month attendance % */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Year Graph</p>
                  <div className="flex items-center gap-2">
                    <Button
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      variant="ghost"
                      size="icon"
                      onClick={() => setYear(year - 1)}
                    >
                      <FaChevronLeft className="text-gray-600" size={12} />
                    </Button>
                    <span className="text-sm font-medium text-gray-700 w-12 text-center">{year}</span>
                    <Button
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      variant="ghost"
                      size="icon"
                      onClick={() => setYear(year + 1)}
                    >
                      <FaChevronRight className="text-gray-600" size={12} />
                    </Button>
                  </div>
                </div>
                <YearAttendanceChart yearlySummary={yearlySummary} />
                <p className="text-center text-sm text-gray-600 mt-2">
                  Over all percentage{" "}
                  <span className="font-bold text-gray-800">{overallYearPct}%</span>
                </p>
              </div>

              {/* Month Graph: donut for a chosen month, with its own month nav */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Month Graph</p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (month === 0) { setMonth(11); setYear(year - 1); }
                        else setMonth(month - 1);
                      }}
                    >
                      <FaChevronLeft className="text-gray-600" size={12} />
                    </Button>
                    <span className="text-sm font-medium text-gray-700 w-24 text-center">
                      {months[month]} {year}
                    </span>
                    <Button
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (month === 11) { setMonth(0); setYear(year + 1); }
                        else setMonth(month + 1);
                      }}
                    >
                      <FaChevronRight className="text-gray-600" size={12} />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={monthDonutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={65}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill="#f97316" />
                        <Cell fill="#1e293b" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-sm text-gray-700 space-y-1.5 flex-1">
                    <p className="flex justify-between">
                      <span className="text-gray-500">Total Days</span>
                      <span className="font-semibold">{totalTrackedDays}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Present days</span>
                      <span className="font-semibold text-green-600">{counts.present}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Absent days</span>
                      <span className="font-semibold text-red-600">{counts.absent}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List view */}
          {view === "list" && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <th className="p-3 text-left text-sm font-semibold">Date</th>
                    <th className="p-3 text-left text-sm font-semibold">Day</th>
                    <th className="p-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummary.map((d, idx) => (
                    <tr
                      key={d.date}
                      role="button"
                      tabIndex={0}
                      className={`border-t border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                      onClick={() => openDayDetail(d)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDayDetail(d);
                        }
                      }}
                    >
                      <td className="p-3 text-sm text-gray-800 font-medium">
                        {new Date(`${d.date}T00:00:00`).getDate()} {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}
                  </h2>
                  <p className="text-white/80 text-sm">{selectedDay.date}</p>
                </div>
                <StatusBadge status={selectedDay.status} />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Time Info */}
              {selectedDay.firstIn && selectedDay.lastOut && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <FaClock className="text-blue-600" size={18} />
                    <span className="font-semibold text-gray-800">Working Hours</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-600">Check In</p>
                      <p className="font-semibold text-gray-800">{fmt(selectedDay.firstIn)}</p>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div>
                      <p className="text-gray-600">Check Out</p>
                      <p className="font-semibold text-gray-800">{fmt(selectedDay.lastOut)}</p>
                    </div>
                  </div>
                  {selectedDay.minutes > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm text-gray-600">
                        Total: <span className="font-semibold text-blue-600">
                          {Math.floor(selectedDay.minutes / 60)}h {selectedDay.minutes % 60}m
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Section */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FaEdit className="text-orange-500" />
                  Add Note
                </label>
                <textarea
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  rows={4}
                  value={selectedDay.note || ""}
                  placeholder="Add a note about this day..."
                  onChange={(e) => setSelectedDay({ ...selectedDay, note: e.target.value })}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 px-6 pb-6">
              <Button
                onClick={() => setSelectedDay(null)}
                variant="outline"
                className="flex-1 px-4 py-3 h-auto rounded-xl border-2 border-gray-300 text-gray-700 font-semibold"
              >
                Close
              </Button>
              <Button
                onClick={saveNote}
                disabled={savingNote}
                className="flex-1 px-4 py-3 h-auto rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 shadow-lg disabled:opacity-60"
              >
                {savingNote ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---

function StatCard({ icon: Icon, label, count, color }) {
  const colors = {
    green: "from-green-400 to-green-500",
    yellow: "from-yellow-400 to-yellow-500",
    red: "from-red-400 to-red-500",
    blue: "from-blue-400 to-blue-500",
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="text-white" size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{count}</p>
          <p className="text-xs text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}

function fmt(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default MyAttendance;