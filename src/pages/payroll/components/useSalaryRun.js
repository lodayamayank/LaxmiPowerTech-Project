// src/pages/payroll/components/useSalaryRun.js
// All data, requests and handlers of the Salary run page, moved here UNCHANGED from SalaryDashboard.jsx
// (only the render code was rewritten). Do not edit calculations or request payloads here without review.
import { useEffect, useState, useMemo } from 'react';
import { getToken } from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import { USERS_KEY } from '@/hooks/useUsers';
import axios from '@/api/client';
import { toast } from 'sonner';

export default function useSalaryRun() {
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

  const token = getToken();

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
        queryClient.invalidateQueries({ queryKey: USERS_KEY });

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
  return {
    salaryData, pagination, page, setPage, PAGE_SIZE, loading, computedAt, recalculating,
    showGenerateModal, setShowGenerateModal, generating,
    month, setMonth, year, setYear, roleFilter, setRoleFilter, searchTerm, setSearchTerm,
    expandedRow, setExpandedRow, otherEdits, salaryDateInfo, filteredData, summary,
    handleRecalculate, toggleRow, addOtherItem, updateOtherItem, removeOtherItem, saveOtherAmounts,
    exportToCSV, handleGenerateSlips, monthNames,
  };
}
