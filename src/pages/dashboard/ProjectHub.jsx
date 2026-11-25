// src/pages/dashboard/ProjectHub.jsx  (route: /branch/:branchId/labour-dashboard)
// The supervisor's hub for one project/branch (mobile), laid out like the Project hub design: project chips, today's
// labour counts and shortcuts to team attendance, tasks, materials and labour. The branch-name lookup is unchanged
// (stored name first, then GET /branches/:id).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardCheck, ListChecks, Package, Users } from "lucide-react";
import axios from "@/api/client";
import { ChoiceChips } from "@/components/common/ChoiceChips";
import { fetchUsersCached } from "@/hooks/useUsers";
import MobileCard from "@/layouts/mobile/MobileCard";
import MobilePage from "@/layouts/mobile/MobilePage";
import MobileTile from "@/layouts/mobile/MobileTile";
import { getSelectedBranchName } from "@/lib/branchContext";
import { ROUTES } from "@/lib/routes";
import { getToken, getUser, setSelectedBranchName } from "@/lib/session";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const Stat = ({ value, label, tone }) => (
  <div className="flex-1 text-center">
    <div className={`text-[22px] font-semibold tabular-nums ${tone}`}>{value}</div>
    <div className="text-caption text-ink-3">{label}</div>
  </div>
);

export default function ProjectHub() {
  const user = getUser();
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [projectName, setProjectName] = useState("");
  const [stats, setStats] = useState({ labour: 0, marked: 0, present: 0 });
  const token = getToken();

  useEffect(() => {
    const fetchBranchName = async () => {
      // PRIORITY 1: the name stored by the project list
      const storedBranchName = getSelectedBranchName();
      if (storedBranchName) {
        setProjectName(storedBranchName);
        return;
      }
      // PRIORITY 2: the API
      try {
        const res = await axios.get(`/branches/${branchId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data && res.data.name) {
          setProjectName(res.data.name);
          setSelectedBranchName(res.data.name);
        } else {
          setProjectName("Project");
        }
      } catch {
        console.warn("Could not fetch branch name, using fallback");
        setProjectName("Selected Project");
      }
    };
    if (branchId) fetchBranchName();
  }, [branchId, token]);

  // Today's counts for this branch (same two requests Team attendance makes).
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [users, att] = await Promise.all([
          fetchUsersCached({ role: "labour" }),
          axios.get("/attendance/by-date", { params: { branch: branchId, date: todayKey() }, headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const labours = (users || []).filter((u) => Array.isArray(u.assignedBranches) && u.assignedBranches.some((b) => (typeof b === "object" ? b._id : b) === branchId));
        const records = att.data || [];
        const ids = new Set(labours.map((l) => l._id));
        const markedIds = new Set(records.filter((r) => ids.has(r.user?._id || r.user)).map((r) => r.user?._id || r.user));
        const presentIds = new Set(records.filter((r) => r.punchType === "in" && ids.has(r.user?._id || r.user)).map((r) => r.user?._id || r.user));
        if (!ignore) setStats({ labour: labours.length, marked: markedIds.size, present: presentIds.size });
      } catch (err) {
        console.error("Failed to load project counts", err);
      }
    };
    if (branchId) load();
    return () => {
      ignore = true;
    };
  }, [branchId, token]);

  const chips = useMemo(
    () => (user?.assignedBranches || []).filter((b) => b?._id).map((b) => ({ value: b._id, label: b.name })),
    [user],
  );
  const switchProject = (id) => {
    const b = (user?.assignedBranches || []).find((x) => x._id === id);
    if (b) setSelectedBranchName(b.name);
    navigate(ROUTES.branch.labourDashboard(id), { replace: true });
  };

  return (
    <MobilePage title={projectName || "Project"} back onBack={() => navigate("/supervisor/projects")} tabs="manager">
      {chips.length > 1 ? <ChoiceChips aria-label="Project" options={chips} value={branchId} onChange={switchProject} className="flex-nowrap overflow-x-auto" /> : null}

      <MobileCard className="flex gap-2.5">
        <Stat value={stats.labour} label="Labour" tone="text-ink-1" />
        <Stat value={stats.present} label="Present" tone="text-tone-ok-fg" />
        <Stat value={Math.max(stats.labour - stats.marked, 0)} label="Not marked" tone="text-tone-warn-fg" />
      </MobileCard>

      <div className="grid grid-cols-2 gap-2.5">
        <MobileTile icon={ClipboardCheck} tone="highlight" className="min-h-[120px]" title="Team attendance" subtitle={`${stats.marked} of ${stats.labour} marked`} to={ROUTES.branch.teamAttendance(branchId)} />
        <MobileTile icon={ListChecks} tone="brand" className="min-h-[120px]" title="Tasks" subtitle="Add and track" to={ROUTES.branch.tasks(branchId)} />
        <MobileTile icon={Package} tone="info" className="min-h-[120px]" title="Materials" subtitle="Intent, transfer, GRN" onClick={() => navigate(ROUTES.material.intent, { state: { branchId } })} />
        <MobileTile icon={Users} tone="ok" className="min-h-[120px]" title="Labour" subtitle={`${stats.labour} people`} to={ROUTES.branch.labours(branchId)} />
      </div>
    </MobilePage>
  );
}
