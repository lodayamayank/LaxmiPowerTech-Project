// src/pages/dashboard/LabourHome.jsx
// Home of labour and staff (mobile). Laid out like the Labour Home / On shift designs: greeting, today's card with the
// punch action, the month's attendance counts and four shortcuts. Data: GET /attendance/my (the same list My attendance
// uses) and the locally cached punch status.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, FileText, Receipt, RefreshCw } from "lucide-react";
import axios from "@/api/client";
import { UserAvatar } from "@/components/common/UserAvatar";
import MobileCard from "@/layouts/mobile/MobileCard";
import MobilePage from "@/layouts/mobile/MobilePage";
import MobileTile from "@/layouts/mobile/MobileTile";
import { computeDailyStatuses } from "@/lib/attendanceCalculations";
import { EVENTS } from "@/lib/events";
import { readPunchStatus } from "@/lib/punchStatusCache";
import { ROUTES } from "@/lib/routes";
import { getToken, getUser } from "@/lib/session";
import useNetworkStatus from "@/pwa/useNetworkStatus";
import PunchHero from "./components/PunchHero";

const greeting = (d) => (d.getHours() < 12 ? "Good morning" : d.getHours() < 17 ? "Good afternoon" : "Good evening");
const sameDay = (a, b) => a.toDateString() === b.toDateString();

const Stat = ({ value, label, tone }) => (
  <div className="flex-1 rounded-[10px] bg-surface-subtle px-1 py-2.5 text-center">
    <div className={`text-[20px] font-semibold tabular-nums ${tone}`}>{value}</div>
    <div className="text-[11.5px] text-ink-3">{label}</div>
  </div>
);

export default function LabourHome() {
  const user = getUser();
  const navigate = useNavigate();
  const { pendingCount, failedCount } = useNetworkStatus();
  const [now, setNow] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [punch, setPunch] = useState(() => readPunchStatus() || { punchedIn: false, punchedOut: false });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/attendance/my", { headers: { Authorization: `Bearer ${getToken()}` } });
        setRecords(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load attendance", err);
      }
      try {
        const res = await axios.get("/attendance/today", { headers: { Authorization: `Bearer ${getToken()}` } });
        const cached = readPunchStatus();
        setPunch({ punchedIn: res.data.punchedIn || cached?.punchedIn || false, punchedOut: res.data.punchedOut || cached?.punchedOut || false });
      } catch {
        /* offline: the cached status above is still shown */
      }
    };
    load();
    window.addEventListener(EVENTS.leaveUpdated, load);
    return () => window.removeEventListener(EVENTS.leaveUpdated, load);
  }, []);

  const counts = useMemo(() => {
    const days = computeDailyStatuses(records, now.getMonth(), now.getFullYear());
    return {
      present: days.filter((d) => d.status === "Present").length,
      half: days.filter((d) => d.status === "Half Day").length,
      absent: days.filter((d) => d.status === "Absent").length,
      leave: days.filter((d) => d.status.includes("Leave")).length,
    };
  }, [records, now]);

  // First punch-in of today (the timer on the "On shift" card).
  const todayIn = useMemo(
    () =>
      records
        .filter((r) => r.punchType === "in" && r.createdAt && sameDay(new Date(r.createdAt), now))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0],
    [records, now],
  );
  const elapsedMin = todayIn ? Math.max(0, Math.floor((now - new Date(todayIn.createdAt)) / 60000)) : null;
  const sites = (user?.assignedBranches || []).map((b) => b?.name).filter(Boolean);
  const queued = (pendingCount || 0) + (failedCount || 0);
  const month = now.toLocaleDateString("en-US", { month: "long" });

  return (
    <MobilePage
      home
      tabs="worker"
      right={
        <Link to={ROUTES.profile} aria-label="Profile">
          <UserAvatar name={user?.name || "U"} tone="purple" className="size-9" />
        </Link>
      }
    >
      <div>
        <div className="text-body text-ink-3">{greeting(now)},</div>
        <div className="text-[22px] font-semibold text-primary">{user?.name || "there"}</div>
      </div>

      <PunchHero now={now} punch={punch} todayIn={todayIn} elapsedMin={elapsedMin} sites={sites} onPunch={() => navigate(ROUTES.punch)} />

      <MobileCard
        title={`${month} so far`}
        action={
          <Link to="/my-attendance" className="text-[13.5px] font-semibold text-primary">
            View all
          </Link>
        }
      >
        <div className="flex gap-2">
          <Stat value={counts.present} label="Present" tone="text-tone-ok-fg" />
          <Stat value={counts.half} label="Half day" tone="text-tone-warn-fg" />
          <Stat value={counts.absent} label="Absent" tone="text-tone-bad-fg" />
          <Stat value={counts.leave} label="Leave" tone="text-tone-info-fg" />
        </div>
      </MobileCard>

      <div className="grid grid-cols-2 gap-2.5">
        <MobileTile icon={CalendarDays} title="My attendance" subtitle="Calendar & history" to="/my-attendance" />
        <MobileTile icon={FileText} title="Leave" subtitle="Apply or track" to="/leaves" />
        <MobileTile icon={Receipt} title="Reimbursement" subtitle="Claim expenses" to={ROUTES.reimbursements} />
        <MobileTile icon={RefreshCw} title="Sync" subtitle={queued ? `${queued} waiting` : "All synced"} to={ROUTES.connectServer} />
      </div>
    </MobilePage>
  );
}
