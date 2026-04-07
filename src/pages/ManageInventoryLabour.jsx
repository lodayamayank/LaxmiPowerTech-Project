import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMonthYear = (month, year) => {
  if (!month || !year) return '-';
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const SummaryTile = ({ title, value, tone = 'default' }) => {
  const toneClass = { default: 'text-gray-900', success: 'text-green-600', danger: 'text-red-600' }[tone];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
};

const selectClass =
  'w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:w-52';

const ManageInventoryLabour = () => {
  const navigate = useNavigate();

  // Filter state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branchProjects, setBranchProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Data state
  const [overview, setOverview] = useState({ groups: [], summary: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Fetch all branches on mount ──
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get('/branches');
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        setBranches(data);
      } catch (err) {
        console.warn('Failed to fetch branches', err);
      }
    };
    fetchBranches();
  }, []);

  // ── When branch changes → fetch projects for that branch (dependent dropdown) ──
  useEffect(() => {
    if (selectedBranch === 'all') {
      setBranchProjects([]);
      setSelectedProject('all');
      return;
    }
    const fetchProjectsForBranch = async () => {
      try {
        const res = await axios.get(`/labour/projects-by-branch/${selectedBranch}`);
        const data = Array.isArray(res?.data?.data) ? res.data.data : [];
        setBranchProjects(data);
      } catch (err) {
        console.warn('Failed to fetch projects for branch', err);
        setBranchProjects([]);
      }
    };
    setSelectedProject('all');
    fetchProjectsForBranch();
  }, [selectedBranch]);

  // ── Derive month/year from picker ──
  const [year, month] = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return [Number(y), Number(m)];
  }, [selectedMonth]);

  // ── Fetch labour overview (branch-based) ──
  const fetchOverview = useCallback(async () => {
    if (!month || !year) return;
    try {
      setLoading(true);
      setError('');
      const params = { month, year };
      if (selectedBranch !== 'all') params.branchId = selectedBranch;
      if (selectedProject !== 'all') params.projectId = selectedProject;

      const response = await axios.get('/labour/overview', { params });
      const groupedData = Array.isArray(response?.data?.data) ? response.data.data : [];
      const summaryFromApi = response?.data?.summary || null;
      setOverview({ groups: groupedData, summary: summaryFromApi });
    } catch (err) {
      console.error('Failed to fetch labour overview', err);
      const status = err?.response?.status;

      if (status === 404) {
        // Fallback: fetch raw labour users and group by branch
        try {
          const fallbackRes = await axios.get('/users', { params: { role: 'labour' } });
          const rawUsers = Array.isArray(fallbackRes?.data)
            ? fallbackRes.data
            : Array.isArray(fallbackRes?.data?.data)
            ? fallbackRes.data.data
            : [];
          const built = buildOverviewFromUsers(rawUsers);
          setOverview({ groups: built.groups, summary: built.summary });
          setError('');
        } catch (fbErr) {
          console.error('Fallback failed', fbErr);
          setError('Unable to load labour data. Please try again.');
          setOverview({ groups: [], summary: null });
        }
      } else {
        setError(err?.response?.data?.message || 'Unable to load labour data. Please try again.');
        setOverview({ groups: [], summary: null });
      }
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedBranch, selectedProject]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // ── Fallback builder: groups by branch from raw user docs ──
  const buildOverviewFromUsers = (users) => {
    let filtered = users;
    if (selectedBranch !== 'all') {
      filtered = filtered.filter((u) => {
        const bIds = (Array.isArray(u.assignedBranches) ? u.assignedBranches : []).map(
          (b) => (b?._id || b)?.toString?.() || ''
        );
        return bIds.includes(selectedBranch);
      });
    }
    if (selectedProject !== 'all') {
      filtered = filtered.filter((u) => {
        const pId = (u.project?._id || u.project)?.toString?.() || '';
        return pId === selectedProject;
      });
    }

    const summary = { totalLabours: filtered.length, totalSalary: 0, totalPaid: 0, totalPending: 0 };
    const groupsMap = new Map();

    filtered.forEach((labour) => {
      const monthlySalary = Number(labour.ctcAmount) || 0;
      summary.totalSalary += monthlySalary;
      summary.totalPending += monthlySalary;

      const projectName = labour.project?.name || labour.project?.projectName || 'Unassigned';
      const branchDocs = Array.isArray(labour.assignedBranches) ? labour.assignedBranches : [];
      const branchList = branchDocs.length > 0 ? branchDocs : [null];

      branchList.forEach((branchDoc) => {
        const bId = branchDoc?._id?.toString?.() || branchDoc?.toString?.() || 'unassigned';
        const bName = branchDoc?.name || 'Unassigned Branch';

        if (!groupsMap.has(bId)) {
          groupsMap.set(bId, {
            branchId: branchDoc?._id || null,
            branchName: bName,
            totalLabours: 0,
            totalSalary: 0,
            totalPaid: 0,
            totalPending: 0,
            labours: [],
          });
        }

        const group = groupsMap.get(bId);
        group.totalLabours += 1;
        group.totalSalary += monthlySalary;
        group.totalPending += monthlySalary;
        group.labours.push({
          id: labour._id || labour.id,
          name: labour.name,
          username: labour.username,
          projectName,
          branchName: bName,
          workingHours: labour.standardDailyHours || null,
          monthlySalary,
          paidAmount: 0,
          pendingAmount: monthlySalary,
          paymentStatus: monthlySalary ? 'pending' : 'not_configured',
          dateOfJoining: labour.dateOfJoining || labour.createdAt || null,
          salaryHistory: [],
        });
      });
    });

    return { summary, groups: Array.from(groupsMap.values()) };
  };

  // ── Search filter on top of groups ──
  const groups = useMemo(() => {
    const baseGroups = Array.isArray(overview?.groups) ? overview.groups : [];
    if (!searchTerm) return baseGroups;
    const term = searchTerm.toLowerCase();
    return baseGroups
      .map((group) => ({
        ...group,
        labours: group.labours.filter(
          (l) =>
            l.name?.toLowerCase?.().includes(term) ||
            l.username?.toLowerCase?.().includes(term) ||
            l.projectName?.toLowerCase?.().includes(term) ||
            l.branchName?.toLowerCase?.().includes(term)
        ),
      }))
      .filter((g) => g.labours.length > 0);
  }, [overview, searchTerm]);

  // ── Summary cards ──
  const summaryCards = useMemo(() => {
    const s = overview?.summary;
    if (!s) return null;
    return [
      { title: 'Total Labour', value: s.totalLabours },
      { title: 'Monthly Salary (Configured)', value: formatCurrency(s.totalSalary) },
      { title: 'Paid This Period', value: formatCurrency(s.totalPaid), tone: 'success' },
      { title: 'Pending This Period', value: formatCurrency(s.totalPending), tone: s.totalPending > 0 ? 'danger' : 'default' },
    ];
  }, [overview]);

  const handleToggleRow = (id) => setExpandedRow((c) => (c === id ? null : id));

  // ── Active filter description ──
  const filterDescription = useMemo(() => {
    const parts = [formatMonthYear(month, year)];
    if (selectedBranch !== 'all') {
      const br = branches.find((b) => b._id === selectedBranch);
      if (br) parts.push(`Branch: ${br.name}`);
    }
    if (selectedProject !== 'all') {
      const pr = branchProjects.find((p) => p._id === selectedProject);
      if (pr) parts.push(`Project: ${pr.name}`);
    }
    return parts.join(' • ');
  }, [month, year, selectedBranch, selectedProject, branches, branchProjects]);

  return (
    <DashboardLayout title="Manage Labour Inventory">
      <div className="space-y-6">
        {/* ── Header with filters ── */}
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="shrink-0">
            <h1 className="text-2xl font-bold text-gray-900">Labour Overview</h1>
            <p className="text-sm text-gray-500">
              Monitor labour assignments and salaries across branches.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto">
            {/* Branch dropdown (primary) */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={selectClass}
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            {/* Project dropdown (dependent on branch) */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={selectedBranch === 'all'}
              className={`${selectClass} ${selectedBranch === 'all' ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <option value="all">{selectedBranch === 'all' ? 'Select branch first' : 'All Projects'}</option>
              {branchProjects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>

            {/* Month picker */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:w-40"
            />

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search labour, branch..."
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

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {/* Summary tiles */}
        {summaryCards && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryTile key={card.title} title={card.title} value={card.value} tone={card.tone} />
            ))}
          </section>
        )}

        {/* Main table — grouped by branch */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Labour Snapshot</p>
              <p className="text-sm text-gray-500">{filterDescription}</p>
            </div>
            <FaHardHat className="text-2xl text-orange-500" />
          </header>

          {loading ? (
            <div className="flex h-60 items-center justify-center text-gray-500">Loading labour data...</div>
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
                      const groupKey = group.branchId || group.branchName;
                      const isExpanded = expandedRow === groupKey;

                      return (
                        <React.Fragment key={groupKey}>
                          <tr className="hover:bg-orange-50/40 cursor-pointer" onClick={() => handleToggleRow(groupKey)}>
                            <td className="px-6 py-3 font-semibold text-gray-800">{group.branchName}</td>
                            <td className="px-6 py-3 text-gray-600">{group.totalLabours}</td>
                            <td className="px-6 py-3 text-gray-800">{formatCurrency(group.totalSalary)}</td>
                            <td className="px-6 py-3 text-gray-600">{formatCurrency(group.totalPaid)}</td>
                            <td className={`px-6 py-3 font-medium ${group.totalPending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(group.totalPending)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50"
                                aria-label="Toggle labour list"
                              >
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-orange-50/30">
                              <td colSpan={6} className="px-6 pb-6 pt-2">
                                <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-inner">
                                  <h4 className="mb-3 text-sm font-semibold text-orange-600">{group.branchName}</h4>
                                  {group.labours?.length ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-200 text-left text-gray-500">
                                            <th className="pb-2 pr-4 font-medium">Name</th>
                                            <th className="pb-2 pr-4 font-medium">Branch</th>
                                            <th className="pb-2 pr-4 font-medium">Project</th>
                                            <th className="pb-2 pr-4 font-medium">Work Time</th>
                                            <th className="pb-2 pr-4 font-medium">Salary</th>
                                            <th className="pb-2 pr-4 font-medium">Paid</th>
                                            <th className="pb-2 pr-4 font-medium">Pending</th>
                                            <th className="pb-2 font-medium">Joined</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {group.labours.map((labour) => (
                                            <tr key={labour.id || `${labour.name}-${labour.username}`} className="hover:bg-gray-50/60">
                                              <td className="py-2 pr-4">
                                                <p className="font-semibold text-gray-800">{labour.name || '-'}</p>
                                                <p className="text-gray-400">{labour.username || '—'}</p>
                                              </td>
                                              <td className="py-2 pr-4 text-gray-600">{labour.branchName || group.branchName}</td>
                                              <td className="py-2 pr-4 text-gray-600">{labour.projectName || 'Unassigned'}</td>
                                              <td className="py-2 pr-4 text-gray-600">{labour.workingHours ? `${labour.workingHours} hrs` : '—'}</td>
                                              <td className="py-2 pr-4 font-medium text-gray-800">{formatCurrency(labour.monthlySalary)}</td>
                                              <td className="py-2 pr-4 text-green-600">{formatCurrency(labour.paidAmount)}</td>
                                              <td className={`py-2 pr-4 font-medium ${labour.pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(labour.pendingAmount)}
                                              </td>
                                              <td className="py-2 text-gray-500">{formatDate(labour.dateOfJoining)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">No labours in this branch.</p>
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
