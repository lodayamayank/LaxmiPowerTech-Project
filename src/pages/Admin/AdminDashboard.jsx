// src/pages/AdminDashboard.jsx
import DashboardLayout from "../../layouts/DashboardLayout";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "../../utils/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddEmployeeModal from "../../components/AddEmployeeModal";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaClock,
  FaChartBar,
  FaMapMarkerAlt,
  FaBell,
  FaBolt,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaUserPlus,
  FaFileAlt,
  FaCalendarCheck,
} from "react-icons/fa";

/* ---------- config ---------- */
const ROUTES = {
  addEmployee: "/components/AddEmployeeModal",
  branches: "/dashboard/branches",  
  leaves: "/attendance/leaves",
  reports: "/dashboard/report",
};

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
const localDay = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const getToday = () => localDay(new Date());
const BADGES = {
  in: ["green", "in"],
  out: ["gray", "out"],
  half: ["yellow", "half"],
  absent: ["red", "absent"],
  weekoff: ["blue", "week off"],
  paidleave: ["purple", "paid leave"],
  unpaidleave: ["pink", "unpaid leave"],
  overtime: ["orange", "overtime"],
};
const TONE = {
  green:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  gray: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
  yellow:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  purple:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  pink: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
  orange:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
};
const PunchTypeBadge = ({ type }) => {
  const [tone, label] = BADGES[type] || ["gray", type];
  return (
    <Badge variant="outline" className={`capitalize ${TONE[tone]}`}>
      {label}
    </Badge>
  );
};

const punchTypeOrder = {
  in: 0,
  out: 1,
  half: 2,
  absent: 3,
  weekoff: 4,
  paidleave: 5,
  unpaidleave: 6,
  overtime: 7,
};

/* ---------- small UI pieces ---------- */
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="flex items-start gap-3">
      <Icon className="text-orange-500 mt-1" size={18} />
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action}
  </div>
);

const STAT_TONES = {
  orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-500 bg-opacity-100",
  green: "bg-green-50 dark:bg-green-950/30 text-green-600",
  red: "bg-red-50 dark:bg-red-950/30 text-red-600",
  amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-500",
  blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600",
};
const StatCard = ({ icon: Icon, tone, label, value, note, trend }) => (
  <div className={`rounded-xl p-4 flex items-center gap-4 ${STAT_TONES[tone]}`}>
    <div className="h-12 w-12 shrink-0 rounded-full bg-white/80 dark:bg-gray-900/50 flex items-center justify-center">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          {value}
        </p>
        {trend != null && (
          <span className="rounded-full bg-white/80 dark:bg-gray-900/50 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-300">
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{note}</p>
    </div>
  </div>
);

const WeeklyChart = ({ days }) => {
  const max = Math.max(1, ...days.map((d) => d.present + d.absent + d.late));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => Math.round(max * t));
  return (
    <div>
      <div className="flex gap-3">
        <div className="flex flex-col justify-between h-44 text-[11px] text-gray-400">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 gap-3 items-end h-44 border-b border-gray-200 dark:border-gray-700">
          {days.map((d) => (
            <div
              key={d.label}
              className="flex flex-col-reverse h-full justify-start"
              title={`${d.label}: ${d.present} present, ${d.absent} absent, ${d.late} late`}
            >
              <div
                className="bg-green-500 rounded-b-sm"
                style={{ height: `${(d.present / max) * 100}%` }}
              />
              <div
                className="bg-red-500"
                style={{ height: `${(d.absent / max) * 100}%` }}
              />
              <div
                className="bg-amber-400 rounded-t-sm"
                style={{ height: `${(d.late / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-3 ml-8 mt-2 text-center text-[11px] text-gray-500 dark:text-gray-400">
        {days.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      <div className="flex justify-center gap-5 mt-3 text-xs text-gray-600 dark:text-gray-300">
        {[
          ["bg-green-500", "Present"],
          ["bg-red-500", "Absent"],
          ["bg-amber-400", "Late"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${c}`} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ---------- page ---------- */
const AdminDashboard = () => {
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
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), []);
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
    if (!filtered.length) return alert("No records to export");
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

  const getPageNumbers = () => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const labelCls = "block text-xs mb-1.5 text-gray-600 dark:text-gray-300";
  const attention = [
    {
      n: stats.pendingLeaves,
      text: "Leave requests pending approval",
      tone: "bg-orange-50 text-orange-600",
      href: ROUTES.leaves,
    },
    {
      n: stats.absent,
      text: "Marked absent today",
      tone: "bg-red-50 text-red-600",
      href: "#records",
    },
    {
      n: stats.incomplete,
      text: "Employees with incomplete punch-out",
      tone: "bg-amber-50 text-amber-600",
      href: "#records",
    },
  ];
  const quick = [
    {
      icon: FaUserPlus,
      label: "Add Employee",
      cls: "border-orange-300 text-orange-600 bg-orange-50/50",
      action: () => setAddEmployeeOpen(true),
    },
    {
      icon: FaMapMarkerAlt,
      label: "Manage Branches",
      cls: "border-blue-300 text-blue-600 bg-blue-50/50",
      href: ROUTES.branches,
    },
    {
      icon: FaCalendarCheck,
      label: "Approve Leaves",
      cls: "border-green-300 text-green-700 bg-green-50/50",
      href: ROUTES.leaves,
    },
    {
      icon: FaFileAlt,
      label: "Generate Report",
      cls: "border-purple-300 text-purple-600 bg-purple-50/50",
      href: ROUTES.reports,
    },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Here's your workforce attendance overview.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setAddEmployeeOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <FaUserPlus className="mr-2" />
              Add Employee
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-orange-400 text-orange-600"
            >
              <Link to={ROUTES.reports}>Generate Report</Link>
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard
            icon={FaUsers}
            tone="orange"
            label="Total Employees"
            value={stats.known}
            note="Active workforce"
          />
          <StatCard
            icon={FaUserCheck}
            tone="green"
            label="Present Today"
            value={stats.present}
            trend={stats.trends.present}
            note={`${stats.pctPresent.toFixed(1)}% attendance`}
          />
          <StatCard
            icon={FaUserTimes}
            tone="red"
            label="Absent Today"
            value={stats.absent}
            trend={stats.trends.absent}
            note={`${stats.pctAbsent.toFixed(1)}% of employees`}
          />
          <StatCard
            icon={FaClock}
            tone="amber"
            label="Late Arrivals"
            value={stats.late}
            trend={stats.trends.late}
            note={`${stats.pctLate.toFixed(1)}% of present`}
          />
          <StatCard
            icon={FaFileAlt}
            tone="blue"
            label="Pending Leaves"
            value={stats.pendingLeaves}
            note="Awaiting approval"
          />
        </div>

        {/* Chart + branches */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <Card className="xl:col-span-3">
            <CardContent className="p-5">
              <SectionHeader
                icon={FaChartBar}
                title="Weekly Attendance Overview"
                subtitle="Present, absent and late employees over the last 7 days"
              />
              <WeeklyChart days={stats.days} />
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardContent className="p-5">
              <SectionHeader
                icon={FaMapMarkerAlt}
                title="Attendance by Branch"
                subtitle="Today's attendance across all branches"
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.branches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-4"
                      >
                        No branch data
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.branches.map((b) => (
                      <TableRow key={b.branch}>
                        <TableCell className="font-medium">
                          {b.branch}
                        </TableCell>
                        <TableCell>{b.employees}</TableCell>
                        <TableCell>{b.present}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-semibold text-xs w-12">
                              {b.pct.toFixed(1)}%
                            </span>
                            <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${Math.min(100, b.pct)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Records + side panels */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4" id="records">
          <Card className="xl:col-span-3">
            <CardContent className="p-5 space-y-4">
              <SectionHeader
                icon={FaFileAlt}
                title="Attendance Records"
                subtitle="Check-in and check-out records for the selected period"
                action={
                  <Button variant="outline" size="sm" onClick={downloadCSV}>
                    Export CSV
                  </Button>
                }
              />

              <form onSubmit={onSearch} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className={labelCls}>Search</Label>
                    <Input
                      placeholder="Search staff..."
                      value={searchStaff}
                      onChange={(e) => setSearchStaff(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Role</Label>
                    <Select
                      value={role || "all"}
                      onValueChange={(v) => setRole(v === "all" ? "" : v)}
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="labour">Labour</SelectItem>
                        <SelectItem value="subcontractor">
                          Subcontractor
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={labelCls}>Month</Label>
                    <Select
                      value={String(month)}
                      onValueChange={(v) => setMonth(Number(v))}
                      disabled={hasCustomRange}
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, m) => (
                          <SelectItem key={m} value={String(m + 1)}>
                            {new Date(0, m).toLocaleString("default", {
                              month: "long",
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={labelCls}>Year</Label>
                    <Select
                      value={String(year)}
                      onValueChange={(v) => setYear(Number(v))}
                      disabled={hasCustomRange}
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) =>
                          String(new Date().getFullYear() - i),
                        ).map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div>
                    <Label className={labelCls}>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      max={endDate || today}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      max={today}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 lg:col-start-4 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetFilters}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </form>

              <div className="-mx-5 border-t border-gray-100 dark:border-gray-700 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {[
                        "Employee",
                        "Role",
                        "Type",
                        "Date",
                        "Time",
                        "Branch",
                        "Selfie",
                        "Note",
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className="text-gray-600 dark:text-gray-300"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-6"
                        >
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                            {item.user?.name || "N/A"}
                          </TableCell>
                          <TableCell className="capitalize">
                            {item.user?.role || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              {item.punchTypes.length
                                ? item.punchTypes.map((t) => (
                                    <PunchTypeBadge key={t} type={t} />
                                  ))
                                : "-"}
                            </div>
                          </TableCell>
                          <TableCell>{item.dateString}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              {item.punchIn && (
                                <div>
                                  In:{" "}
                                  {new Date(item.punchIn).toLocaleTimeString()}
                                </div>
                              )}
                              {item.punchOut && (
                                <div>
                                  Out:{" "}
                                  {new Date(item.punchOut).toLocaleTimeString()}
                                </div>
                              )}
                              {!item.punchIn && !item.punchOut && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1 ${
                                item.branch ? TONE.blue : TONE.gray
                              }`}
                            >
                              <FaMapMarkerAlt size={10} />
                              {item.branch || "Outside Assigned Branch"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.selfieIn || item.selfieOut ? (
                              <div className="flex items-center gap-2">
                                {item.selfieIn && (
                                  <img
                                    src={item.selfieIn}
                                    alt="Punch in selfie"
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                                {item.selfieOut && (
                                  <img
                                    src={item.selfieOut}
                                    alt="Punch out selfie"
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {item.markedByIn || item.markedByOut || "N/A"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground italic">
                            {item.note || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {!loading && filtered.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing <b>{startIndex + 1}</b>–
                      <b>{Math.min(endIndex, totalItems)}</b> of{" "}
                      <b>{totalItems}</b>
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      aria-label="Rows per page"
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-background text-foreground"
                    >
                      {[25, 50, 100, 200].map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="icon"
                        title="First Page"
                      >
                        <FaAngleDoubleLeft size={12} />
                      </Button>
                      <Button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="icon"
                        title="Previous Page"
                      >
                        <FaChevronLeft size={12} />
                      </Button>
                      {getPageNumbers().map((p, i) =>
                        p === "..." ? (
                          <span
                            key={`e${i}`}
                            className="px-2 text-muted-foreground"
                          >
                            ...
                          </span>
                        ) : (
                          <Button
                            key={p}
                            onClick={() => goToPage(p)}
                            size="sm"
                            variant={currentPage === p ? "default" : "outline"}
                            className={
                              currentPage === p
                                ? "bg-orange-500 hover:bg-orange-600"
                                : ""
                            }
                          >
                            {p}
                          </Button>
                        ),
                      )}
                      <Button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="icon"
                        title="Next Page"
                      >
                        <FaChevronRight size={12} />
                      </Button>
                      <Button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="icon"
                        title="Last Page"
                      >
                        <FaAngleDoubleRight size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <SectionHeader icon={FaBell} title="Requires Attention" />
                <div className="space-y-2">
                  {attention.map((a) => (
                    <a
                      key={a.text}
                      href={a.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-800 ${
                        a.tone.split(" ")[0]
                      } dark:bg-gray-800`}
                    >
                      <span className={`font-bold w-5 ${a.tone.split(" ")[1]}`}>
                        {a.n}
                      </span>
                      <span className="flex-1">{a.text}</span>
                      <FaChevronRight size={10} className="text-gray-400" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <SectionHeader icon={FaBolt} title="Quick Actions" />
                <div className="grid grid-cols-2 gap-3">
                  {quick.map((q) =>
                    q.action ? (
                      <button
                        key={q.label}
                        type="button"
                        onClick={q.action}
                        className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-4 text-xs font-medium text-center ${q.cls}`}
                      >
                        <q.icon size={18} />
                        {q.label}
                      </button>
                    ) : (
                      <Link
                        key={q.label}
                        to={q.href}
                        className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-4 text-xs font-medium text-center ${q.cls}`}
                      >
                        <q.icon size={18} />
                        {q.label}
                      </Link>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AddEmployeeModal
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        onCreated={fetchData}
      />
    </DashboardLayout>
  );
};

export default AdminDashboard;
