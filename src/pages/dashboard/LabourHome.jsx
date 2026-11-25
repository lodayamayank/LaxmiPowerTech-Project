// src/pages/dashboard/LabourHome.jsx
// Home of labour and staff (mobile). Laid out like the Labour Home / On shift designs: greeting, today's card with the
// punch action, the month's attendance counts and four shortcuts. Data: GET /attendance/my (the same list My attendance
// uses) and the locally cached punch status.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CircleCheck, FileText, Fingerprint, LogOut, MapPin, Receipt, RefreshCw, UserCheck } from "lucide-react";
import axios from "@/api/client";
import { Button } from "@/components/ui/button";
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

const greeting = (d) => (d.getHours() < 12 ? "Good morning" : d.getHours() < 17 ? "Good afternoon" : "Good evening");
const clock = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
const shortDay = (d) => `${d.toLocaleDateString("en-GB", { weekday: "short" })}, ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
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
  const onShift = punch.punchedIn && !punch.punchedOut;
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

      <section className="flex flex-col gap-3.5 rounded-[18px] bg-primary p-[18px] text-primary-foreground">
        {onShift ? (
          <>
            <div className="flex items-center justify-between">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-tone-ok-fg/25 px-2.5 text-caption font-semibold">
                <span className="size-1.5 rounded-full bg-tone-ok-fg" /> On shift
              </span>
              <span className="text-[13px] opacity-75">{shortDay(now)}</span>
            </div>
            {elapsedMin !== null ? (
              <div>
                <div className="text-[13px] opacity-75">Time on site</div>
                <div className="text-[40px] font-semibold leading-[1.1] tracking-tight tabular-nums">
                  {Math.floor(elapsedMin / 60)}h {String(elapsedMin % 60).padStart(2, "0")}m
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2.5 rounded-xl bg-primary-foreground/10 p-2.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/20">
                <UserCheck className="size-5" />
              </span>
              <div className="flex-1 text-[13.5px]">
                <div className="font-semibold">{todayIn ? `Punched in ${clock(new Date(todayIn.createdAt))}` : "You are punched in"}</div>
                <div className="opacity-75">{sites[0] || "Your site"} · selfie verified</div>
              </div>
            </div>
            <Button size="xl" className="w-full bg-surface text-primary hover:bg-surface/90" onClick={() => navigate(ROUTES.punch)}>
              <LogOut /> Punch out
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[13px] opacity-75">{shortDay(now)}</div>
                <div className="text-[34px] font-semibold leading-[1.1] tracking-tight tabular-nums">{clock(now)}</div>
              </div>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 text-caption font-semibold">
                <span className="size-1.5 rounded-full bg-highlight" /> {punch.punchedOut ? "Shift complete" : "Not punched in"}
              </span>
            </div>
            {sites.length ? (
              <div className="flex items-center gap-2 text-[13.5px] opacity-90">
                <MapPin className="size-4 shrink-0" /> <span className="truncate">{sites.join(" · ")}</span>
              </div>
            ) : null}
            <Button
              size="xl"
              className="w-full bg-highlight text-ink-1 hover:bg-highlight/90"
              disabled={punch.punchedOut}
              onClick={() => navigate(ROUTES.punch)}
            >
              {punch.punchedOut ? <CircleCheck /> : <Fingerprint />}
              {punch.punchedOut ? "Attendance complete for today" : "Punch in with selfie"}
            </Button>
            <div className="text-center text-[12.5px] opacity-75">{punch.punchedOut ? "See you tomorrow" : "Shift starts when you punch in"}</div>
          </>
        )}
      </section>

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
