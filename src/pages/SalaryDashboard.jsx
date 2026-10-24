import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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

const SalaryDashboard = () => {
  const [salaryData, setSalaryData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [loading, setLoading] = useState(false);
  const [computedAt, setComputedAt] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
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
  const [otherEdits, setOtherEdits] = useState({}); // { [userId]: { amount, type, saving } }

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
  const fetchSalaryData = async (targetPage = page) => {
    setLoading(true);
    try {
      const params = { month, year, page: targetPage, limit: PAGE_SIZE };
      if (roleFilter) params.role = roleFilter;

      const res = await axios.get('/salary/calculate', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data, total, totalPages, page: returnedPage, computedAt: ca } = res.data;
      setSalaryData(data || []);
      setPagination({ page: returnedPage, total, totalPages });
      if (ca) setComputedAt(new Date(ca));
    } catch (err) {
      console.error('Failed to fetch salary data:', err);
      if (err.response?.status !== 404) {
        toast.error('Failed to load salary data');
      }
      setSalaryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchSalaryData(1);
  }, [month, year, roleFilter]);

  useEffect(() => {
    fetchSalaryData(page);
  }, [page]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    return salaryData.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salaryData, searchTerm]);

  // Calculate summary statistics (across current page only)
  const summary = useMemo(() => {
    const totalGross = filteredData.reduce((sum, item) => sum + item.grossSalary, 0);
    const totalNet = filteredData.reduce((sum, item) => sum + item.netSalary, 0);
    const totalDeductions = filteredData.reduce((sum, item) => sum + item.deductions.total, 0);
    const totalReimbursements = filteredData.reduce((sum, item) => sum + (item.reimbursements?.total || 0), 0);
    const totalTravel = filteredData.reduce((sum, item) => sum + (item.travel?.total || 0), 0);
    const totalOvertime = filteredData.reduce((sum, item) => sum + (item.overtime?.total ?? item.overtime?.pay ?? 0), 0);
    const employeeCount = pagination.total;

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

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await axios.post('/salary/recalculate', { month, year }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Salary recalculated');
      setPage(1);
      fetchSalaryData(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

    const makeKey = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const buildEditItems = (item) => {
      const list = item.otherAmounts?.length ? item.otherAmounts : [];
      return list.map((o) => ({
        key: makeKey(),
        label: o.label,
        amount: o.amount,
        type: o.type,
      }));
    };

    const toggleRow = (item) => {
      const next = expandedRow === item.userId ? null : item.userId;
      setExpandedRow(next);
      if (next && !otherEdits[next]) {
        setOtherEdits((prev) => ({
          ...prev,
          [next]: { items: buildEditItems(item), saving: false },
        }));
      }
    };

    const addOtherItem = (userId) => {
      setOtherEdits((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          items: [
            ...prev[userId].items,
            { key: makeKey(), label: "", amount: "", type: "earning" },
          ],
        },
      }));
    };

    const updateOtherItem = (userId, key, field, value) => {
      setOtherEdits((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          items: prev[userId].items.map((it) =>
            it.key === key ? { ...it, [field]: value } : it
          ),
        },
      }));
    };

    const removeOtherItem = (userId, key) => {
      setOtherEdits((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          items: prev[userId].items.filter((it) => it.key !== key),
        },
      }));
    };

    const saveOtherAmounts = async (userId) => {
      const edit = otherEdits[userId];
      const rows = edit.items.filter(
        (it) => it.label.trim() || it.amount !== ""
      );

      for (const it of rows) {
        if (!it.label.trim())
          return toast.error("Please add a reason for every amount");
        if (!(parseFloat(it.amount) >= 0))
          return toast.error(`Enter a valid amount for "${it.label}"`);
      }

      setOtherEdits((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], saving: true },
      }));
      try {
        const res = await axios.patch(
          `/users/${userId}/salary-config`,
          {
            otherAmounts: rows.map((it) => ({
              label: it.label.trim(),
              amount: parseFloat(it.amount) || 0,
              type: it.type,
            })),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        await axios.post(
          "/salary/recalculate",
          { month, year },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        toast.success("Other amounts saved");

        const saved = res.data.user?.otherAmounts || [];
        setOtherEdits((prev) => ({
          ...prev,
          [userId]: {
            saving: false,
            items: saved.map((o) => ({
              key: makeKey(),
              label: o.label,
              amount: o.amount,
              type: o.type,
            })),
          },
        }));
        fetchSalaryData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to save");
        setOtherEdits((prev) => ({
          ...prev,
          [userId]: { ...prev[userId], saving: false },
        }));
      }
    };


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
      "Employee ID",
      "Name",
      "Role",
      "Department",
      "CTC",
      "Salary Type",
      "Gross Salary",
      "Present Days",
      "Absent Days",
      "Half Days",
      "Paid Leave",
      "Unpaid Leave",
      "Payable Days",
      "Deductions",
      "Reimbursements",
      "Travel Allowance",
      "Overtime Pay",
      "Other Earnings",
      "Other Deductions",
      "Net Salary",
      "Salary Date",
      "Payment Status",
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
      item.overtime?.total ?? item.overtime?.pay ?? 0,
      item.otherEarnings || 0,
      item.otherDeductions || 0,
      item.netSalary,
      salaryDateInfo.formattedDate,
      salaryDateInfo.isPast
        ? "Paid"
        : salaryDateInfo.isToday
        ? "Due Today"
        : "Pending",
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
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <Label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Month
                  </Label>
                  <Select
                    value={String(month)}
                    onValueChange={(value) => setMonth(Number(value))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((name, index) => (
                        <SelectItem key={name} value={String(index + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Year
                  </Label>
                  <Select
                    value={String(year)}
                    onValueChange={(value) => setYear(Number(value))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-3">
                  <Button
                    onClick={() =>
                      (window.location.href = "/admin/salary-history")
                    }
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
                  >
                    <FaCalendarAlt />
                    View History
                  </Button>
                  <Button
                    onClick={handleRecalculate}
                    disabled={recalculating || loading}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                  >
                    {recalculating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{" "}
                        Recalculating...
                      </>
                    ) : (
                      <>
                        <FaChartLine /> Recalculate
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowGenerateModal(true)}
                    className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600"
                  >
                    <FaFileDownload />
                    Generate Slips
                  </Button>
                </div>
                {computedAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Last computed:{" "}
                    {computedAt.toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Auto-Calculation Info Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 shadow-lg text-white">
          <div className="flex items-center gap-3">
            <FaInfoCircle size={24} className="opacity-90" />
            <div>
              <h3 className="font-bold text-lg">
                Auto-Calculated Salary Period
              </h3>
              <p className="text-sm opacity-90">{salaryDateInfo.autoMessage}</p>
              <p className="text-xs opacity-75 mt-1">
                {salaryDateInfo.isPaymentPending
                  ? "💰 This salary is finalized and ready for payment"
                  : "📊 This salary is being calculated based on ongoing attendance"}
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
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalGross)}
              </div>
            </div>
            <p className="text-sm opacity-90">Total Gross Salary</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FaExclamationTriangle size={24} className="opacity-80" />
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalDeductions)}
              </div>
            </div>
            <p className="text-sm opacity-90">Total Deductions</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FaChartLine size={24} className="opacity-80" />
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalNet)}
              </div>
            </div>
            <p className="text-sm opacity-90">Total Net Payable</p>
            <p className="text-xs opacity-75 mt-1">
              {salaryDateInfo.isPaymentPending
                ? "💰 Ready for payment"
                : "📊 In progress"}
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        {!loading && salaryData.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 text-gray-400 dark:text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Search by name, username, or employee ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-auto pl-10 pr-4 py-2 text-base md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent focus-visible:ring-orange-500 focus-visible:ring-offset-0 focus-visible:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select
                    value={roleFilter || "all"}
                    onValueChange={(value) =>
                      setRoleFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="labour">Labour</SelectItem>
                      <SelectItem value="subcontractor">
                        Subcontractor
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
                  >
                    <FaFileDownload />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Salary Table */}
              <div className="overflow-x-auto rounded-md border">
                <div className="min-w-[1100px]">
                  <div className="grid grid-cols-[minmax(0,2fr)_repeat(6,minmax(0,1fr))_minmax(130px,auto)] items-center gap-2 bg-muted/50 px-4 py-3 text-sm font-medium">
                    <div>Employee</div>
                    <div>Role</div>
                    <div className="text-right">CTC</div>
                    <div className="text-right">Gross</div>
                    <div className="text-center">Days</div>
                    <div className="text-right">Deductions</div>
                    <div className="text-right">Net Salary</div>
                    <div className="text-center">Actions</div>
                    <div />
                  </div>
                  <Accordion
                    type="single"
                    collapsible
                    value={expandedRow ? String(expandedRow) : ""}
                    onValueChange={(value) => {
                      if (!value) {
                        setExpandedRow(null);
                        return;
                      }
                      const item = filteredData.find(
                        (entry) => String(entry.userId) === value
                      );
                      if (item) toggleRow(item);
                    }}
                  >
                    {filteredData.map((item) => (
                      <AccordionItem
                        key={item.userId}
                        value={String(item.userId)}
                        className="border-b border-gray-200 last:border-b-0"
                      >
                        <div className="grid grid-cols-[minmax(0,2fr)_repeat(6,minmax(0,1fr))_minmax(130px,auto)] items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/50">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{item.username}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {item.employeeId}
                            </p>
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              className={`capitalize ${
                                item.role === "admin"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : item.role === "staff"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : item.role === "labour"
                                  ? "bg-green-50 text-green-800 border-green-200"
                                  : "bg-gray-50 text-gray-800 border-gray-200"
                              }`}
                            >
                              {item.role}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(item.ctcAmount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.salaryType}
                            </p>
                          </div>
                          <div className="text-right font-medium">
                            {formatCurrency(item.grossSalary)}
                          </div>
                          <div className="text-center">
                            <div className="text-sm">
                              <p className="text-green-600 font-semibold">
                                {item.payableDays}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                of {item.attendance.workingDays}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-red-600 font-medium">
                            {formatCurrency(item.deductions.total)}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-green-600">
                              {formatCurrency(item.netSalary)}
                            </p>
                          </div>
                          <div className="text-center">
                            <AccordionTrigger className="w-full justify-center px-2 py-1 text-sm text-orange-500 hover:text-orange-600 hover:no-underline">
                              Details
                            </AccordionTrigger>
                          </div>
                        </div>
                        <AccordionContent className="bg-muted/50 px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {/* Attendance Breakdown */}
                            <div>
                              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <FaCalendarAlt className="text-orange-500 dark:text-orange-400" />
                                Attendance
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Present:
                                  </span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {item.attendance.presentDays}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Absent:
                                  </span>
                                  <span className="font-medium text-red-600 dark:text-red-400">
                                    {item.attendance.absentDays}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Half Days:
                                  </span>
                                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                                    {item.attendance.halfDays}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Paid Leave:
                                  </span>
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {item.attendance.effectivePaidLeaveDays ||
                                      item.attendance.paidLeaveDays ||
                                      0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Unpaid:
                                  </span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">
                                    {item.attendance.effectiveUnpaidLeaveDays ||
                                      item.attendance.unpaidLeaveDays ||
                                      0}
                                  </span>
                                </div>
                                {item.attendance.totalHoursWorked && (
                                  <div className="flex justify-between border-t pt-2">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Total Hours:
                                    </span>
                                    <span className="font-medium">
                                      {item.attendance.totalHoursWorked}h
                                    </span>
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
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Gross:
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(item.grossSalary)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Per Day:
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(item.perDaySalary)}
                                  </span>
                                </div>
                                {item.perHourRate && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Per Hour:
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(item.perHourRate)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Payable Days:
                                  </span>
                                  <span className="font-medium">
                                    {item.payableDays}
                                  </span>
                                </div>
                                {item.otherAmounts?.map((o, i) => (
                                  <div key={i} className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {o.label}:
                                    </span>
                                    <span
                                      className={`font-medium ${
                                        o.type === "deduction"
                                          ? "text-red-600 dark:text-red-400"
                                          : "text-blue-600 dark:text-blue-400"
                                      }`}
                                    >
                                      {o.type === "deduction" ? "−" : "+"}
                                      {formatCurrency(o.amount)}
                                    </span>
                                  </div>
                                ))}
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-gray-700 dark:text-gray-300 font-semibold">
                                    Net Salary:
                                  </span>
                                  <span className="font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(item.netSalary)}
                                  </span>
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
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Absent:
                                  </span>
                                  <span className="font-medium text-red-600 dark:text-red-400">
                                    {formatCurrency(item.deductions.absent)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Half Day:
                                  </span>
                                  <span className="font-medium text-red-600 dark:text-red-400">
                                    {formatCurrency(item.deductions.halfDay)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Unpaid Leave:
                                  </span>
                                  <span className="font-medium text-red-600 dark:text-red-400">
                                    {formatCurrency(
                                      item.deductions.unpaidLeave
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-gray-700 dark:text-gray-300 font-semibold">
                                    Total:
                                  </span>
                                  <span className="font-bold text-red-600 dark:text-red-400">
                                    {formatCurrency(item.deductions.total)}
                                  </span>
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
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Daily Travel:
                                      </span>
                                      <span className="font-medium text-blue-600 dark:text-blue-400">
                                        {formatCurrency(
                                          item.travel.perDayAllowance || 0
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Railway Pass:
                                      </span>
                                      <span className="font-medium text-blue-600 dark:text-blue-400">
                                        {formatCurrency(
                                          item.travel.railwayPass || 0
                                        )}
                                      </span>
                                    </div>
                                  </>
                                )}
                                {item.reimbursements && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Reimbursements:
                                    </span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">
                                      {formatCurrency(
                                        item.reimbursements.total || 0
                                      )}
                                      {item.reimbursements.count > 0 && (
                                        <span className="text-xs ml-1">
                                          ({item.reimbursements.count})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-gray-700 dark:text-gray-300 font-semibold">
                                    Total Benefits:
                                  </span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(
                                      (item.travel?.total || 0) +
                                        (item.reimbursements?.total || 0)
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
                                      <span className="text-gray-600 dark:text-gray-400">
                                        OT Hours:
                                      </span>
                                      <span className="font-medium text-purple-600 dark:text-purple-400">
                                        {item.overtime.hours || 0}h
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Hourly Rate:
                                      </span>
                                      <span className="font-medium">
                                        {formatCurrency(
                                          item.overtime.rate || 0
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Multiplier:
                                      </span>
                                      <span className="font-medium">
                                        {item.overtime.multiplier || 1.0}x
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                      <span className="text-gray-700 dark:text-gray-300 font-semibold">
                                        OT Pay:
                                      </span>
                                      <span className="font-bold text-purple-600 dark:text-purple-400">
                                        {formatCurrency(
                                          item.overtime?.total ??
                                            item.overtime?.pay ??
                                            0
                                        )}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                                    No overtime
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Other Amounts editor */}
                          {otherEdits[item.userId] && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <FaRupeeSign className="text-orange-500" />
                                Other Amounts
                                <span className="text-xs font-normal text-gray-400">
                                  (added/deducted each month)
                                </span>
                              </h4>

                              <div className="space-y-3">
                                {otherEdits[item.userId].items.length === 0 && (
                                  <p className="text-xs text-gray-400">
                                    No other amounts added.
                                  </p>
                                )}

                                {otherEdits[item.userId].items.map((it) => (
                                  <div
                                    key={it.key}
                                    className="flex flex-wrap items-end gap-3"
                                  >
                                    <div>
                                      <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                                        Type
                                      </Label>
                                      <Select
                                        value={it.type}
                                        onValueChange={(v) =>
                                          updateOtherItem(
                                            item.userId,
                                            it.key,
                                            "type",
                                            v
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-[150px]">
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="earning">
                                            Earning (+)
                                          </SelectItem>
                                          <SelectItem value="deduction">
                                            Deduction (−)
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="flex-1 min-w-[200px]">
                                      <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                                        Reason / Description
                                      </Label>
                                      <Input
                                        type="text"
                                        maxLength={100}
                                        placeholder="e.g. Performance bonus, Advance recovery"
                                        value={it.label}
                                        onChange={(e) =>
                                          updateOtherItem(
                                            item.userId,
                                            it.key,
                                            "label",
                                            e.target.value
                                          )
                                        }
                                        className="h-auto border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm md:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      />
                                    </div>

                                    <div>
                                      <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                                        Amount (₹)
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={it.amount}
                                        onChange={(e) =>
                                          updateOtherItem(
                                            item.userId,
                                            it.key,
                                            "amount",
                                            e.target.value
                                          )
                                        }
                                        className="h-auto border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm md:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32"
                                      />
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        removeOtherItem(item.userId, it.key)
                                      }
                                      disabled={otherEdits[item.userId].saving}
                                      className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 flex gap-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addOtherItem(item.userId)}
                                  disabled={otherEdits[item.userId].saving}
                                >
                                  + Add Amount
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => saveOtherAmounts(item.userId)}
                                  disabled={otherEdits[item.userId].saving}
                                  className="bg-orange-500 hover:bg-orange-600"
                                >
                                  {otherEdits[item.userId].saving
                                    ? "Saving..."
                                    : "Save All"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>

              {/* Results Summary + Pagination */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(pagination.page - 1) * PAGE_SIZE + 1}–
                  {Math.min(pagination.page * PAGE_SIZE, pagination.total)} of{" "}
                  {pagination.total} employees
                </p>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      disabled={
                        pagination.page >= pagination.totalPages || loading
                      }
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {!loading && salaryData.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FaInfoCircle
                size={48}
                className="mx-auto text-gray-300 dark:text-gray-500 mb-4"
              />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
                No Salary Data
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No employees found with salary information for the selected
                period.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 dark:border-orange-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading salary data...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Generate Salary Slips Dialog */}
      <Dialog
        open={showGenerateModal}
        onOpenChange={(open) => {
          if (!generating) setShowGenerateModal(open);
        }}
      >
        <DialogContent
          className="max-w-md"
          onEscapeKeyDown={(event) => generating && event.preventDefault()}
          onInteractOutside={(event) => generating && event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Generate Salary Slips</DialogTitle>
            <DialogDescription>
              Create permanent salary records for {monthNames[month - 1]} {year}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
              <div className="flex items-start gap-3">
                <FaInfoCircle className="mt-0.5 text-orange-500" />
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  <p className="mb-1 font-semibold">
                    What happens when you generate slips?
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    <li>
                      Permanent salary records will be created for{" "}
                      <strong>{filteredData.length} employee(s)</strong>
                    </li>
                    <li>
                      Records include attendance, deductions, and benefits
                    </li>
                    <li>You can mark them as paid after generation</li>
                    <li>Existing slips for this period will be skipped</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <h4 className="mb-2 font-semibold text-gray-800 dark:text-white">
                Summary
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Period:
                  </span>
                  <span className="font-medium">
                    {monthNames[month - 1]} {year}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Employees:
                  </span>
                  <span className="font-medium">{filteredData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Payable:
                  </span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(summary.totalNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              onClick={() => setShowGenerateModal(false)}
              disabled={generating}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateSlips}
              disabled={generating || filteredData.length === 0}
              className="flex-1 bg-purple-500 hover:bg-purple-600"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Generating...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Generate {filteredData.length} Slip(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SalaryDashboard;