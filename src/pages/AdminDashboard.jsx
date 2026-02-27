// src/pages/AdminDashboard.jsx
import DashboardLayout from '../layouts/DashboardLayout';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '../utils/axios';
import Select from '../components/Select';
import { 
  FaUser, 
  FaCalendarAlt, 
  FaChevronLeft, 
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaMapMarkerAlt
} from 'react-icons/fa';

const PunchTypeBadge = ({ type }) => {
  let cls = "px-2 py-1 rounded-full text-xs font-medium capitalize ";
  switch (type) {
    case "in": cls += "bg-green-100 text-green-700"; break;
    case "out": cls += "bg-gray-200 text-gray-700"; break;
    case "half": cls += "bg-yellow-100 text-yellow-700"; break;
    case "absent": cls += "bg-red-100 text-red-700"; break;
    case "weekoff": cls += "bg-blue-100 text-blue-700"; break;
    case "paidleave": cls += "bg-purple-100 text-purple-700"; break;
    case "unpaidleave": cls += "bg-pink-100 text-pink-700"; break;
    case "overtime": cls += "bg-orange-100 text-orange-700"; break;
    default: cls += "bg-gray-100 text-gray-600";
  }
  return <span className={cls}>{type}</span>;
};

const AdminDashboard = () => {
  const [attendances, setAttendances] = useState([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [role, setRole] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  /// Around line 45-88, replace the entire fetchData and useEffect section:

// ✅ FIX: Get token once and memoize it
const token = useMemo(() => localStorage.getItem('token'), []);

const fetchData = useCallback(async () => {
  if (!token) {
    console.error('No token available');
    return;
  }

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

    const res = await axios.get('/attendance', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    const rows = Array.isArray(res.data) ? res.data : res.data.rows || [];
    setAttendances(rows);
  } catch (err) {
    console.error('Failed to fetch attendance', err);
    setAttendances([]);
  } finally {
    setLoading(false);
  }
}, [role, month, year, startDate, endDate, token]);

// ✅ FIX: Separate effect for fetching and resetting page
useEffect(() => {
  if (token) {
    fetchData();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [role, month, year, startDate, endDate, token]);

// ✅ FIX: Separate effect for resetting page when filters change
useEffect(() => {
  setCurrentPage(1);
}, [role, month, year, startDate, endDate]);

  // Group attendances by user + date, combining in/out punches
  const groupedAttendances = useMemo(() => {
    const groups = {};
    
    attendances.forEach((record) => {
      const userId = record.user?._id;
      const date = new Date(record.createdAt).toLocaleDateString();
      const key = `${userId}_${date}`;
      
      if (!groups[key]) {
        groups[key] = {
          user: record.user,
          date: record.createdAt,
          dateString: date,
          branch: record.branch,
          note: record.note,
          punchIn: null,
          punchOut: null,
          selfieIn: null,
          selfieOut: null,
        };
      }
      
      if (record.punchType === 'in') {
        groups[key].punchIn = record.createdAt;
        groups[key].selfieIn = record.selfieUrl;
      } else if (record.punchType === 'out') {
        groups[key].punchOut = record.createdAt;
        groups[key].selfieOut = record.selfieUrl;
      }
    });
    
    return Object.values(groups);
  }, [attendances]);

  const filtered = useMemo(() => 
    groupedAttendances.filter((r) =>
      r.user?.name?.toLowerCase().includes(searchStaff.toLowerCase())
    ),
    [groupedAttendances, searchStaff]
  );

  // Pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filtered.slice(startIndex, endIndex);

  // Reset to page 1 when search or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchStaff, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const downloadCSV = () => {
    if (filtered.length === 0) {
      alert("No records to export");
      return;
    }

    const headers = ["Name", "Role", "Date", "Punch In Time", "Punch Out Time", "Branch", "Note"];
    const rows = filtered.map((item) => [
      item.user?.name || "N/A",
      item.user?.role || "-",
      item.dateString,
      item.punchIn ? new Date(item.punchIn).toLocaleTimeString() : "-",
      item.punchOut ? new Date(item.punchOut).toLocaleTimeString() : "-",
      item.branch || "Outside Assigned Branch",
      item.note || "-"
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `attendance_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-4">
        {/* Filters */}
        <form
          onSubmit={onSearch}
          className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-white p-4 rounded-xl shadow"
        >
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Search Staff"
            value={searchStaff}
            onChange={(e) => setSearchStaff(e.target.value)}
          />

          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="All Roles"
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'labour', label: 'Labour' },
              { value: 'subcontractor', label: 'Subcontractor' },
            ]}
            icon={<FaUser size={14} />}
          />


          {!startDate && !endDate && (
            <>
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                options={[...Array(12).keys()].map((m) => ({
                  value: m + 1,
                  label: new Date(0, m).toLocaleString('default', { month: 'long' })
                }))}
                icon={<FaCalendarAlt size={14} />}
              />

              <Select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return { value: y, label: y.toString() };
                })}
                icon={<FaCalendarAlt size={14} />}
              />
            </>
          )}

          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Filter
          </button>
        </form>

        {/* Results Info & Items Per Page */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl shadow">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(endIndex, totalItems)}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalItems}</span> records
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Punch In Time</th>
                <th className="text-left px-4 py-2">Punch Out Time</th>
                <th className="text-left px-4 py-2">Branch</th>
                <th className="text-left px-4 py-2">In Selfie</th>
                <th className="text-left px-4 py-2">Out Selfie</th>
                <th className="text-left px-4 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={9}>
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                      <span className="ml-3">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={9}>
                    No records found
                  </td>
                </tr>
              ) : (
                currentItems.map((item, idx) => (
                  <tr key={`${item.user?._id}_${item.dateString}_${idx}`} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{item.user?.name || 'N/A'}</td>
                    <td className="px-4 py-2 capitalize">{item.user?.role || '-'}</td>
                    <td className="px-4 py-2">
                      {item.dateString}
                    </td>
                    <td className="px-4 py-2">
                      {item.punchIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {new Date(item.punchIn).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {item.punchOut ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                          {new Date(item.punchOut).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {item.branch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <FaMapMarkerAlt size={10} />
                          {item.branch}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          <FaMapMarkerAlt size={10} />
                          Outside Assigned Branch
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {item.selfieIn ? (
                        <img
                          src={item.selfieIn}
                          alt="punch in selfie"
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => window.open(item.selfieIn, '_blank')}
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {item.selfieOut ? (
                        <img
                          src={item.selfieOut}
                          alt="punch out selfie"
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => window.open(item.selfieOut, '_blank')}
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-700 italic">
                      {item.note || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filtered.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 py-3 rounded-xl shadow">
            <div className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First Page"
              >
                <FaAngleDoubleLeft size={14} />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <FaChevronLeft size={14} />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              {/* Next Page */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <FaChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
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

export default AdminDashboard;