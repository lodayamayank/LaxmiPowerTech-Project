// frontend/pages/NotesDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FaUser,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaDownload,
  FaSearch,
  FaStickyNote,
  FaFileAlt,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = 8;

const NotesDashboard = () => {
  const [notes, setNotes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const limit = 25;

  const token = localStorage.getItem("token");

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get("/branches", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBranches(res.data || []);
      } catch (err) {
        console.error("Failed to fetch branches", err);
      }
    };
    fetchBranches();
  }, [token]);

  // Fetch notes
  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("/attendanceNotes", {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, role, branch, page, limit },
      });
      setNotes(res.data.notes || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch notes", err);
      // Generic message only; backend details stay in the console.
      setError("We couldn't load the notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [page, role, branch, search]);

  const totalPages = Math.ceil(total / limit);

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages = [],
      maxShow = 5;
    if (totalPages <= maxShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const exportToCSV = () => {
    if (!notes.length) {
      alert("No notes to export");
      return;
    }

    const headers = ["User", "Role", "Branch", "Date", "Note"];
    const rows = notes.map((n) => [
      n.userName || "N/A",
      n.role || "N/A",
      n.branch || "N/A",
      n.date,
      n.note,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `attendance_notes_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  // Count notes by role
  const roleCounts = notes.reduce((acc, note) => {
    acc[note.role] = (acc[note.role] || 0) + 1;
    return acc;
  }, {});

  // Stat card config (full class strings so Tailwind can detect them)
  const stats = [
    {
      label: "Total Notes",
      value: total,
      Icon: FaStickyNote,
      valueClass: "text-gray-800",
      circleClass: "bg-gray-100",
      iconClass: "text-gray-600",
    },
    {
      label: "Current Page",
      value: notes.length,
      Icon: FaFileAlt,
      valueClass: "text-orange-600",
      circleClass: "bg-orange-100",
      iconClass: "text-orange-600",
    },
    {
      label: "Labour Notes",
      value: roleCounts.labour || 0,
      Icon: FaUser,
      valueClass: "text-blue-600",
      circleClass: "bg-blue-100",
      iconClass: "text-blue-600",
    },
    {
      label: "Staff Notes",
      value: roleCounts.staff || 0,
      Icon: FaUser,
      valueClass: "text-green-600",
      circleClass: "bg-green-100",
      iconClass: "text-green-600",
    },
  ];

  return (
    <DashboardLayout title="Notes Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mt-1">
              View and manage attendance notes
            </p>
          </div>
          <Button
            onClick={exportToCSV}
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
          >
            <FaDownload size={14} />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(
            ({ label, value, Icon, valueClass, circleClass, iconClass }) => (
              <Card
                key={label}
                className="bg-white rounded-xl shadow-sm border border-gray-100 py-0 gap-0"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        {label}
                      </p>
                      <p className={`text-3xl font-bold mt-1 ${valueClass}`}>
                        {value}
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${circleClass}`}
                    >
                      <Icon className={iconClass} size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label
                htmlFor="notes-search"
                className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5"
              >
                Search
              </Label>
              <div className="relative">
                <FaSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400"
                  size={14}
                />
                <Input
                  id="notes-search"
                  type="text"
                  className="w-full h-auto pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-background text-foreground placeholder:text-muted-foreground text-sm focus:ring-2 focus:ring-orange-500 focus-visible:ring-orange-500 focus-visible:ring-offset-0"
                  placeholder="Search notes, users, branches..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="notes-role"
                className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5"
              >
                Role
              </Label>
              <Select
                value={role || "all"}
                onValueChange={(value) => {
                  setRole(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="notes-role" className="w-full">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="labour">Labour</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="notes-branch"
                className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5"
              >
                Branch
              </Label>
              <Select
                value={branch || "all"}
                onValueChange={(value) => {
                  setBranch(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="notes-branch" className="w-full">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>

                  {branches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error feedback */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load notes</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Info */}
        {!loading && notes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {total}
              </span>{" "}
              notes
            </div>
          </div>
        )}

        {/* Notes Table (Table component provides horizontal scroll container) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <Table className="min-w-full text-sm">
            <TableHeader className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-left px-4 py-3 h-auto font-semibold text-inherit">
                  User
                </TableHead>
                <TableHead className="text-left px-4 py-3 h-auto font-semibold text-inherit">
                  Role
                </TableHead>
                <TableHead className="text-left px-4 py-3 h-auto font-semibold text-inherit">
                  Branch
                </TableHead>
                <TableHead className="text-left px-4 py-3 h-auto font-semibold text-inherit">
                  Date
                </TableHead>
                <TableHead className="text-left px-4 py-3 h-auto font-semibold text-inherit">
                  Note
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow
                    key={`skeleton-${i}`}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-transparent"
                  >
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : notes.length > 0 ? (
                notes.map((n) => (
                  <TableRow
                    key={n._id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <TableCell className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {n.userName || "N/A"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-xs font-medium capitalize"
                      >
                        {n.role || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {n.branch || "N/A"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {n.date}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-900 dark:text-white max-w-md">
                      <p className="truncate">{n.note}</p>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    No notes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {!loading && notes.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Page{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {totalPages}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(1)}
                disabled={page === 1}
                title="First Page"
                className="h-9 w-9"
              >
                <FaAngleDoubleLeft size={14} />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                title="Previous Page"
                className="h-9 w-9"
              >
                <FaChevronLeft size={14} />
              </Button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === "..." ? (
                    <span key={idx} className="px-3 py-1 text-gray-500">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      onClick={() => goToPage(pageNum)}
                      className={`h-auto px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                          : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                title="Next Page"
                className="h-9 w-9"
              >
                <FaChevronRight size={14} />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(totalPages)}
                disabled={page === totalPages}
                title="Last Page"
                className="h-9 w-9"
              >
                <FaAngleDoubleRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotesDashboard;
