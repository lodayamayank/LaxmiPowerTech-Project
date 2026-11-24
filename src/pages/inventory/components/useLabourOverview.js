// src/pages/inventory/components/useLabourOverview.js
// Filters, requests (GET /labour/overview with the /users fallback), grouping and summary figures of the Labour overview page
// (moved unchanged from ManageInventoryLabour.jsx). The local money/date formatters are kept as they were.
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useBranches } from "@/hooks/useBranches";
import axios from "@/api/client";

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "₹0";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatMonthYear = (month, year) => {
  if (!month || !year) return "-";
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

export const ALL = "all";

export default function useLabourOverview() {
  const navigate = useNavigate();

  // Filter state
  const { data: branches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState(ALL);
  const { data: allProjects } = useProjects();
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
  return {
    navigate, branches, selectedBranch, setSelectedBranch, selectedProject, setSelectedProject, selectedMonth, setSelectedMonth,
    searchTerm, setSearchTerm, loading, error, expandedRow, setExpandedRow, branchProjects, month, year, groups, summaryCards, filterDescription,
  };
}
