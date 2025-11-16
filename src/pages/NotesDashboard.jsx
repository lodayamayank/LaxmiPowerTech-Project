// frontend/pages/NotesDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import Select from "../components/Select";
import {
  FaUser,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaDownload,
  FaSearch,
  FaStickyNote,
  FaCalendarAlt,
  FaFileAlt
} from "react-icons/fa";

const NotesDashboard = () => {
  const [notes, setNotes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
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
      const res = await axios.get("/attendanceNotes", {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, role, branch, page, limit },
      });
      setNotes(res.data.notes || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch notes", err);
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
    const pages = [], maxShow = 5;
    if (totalPages <= maxShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
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
      n.note
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `attendance_notes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Count notes by role
  const roleCounts = notes.reduce((acc, note) => {
    acc[note.role] = (acc[note.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout title="Notes Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mt-1">View and manage attendance notes</p>
          </div>
          <button
            onClick={exportToCSV}
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
                <p className="text-sm text-gray-500 font-medium">Total Notes</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FaStickyNote className="text-gray-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Current Page</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{notes.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FaFileAlt className="text-orange-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Labour Notes</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{roleCounts.labour || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FaUser className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Staff Notes</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{roleCounts.staff || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaUser className="text-green-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
              <Select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                placeholder="All Roles"
                options={[
                  { value: "labour", label: "Labour" },
                  { value: "staff", label: "Staff" },
                  { value: "subcontractor", label: "Subcontractor" },
                  { value: "admin", label: "Admin" },
                ]}
                icon={<FaUser size={14} />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Branch</label>
              <Select
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setPage(1);
                }}
                placeholder="All Branches"
                options={branches.map((b) => ({ value: b._id, label: b.name }))}
                icon={<FaMapMarkerAlt size={14} />}
              />
            </div>
          </div>
        </div>

        {/* Results Info */}
        {!loading && notes.length > 0 && (
          <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-gray-900">{total}</span> notes
            </div>
          </div>
        )}

        {/* Notes Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Branch</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : notes.length > 0 ? (
                notes.map((n) => (
                  <tr key={n._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{n.userName || "N/A"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                        {n.role || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{n.branch || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-600">{n.date}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-md">
                      <p className="truncate">{n.note}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                    No notes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && notes.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{page}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First Page"
              >
                <FaAngleDoubleLeft size={14} />
              </button>

              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <FaChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === '...' ? (
                    <span key={idx} className="px-3 py-1 text-gray-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <FaChevronRight size={14} />
              </button>

              <button
                onClick={() => goToPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last Page"
              >
                <FaAngleDoubleRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotesDashboard;