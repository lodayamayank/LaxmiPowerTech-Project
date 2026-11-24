// src/pages/team/components/useMemberProfile.js
// Loads one member (GET /users/:id) and this month's attendance (GET /attendance/user/:id, the same request the
// attendance graph uses), plus the reset-password request used on the My team page.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { computeDailyStatuses } from "@/lib/attendanceCalculations";
import { useBranches } from "@/hooks/useBranches";
import { useProjects } from "@/hooks/useProjects";

const toDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const idOf = (v) => (v?._id || v)?.toString?.() || "";

export default function useMemberProfile(userId) {
  const { data: branches } = useBranches();
  const { data: projects } = useProjects();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const now = useMemo(() => new Date(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const res = await axios.get(`/users/${userId}`, { headers });
      setUser(res.data);
    } catch (err) {
      console.error("Failed to load member", err);
      setError("Failed to load this member");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let ignore = false;
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    axios
      .get(`/attendance/user/${userId}`, { headers: { Authorization: `Bearer ${getToken()}` }, params: { startDate: toDateKey(start), endDate: toDateKey(end) } })
      .then((res) => {
        if (ignore) return;
        const rows = Array.isArray(res.data) ? res.data : res.data?.rows || [];
        setRecords(rows.filter((r) => idOf(r.user) === userId));
      })
      .catch(() => !ignore && setRecords([]));
    return () => {
      ignore = true;
    };
  }, [userId, now]);

  const days = useMemo(() => computeDailyStatuses(records, now.getMonth(), now.getFullYear()), [records, now]);

  const resetPassword = async (username) => {
    try {
      await axios.post(`/users/reset-password/${username}`, {}, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success(`Password reset for ${username} to default123`);
    } catch (err) {
      console.error("Failed to reset password", err);
      toast.error("Error resetting password");
    }
  };

  const projectName = user ? (typeof user.project === "object" && user.project?.name) || projects.find((p) => p._id === idOf(user.project))?.name || "" : "";
  const branchNames = user
    ? (Array.isArray(user.assignedBranches) ? user.assignedBranches : []).map((b) => (typeof b === "object" && b?.name) || branches.find((x) => x._id === idOf(b))?.name || "").filter(Boolean)
    : [];

  return { user, loading, error, reload: load, branches, projects, days, monthDate: now, resetPassword, projectName, branchNames };
}
