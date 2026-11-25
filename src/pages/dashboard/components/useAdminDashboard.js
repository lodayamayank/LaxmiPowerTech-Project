// src/pages/dashboard/components/useAdminDashboard.js
// Data and state for the admin dashboard: the one summary request, the attendance-records request and its filters,
// the grouped/filtered/paged table rows and the CSV export. Moved unchanged from AdminDashboard.jsx (only the
// "No records to export" alert became a toast).
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { fetchUsersCached } from "@/hooks/useUsers";

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

  // The dashboard numbers are worked out in the browser from endpoints that already exist (there is no dedicated
  // summary route): today's live status of everyone, the last 7 days of attendance records, the users with their
  // assigned branches and the pending-leave count. Each source is optional: if one fails, only its numbers are empty.
  useEffect(() => {
    if (!token) return undefined;
    let ignore = false;
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    Promise.allSettled([
      axios.get("/attendance/live", { headers: auth }),
      axios.get("/attendance", { headers: auth, params: { startDate: localDay(days[0]), endDate: localDay(days[6]) } }),
      axios.get("/leaves/pending-count", { headers: auth }),
      fetchUsersCached(),
    ]).then(([liveRes, weekRes, leavesRes, usersRes]) => {
      if (ignore) return;
      const live = liveRes.status === "fulfilled" && Array.isArray(liveRes.value.data) ? liveRes.value.data : null;
      if (!live) {
        console.error("Failed to fetch live attendance for the dashboard", liveRes.reason);
        setSummary(null);
        return;
      }
      const records = weekRes.status === "fulfilled" ? (Array.isArray(weekRes.value.data) ? weekRes.value.data : weekRes.value.data?.rows || []) : [];
      const users = usersRes.status === "fulfilled" ? usersRes.value : [];

      const known = live.length;
      const isLeave = (st) => st === "paidleave" || st === "unpaidleave";
      const present = live.filter((u) => u.status === "in" || u.status === "out").length;
      const onLeave = live.filter((u) => isLeave(u.status)).length;
      const absent = live.filter((u) => u.status === "no_punch").length;

      // Per day: who punched / was on leave / was marked week off, from the records.
      const byDay = new Map(days.map((d) => [localDay(d), { present: new Set(), leave: new Set(), off: new Set(), ins: new Set(), outs: new Set() }]));
      records.forEach((r) => {
        const day = byDay.get(localDay(r.createdAt));
        const id = r.user?._id;
        if (!day || !id) return;
        if (["in", "out", "half", "overtime"].includes(r.punchType)) day.present.add(id);
        if (r.punchType === "in") day.ins.add(id);
        if (r.punchType === "out") day.outs.add(id);
        if (["leave", "paidleave", "unpaidleave"].includes(r.punchType)) day.leave.add(id);
        if (r.punchType === "weekoff") day.off.add(id);
      });
      const weekly = days.map((d, i) => {
        const v = byDay.get(localDay(d));
        const isToday = i === days.length - 1;
        const p = isToday ? present : v.present.size;
        const l = isToday ? onLeave : v.leave.size;
        return {
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          present: p,
          late: 0,
          absent: isToday ? absent : Math.max(0, known - p - l - v.off.size),
        };
      });
      const yday = byDay.get(localDay(days[5]));
      const incompletePunchOut = [...yday.ins].filter((id) => !yday.outs.has(id)).length;

      // Branch rows: everyone assigned to a branch vs. those of them who are in/out today.
      const status = new Map(live.map((u) => [String(u._id), u.status]));
      const perBranch = new Map();
      users.forEach((u) => {
        (u.assignedBranches || []).forEach((b) => {
          const name = b?.name;
          if (!name) return;
          const row = perBranch.get(name) || { name, employees: 0, present: 0 };
          row.employees += 1;
          const st = status.get(String(u._id));
          if (st === "in" || st === "out") row.present += 1;
          perBranch.set(name, row);
        });
      });
      const branches = [...perBranch.values()]
        .map((b) => ({ ...b, attendance: b.employees ? Math.round((b.present / b.employees) * 1000) / 10 : 0 }))
        .sort((a, b) => b.employees - a.employees);

      setSummary({
        totalEmployees: known,
        present,
        absent,
        onLeave,
        pendingLeaves: leavesRes.status === "fulfilled" ? Number(leavesRes.value.data?.count) || 0 : 0,
        attention: { incompletePunchOut },
        yesterday: { present: weekly[5].present, absent: weekly[5].absent },
        weekly,
        branches,
      });
    });
    return () => {
      ignore = true;
    };
  }, [token, auth]);

  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [role, month, year, startDate, endDate, token]);
  useEffect(() => {
    setCurrentPage(1);
  }, [role, month, year, startDate, endDate, searchStaff, itemsPerPage]);

  /* ----- dashboard metrics (worked out above from the existing endpoints) ----- */
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
      onLeave: d.onLeave ?? 0,
      pendingLeaves: d.pendingLeaves ?? 0,
      incomplete: d.attention?.incompletePunchOut ?? 0,
      pctPresent: pct(d.present, d.totalEmployees),
      pctAbsent: pct(d.absent, d.totalEmployees),
      pctOnLeave: pct(d.onLeave, d.totalEmployees),
      trends: {
        present: trend(d.present, y.present),
        absent: trend(d.absent, y.absent),
        onLeave: null,
      },
      days: (d.weekly || []).map((w) => ({
        label: w.label,
        present: Math.max(0, w.present - w.late), // chart stacks on-time + late
        late: 0,
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
