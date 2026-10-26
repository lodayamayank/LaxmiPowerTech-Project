import React, { useEffect, useState } from "react";
import axios from "@/utils/axios";
import DashboardLayout from "@/layouts/DashboardLayout";

import {
  FaUserCircle,
  FaUser,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock,
  FaDownload,
  FaSearch,
} from "react-icons/fa";

import { formatIST } from "@/utils/date";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const AdminLiveAttendance = () => {
  const [staffData, setStaffData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    role: "",
    branch: "",
  });

  const [branches, setBranches] = useState([]);

  // Status filter configuration
  const statusTabs = [
    {
      label: "All",
      value: "all",
      icon: <FaUser size={14} />,
      color: "gray",
    },
    {
      label: "Punched In",
      value: "in",
      icon: <FaCheckCircle size={14} />,
      color: "green",
    },
    {
      label: "Punched Out",
      value: "out",
      icon: <FaUserClock size={14} />,
      color: "yellow",
    },
    {
      label: "No Punch In",
      value: "no_punch",
      icon: <FaTimesCircle size={14} />,
      color: "red",
    },
  ];

  // Fetch branches
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

  // Fetch live attendance with role and branch filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {};

        if (filters.role) {
          params.role = filters.role;
        }

        if (filters.branch) {
          params.branch = filters.branch;
        }

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

    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, [filters]);

  // Apply search and status filters
  useEffect(() => {
    const filtered = Array.isArray(staffData)
      ? staffData.filter((user) => {
          const matchesStatus =
            statusFilter === "all" || user.status === statusFilter;

          const matchesSearch = (user.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

          return matchesStatus && matchesSearch;
        })
      : [];

    setFilteredData(filtered);
  }, [statusFilter, searchQuery, staffData]);

  // Calculate status counts
  const statusCounts = staffData.reduce(
    (acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    },
    {
      in: 0,
      out: 0,
      no_punch: 0,
    }
  );

  // Export attendance data to CSV
  const downloadCSV = () => {
    const csvHeader =
      "Name,Status,Punch In Time,Punch Out Time,Role,Branch,Location";

    const csvRows = filteredData.map((user) =>
      [
        user.name || "-",
        user.status || "-",
        formatIST(user.punchInTime) || "-",
        formatIST(user.punchOutTime) || "-",
        user.role || "-",
        user.branch || "-",
        user.location || "-",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csvContent = [csvHeader, ...csvRows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `live_attendance_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Status badge component
  const renderStatusBadge = (status) => {
    if (status === "in") {
      return (
        <Badge className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100">
          <FaCheckCircle size={12} />
          Punched In
        </Badge>
      );
    }

    if (status === "out") {
      return (
        <Badge className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-100">
          <FaUserClock size={12} />
          Punched Out
        </Badge>
      );
    }

    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
        <FaTimesCircle size={12} />
        No Punch In
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Live Attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time attendance tracking • Auto-refreshes every 30s
            </p>
          </div>

          <Button
            onClick={downloadCSV}
            className="gap-2 bg-orange-500 text-white shadow-md hover:bg-orange-600"
          >
            <FaDownload size={14} />
            Export CSV
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Staff */}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Staff
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {staffData.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <FaUser
                  className="text-gray-600 dark:text-gray-300"
                  size={20}
                />
              </div>
            </CardContent>
          </Card>

          {/* Punched In */}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Punched In
                </p>

                <p className="mt-1 text-3xl font-bold text-green-600">
                  {statusCounts.in || 0}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <FaCheckCircle className="text-green-600" size={20} />
              </div>
            </CardContent>
          </Card>

          {/* Punched Out */}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Punched Out
                </p>

                <p className="mt-1 text-3xl font-bold text-yellow-600">
                  {statusCounts.out || 0}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <FaUserClock className="text-yellow-600" size={20} />
              </div>
            </CardContent>
          </Card>

          {/* No Punch In */}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  No Punch In
                </p>

                <p className="mt-1 text-3xl font-bold text-red-600">
                  {statusCounts.no_punch || 0}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <FaTimesCircle className="text-red-600" size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Filters</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Role Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="attendance-role" className="text-xs">
                  Role
                </Label>

                <Select
                  value={filters.role || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      role: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger
                    id="attendance-role"
                    className="w-full"
                  >
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="labour">Labour</SelectItem>
                    <SelectItem value="subcontractor">
                      Subcontractor
                    </SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Branch Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="attendance-branch" className="text-xs">
                  Branch
                </Label>

                <Select
                  value={filters.branch || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      branch: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger
                    id="attendance-branch"
                    className="w-full"
                  >
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>

                    {branches.map((branch) => (
                      <SelectItem
                        key={branch._id}
                        value={branch._id}
                      >
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-1.5">
                <Label htmlFor="attendance-search" className="text-xs">
                  Search
                </Label>

                <div className="relative">
                  <FaSearch
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />

                  <Input
                    id="attendance-search"
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-2 focus-visible:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Filters */}
        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-full"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            {statusTabs.map((tab) => {
              const activeClasses = {
                gray: "data-[state=active]:border-gray-500 data-[state=active]:bg-gray-500",
                green: "data-[state=active]:border-green-500 data-[state=active]:bg-green-500",
                yellow:
                  "data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500",
                red: "data-[state=active]:border-red-500 data-[state=active]:bg-red-500",
              };

              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`flex h-auto items-center gap-2 rounded-lg border-2 border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-none transition-all hover:bg-muted data-[state=active]:text-white data-[state=active]:shadow-md ${activeClasses[tab.color]}`}
                >
                  {tab.icon}

                  <span>{tab.label}</span>

                  {tab.value !== "all" && (
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        statusFilter === tab.value
                          ? "bg-white/20"
                          : "bg-muted"
                      }`}
                    >
                      {statusCounts[tab.value] || 0}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Staff List */}
        <div className="space-y-3">
          {filteredData.length === 0 ? (
            /* Empty State */
            <Card>
              <CardContent className="p-12 text-center">
                <FaUserCircle
                  className="mx-auto mb-4 text-muted-foreground/40"
                  size={64}
                />

                <p className="text-lg font-medium">No staff found</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredData.map((user) => (
              /* Staff Card */
              <Card
                key={user._id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  {/* Staff Information */}
                  <div className="flex min-w-0 items-center gap-4">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.name || "Staff"} avatar`}
                        className="h-14 w-14 shrink-0 rounded-full border-2 border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted">
                        <FaUserCircle className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">
                        {user.name}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        {user.role && (
                          <Badge
                            variant="secondary"
                            className="capitalize"
                          >
                            {user.role}
                          </Badge>
                        )}

                        {user.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FaMapMarkerAlt size={10} />
                            {user.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Status */}
                  <div className="shrink-0 text-right">
                    <div className="space-y-1">
                      {renderStatusBadge(user.status)}

                      {(user.status === "in" ||
                        user.status === "out") && (
                        <div className="text-sm font-medium text-muted-foreground">
                          {user.punchTime || "-"}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Results Count */}
        {filteredData.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredData.length} of {staffData.length} staff members
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminLiveAttendance;