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
  FaSearch,
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
  const labelMap = {
    weekoff: "week off",
    paidleave: "paid leave",
    unpaidleave: "unpaid leave",
  };
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
  return <Badge variant={variant} className={cls}>{labelMap[type] || type}</Badge>;
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
          punchTypes: [],
        };
      }

      if (!groups[key].punchTypes.includes(record.punchType)) {
        groups[key].punchTypes.push(record.punchType);
      }
      
      if (record.punchType === 'in') {
        groups[key].punchIn = record.createdAt;
        groups[key].selfieIn = record.selfieUrl;
      } else if (record.punchType === 'out') {
        groups[key].punchOut = record.createdAt;
        groups[key].selfieOut = record.selfieUrl;
      }
    });
    
    return Object.values(groups).map((group) => ({
      ...group,
      punchTypes: [...group.punchTypes].sort(
        (left, right) => (punchTypeOrder[left] ?? 99) - (punchTypeOrder[right] ?? 99)
      ),
    }));
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
    
    if (startDate && !endDate) {
      setEndDate(startDate);
      return;
    }

    if (!startDate && endDate) {
      setStartDate(endDate);
      return;
    }

    fetchData();
  };

  const resetFilters = () => {
    setSearchStaff('');
    setRole('');
    setStartDate('');
    setEndDate('');
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
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
          <CardContent className="p-5">
            <form onSubmit={onSearch} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Search</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaSearch size={14} />
                    </div>
                    <input
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Search staff..."
                      value={searchStaff}
                      onChange={(e) => setSearchStaff(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                  <Select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder={null}
                    options={[
                      { value: '', label: 'All Roles' },
                      { value: 'staff', label: 'Staff' },
                      { value: 'labour', label: 'Labour' },
                      { value: 'subcontractor', label: 'Subcontractor' },
                    ]}
                    icon={<FaUser size={14} />}
                  />
                </div>

                {!startDate && !endDate ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Month</label>
                      <Select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        options={[...Array(12).keys()].map((m) => ({
                          value: m + 1,
                          label: new Date(0, m).toLocaleString('default', { month: 'long' })
                        }))}
                        icon={<FaCalendarAlt size={14} />}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
                      <Select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        options={Array.from({ length: 5 }, (_, i) => {
                          const y = new Date().getFullYear() - i;
                          return { value: y, label: y.toString() };
                        })}
                        icon={<FaCalendarAlt size={14} />}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <Button type="submit" className="bg-black hover:bg-gray-800">
                  Apply
                </Button>
              </div>
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
                        <div className="flex flex-col items-start gap-1">
                          {item.punchTypes.length > 0 ? (
                            item.punchTypes.map((type) => (
                              <PunchTypeBadge key={`${item._id}_${type}`} type={type} />
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {item.punchIn ? (
                            <div>In: {new Date(item.punchIn).toLocaleTimeString()}</div>
                          ) : null}
                          {item.punchOut ? (
                            <div>Out: {new Date(item.punchOut).toLocaleTimeString()}</div>
                          ) : null}
                          {!item.punchIn && !item.punchOut ? (
                            <span className="text-muted-foreground">-</span>
                          ) : null}
                        </div>
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
                        {item.selfieIn || item.selfieOut ? (
                          <div className="flex items-center gap-2">
                            {item.selfieIn ? (
                              <img
                                src={item.selfieIn}
                                alt="Punch in selfie"
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : null}
                            {item.selfieOut ? (
                              <img
                                src={item.selfieOut}
                                alt="Punch out selfie"
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
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
