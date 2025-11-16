import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
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
  FaNotesMedical,
  FaCalendarDay,
  FaEdit,
} from "react-icons/fa";

const MINUTES_HALF_DAY = 240;
const MINUTES_FULL_DAY = 480;
const WEEK_OFF_DAYS = [0]; // Sunday

const MyAttendance = () => {
  const [records, setRecords] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("calendar"); // calendar | summary | list
  const [selectedDay, setSelectedDay] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

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
  

  // --- filter punches
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);

    return (records || []).filter((rec) => {
      const ts = new Date(rec.createdAt);
      if (Number.isNaN(ts.getTime())) return false;

      if (filter === "today") return ts.toDateString() === now.toDateString();
      if (filter === "week") return ts >= new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
      if (filter === "month")
        return ts.getMonth() === now.getMonth() && ts.getFullYear() === now.getFullYear();
      return true;
    });
  }, [records, filter]);

  // --- daily aggregation
  const dailySummary = useMemo(() => {
    const keyOf = (iso) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    };
  
    const byDay = new Map();
    for (const p of records) {
      const ts = p.createdAt;
      if (!ts) continue;
      const k = keyOf(ts);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(p);
    }
  
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const out = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = keyOf(d);
      const punches = byDay.get(key) || [];
      const dow = d.getDay();
  
      let status;
      let firstIn = null, lastOut = null, minutes = 0;
  
      if (d > today) {
        status = "Future";
      } else if (punches.some((p) => p.punchType === "leave")) {
        const leavePunch = punches.find((p) => p.punchType === "leave");
        const type = leavePunch?.leaveId?.type || "unpaid";
        status =
          type === "paid"
            ? "Paid Leave"
            : type === "unpaid"
            ? "Unpaid Leave"
            : type === "sick"
            ? "Sick Leave"
            : "Casual Leave";
      } else if (
        punches.some((p) => p.punchType === "in") &&
        punches.some((p) => p.punchType === "out")
      ) {
        const ins = punches.filter((p) => p.punchType === "in").map((x) => new Date(x.createdAt));
        const outs = punches.filter((p) => p.punchType === "out").map((x) => new Date(x.createdAt));
        firstIn = new Date(Math.min(...ins.map((x) => x.getTime())));
        lastOut = new Date(Math.max(...outs.map((x) => x.getTime())));
        minutes = Math.max(0, Math.round((lastOut - firstIn) / 60000));
  
        if (!WEEK_OFF_DAYS.includes(dow)) {
          status =
            minutes >= MINUTES_FULL_DAY
              ? "Present"
              : minutes >= MINUTES_HALF_DAY
              ? "Half Day"
              : "Absent";
        } else {
          status = "Week Off";
        }
      } else if (punches.length && !WEEK_OFF_DAYS.includes(dow)) {
        status = "Half Day";
      } else if (WEEK_OFF_DAYS.includes(dow)) {
        status = "Week Off";
      } else {
        status = "Absent";
      }
  
      out.push({ date: key, status, minutes, firstIn, lastOut, punches });
    }
  
    return out;
  }, [records, month, year]);
  

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
  

  const openDayDetail = async (day) => {
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
    if (!selectedDay) return;
    await axios.post(
      `/attendance/notes/${user._id}/${selectedDay.date}`,
      { note: selectedDay.note },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSelectedDay(null);
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
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="text-orange-600" size={16} />
            <span className="text-sm font-medium text-orange-600">Back</span>
          </button>

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
                <button
                  className="w-10 h-10 rounded-full bg-white shadow hover:shadow-md transition-all flex items-center justify-center text-orange-600"
                  onClick={() => {
                    if (month === 0) { setMonth(11); setYear(year - 1); }
                    else setMonth(month - 1);
                  }}
                >
                  <FaChevronLeft className="text-orange-600" size={16} />
                </button>
                <div className="text-center">
                  <div className="font-bold text-gray-800 text-lg">{months[month]}</div>
                  <div className="text-sm text-gray-600">{year}</div>
                </div>
                <button
                  className="w-10 h-10 rounded-full bg-white shadow hover:shadow-md transition-all flex items-center justify-center text-orange-600"
                  onClick={() => {
                    if (month === 11) { setMonth(0); setYear(year + 1); }
                    else setMonth(month + 1);
                  }}
                >
                  <FaChevronRight className="text-orange-600" size={16} />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <CalendarGrid dailySummary={dailySummary} openDayDetail={openDayDetail} month={month} year={year} />

              {/* Legend */}
              <Legend />
            </div>
          )}

          {/* Summary view */}
          {view === "summary" && (
            <div className="space-y-3">
              {dailySummary.map((d) => (
                <div
                  key={d.date}
                  className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => openDayDetail(d)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs text-orange-600 font-medium">
                            {new Date(d.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                          </div>
                          <div className="text-lg font-bold text-orange-600">
                            {new Date(d.date).getDate()}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                        <div className="text-sm text-gray-600">
                          {d.firstIn && d.lastOut
                            ? `${fmt(d.firstIn)} - ${fmt(d.lastOut)}`
                            : "No punch data"}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.minutes > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                      <FaClock size={12} />
                      <span>{Math.floor(d.minutes / 60)}h {d.minutes % 60}m worked</span>
                    </div>
                  )}
                </div>
              ))}
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
                      className={`border-t border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                      onClick={() => openDayDetail(d)}
                    >
                      <td className="p-3 text-sm text-gray-800 font-medium">
                        {new Date(d.date).getDate()} {new Date(d.date).toLocaleDateString('en-US', { month: 'short' })}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long' })}
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
              <button
                onClick={() => setSelectedDay(null)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Close
              </button>
              <button
                onClick={saveNote}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
              >
                Save Note
              </button>
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

function CalendarGrid({ dailySummary, openDayDetail, month, year }) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  
  return (
    <div className="grid grid-cols-7 gap-2 mb-6">
      {Array.from({ length: offset }).map((_, i) => (
        <div key={`blank-${i}`} className="h-14"></div>
      ))}
      {dailySummary.map((d) => (
        <div
          key={d.date}
          className={`h-14 flex items-center justify-center rounded-xl cursor-pointer font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm ${statusColor(d.status)}`}
          onClick={() => openDayDetail(d)}
        >
          {new Date(d.date).getDate()}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Present: { bg: "bg-green-500", icon: FaCheckCircle },
    "Half Day": { bg: "bg-yellow-500", icon: FaClock },
    Absent: { bg: "bg-red-500", icon: FaTimesCircle },
    "Week Off": { bg: "bg-gray-500", icon: FaUmbrellaBeach },
    "Future": { bg: "bg-gray-200 text-gray-500", icon: FaCalendarDay },
    "Paid Leave": { bg: "bg-blue-500", icon: FaUmbrellaBeach },
    "Unpaid Leave": { bg: "bg-purple-500", icon: FaUmbrellaBeach },
    "Sick Leave": { bg: "bg-orange-500", icon: FaNotesMedical },
    "Casual Leave": { bg: "bg-pink-500", icon: FaUmbrellaBeach },
  };

  const { bg, icon: Icon } = config[status] || { bg: "bg-gray-200", icon: FaCalendarDay };
  
  return (
    <span className={`px-3 py-1.5 rounded-full ${bg} text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm`}>
      <Icon size={10} />
      {status}
    </span>
  );
}

function statusColor(status) {
  return {
    Present: "bg-gradient-to-br from-green-400 to-green-500 text-white",
    "Half Day": "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white",
    Absent: "bg-gradient-to-br from-red-400 to-red-500 text-white",
    "Week Off": "bg-gradient-to-br from-gray-300 to-gray-400 text-white",
    Future: "bg-gray-100 text-gray-400 border-2 border-gray-200",
    "Paid Leave": "bg-gradient-to-br from-blue-400 to-blue-500 text-white",
    "Unpaid Leave": "bg-gradient-to-br from-purple-400 to-purple-500 text-white",
    "Sick Leave": "bg-gradient-to-br from-orange-400 to-orange-500 text-white",
    "Casual Leave": "bg-gradient-to-br from-pink-400 to-pink-500 text-white",
  }[status] || "bg-gray-100";
}

function Legend() {
  const items = [
    { label: "Present", color: "from-green-400 to-green-500" },
    { label: "Half Day", color: "from-yellow-400 to-yellow-500" },
    { label: "Absent", color: "from-red-400 to-red-500" },
    { label: "Week Off", color: "from-gray-300 to-gray-400" },
    { label: "Paid Leave", color: "from-blue-400 to-blue-500" },
    { label: "Sick Leave", color: "from-orange-400 to-orange-500" },
  ];
  
  return (
    <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-4 border border-gray-200">
      <p className="text-xs font-semibold text-gray-700 mb-3">Legend</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded bg-gradient-to-br ${i.color} shadow-sm`}></span>
            <span className="text-gray-700">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default MyAttendance;