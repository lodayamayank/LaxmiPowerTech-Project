import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { FaChartPie, FaHardHat, FaWarehouse } from 'react-icons/fa';
import { MdOutlineWork } from 'react-icons/md';

const REPORT_TYPES = [
  {
    key: 'workOrder',
    label: 'Work Order Report',
    description: 'View work order value, billing and retention summary.',
    icon: <MdOutlineWork className="text-xl" />,
  },
  {
    key: 'material',
    label: 'Material Inventory Report',
    description: 'Track GRN invoices, material costs and supplier details.',
    icon: <FaWarehouse className="text-xl" />,
  },
  {
    key: 'labour',
    label: 'Labour Inventory Report',
    description: 'Analyse labour cost, payouts and attendance insights.',
    icon: <FaHardHat className="text-xl" />,
  },
];

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const AdminReports = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeReportType, setActiveReportType] = useState(REPORT_TYPES[0].key);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('/projects');
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
  }, []);

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
    };
  }, [reportData]);

  const renderReportBody = () => {
    if (!reportData) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          {selectedProject
            ? 'Select a report type to view detailed analytics.'
            : 'Choose a project and period to generate reports.'}
        </div>
      );
    }

    if (activeReportType === 'workOrder') {
      const rows = reportData.woData || [];
      const totals = reportData.woSummary || {};

      return (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile title="Total Work Orders" value={totals.totalWorkOrders || 0} />
            <SummaryTile title="Total WO Value" value={formatCurrency(totals.totalWorkOrderValue)} />
            <SummaryTile title="Billed (Selected Period)" value={formatCurrency(totals.totalBilledInPeriod)} />
            <SummaryTile title="Lifetime Outstanding" value={formatCurrency(totals.outstandingLifetime)} />
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
              No work orders found for this project.
            </div>
          ) : (
            rows.map((wo, index) => (
              <div key={wo.id || index} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-orange-50 to-white px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-800">
                    Work Order: {wo.workOrderNo || index + 1}
                    <span className="ml-2 text-gray-500 font-normal">|</span>
                    <span className="ml-2 font-semibold text-orange-600">Total Value: {formatCurrency(wo.totalValue)}</span>
                  </h3>
                  {wo.name && <p className="text-sm text-gray-500 mt-1">{wo.name}</p>}
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-100 p-3 text-center">
                      <p className="text-xs uppercase text-gray-400">Total Bill</p>
                      <p className="text-lg font-semibold text-gray-800">{formatCurrency(wo.billedInPeriod)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 p-3 text-center">
                      <p className="text-xs uppercase text-gray-400">Total Retention</p>
                      <p className="text-lg font-semibold text-gray-800">{formatCurrency(wo.retentionInPeriod)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 p-3 text-center">
                      <p className="text-xs uppercase text-gray-400">Total Holding</p>
                      <p className="text-lg font-semibold text-gray-800">{formatCurrency(wo.holdingInPeriod)}</p>
                    </div>
                  </div>

                  {wo.bills && wo.bills.length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Bill Details</p>
                      <table className="min-w-full divide-y divide-gray-200 text-sm border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Invoice No.</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Retention</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Holding</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {wo.bills.map((bill) => (
                            <tr key={bill.id} className="hover:bg-orange-50/40">
                              <td className="px-4 py-2 text-gray-700">{bill.billNo || '-'}</td>
                              <td className="px-4 py-2 text-gray-700">{formatDate(bill.billDate)}</td>
                              <td className="px-4 py-2 text-gray-700">{formatCurrency(bill.totalBillValue)}</td>
                              <td className="px-4 py-2 text-gray-700">{formatCurrency(bill.retentionAmount)}</td>
                              <td className="px-4 py-2 text-gray-700">{formatCurrency(bill.holdingAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
                    <span className="text-gray-500">Lifetime Billed: <strong className="text-gray-800">{formatCurrency(wo.lifetimeBilled)}</strong></span>
                    <span className="text-gray-500">Outstanding: <strong className="text-orange-600">{formatCurrency(wo.outstandingLifetime)}</strong></span>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${wo.status === 'active' ? 'bg-green-100 text-green-700' : wo.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {wo.status || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      );
    }

    if (activeReportType === 'material') {
      const rows = reportData.materialData || [];
      const totals = reportData.materialSummary || {};

      return (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile title="Deliveries" value={totals.deliveriesCount || 0} />
            <SummaryTile title="Gross Material Value" value={formatCurrency(totals.totalMaterialPrice)} />
            <SummaryTile title="Material Discount" value={formatCurrency(totals.totalMaterialDiscount)} />
            <SummaryTile title="Total Material Cost" value={formatCurrency(totals.totalMaterialCost)} />
          </div>

          <ReportTable
            columns={[
              { key: 'transferNumber', label: 'Reference' },
              { key: 'invoiceNumber', label: 'Invoice No.' },
              { key: 'materialName', label: 'Material' },
              { key: 'quantity', label: 'Qty', render: (v) => (v != null ? v : '-') },
              { key: 'rate', label: 'Rate', render: (v) => (v != null ? formatCurrency(v) : '-') },
              { key: 'billDate', label: 'Invoice Date', render: (value) => formatDate(value) },
              { key: 'totalAmount', label: 'Amount', render: (value) => formatCurrency(value) },
              { key: 'companyName', label: 'Company' },
              { key: 'status', label: 'Status' },
            ]}
            rows={rows}
            emptyMessage="No GRN invoices recorded for the selected period."
          />
        </section>
      );
    }

    if (activeReportType === 'labour') {
      const rows = reportData.labourData || [];
      const totals = reportData.labourSummary || {};

      return (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryTile title="Team Members" value={totals.labourCount || 0} />
            <SummaryTile title="Total Labour Cost" value={formatCurrency(totals.totalLabourCost)} />
            <SummaryTile
              title="Data Source"
              value={
                totals.dataSource === 'salarySlip'
                  ? 'Salary Slip'
                  : totals.dataSource === 'mixed'
                  ? 'Salary Slip + Estimates'
                  : 'Estimated'
              }
            />
          </div>

          <ReportTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'employeeId', label: 'Employee ID' },
              { key: 'role', label: 'Role' },
              { key: 'salaryType', label: 'Salary Type', render: (value) => value?.toUpperCase?.() || value },
              { key: 'grossSalary', label: 'Gross Salary', render: (value) => formatCurrency(value) },
              { key: 'netSalary', label: 'Net Payout', render: (value) => formatCurrency(value) },
              { key: 'deductions', label: 'Deductions', render: (value) => formatCurrency(value) },
              { key: 'travelAllowance', label: 'Travel Allow.', render: (value) => formatCurrency(value) },
              { key: 'overtimePay', label: 'Overtime', render: (value) => formatCurrency(value) },
              {
                key: 'dataSource',
                label: 'Source',
                render: (value) => (value === 'salarySlip' ? 'Salary Slip' : 'Estimated'),
              },
            ]}
            rows={rows}
            emptyMessage="No labour cost records available for the selected period."
          />
        </section>
      );
    }

    return null;
  };

  return (
    <DashboardLayout title="Reports">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Reports</h1>
            <p className="text-sm text-gray-500">Generate project-wise financial and operational insights.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:w-64"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:w-40"
            />
          </div>
        </header>

        {reportData?.projectName && (
          <section className="grid gap-4 rounded-2xl bg-gradient-to-r from-orange-50 to-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Project</p>
              <p className="text-lg font-semibold text-gray-800">{reportData.projectName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Billing (Period)</p>
              <p className="text-lg font-semibold text-gray-800">{formatCurrency(summaryCard?.billing)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Expenses (Material + Labour)</p>
              <p className="text-lg font-semibold text-gray-800">{formatCurrency(summaryCard?.expenses)}</p>
            </div>
            <div className="rounded-xl border border-dashed border-orange-200 bg-white/70 p-4 text-sm font-semibold text-gray-700 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-orange-500">Profit / Loss</p>
              <p
                className={`text-xl font-bold ${
                  summaryCard?.profitOrLoss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(summaryCard?.profitOrLoss)}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {REPORT_TYPES.map((type) => {
            const isActive = activeReportType === type.key;
            return (
              <button
                key={type.key}
                type="button"
                onClick={() => setActiveReportType(type.key)}
                className={`flex h-full flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                  isActive ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200'
                }`}
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                    isActive ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-500'
                  }`}
                >
                  {type.icon}
                </div>
                <h2 className="mb-2 text-lg font-semibold text-gray-900">{type.label}</h2>
                <p className="text-sm text-gray-500">{type.description}</p>
              </button>
            );
          })}
        </section>

        {loading && (
          <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-white p-8 text-gray-500 shadow-sm">
            <FaChartPie className="mr-3 animate-spin text-orange-500" /> Generating report...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && renderReportBody()}

        {reportData && (
          <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Final Summary</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile title="Total Billing" value={formatCurrency(summaryCard?.billing)} />
              <SummaryTile title="Material Cost" value={formatCurrency(summaryCard?.materialCost)} />
              <SummaryTile title="Labour Cost" value={formatCurrency(summaryCard?.labourCost)} />
              <SummaryTile
                title="Profit / Loss"
                value={formatCurrency(summaryCard?.profitOrLoss)}
                valueClass={summaryCard?.profitOrLoss >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

const SummaryTile = ({ title, value, valueClass }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
    <p className={`mt-2 text-lg font-semibold text-gray-800 ${valueClass || ''}`}>{value}</p>
  </div>
);

const ReportTable = ({ columns, rows, emptyMessage }) => {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id || row._id} className="hover:bg-orange-50/40">
                {columns.map((column) => {
                  const rawValue = row[column.key];
                  const content = column.render ? column.render(rawValue, row) : rawValue ?? '-';
                  return (
                    <td key={column.key} className="px-4 py-3 text-sm text-gray-700">
                      {content === '' ? '-' : content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReports;
