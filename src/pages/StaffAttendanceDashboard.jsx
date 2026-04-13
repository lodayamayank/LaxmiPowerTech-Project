import DashboardLayout from '../layouts/DashboardLayout';
import React, { useEffect, useState } from 'react';
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
  FaDownload,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock,
  FaClock
} from 'react-icons/fa';

const LeaveBadge = ({ count, type }) => {
  if (!count || count === 0) return null;

  let cls = "capitalize mr-1 ";

  switch (type) {
    case "paidLeave":
      cls += "bg-purple-50 text-purple-700 border-purple-200";
      break;
    case "unpaidLeave":
      cls += "bg-pink-50 text-pink-700 border-pink-200";
      break;
    case "sickLeave":
      cls += "bg-teal-50 text-teal-700 border-teal-200";
      break;
    case "casualLeave":
      cls += "bg-indigo-50 text-indigo-700 border-indigo-200";
      break;
    default:
      cls += "bg-gray-100 text-gray-700 border-gray-200";
  }

  const label =
    type === "paidLeave"
      ? "Paid"
      : type === "unpaidLeave"
      ? "Unpaid"
      : type === "sickLeave"
      ? "Sick"
      : type === "casualLeave"
      ? "Casual"
      : type;

  return <Badge variant="outline" className={cls}>{label}: {count}</Badge>;
};

const StaffAttendanceDashboard = () => {
  const [records, setRecords] = useState([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/attendance/summary', {
          headers: { Authorization: `Bearer ${token}` },
          params: { role: 'staff', month, year },
        });
        setRecords(res.data || []);
      } catch (err) {
        console.error('Failed to fetch staff summary', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, month, year]);

  const filtered = records.filter((r) =>
    r.name?.toLowerCase().includes(searchStaff.toLowerCase())
  );

  // Calculate totals
  const totals = filtered.reduce(
    (acc, item) => ({
      present: acc.present + (item.present || 0),
      absent: acc.absent + (item.absent || 0),
      halfDay: acc.halfDay + (item.halfDay || 0),
      overtime: acc.overtime + (item.overtime || 0),
    }),
    { present: 0, absent: 0, halfDay: 0, overtime: 0 }
  );

  // Pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchStaff, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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

  const exportToCSV = () => {
    if (!filtered.length) {
      alert("No records to export");
      return;
    }

    const headers = [
      "Name",
      "Employee ID",
      "Present",
      "Absent",
      "Half Day",
      "Week Off",
      "Paid Leave",
      "Unpaid Leave",
      "Sick Leave",
      "Casual Leave",
      "Overtime",
    ];

    const rows = filtered.map((item) => [
      item.name,
      item.employeeId,
      item.present,
      item.absent,
      item.halfDay,
      item.weekOff,
      item.paidLeave || 0,
      item.unpaidLeave || 0,
      item.sickLeave || 0,
      item.casualLeave || 0,
      item.overtime,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Staff_Attendance_${month}_${year}.csv`;
    link.click();
  };

  return (
    <DashboardLayout title="Staff Attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {/* <h1 className="text-2xl font-bold text-gray-800">Staff Attendance Summary</h1> */}
            <p className="text-sm text-gray-500 mt-1">Monthly attendance overview for staff members</p>
          </div>
          <Button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <FaDownload size={14} />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Staff</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{filtered.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <FaUser className="text-gray-600" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Present</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{totals.present}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FaCheckCircle className="text-green-600" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Absent</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{totals.absent}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <FaTimesCircle className="text-red-600" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Overtime</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{totals.overtime}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <FaClock className="text-orange-600" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Search Staff</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaSearch size={14} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Search by name..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                />
              </div>
            </div>

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
            </div>
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
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
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
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Half Day</TableHead>
                  <TableHead>Week Off</TableHead>
                  <TableHead>Leaves</TableHead>
                  <TableHead>Overtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.employeeId}</TableCell>
                      <TableCell>{item.present}</TableCell>
                      <TableCell>{item.absent}</TableCell>
                      <TableCell>{item.halfDay}</TableCell>
                      <TableCell>{item.weekOff}</TableCell>
                      <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <LeaveBadge count={item.paidLeave} type="paidLeave" />
                        <LeaveBadge count={item.unpaidLeave} type="unpaidLeave" />
                        <LeaveBadge count={item.sickLeave} type="sickLeave" />
                        <LeaveBadge count={item.casualLeave} type="casualLeave" />
                        </div>
                      </TableCell>
                      <TableCell>{item.overtime}</TableCell>
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
              <Button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="icon"
                title="First Page"
              >
                <FaAngleDoubleLeft size={14} />
              </Button>

              <Button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="icon"
                title="Previous Page"
              >
                <FaChevronLeft size={14} />
              </Button>

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

              <Button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="icon"
                title="Next Page"
              >
                <FaChevronRight size={14} />
              </Button>

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

export default StaffAttendanceDashboard;