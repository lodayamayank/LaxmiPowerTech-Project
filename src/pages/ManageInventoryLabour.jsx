import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { FaHardHat, FaPlus, FaSearch, FaChevronDown, FaChevronUp } from 'react-icons/fa';

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

const formatMonthYear = (month, year) => {
  if (!month || !year) return '-';
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const SummaryTile = ({ title, value, tone = 'default' }) => {
  const toneClass = {
    default: 'text-gray-900',
    success: 'text-green-600',
    danger: 'text-red-600',
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
};

const ManageInventoryLabour = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [overview, setOverview] = useState({ groups: [], summary: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [fallbackNotice, setFallbackNotice] = useState('');

  const buildOverviewFromUsers = (users, monthValue, yearValue) => {
    const filteredUsers = users.filter((user) => {
      if (selectedProject === 'all') return true;
      const userProjectId = user.project?._id || user.project?.id || user.project;
      return userProjectId ? userProjectId.toString() === selectedProject : false;
    });

    const summary = {
      totalLabours: filteredUsers.length,
      totalSalary: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    const groupsMap = new Map();

    filteredUsers.forEach((labour) => {
      const monthlySalary = Number(labour.ctcAmount) || 0;
      summary.totalSalary += monthlySalary;
      summary.totalPending += monthlySalary;

      const project = labour.project
        ? labour.project.name || labour.project.projectName || labour.project
        : 'Unassigned Project';
      const branchDocs = Array.isArray(labour.assignedBranches) ? labour.assignedBranches : [];
      const branch = branchDocs[0]?.name || 'Unassigned Branch';
      const key = `${project}::${branch}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          projectName: project,
          branchName: branch,
          totalLabours: 0,
          totalSalary: 0,
          totalPaid: 0,
          totalPending: 0,
          labours: [],
        });
      }

      const group = groupsMap.get(key);
      group.totalLabours += 1;
      group.totalSalary += monthlySalary;
      group.totalPending += monthlySalary;
      group.labours.push({
        id: labour._id || labour.id,
        name: labour.name,
        username: labour.username,
        workTime: labour.standardDailyHours || null,
        monthlySalary,
        paidAmount: 0,
        pendingAmount: monthlySalary,
        project: project,
        branch: branch,
        paymentStatus: monthlySalary ? 'pending' : 'not_configured',
        dateOfJoining: labour.dateOfJoining || labour.createdAt || null,
        salaryHistory: [],
      });
    });

    return {
      summary,
      filters: {
        month: monthValue,
        year: yearValue,
        projectId: selectedProject === 'all' ? null : selectedProject,
      },
      groups: Array.from(groupsMap.values()),
    };
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('/projects');
        if (Array.isArray(response?.data)) {
          setProjects(response.data);
        } else if (Array.isArray(response?.data?.data)) {
          setProjects(response.data.data);
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.warn('Failed to fetch projects list', err);
      }
    };

    fetchProjects();
  }, []);

  const [year, month] = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return [Number(y), Number(m)];
  }, [selectedMonth]);

  useEffect(() => {
    if (!month || !year) {
      return;
    }

    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError('');
        setFallbackNotice('');
        const params = {
          month,
          year,
        };
        if (selectedProject !== 'all') {
          params.projectId = selectedProject;
        }

        const response = await axios.get('/labour/overview', { params });
        const groupedData = Array.isArray(response?.data?.data) ? response.data.data : [];
        const summaryFromApi = response?.data?.summary || null;
        setOverview({
          groups: groupedData,
          summary: summaryFromApi,
          filters: response?.data?.filters,
        });
      } catch (err) {
        console.error('Failed to fetch labour overview', err);
        const status = err?.response?.status;

        if (status === 404) {
          try {
            const fallbackResponse = await axios.get('/users', {
              params: { role: 'labour' },
            });
            const rawUsers = Array.isArray(fallbackResponse?.data)
              ? fallbackResponse.data
              : Array.isArray(fallbackResponse?.data?.data)
              ? fallbackResponse.data.data
              : [];

            const overviewFromUsers = buildOverviewFromUsers(rawUsers, month, year);
            setOverview({
              groups: overviewFromUsers.groups,
              summary: overviewFromUsers.summary,
              filters: overviewFromUsers.filters,
            });
            setFallbackNotice(
              'Using basic labour data (detailed salary history unavailable on current backend deployment).'
            );
            setError('');
          } catch (fallbackErr) {
            console.error('Failed to fetch labour list fallback', fallbackErr);
            setError(
              fallbackErr?.response?.data?.message ||
                'Unable to load labour overview. Please try again.'
            );
            setOverview({ groups: [], summary: null, filters: null });
          }
        } else {
          setError(err?.response?.data?.message || 'Unable to load labour overview. Please try again.');
          setOverview({ groups: [], summary: null, filters: null });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [month, year, selectedProject]);

  const groups = useMemo(() => {
    const baseGroups = Array.isArray(overview?.groups) ? overview.groups : [];
    if (!searchTerm) return baseGroups;

    const term = searchTerm.toLowerCase();

    return baseGroups
      .map((group) => ({
        ...group,
        labours: group.labours.filter((labour) =>
          labour.name?.toLowerCase?.().includes(term) ||
          labour.username?.toLowerCase?.().includes(term) ||
          labour.project?.toLowerCase?.().includes(term) ||
          labour.branch?.toLowerCase?.().includes(term)
        ),
      }))
      .filter((group) => group.labours.length > 0);
  }, [overview, searchTerm]);

  const summaryCards = useMemo(() => {
    const summary = overview?.summary;
    if (!summary) {
      return null;
    }

    return [
      {
        title: 'Total Labour',
        value: summary.totalLabours,
      },
      {
        title: 'Monthly Salary (Configured)',
        value: formatCurrency(summary.totalSalary),
      },
      {
        title: 'Paid This Period',
        value: formatCurrency(summary.totalPaid),
        tone: 'success',
      },
      {
        title: 'Pending This Period',
        value: formatCurrency(summary.totalPending),
        tone: summary.totalPending > 0 ? 'danger' : 'default',
      },
    ];
  }, [overview]);

  const handleToggleRow = (id) => {
    setExpandedRow((current) => (current === id ? null : id));
  };

  return (
    <DashboardLayout title="Manage Labour Inventory">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Labour Overview</h1>
            <p className="text-sm text-gray-500">
              Monitor labour assignments, monthly payout status, and pending salaries across projects.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <select
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:w-56"
              >
                <option value="all">All Projects</option>
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

            <div className="relative w-full sm:w-72">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by labour, username, or project"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/my-team', { state: { tab: 'labour' } })}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              <FaPlus />
              Add Labour
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {!error && fallbackNotice && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
            {fallbackNotice}
          </div>
        )}

        {summaryCards && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryTile key={card.title} title={card.title} value={card.value} tone={card.tone} />
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Labour Snapshot</p>
              <p className="text-sm text-gray-500">
                Data for {formatMonthYear(month, year)}{selectedProject !== 'all' ? ' • filtered by project' : ''}
              </p>
            </div>
            <FaHardHat className="text-2xl text-orange-500" />
          </header>

          {loading ? (
            <div className="flex h-60 items-center justify-center text-gray-500">Loading labour data...</div>
          ) : !overview?.groups ? (
            <div className="flex h-60 flex-col items-center justify-center text-gray-500">
              <p className="text-sm">No data available for the selected filters.</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center text-center text-gray-500">
              <FaHardHat className="mb-3 text-3xl text-gray-300" />
              <p className="font-medium">No labour records found.</p>
              <p className="text-sm text-gray-400">Try adjusting the filters or add labour from the My Team module.</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left">Project</th>
                      <th className="px-6 py-3 text-left">Branch</th>
                      <th className="px-6 py-3 text-left">Labours</th>
                      <th className="px-6 py-3 text-left">Monthly Salary</th>
                      <th className="px-6 py-3 text-left">Paid ({formatMonthYear(month, year)})</th>
                      <th className="px-6 py-3 text-left">Pending</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {groups.map((group) => {
                      const groupKey = `${group.projectName}-${group.branchName}`;
                      const isExpanded = expandedRow === groupKey;

                      return (
                        <React.Fragment key={groupKey}>
                          <tr className="hover:bg-orange-50/40">
                            <td className="px-6 py-3 font-semibold text-gray-800">{group.projectName}</td>
                            <td className="px-6 py-3 text-gray-600">{group.branchName}</td>
                            <td className="px-6 py-3 text-gray-600">{group.totalLabours}</td>
                            <td className="px-6 py-3 text-gray-800">{formatCurrency(group.totalSalary)}</td>
                            <td className="px-6 py-3 text-gray-600">{formatCurrency(group.totalPaid)}</td>
                            <td className={`px-6 py-3 font-medium ${group.totalPending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(group.totalPending)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleRow(groupKey)}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50"
                                aria-label="Toggle labour list"
                              >
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-orange-50/30">
                              <td colSpan={7} className="px-6 pb-6 pt-0">
                                <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-inner">
                                  <h4 className="mb-3 text-sm font-semibold text-orange-600">{group.projectName} • {group.branchName}</h4>
                                  {group.labours?.length ? (
                                    <div className="space-y-3">
                                      {group.labours.map((labour) => (
                                        <div
                                          key={labour.id || `${labour.name}-${labour.username}`}
                                          className="rounded-lg border border-gray-100 bg-gray-50/80 p-3"
                                        >
                                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                              <p className="text-sm font-semibold text-gray-800">{labour.name || '-'}</p>
                                              <p className="text-xs text-gray-500">{labour.username || '—'} • {labour.role || 'Labour'}</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                              <span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-600">
                                                {formatCurrency(labour.monthlySalary)} / month
                                              </span>
                                              <span className={`rounded-full px-3 py-1 font-medium ${labour.pendingAmount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                Pending: {formatCurrency(labour.pendingAmount)}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                              <span className="font-semibold text-gray-700">Working Hours:</span> {(labour.workingHours || labour.workTime) ? `${labour.workingHours || labour.workTime} hrs` : '—'}
                                            </div>
                                            <div>
                                              <span className="font-semibold text-gray-700">Paid:</span> {formatCurrency(labour.paidAmount)}
                                            </div>
                                            <div>
                                              <span className="font-semibold text-gray-700">Joined:</span> {formatDate(labour.dateOfJoining)}
                                            </div>
                                          </div>

                                          <div className="mt-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Salary History</p>
                                            {labour.salaryHistory?.length ? (
                                              <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                                {labour.salaryHistory.map((entry) => (
                                                  <div key={entry.id || `${entry.month}-${entry.year}`} className="rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600">
                                                    <p className="font-semibold text-gray-800">{formatMonthYear(entry.month, entry.year)}</p>
                                                    <p>{formatCurrency(entry.netSalary)}</p>
                                                    <p className="capitalize">Status: {entry.paymentStatus || 'pending'}</p>
                                                    {entry.paymentDate && <p>Paid on {formatDate(entry.paymentDate)}</p>}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="mt-1 text-xs text-gray-500">No salary history recorded.</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">No salary history recorded.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManageInventoryLabour;
