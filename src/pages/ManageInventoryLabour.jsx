import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import axios from "../utils/axios";
import { FaHardHat, FaPlus, FaSearch } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "₹0";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMonthYear = (month, year) => {
  if (!month || !year) return "-";
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const SummaryTile = ({ title, value, tone = "default" }) => {
  const toneClass = {
    default: "text-gray-900",
    success: "text-green-600",
    danger: "text-red-600",
  }[tone];
  return (
    <Card className="gap-0 py-0 rounded-2xl border-gray-100 bg-white shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
        <p className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

// One shared look for every control in the filter bar, so heights and focus rings match.
const controlClass =
  "h-10 rounded-lg border-gray-200 bg-white text-sm text-gray-700 shadow-sm focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-100";

const ALL = "all";

const FilterSelect = ({
  value,
  onValueChange,
  items,
  disabled = false,
  ariaLabel,
}) => (
  <Select value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger
      aria-label={ariaLabel}
      className={`w-full data-[size=default]:h-10 ${controlClass}`}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const ManageInventoryLabour = () => {
  const navigate = useNavigate();

  // Filter state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(ALL);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(ALL);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Data state
  const [overview, setOverview] = useState({ groups: [], summary: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Fetch branches and projects on mount ──
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [branchRes, projectRes] = await Promise.all([
          axios.get("/branches"),
          axios.get("/projects"),
        ]);
        const branchData = Array.isArray(branchRes?.data)
          ? branchRes.data
          : Array.isArray(branchRes?.data?.data)
          ? branchRes.data.data
          : [];
        const projectData = Array.isArray(projectRes?.data)
          ? projectRes.data
          : Array.isArray(projectRes?.data?.data)
          ? projectRes.data.data
          : [];
        setBranches(branchData);
        setAllProjects(projectData);
      } catch (err) {
        console.warn("Failed to fetch branches/projects", err);
      }
    };
    fetchInitialData();
  }, []);

  // ── Reset project when branch changes ──
  useEffect(() => {
    setSelectedProject(ALL);
  }, [selectedBranch]);

  // ── Derive projects for selected branch (client-side filter) ──
  const branchProjects = useMemo(() => {
    if (selectedBranch === ALL) return [];
    return allProjects.filter((p) => {
      const pBranches = Array.isArray(p.branches) ? p.branches : [];
      return pBranches.some((b) => {
        const bId = (b?._id || b)?.toString?.() || "";
        return bId === selectedBranch;
      });
    });
  }, [selectedBranch, allProjects]);

  // ── Derive month/year from picker ──
  const [year, month] = useMemo(() => {
    const [y, m] = selectedMonth.split("-");
    return [Number(y), Number(m)];
  }, [selectedMonth]);

  // ── Fallback builder: groups by branch from raw user docs ──
  const buildOverviewFromUsers = (users) => {
    let filtered = users;
    if (selectedBranch !== ALL) {
      filtered = filtered.filter((u) => {
        const bIds = (
          Array.isArray(u.assignedBranches) ? u.assignedBranches : []
        ).map((b) => (b?._id || b)?.toString?.() || "");
        return bIds.includes(selectedBranch);
      });
    }
    if (selectedProject !== ALL) {
      filtered = filtered.filter((u) => {
        const pId = (u.project?._id || u.project)?.toString?.() || "";
        return pId === selectedProject;
      });
    }

    const summary = {
      totalLabours: filtered.length,
      totalSalary: 0,
      totalPaid: 0,
      totalPending: 0,
    };
    const groupsMap = new Map();

    filtered.forEach((labour) => {
      const monthlySalary = Number(labour.ctcAmount) || 0;
      summary.totalSalary += monthlySalary;
      summary.totalPending += monthlySalary;

      const projectName =
        labour.project?.name || labour.project?.projectName || "Unassigned";
      const branchDocs = Array.isArray(labour.assignedBranches)
        ? labour.assignedBranches
        : [];
      const branchList = branchDocs.length > 0 ? branchDocs : [null];

      branchList.forEach((branchDoc) => {
        const bId =
          branchDoc?._id?.toString?.() ||
          branchDoc?.toString?.() ||
          "unassigned";
        const bName = branchDoc?.name || "Unassigned Branch";

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
          paymentStatus: monthlySalary ? "pending" : "not_configured",
          dateOfJoining: labour.dateOfJoining || labour.createdAt || null,
          salaryHistory: [],
        });
      });
    });

    return { summary, groups: Array.from(groupsMap.values()) };
  };

  // ── Fetch labour overview (branch-based) ──
  const fetchOverview = useCallback(async () => {
    if (!month || !year) return;
    try {
      setLoading(true);
      setError("");
      const params = { month, year };
      if (selectedBranch !== ALL) params.branchId = selectedBranch;
      if (selectedProject !== ALL) params.projectId = selectedProject;

      const response = await axios.get("/labour/overview", { params });
      const groupedData = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      const summaryFromApi = response?.data?.summary || null;
      setOverview({ groups: groupedData, summary: summaryFromApi });
    } catch (err) {
      console.error("Failed to fetch labour overview", err);
      const status = err?.response?.status;

      if (status === 404) {
        // Fallback: fetch raw labour users and group by branch
        try {
          const fallbackRes = await axios.get("/users", {
            params: { role: "labour" },
          });
          const rawUsers = Array.isArray(fallbackRes?.data)
            ? fallbackRes.data
            : Array.isArray(fallbackRes?.data?.data)
            ? fallbackRes.data.data
            : [];
          const built = buildOverviewFromUsers(rawUsers);
          setOverview({ groups: built.groups, summary: built.summary });
          setError("");
        } catch (fbErr) {
          console.error("Fallback failed", fbErr);
          setError("Unable to load labour data. Please try again.");
          setOverview({ groups: [], summary: null });
        }
      } else {
        setError(
          err?.response?.data?.message ||
            "Unable to load labour data. Please try again."
        );
        setOverview({ groups: [], summary: null });
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, selectedBranch, selectedProject]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

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
      { title: "Total Labour", value: s.totalLabours },
      {
        title: "Monthly Salary (Configured)",
        value: formatCurrency(s.totalSalary),
      },
      {
        title: "Paid This Period",
        value: formatCurrency(s.totalPaid),
        tone: "success",
      },
      {
        title: "Pending This Period",
        value: formatCurrency(s.totalPending),
        tone: s.totalPending > 0 ? "danger" : "default",
      },
    ];
  }, [overview]);

  // ── Active filter description ──
  const filterDescription = useMemo(() => {
    const parts = [formatMonthYear(month, year)];
    if (selectedBranch !== ALL) {
      const br = branches.find((b) => b._id === selectedBranch);
      if (br) parts.push(`Branch: ${br.name}`);
    }
    if (selectedProject !== ALL) {
      const pr = branchProjects.find((p) => p._id === selectedProject);
      if (pr) parts.push(`Project: ${pr.name}`);
    }
    return parts.join(" • ");
  }, [month, year, selectedBranch, selectedProject, branches, branchProjects]);

  const gridCols = "grid-cols-[minmax(180px,2fr)_repeat(4,minmax(0,1fr))_24px]";

  return (
    <DashboardLayout title="Manage Labour Inventory">
      <div className="space-y-6">
        {/* ── Header with filters ── */}
        <header className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm">
          <div className="shrink-0">
            <h1 className="text-2xl font-bold text-gray-900">
              Labour Overview
            </h1>
            <p className="text-sm text-gray-500">
              Monitor labour assignments and salaries across branches.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_minmax(0,1.4fr)_auto]">
            {/* Branch dropdown (primary) */}
            <FilterSelect
              ariaLabel="Select branch"
              value={selectedBranch}
              onValueChange={setSelectedBranch}
              items={[
                { value: ALL, label: "All Branches" },
                ...branches.map((b) => ({ value: b._id, label: b.name })),
              ]}
            />

            {/* Project dropdown (dependent on branch) */}
            <FilterSelect
              ariaLabel="Select project"
              value={selectedProject}
              onValueChange={setSelectedProject}
              disabled={selectedBranch === ALL}
              items={[
                {
                  value: ALL,
                  label:
                    selectedBranch === ALL
                      ? "Select branch first"
                      : "All Projects",
                },
                ...branchProjects.map((p) => ({ value: p._id, label: p.name })),
              ]}
            />

            {/* Month picker */}
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select month"
              className={`w-full px-3 ${controlClass}`}
            />

            {/* Search */}
            <div className="relative w-full">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search labour, branch..."
                aria-label="Search labour"
                className={`w-full pl-10 pr-4 ${controlClass}`}
              />
            </div>

            <Button
              type="button"
              onClick={() =>
                navigate("/admin/my-team", { state: { tab: "labour" } })
              }
              className="h-10 w-full bg-orange-500 hover:bg-orange-600 text-white lg:w-auto"
            >
              <FaPlus />
              Add Labour
            </Button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {/* Summary tiles */}
        {summaryCards && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryTile
                key={card.title}
                title={card.title}
                value={card.value}
                tone={card.tone}
              />
            ))}
          </section>
        )}

        {/* Main table — grouped by branch */}
        <Card className="gap-0 py-0 rounded-2xl border-gray-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Labour Snapshot
              </p>
              <p className="text-sm text-gray-500">{filterDescription}</p>
            </div>
            <FaHardHat className="text-2xl text-orange-500" />
          </header>

          {loading ? (
            <div className="space-y-3 p-6" aria-label="Loading labour data">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center text-center text-gray-500">
              <FaHardHat className="mb-3 text-3xl text-gray-300" />
              <p className="font-medium">No labour records found.</p>
              <p className="text-sm text-gray-400">
                Try adjusting the filters or add labour from the My Team module.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div
                  className={`grid ${gridCols} items-center gap-2 bg-gray-50 px-6 py-3 text-xs uppercase tracking-wide text-gray-500`}
                >
                  <div>Branch</div>
                  <div>Labours</div>
                  <div>Monthly Salary</div>
                  <div>Paid ({formatMonthYear(month, year)})</div>
                  <div>Pending</div>
                  <div />
                </div>

                <Accordion
                  type="single"
                  collapsible
                  value={expandedRow ? String(expandedRow) : ""}
                  onValueChange={(value) => setExpandedRow(value || null)}
                >
                  {groups.map((group) => {
                    const groupKey = group.branchId || group.branchName;

                    return (
                      <AccordionItem
                        key={groupKey}
                        value={String(groupKey)}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        <AccordionTrigger
                          className={`grid w-full ${gridCols} items-center gap-2 px-6 py-3 text-left hover:bg-orange-50/40 hover:no-underline`}
                        >
                          <div className="font-semibold text-gray-800">
                            {group.branchName}
                          </div>
                          <div className="text-gray-600">
                            {group.totalLabours}
                          </div>
                          <div className="text-gray-800">
                            {formatCurrency(group.totalSalary)}
                          </div>
                          <div className="text-gray-600">
                            {formatCurrency(group.totalPaid)}
                          </div>
                          <div
                            className={`font-medium ${
                              group.totalPending > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {formatCurrency(group.totalPending)}
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="bg-orange-50/30 px-6 pb-6 pt-2">
                          <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-inner">
                            <h4 className="mb-3 text-sm font-semibold text-orange-600">
                              {group.branchName}
                            </h4>
                            {group.labours?.length ? (
                              <Table className="min-w-full text-xs">
                                <TableHeader>
                                  <TableRow className="border-gray-200 hover:bg-transparent">
                                    {[
                                      "Name",
                                      "Branch",
                                      "Project",
                                      "Work Time",
                                      "Salary",
                                      "Paid",
                                      "Pending",
                                      "Joined",
                                    ].map((h) => (
                                      <TableHead
                                        key={h}
                                        className="h-auto pb-2 pr-4 text-xs font-medium text-gray-500"
                                      >
                                        {h}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.labours.map((labour) => (
                                    <TableRow
                                      key={
                                        labour.id ||
                                        `${labour.name}-${labour.username}`
                                      }
                                      className="border-gray-100 hover:bg-gray-50/60"
                                    >
                                      <TableCell className="py-2 pr-4">
                                        <p className="font-semibold text-gray-800">
                                          {labour.name || "-"}
                                        </p>
                                        <p className="text-gray-400">
                                          {labour.username || "—"}
                                        </p>
                                      </TableCell>
                                      <TableCell className="py-2 pr-4 text-gray-600">
                                        {labour.branchName || group.branchName}
                                      </TableCell>
                                      <TableCell className="py-2 pr-4 text-gray-600">
                                        {labour.projectName || "Unassigned"}
                                      </TableCell>
                                      <TableCell className="py-2 pr-4 text-gray-600">
                                        {labour.workingHours
                                          ? `${labour.workingHours} hrs`
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="py-2 pr-4 font-medium text-gray-800">
                                        {formatCurrency(labour.monthlySalary)}
                                      </TableCell>
                                      <TableCell className="py-2 pr-4 text-green-600">
                                        {formatCurrency(labour.paidAmount)}
                                      </TableCell>
                                      <TableCell
                                        className={`py-2 pr-4 font-medium ${
                                          labour.pendingAmount > 0
                                            ? "text-red-600"
                                            : "text-green-600"
                                        }`}
                                      >
                                        {formatCurrency(labour.pendingAmount)}
                                      </TableCell>
                                      <TableCell className="py-2 text-gray-500">
                                        {formatDate(labour.dateOfJoining)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No labours in this branch.
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManageInventoryLabour;
