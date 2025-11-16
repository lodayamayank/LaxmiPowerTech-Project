import React, { useEffect, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import Select from "../components/Select";
import { 
  FaUserCircle, 
  FaUser, 
  FaMapMarkerAlt, 
  FaCheckCircle, 
  FaTimesCircle,
  FaUserClock,
  FaDownload,
  FaSearch
} from "react-icons/fa";
import { formatIST } from "../utils/date";

const AdminLiveAttendance = () => {
  const [staffData, setStaffData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ role: "", branch: "" });
  const [branches, setBranches] = useState([]);

  const statusTabs = [
    { label: "All", value: "all", icon: <FaUser size={14} />, color: "gray" },
    { label: "Punched In", value: "in", icon: <FaCheckCircle size={14} />, color: "green" },
    { label: "Punched Out", value: "out", icon: <FaUserClock size={14} />, color: "yellow" },
    { label: "No Punch In", value: "no_punch", icon: <FaTimesCircle size={14} />, color: "red" },
  ];

  // Fetch branches only
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get("/branches");
        setBranches(res.data || []);
      } catch (err) {
        console.error("Failed to fetch branches", err);
      }
    };
    fetchBranches();
  }, []);

  // Fetch live attendance with filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {};
        if (filters.role) params.role = filters.role;
        if (filters.branch) params.branch = filters.branch;

        const res = await axios.get("/attendance/live", { params });
        if (Array.isArray(res.data)) {
          setStaffData(res.data);
        } else {
          console.warn("Live response not an array", res.data);
          setStaffData([]);
        }
      } catch (err) {
        console.error("Failed to fetch live attendance", err);
        setStaffData([]);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [filters]);

  // Apply search & status filters
  useEffect(() => {
    const filtered = Array.isArray(staffData)
      ? staffData.filter((user) => {
          const matchesStatus =
            statusFilter === "all" || user.status === statusFilter;
          const matchesSearch = user.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          return matchesStatus && matchesSearch;
        })
      : [];
    setFilteredData(filtered);
  }, [statusFilter, searchQuery, staffData]);

  const statusCounts = staffData.reduce(
    (acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    },
    { in: 0, out: 0, no_punch: 0 }
  );

  const downloadCSV = () => {
    const csvHeader = "Name,Status,Punch In Time,Punch Out Time,Role,Branch,Location";
    const csvRows = filteredData.map(
      (u) => `${u.name},${u.status},${formatIST(u.punchInTime) || "-"},${formatIST(u.punchOutTime) || "-"},${u.role || "-"},${u.branch || "-"},${u.location || "-"}`
    );
    const csvContent = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `live_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <DashboardLayout title="Live Attendance">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mt-1">Real-time attendance tracking • Auto-refreshes every 30s</p>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg"
          >
            <FaDownload size={14} />
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Staff</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{staffData.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FaUser className="text-gray-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Punched In</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{statusCounts.in || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaCheckCircle className="text-green-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Punched Out</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{statusCounts.out || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <FaUserClock className="text-yellow-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">No Punch In</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{statusCounts.no_punch || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FaTimesCircle className="text-red-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
              <Select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                placeholder="All Roles"
                options={[
                  { value: "staff", label: "Staff" },
                  { value: "labour", label: "Labour" },
                  { value: "subcontractor", label: "Subcontractor" },
                  { value: "supervisor", label: "Supervisor" },
                ]}
                icon={<FaUser size={14} />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Branch</label>
              <Select
                value={filters.branch}
                onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                placeholder="All Branches"
                options={branches.map((b) => ({ value: b._id, label: b.name }))}
                icon={<FaMapMarkerAlt size={14} />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Search</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaSearch size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-3 flex-wrap">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                statusFilter === tab.value
                  ? tab.color === "gray"
                    ? "bg-gray-500 text-white border-gray-500 shadow-md"
                    : tab.color === "green"
                    ? "bg-green-500 text-white border-green-500 shadow-md"
                    : tab.color === "yellow"
                    ? "bg-yellow-500 text-white border-yellow-500 shadow-md"
                    : "bg-red-500 text-white border-red-500 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.value !== "all" && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  statusFilter === tab.value ? "bg-white/20" : "bg-gray-100"
                }`}>
                  {statusCounts[tab.value] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Staff List */}
        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <FaUserCircle className="mx-auto text-gray-300 mb-4" size={64} />
              <p className="text-gray-500 text-lg font-medium">No staff found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query</p>
            </div>
          ) : (
            filteredData.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <FaUserCircle className="w-10 h-10 text-gray-400" />
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{user.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {user.role && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium capitalize">
                          {user.role}
                        </span>
                      )}
                      {user.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <FaMapMarkerAlt size={10} />
                          {user.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {user.status === "in" ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">
                        <FaCheckCircle size={12} />
                        Punched In
                      </span>
                      <div className="text-sm text-gray-600 font-medium">{user.punchTime}</div>
                    </div>
                  ) : user.status === "out" ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                        <FaUserClock size={12} />
                        Punched Out
                      </span>
                      <div className="text-sm text-gray-600 font-medium">{user.punchTime}</div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
                      <FaTimesCircle size={12} />
                      No Punch In
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results count */}
        {filteredData.length > 0 && (
          <div className="text-center text-sm text-gray-500">
            Showing {filteredData.length} of {staffData.length} staff members
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminLiveAttendance;