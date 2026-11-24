// src/pages/reports/components/useAdminReports.js
// Data, requests and the Excel / PDF export functions of the Reports page, moved here UNCHANGED from AdminReports.jsx.
// The export code (including its dynamic imports of xlsx and jspdf) is byte-for-byte what it was.
import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchProjectsCached } from '@/hooks/useProjects';
import axios from '@/api/client';
import { formatCurrency, formatDate } from '../reportFormat';

export const REPORT_KEYS = ['workOrder', 'material', 'labour'];

export default function useAdminReports() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeReportType, setActiveReportType] = useState(REPORT_KEYS[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = { data: await fetchProjectsCached() };
        const projectList = response.data || [];
        setProjects(projectList);

        if (projectList.length > 0 && !selectedProject) {
          setSelectedProject(projectList[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch projects', err);
        setError('Failed to fetch projects. Please try again later.');
      }
    };

    fetchProjects();
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject || !selectedMonth) {
      setReportData(null);
      return;
    }

    const [year, month] = selectedMonth.split('-');

    const fetchReports = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(
          `/reports/project/${selectedProject}?month=${Number(month)}&year=${Number(year)}`
        );
        const apiData = response?.data?.data;
        setReportData(apiData || null);
      } catch (err) {
        console.error('Failed to fetch reports', err);
        const message = err?.response?.data?.message || 'Failed to fetch report data. Please try again.';
        setError(message);
        setReportData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedProject, selectedMonth]);

  const summaryCard = useMemo(() => {
    if (!reportData) return null;
    return {
      billing: reportData.totalBilling || 0,
      materialCost: reportData.totalMaterialCost || 0,
      labourCost: reportData.totalLabourCost || 0,
      expenses: reportData.totalExpenses || 0,
      profitOrLoss: reportData.profitOrLoss || 0,
      outstanding: reportData.outstandingAmount || 0,
    };
  }, [reportData]);

  const getMonthLabel = useCallback((monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, []);

  const exportToExcel = useCallback(async () => {
    if (!reportData) return;
    // Loaded on demand: xlsx is large and only needed when exporting.
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const projectName = reportData.projectName || 'Report';
    const period = getMonthLabel(selectedMonth);

    // Summary sheet
    const summaryRows = [
      ['Project Report'],
      ['Project', projectName],
      ['Period', period],
      [],
      ['Metric', 'Value (₹)'],
      ['Total Billing', summaryCard?.billing || 0],
      ['Material Cost', summaryCard?.materialCost || 0],
      ['Labour Cost', summaryCard?.labourCost || 0],
      ['Total Expenses', summaryCard?.expenses || 0],
      ['Outstanding', summaryCard?.outstanding || 0],
      ['Profit / Loss', summaryCard?.profitOrLoss || 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(summaryRows);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    // Work Orders sheet
    if (reportData.woData?.length) {
      const rows = reportData.woData.map((wo) => ({
        'WO No': wo.workOrderNo || '',
        'Name': wo.name || '',
        'Total Value': wo.totalValue || 0,
        'Billed (Period)': wo.billedInPeriod || 0,
        'Retention': wo.retentionInPeriod || 0,
        'Holding': wo.holdingInPeriod || 0,
        'Lifetime Billed': wo.lifetimeBilled || 0,
        'Outstanding': wo.outstandingLifetime || 0,
        'Status': wo.status || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Work Orders');
    }

    // Material sheet
    if (reportData.materialData?.length) {
      const rows = reportData.materialData.map((m) => ({
        'Reference': m.transferNumber || '',
        'Invoice No': m.invoiceNumber || '',
        'Material': m.materialName || '',
        'Quantity': m.quantity ?? '',
        'Rate': m.rate ?? '',
        'Invoice Date': m.billDate ? formatDate(m.billDate) : '',
        'Amount': m.totalAmount || 0,
        'Company': m.companyName || '',
        'Status': m.status || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Material');
    }

    // Labour sheet
    if (reportData.labourData?.length) {
      const rows = reportData.labourData.map((l) => ({
        'Name': l.name || '',
        'Employee ID': l.employeeId || '',
        'Role': l.role || '',
        'Salary Type': l.salaryType || '',
        'Gross Salary': l.grossSalary || 0,
        'Net Payout': l.netSalary || 0,
        'Deductions': l.deductions || 0,
        'Travel Allow.': l.travelAllowance || 0,
        'Overtime': l.overtimePay || 0,
        'Source': l.dataSource === 'salarySlip' ? 'Salary Slip' : 'Estimated',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Labour');
    }

    XLSX.writeFile(wb, `${projectName}_Report_${selectedMonth}.xlsx`);
  }, [reportData, summaryCard, selectedMonth, getMonthLabel]);

  const exportToPDF = useCallback(async () => {
    if (!reportData) return;
    // Loaded on demand: jsPDF + autoTable are large and only needed when exporting.
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF('l', 'mm', 'a4');
    const projectName = reportData.projectName || 'Report';
    const period = getMonthLabel(selectedMonth);

    // Title
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text(`Project Report: ${projectName}`, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${period}`, 14, 28);

    // Summary table
    autoTable(doc, {
      startY: 34,
      head: [['Metric', 'Value']],
      body: [
        ['Total Billing', formatCurrency(summaryCard?.billing)],
        ['Material Cost', formatCurrency(summaryCard?.materialCost)],
        ['Labour Cost', formatCurrency(summaryCard?.labourCost)],
        ['Total Expenses', formatCurrency(summaryCard?.expenses)],
        ['Outstanding', formatCurrency(summaryCard?.outstanding)],
        ['Profit / Loss', formatCurrency(summaryCard?.profitOrLoss)],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
    });

    // Work Orders
    if (reportData.woData?.length) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Work Order Report', 14, 20);
      autoTable(doc, {
        startY: 26,
        head: [['WO No', 'Name', 'Total Value', 'Billed (Period)', 'Retention', 'Holding', 'Outstanding', 'Status']],
        body: reportData.woData.map((wo) => [
          wo.workOrderNo || '', wo.name || '',
          formatCurrency(wo.totalValue), formatCurrency(wo.billedInPeriod),
          formatCurrency(wo.retentionInPeriod), formatCurrency(wo.holdingInPeriod),
          formatCurrency(wo.outstandingLifetime), wo.status || '',
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      });
    }

    // Material
    if (reportData.materialData?.length) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Material Inventory Report', 14, 20);
      autoTable(doc, {
        startY: 26,
        head: [['Reference', 'Invoice', 'Material', 'Qty', 'Rate', 'Amount', 'Company', 'Status']],
        body: reportData.materialData.map((m) => [
          m.transferNumber || '', m.invoiceNumber || '', m.materialName || '',
          m.quantity ?? '-', m.rate != null ? formatCurrency(m.rate) : '-',
          formatCurrency(m.totalAmount), m.companyName || '', m.status || '',
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      });
    }

    // Labour
    if (reportData.labourData?.length) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Labour Inventory Report', 14, 20);
      autoTable(doc, {
        startY: 26,
        head: [['Name', 'Emp ID', 'Role', 'Type', 'Gross', 'Net Payout', 'Deductions', 'Travel', 'Overtime', 'Source']],
        body: reportData.labourData.map((l) => [
          l.name || '', l.employeeId || '', l.role || '',
          l.salaryType || '', formatCurrency(l.grossSalary), formatCurrency(l.netSalary),
          formatCurrency(l.deductions), formatCurrency(l.travelAllowance),
          formatCurrency(l.overtimePay), l.dataSource === 'salarySlip' ? 'Salary Slip' : 'Estimated',
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      });
    }

    doc.save(`${projectName}_Report_${selectedMonth}.pdf`);
  }, [reportData, summaryCard, selectedMonth, getMonthLabel]);
  return {
    projects, selectedProject, setSelectedProject, selectedMonth, setSelectedMonth,
    activeReportType, setActiveReportType, reportData, loading, error, summaryCard, getMonthLabel,
    exportToExcel, exportToPDF,
  };
}
