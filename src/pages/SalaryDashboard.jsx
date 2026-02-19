import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { toast } from 'react-toastify';
import {
  FaRupeeSign,
  FaCalendarAlt,
  FaUserTie,
  FaFileDownload,
  FaSearch,
  FaFilter,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
  FaUsers,
  FaExclamationTriangle,
  FaClock,
  FaCalendarCheck,
  FaInfoCircle,
} from 'react-icons/fa';
import Select from '../components/Select';

const SalaryDashboard = () => {
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  //  AUTO-CALCULATION: Determine correct month based on salary day (10th)
  const getDefaultSalaryMonth = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // ✅ If before 10th, show PREVIOUS month's salary (ready for payment on 10th)
    if (currentDay < 10) {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      return {
        month: prevMonth,
        year: prevYear,
        isPaymentPending: true, // Salary ready but not yet paid
        message: `Showing ${getPreviousMonthName(currentMonth)} salary - Payment due on ${currentMonth}/10/${currentYear}`
      };
    }

    // ✅ On or after 10th, show CURRENT month's salary (in progress)
    return {
      month: currentMonth,
      year: currentYear,
      isPaymentPending: false, // Current month calculation
      message: `Showing ${getMonthName(currentMonth)} salary - Payment on ${currentMonth === 12 ? 1 : currentMonth + 1}/10/${currentMonth === 12 ? currentYear + 1 : currentYear}`
    };
  };

  const getPreviousMonthName = (currentMonth) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[currentMonth === 1 ? 11 : currentMonth - 2];
  };

  const getMonthName = (month) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1];
  };

  const defaultPeriod = getDefaultSalaryMonth();
  const [month, setMonth] = useState(defaultPeriod.month);
  const [year, setYear] = useState(defaultPeriod.year);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const token = localStorage.getItem('token');

  // Calculate salary date info (10th of every month)
  const salaryDateInfo = useMemo(() => {
    const currentDate = new Date();
    const selectedDate = new Date(year, month - 1, 10);
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const salaryDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    const isPast = salaryDay < today;
    const isToday = salaryDay.getTime() === today.getTime();
    const isFuture = salaryDay > today;

    // Calculate next salary date
    const nextSalaryDate = new Date();
    if (currentDate.getDate() >= 10) {
      nextSalaryDate.setMonth(currentDate.getMonth() + 1);
    }
    nextSalaryDate.setDate(10);

    // Calculate days until next salary
    const daysUntilSalary = Math.ceil((nextSalaryDate - currentDate) / (1000 * 60 * 60 * 24));

    return {
      salaryDate: selectedDate,
      isPast,
      isToday,
      isFuture,
      nextSalaryDate,
      daysUntilSalary,
      isPaymentPending: defaultPeriod.isPaymentPending,
      autoMessage: defaultPeriod.message,
      formattedDate: selectedDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      nextFormattedDate: nextSalaryDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    };
  }, [month, year]);

  // Fetch salary data
  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (roleFilter) params.role = roleFilter;

      const res = await axios.get('/salary/calculate', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalaryData(res.data || []);
    } catch (err) {
      console.error('Failed to fetch salary data:', err);
      // Don't show error toast if it's just a 404 (route not implemented yet)
      if (err.response?.status !== 404) {
        toast.error('Failed to load salary data');
      }
      setSalaryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, [month, year, roleFilter]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    return salaryData.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salaryData, searchTerm]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalGross = filteredData.reduce((sum, item) => sum + item.grossSalary, 0);
    const totalNet = filteredData.reduce((sum, item) => sum + item.netSalary, 0);
    const totalDeductions = filteredData.reduce((sum, item) => sum + item.deductions.total, 0);
    const totalReimbursements = filteredData.reduce((sum, item) => sum + (item.reimbursements?.total || 0), 0);
    const totalTravel = filteredData.reduce((sum, item) => sum + (item.travel?.total || 0), 0);
    const totalOvertime = filteredData.reduce((sum, item) => sum + (item.overtime?.total || 0), 0);
    const employeeCount = filteredData.length;

    return {
      totalGross: Math.round(totalGross),
      totalNet: Math.round(totalNet),
      totalDeductions: Math.round(totalDeductions),
      totalReimbursements: Math.round(totalReimbursements),
      totalTravel: Math.round(totalTravel),
      totalOvertime: Math.round(totalOvertime),
      employeeCount,
    };
  }, [filteredData]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Role',
      'Department',
      'CTC',
      'Salary Type',
      'Gross Salary',
      'Present Days',
      'Absent Days',
      'Half Days',
      'Paid Leave',
      'Unpaid Leave',
      'Payable Days',
      'Deductions',
      'Reimbursements',
      'Travel Allowance',
      'Overtime Pay',
      'Net Salary',
      'Salary Date',
      'Payment Status',
    ];

    const rows = filteredData.map((item) => [
      item.employeeId,
      item.name,
      item.role,
      item.department,
      item.ctcAmount,
      item.salaryType,
      item.grossSalary,
      item.attendance.presentDays,
      item.attendance.absentDays,
      item.attendance.halfDays,
      item.attendance.paidLeaveDays,
      item.attendance.unpaidLeaveDays,
      item.payableDays,
      item.deductions.total,
      item.reimbursements?.total || 0,
      item.travel?.total || 0,
      item.overtime?.total || 0,
      item.netSalary,
      salaryDateInfo.formattedDate,
      salaryDateInfo.isPast ? 'Paid' : salaryDateInfo.isToday ? 'Due Today' : 'Pending',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_report_${year}_${month}_${salaryDateInfo.formattedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  // Generate salary slips
  const handleGenerateSlips = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(
        '/salary-slips/generate',
        {
          month,
          year,
          overwrite: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(
        `✅ Generated ${res.data.created} salary slip(s)${res.data.skipped > 0 ? `, skipped ${res.data.skipped}` : ''
        }`
      );

      if (res.data.errors > 0) {
        toast.warning(`⚠️ ${res.data.errors} error(s) occurred`);
        console.error('Generation errors:', res.data.errorDetails);
      }

      setShowGenerateModal(false);
    } catch (err) {
      console.error('Failed to generate salary slips:', err);
      toast.error(err.response?.data?.message || 'Failed to generate salary slips');
    } finally {
      setGenerating(false);
    }
  };
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <DashboardLayout title="Salary Management">
      <div className="space-y-6">
        {/* Month/Year Selector & Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Month
                </label>
                <Select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  options={monthNames.map((name, index) => ({
                    value: index + 1,
                    label: name
                  }))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Year
                </label>
                <Select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  options={[2024, 2025, 2026, 2027].map((y) => ({
                    value: y,
                    label: y.toString()
                  }))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/admin/salary-history'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <FaCalendarAlt />
                View History
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              >
                <FaFileDownload />
                Generate Slips
              </button>
            </div>
          </div>
        </div>
        {/* Auto-Calculation Info Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 shadow-lg text-white">
          <div className="flex items-center gap-3">
            <FaInfoCircle size={24} className="opacity-90" />
            <div>
              <h3 className="font-bold text-lg">Auto-Calculated Salary Period</h3>
              <p className="text-sm opacity-90">{salaryDateInfo.autoMessage}</p>
              <p className="text-xs opacity-75 mt-1">
                {salaryDateInfo.isPaymentPending
                  ? '💰 This salary is finalized and ready for payment'
                  : '📊 This salary is being calculated based on ongoing attendance'}
              </p>
            </div>
          </div>
        </div>

        {/* Salary Date Alert Banner */}
        {/* <div className={`rounded-xl p-4 shadow-lg ${
          salaryDateInfo.isToday 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : salaryDateInfo.isPast 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
            : 'bg-gradient-to-r from-orange-500 to-orange-600'
        } text-white`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FaCalendarCheck size={28} className="opacity-90" />
              <div>
                <h3 className="font-bold text-lg">
                  {salaryDateInfo.isToday && '🎉 Salary Day Today!'}
                  {salaryDateInfo.isPast && '✅ Salary Already Paid'}
                  {salaryDateInfo.isFuture && salaryDateInfo.isPaymentPending && '⏳ Payment Pending'}
                  {salaryDateInfo.isFuture && !salaryDateInfo.isPaymentPending && '📊 Salary In Progress'}
                </h3>
                <p className="text-sm opacity-90">
                  Salary Date: <span className="font-semibold">{salaryDateInfo.formattedDate}</span>
                  {!salaryDateInfo.isToday && !salaryDateInfo.isPast && (
                    <span className="ml-2">
                      - Next salary in <span className="font-bold">{salaryDateInfo.daysUntilSalary} days</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            {!salaryDateInfo.isPast && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <FaClock size={16} />
                  <span className="text-sm font-medium">
                    Next: {salaryDateInfo.nextFormattedDate}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div> */}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FaUsers size={24} className="opacity-80" />
              <div className="text-3xl font-bold">{summary.employeeCount}</div>
            </div>
            <p className="text-sm opacity-90">Total Employees</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FaMoneyBillWave size={24} className="opacity-80" />
              <div className="text-2xl font-bold">{formatCurrency(summary.totalGross)}</div>
            </div>
            <p className="text-sm opacity-90">Total Gross Salary</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FaExclamationTriangle size={24} className="opacity-80" />
              <div className="text-2xl font-bold">{formatCurrency(summary.totalDeductions)}</div>
            </div>
            <p className="text-sm opacity-90">Total Deductions</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FaChartLine size={24} className="opacity-80" />
              <div className="text-2xl font-bold">{formatCurrency(summary.totalNet)}</div>
            </div>
            <p className="text-sm opacity-90">Total Net Payable</p>
            <p className="text-xs opacity-75 mt-1">
              {salaryDateInfo.isPaymentPending ? '💰 Ready for payment' : '📊 In progress'}
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        {!loading && salaryData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, username, or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="labour">Labour</option>
                  <option value="subcontractor">Subcontractor</option>
                </Select>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 dark:bg-green-900 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-900 transition"
                >
                  <FaFileDownload />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Salary Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Role</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">CTC</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Gross</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Days</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Net Salary</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <React.Fragment key={item.userId}>
                      <tr className="border-b dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">@{item.username}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{item.employeeId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            item.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                              item.role === 'labour' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            } dark:bg-gray-700 dark:text-white`}>
                            {item.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium">{formatCurrency(item.ctcAmount)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.salaryType}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.grossSalary)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <p className="text-green-600 dark:text-green-400 font-semibold">{item.payableDays}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">of {item.attendance.workingDays}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(item.deductions.total)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-lg text-green-600 dark:text-green-400">
                            {formatCurrency(item.netSalary)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedRow(expandedRow === item.userId ? null : item.userId)}
                            className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-500 font-medium text-sm"
                          >
                            {expandedRow === item.userId ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Row Details */}
                      {/* Expanded Row Details */}
                      {expandedRow === item.userId && (
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-600">
                          <td colSpan="8" className="px-4 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                              {/* Attendance Breakdown */}
                              <div>
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <FaCalendarAlt className="text-orange-500 dark:text-orange-400" />
                                  Attendance
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Present:</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">{item.attendance.presentDays}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Absent:</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">{item.attendance.absentDays}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Half Days:</span>
                                    <span className="font-medium text-yellow-600 dark:text-yellow-400">{item.attendance.halfDays}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Paid Leave:</span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">
                                      {item.attendance.effectivePaidLeaveDays || item.attendance.paidLeaveDays || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Unpaid:</span>
                                    <span className="font-medium text-orange-600 dark:text-orange-400">
                                      {item.attendance.effectiveUnpaidLeaveDays || item.attendance.unpaidLeaveDays || 0}
                                    </span>
                                  </div>
                                  {item.attendance.totalHoursWorked && (
                                    <div className="flex justify-between border-t pt-2">
                                      <span className="text-gray-600 dark:text-gray-400">Total Hours:</span>
                                      <span className="font-medium">{item.attendance.totalHoursWorked}h</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Salary Calculation */}
                              <div>
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <FaRupeeSign className="text-green-500 dark:text-green-400" />
                                  Salary
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Gross:</span>
                                    <span className="font-medium">{formatCurrency(item.grossSalary)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Per Day:</span>
                                    <span className="font-medium">{formatCurrency(item.perDaySalary)}</span>
                                  </div>
                                  {item.perHourRate && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Per Hour:</span>
                                      <span className="font-medium">{formatCurrency(item.perHourRate)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Payable Days:</span>
                                    <span className="font-medium">{item.payableDays}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Net Salary:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(item.netSalary)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Deductions */}
                              <div>
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <FaExclamationTriangle className="text-red-500 dark:text-red-400" />
                                  Deductions
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Absent:</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(item.deductions.absent)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Half Day:</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(item.deductions.halfDay)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Unpaid Leave:</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(item.deductions.unpaidLeave)}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Total:</span>
                                    <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(item.deductions.total)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Travel & Reimbursements */}
                              <div>
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <FaMoneyBillWave className="text-blue-500 dark:text-blue-400" />
                                  Benefits
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {item.travel && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Daily Travel:</span>
                                        <span className="font-medium text-blue-600 dark:text-blue-400">
                                          {formatCurrency(item.travel.perDayAllowance || 0)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Railway Pass:</span>
                                        <span className="font-medium text-blue-600 dark:text-blue-400">
                                          {formatCurrency(item.travel.railwayPass || 0)}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                  {item.reimbursements && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Reimbursements:</span>
                                      <span className="font-medium text-blue-600 dark:text-blue-400">
                                        {formatCurrency(item.reimbursements.total || 0)}
                                        {item.reimbursements.count > 0 && (
                                          <span className="text-xs ml-1">({item.reimbursements.count})</span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between border-t pt-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Total Benefits:</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                      {formatCurrency(
                                        (item.travel?.total || 0) + (item.reimbursements?.total || 0)
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Overtime */}
                              <div>
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <FaClock className="text-purple-500 dark:text-purple-400" />
                                  Overtime
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {item.overtime ? (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">OT Hours:</span>
                                        <span className="font-medium text-purple-600 dark:text-purple-400">
                                          {item.overtime.hours || 0}h
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Hourly Rate:</span>
                                        <span className="font-medium">{formatCurrency(item.overtime.rate || 0)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Multiplier:</span>
                                        <span className="font-medium">{item.overtime.multiplier || 1.0}x</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-2">
                                        <span className="text-gray-700 dark:text-gray-300 font-semibold">OT Pay:</span>
                                        <span className="font-bold text-purple-600 dark:text-purple-400">
                                          {formatCurrency(item.overtime.total || 0)}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-xs">No overtime</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results Summary */}
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              Showing {filteredData.length} of {salaryData.length} employees
            </div>
          </div>
        )}

        {/* No Data Message */}
        {!loading && salaryData.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
            <FaInfoCircle size={48} className="mx-auto text-gray-300 dark:text-gray-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">No Salary Data</h3>
            <p className="text-gray-500 dark:text-gray-400">No employees found with salary information for the selected period.</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 dark:border-orange-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading salary data...</p>
          </div>
        )}
      </div>
      {/* Generate Salary Slips Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Generate Salary Slips
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Create permanent salary records for {monthNames[month - 1]} {year}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="text-orange-500 mt-0.5" />
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    <p className="font-semibold mb-1">What happens when you generate slips?</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Permanent salary records will be created for <strong>{filteredData.length} employee(s)</strong></li>
                      <li>Records include attendance, deductions, and benefits</li>
                      <li>You can mark them as paid after generation</li>
                      <li>Existing slips for this period will be skipped</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Period:</span>
                    <span className="font-medium">{monthNames[month - 1]} {year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Employees:</span>
                    <span className="font-medium">{filteredData.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Payable:</span>
                    <span className="font-medium text-green-600">{formatCurrency(summary.totalNet)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSlips}
                disabled={generating || filteredData.length === 0}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Generate {filteredData.length} Slip(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SalaryDashboard;