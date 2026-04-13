// src/pages/AdminDashboard.jsx
import DashboardLayout from '../layouts/DashboardLayout';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '../utils/axios';
import Select from '../components/Select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
  let variant = "outline";
  let cls = "capitalize ";
  switch (type) {
    case "in": cls += "bg-green-50 text-green-700 border-green-200"; break;
    case "out": cls += "bg-gray-100 text-gray-700 border-gray-300"; break;
    case "half": cls += "bg-yellow-50 text-yellow-700 border-yellow-200"; break;
    case "absent": cls += "bg-red-50 text-red-700 border-red-200"; break;
    case "weekoff": cls += "bg-blue-50 text-blue-700 border-blue-200"; break;
    case "paidleave": cls += "bg-purple-50 text-purple-700 border-purple-200"; break;
    case "unpaidleave": cls += "bg-pink-50 text-pink-700 border-pink-200"; break;
    case "overtime": cls += "bg-orange-50 text-orange-700 border-orange-200"; break;
    default: cls += "bg-gray-100 text-gray-600 border-gray-200";
  }
  return <Badge variant={variant} className={cls}>{type}</Badge>;
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

  const filtered = useMemo(() => 
    attendances.filter((r) =>
      r.user?.name?.toLowerCase().includes(searchStaff.toLowerCase())
    ),
    [attendances, searchStaff]
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

    const headers = ["Name", "Role", "Type", "Date", "Time", "Branch", "Note"];
    const rows = filtered.map((item) => [
      item.user?.name || "N/A",
      item.user?.role || "-",
      item.punchType || "-",
      new Date(item.createdAt).toLocaleDateString(),
      new Date(item.createdAt).toLocaleTimeString(),
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
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={onSearch}
              className="grid grid-cols-1 md:grid-cols-6 gap-3"
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

              <Button
                type="submit"
                className="bg-black hover:bg-gray-800"
              >
                Filter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results Info & Items Per Page */}
        {!loading && filtered.length > 0 && (
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3">
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
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Selfie</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        <span className="ml-3">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.user?.name || 'N/A'}</TableCell>
                      <TableCell className="capitalize">{item.user?.role || '-'}</TableCell>
                      <TableCell>
                        <PunchTypeBadge type={item.punchType} />
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {item.branch ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                            <FaMapMarkerAlt size={10} />
                            {item.branch}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 gap-1">
                            <FaMapMarkerAlt size={10} />
                            Outside Assigned Branch
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.selfieUrl ? (
                          <img
                            src={item.selfieUrl}
                            alt="selfie"
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          item.punchType === "leave" ? "—" : "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground italic">
                        {item.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {!loading && filtered.length > 0 && totalPages > 1 && (
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
            <div className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* First Page */}
              <Button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="icon"
                title="First Page"
              >
                <FaAngleDoubleLeft size={14} />
              </Button>

              {/* Previous Page */}
              <Button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="icon"
                title="Previous Page"
              >
                <FaChevronLeft size={14} />
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-3 py-1 text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      onClick={() => goToPage(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={currentPage === page ? "bg-orange-500 hover:bg-orange-600" : ""}
                    >
                      {page}
                    </Button>
                  )
                ))}
              </div>

              {/* Next Page */}
              <Button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="icon"
                title="Next Page"
              >
                <FaChevronRight size={14} />
              </Button>

              {/* Last Page */}
              <Button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="icon"
                title="Last Page"
              >
                <FaAngleDoubleRight size={14} />
              </Button>
            </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;