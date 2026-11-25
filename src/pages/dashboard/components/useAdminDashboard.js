// src/pages/dashboard/components/useAdminDashboard.js
// Data and state for the admin dashboard: the one summary request, the attendance-records request and its filters,
// the grouped/filtered/paged table rows and the CSV export. Moved unchanged from AdminDashboard.jsx (only the
// "No records to export" alert became a toast).
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import axios from "@/api/client";
import { getToken } from "@/lib/session";

const pad = (n) => String(n).padStart(2, "0");
const localDay = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const getToday = () => localDay(new Date());
const punchTypeOrder = { in: 0, out: 1, half: 2, absent: 3, weekoff: 4, paidleave: 5, unpaidleave: 6, overtime: 7 };

export default function useAdminDashboard() {
  const [attendances, setAttendances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchStaff, setSearchStaff] = useState("");
  const [role, setRole] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const token = useMemo(() => getToken(), []);
  const today = getToday();
  const hasCustomRange = Boolean(startDate || endDate);
  const auth = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = { role: role || undefined };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.month = Number(month);
        params.year = Number(year);
      }
      const res = await axios.get("/attendance", { headers: auth, params });
      setAttendances(Array.isArray(res.data) ? res.data : res.data.rows || []);
    } catch (err) {
      console.error("Failed to fetch attendance", err);
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  }, [role, month, year, startDate, endDate, token, auth]);

  // All dashboard numbers come from one summary route
  useEffect(() => {
    if (!token) return;
    axios
      .get("/attendance/dashboard-summary", { headers: auth })
      .then((res) => setSummary(res.data))
      .catch((err) => {
        console.error("Failed to fetch dashboard summary", err);
        setSummary(null);
      });
  }, [token, auth]);

  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [role, month, year, startDate, endDate, token]);
  useEffect(() => {
    setCurrentPage(1);
  }, [role, month, year, startDate, endDate, searchStaff, itemsPerPage]);

  /* ----- dashboard metrics (from /attendance/dashboard-summary) ----- */
  const stats = useMemo(() => {
    const d = summary || {};
    const y = d.yesterday || {};
    const pct = (a, b) => (b ? ((a || 0) / b) * 100 : 0);
    const trend = (cur, prev) =>
      prev ? Math.round(((cur - prev) / prev) * 100) : null;
    return {
      known: d.totalEmployees ?? 0,
      present: d.present ?? 0,
      absent: d.absent ?? 0,
      late: d.late ?? 0,
      pendingLeaves: d.pendingLeaves ?? 0,
      incomplete: d.attention?.incompletePunchOut ?? 0,
      pctPresent: pct(d.present, d.totalEmployees),
      pctAbsent: pct(d.absent, d.totalEmployees),
      pctLate: pct(d.late, d.present),
      trends: {
        present: trend(d.present, y.present),
        absent: trend(d.absent, y.absent),
        late: trend(d.late, y.late),
      },
      days: (d.weekly || []).map((w) => ({
        label: w.label,
        present: Math.max(0, w.present - w.late), // chart stacks on-time + late
        late: w.late,
        absent: w.absent,
      })),
      branches: (d.branches || []).map((b) => ({
        branch: b.name,
        employees: b.employees,
        present: b.present,
        pct: b.attendance,
      })),
    };
  }, [summary]);

  /* ----- records table data ----- */
  const groupedAttendances = useMemo(() => {
    const groups = {};
    attendances.forEach((record) => {
      const date = new Date(record.createdAt).toLocaleDateString();
      const key = `${record.user?._id}_${date}`;
      if (!groups[key]) {
        groups[key] = {
          _id: key,
          user: record.user,
          createdAt: record.createdAt,
          dateString: date,
          branch: record.branch,
          note: record.note,
          punchIn: null,
          punchOut: null,
          selfieIn: null,
          selfieOut: null,
          markedByIn: null,
          markedByOut: null,
          punchTypes: [],
        };
      }
      const g = groups[key];
      if (!g.punchTypes.includes(record.punchType))
        g.punchTypes.push(record.punchType);
      if (record.punchType === "in") {
        g.punchIn = record.createdAt;
        g.selfieIn = record.selfieUrl;
        g.markedByIn = record.markedBy;
      } else if (record.punchType === "out") {
        g.punchOut = record.createdAt;
        g.selfieOut = record.selfieUrl;
        g.markedByOut = record.markedBy;
      }
    });
    return Object.values(groups).map((g) => ({
      ...g,
      punchTypes: [...g.punchTypes].sort(
        (a, b) => (punchTypeOrder[a] ?? 99) - (punchTypeOrder[b] ?? 99),
      ),
    }));
  }, [attendances]);

  const filtered = useMemo(
    () =>
      groupedAttendances.filter((r) =>
        r.user?.name?.toLowerCase().includes(searchStaff.toLowerCase()),
      ),
    [groupedAttendances, searchStaff],
  );

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filtered.slice(startIndex, endIndex);
  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const downloadCSV = () => {
    if (!filtered.length) return toast.info("No records to export");
    const headers = [
      "Name",
      "Role",
      "Date",
      "Punch In Time",
      "Punch Out Time",
      "Branch",
      "Note",
    ];
    const rows = filtered.map((i) => [
      i.user?.name || "N/A",
      i.user?.role || "-",
      i.dateString,
      i.punchIn ? new Date(i.punchIn).toLocaleTimeString() : "-",
      i.punchOut ? new Date(i.punchOut).toLocaleTimeString() : "-",
      i.branch || "Outside Assigned Branch",
      i.note || "-",
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `attendance_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onSearch = (e) => {
    e.preventDefault();
    if (startDate && !endDate) return setEndDate(startDate);
    if (!startDate && endDate) return setStartDate(endDate);
    fetchData();
  };
  const resetFilters = () => {
    setSearchStaff("");
    setRole("");
    setStartDate("");
    setEndDate("");
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
  };
  const handleStartDateChange = (v) => {
    if (v > today) v = today;
    setStartDate(v);
    if (endDate && v && v > endDate) setEndDate(v);
  };
  const handleEndDateChange = (v) => {
    if (v > today) v = today;
    setEndDate(v);
    if (startDate && v && v < startDate) setStartDate(v);
  };

  return {
    summary, stats, loading, filtered, currentItems, totalItems, totalPages, startIndex, endIndex, currentPage, goToPage, itemsPerPage, setItemsPerPage,
    searchStaff, setSearchStaff, role, setRole, month, setMonth, year, setYear, startDate, endDate, hasCustomRange, today,
    downloadCSV, onSearch, resetFilters, handleStartDateChange, handleEndDateChange, fetchData,
  };
}
