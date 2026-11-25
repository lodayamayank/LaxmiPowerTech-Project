import React, { useEffect, useMemo, useState } from "react";
import { getToken, getUser } from '@/lib/session';
import { EVENTS } from '@/lib/events';
import axios from "@/api/client";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { computeDailyStatuses } from "@/lib/attendanceCalculations";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/PageLoader";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import MobileCard from "@/layouts/mobile/MobileCard";
import MobilePage from "@/layouts/mobile/MobilePage";
import {
  CalendarGrid,
  Legend,
  StatusBadge,
  YearAttendanceChart,
  buildYearlySummary,
} from "@/pages/attendance/components/AttendanceVisuals";

const MyAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("calendar"); // calendar | summary | list
  const [selectedDay, setSelectedDay] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const token = getToken();

  // localStorage can legitimately be empty (logged-out state, cleared
  // storage, etc.) — guard against JSON.parse(null) blowing up downstream
  // whenever user._id is read.
  const user = useMemo(() => {
    try {
      return getUser() || {};
    } catch {
      return {};
    }
  }, []);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/attendance/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecords(res.data || []);
      } catch (err) {
        console.error("Failed to load attendance", err);
        setError("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const refresh = () => fetchData();
    window.addEventListener(EVENTS.leaveUpdated, refresh);
    return () => window.removeEventListener(EVENTS.leaveUpdated, refresh);
  }, [token]);

  // --- daily aggregation for the currently selected month
  const dailySummary = useMemo(
    () => computeDailyStatuses(records, month, year),
    [records, month, year]
  );

  // summary counts
  const counts = useMemo(
    () => ({
      present: dailySummary.filter((d) => d.status === "Present").length,
      half: dailySummary.filter((d) => d.status === "Half Day").length,
      absent: dailySummary.filter((d) => d.status === "Absent").length,
      off: dailySummary.filter((d) => d.status === "Week Off").length,
      leave: dailySummary.filter((d) => d.status.includes("Leave")).length,
    }),
    [dailySummary]
  );

  // --- yearly aggregation (12 months) for the "Year Graph" bar + trend line
  const yearlySummary = useMemo(
    () => buildYearlySummary(computeDailyStatuses, records, year),
    [records, year]
  );

  const overallYearPct = useMemo(() => {
    const withData = yearlySummary.filter((m) => m.pct > 0 || m.present + m.absent > 0);
    if (!withData.length) return 0;
    return Math.round(withData.reduce((a, b) => a + b.pct, 0) / withData.length);
  }, [yearlySummary]);

  // --- donut data for the currently selected month ("Month Graph")
  const monthDonutData = useMemo(() => {
    const present = dailySummary.filter((d) => d.status === "Present").length;
    const other = dailySummary.filter(
      (d) => !["Present", "Week Off", "Future", "Pending"].includes(d.status)
    ).length;
    return [
      { name: "Present", value: present },
      { name: "Absent/Other", value: other },
    ];
  }, [dailySummary]);

  const totalTrackedDays = dailySummary.filter(
    (d) => !["Week Off", "Future", "Pending"].includes(d.status)
  ).length;

  const openDayDetail = async (day) => {
    if (!user?._id) {
      setSelectedDay({ ...day, note: "" });
      return;
    }
    try {
      const res = await axios.get(`/attendance/notes/${user._id}/${day.date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedDay({ ...day, note: res.data?.note || "" });
    } catch {
      setSelectedDay({ ...day, note: "" });
    }
  };

  const saveNote = async () => {
    if (!selectedDay || !user?._id) {
      setSelectedDay(null);
      return;
    }
    setSavingNote(true);
    try {
      await axios.post(
        `/attendance/notes/${user._id}/${selectedDay.date}`,
        { note: selectedDay.note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedDay(null);
    } catch (err) {
      console.error("Failed to save note", err);
      toast.error("Couldn\u2019t save the note", { description: "Check your connection and try again.", action: { label: "Retry", onClick: () => saveNote() } });
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <PageLoader label="Loading attendance" />;

  if (error) {
    return (
      <MobilePage title="My attendance" back tabs="worker">
        <MobileCard>
          <EmptyState title={error} description="Check your connection and open this page again." />
        </MobileCard>
      </MobilePage>
    );
  }

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  return (
    <MobilePage title="My attendance" back tabs="worker">
      <SegmentedControl
        aria-label="View"
        className="w-full [&>*]:flex-1"
        options={[
          { value: "calendar", label: "Calendar" },
          { value: "summary", label: "Summary" },
          { value: "list", label: "List" },
        ]}
        value={view}
        onChange={setView}
      />

      <div className="flex gap-2">
        <Stat value={counts.present} label="Present" tone="text-tone-ok-fg" />
        <Stat value={counts.half} label="Half day" tone="text-tone-warn-fg" />
        <Stat value={counts.absent} label="Absent" tone="text-tone-bad-fg" />
        <Stat value={counts.leave} label="Leave" tone="text-tone-info-fg" />
      </div>

      {view === "calendar" && (
        <>
          <MobileCard>
            <div className="mb-3 flex items-center justify-between">
              <Button variant="outline" size="icon" aria-label="Previous month" onClick={prevMonth}>
                <ChevronLeft />
              </Button>
              <h2 className="text-[15px] font-semibold text-ink-1">
                {months[month]} {year}
              </h2>
              <Button variant="outline" size="icon" aria-label="Next month" onClick={nextMonth}>
                <ChevronRight />
              </Button>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
                <div key={idx} className="text-center text-[11.5px] font-semibold text-ink-3">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid (shared with the admin attendance modal) */}
            <CalendarGrid dailySummary={dailySummary} onDayClick={openDayDetail} month={month} year={year} showWeekdays={false} />
            <div className="mt-3.5">
              <Legend />
            </div>
          </MobileCard>
          <MobileCard>
            <div className="text-small text-ink-3">Tap a day to see punch times, selfie and notes.</div>
          </MobileCard>
        </>
      )}

      {view === "summary" && (
        <>
          {/* Year Graph: bar + trend line, per month attendance % */}
          <MobileCard
            title="Year graph"
            action={
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="!size-8" aria-label="Previous year" onClick={() => setYear(year - 1)}>
                  <ChevronLeft />
                </Button>
                <span className="w-12 text-center text-small font-medium text-ink-2">{year}</span>
                <Button variant="outline" size="icon" className="!size-8" aria-label="Next year" onClick={() => setYear(year + 1)}>
                  <ChevronRight />
                </Button>
              </div>
            }
          >
            <YearAttendanceChart yearlySummary={yearlySummary} />
            <p className="mt-2 text-center text-small text-ink-3">
              Overall percentage <span className="font-bold text-ink-1">{overallYearPct}%</span>
            </p>
          </MobileCard>

          {/* Month Graph: donut for a chosen month, with its own month nav */}
          <MobileCard
            title="Month graph"
            action={
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="!size-8" aria-label="Previous month" onClick={prevMonth}>
                  <ChevronLeft />
                </Button>
                <span className="w-24 text-center text-small font-medium text-ink-2">
                  {months[month]} {year}
                </span>
                <Button variant="outline" size="icon" className="!size-8" aria-label="Next month" onClick={nextMonth}>
                  <ChevronRight />
                </Button>
              </div>
            }
          >
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={monthDonutData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="hsl(var(--highlight))" />
                    <Cell fill="hsl(var(--primary))" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 text-small text-ink-2">
                <p className="flex justify-between">
                  <span className="text-ink-3">Total days</span>
                  <span className="font-semibold">{totalTrackedDays}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-ink-3">Present days</span>
                  <span className="font-semibold text-tone-ok-fg">{counts.present}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-ink-3">Absent days</span>
                  <span className="font-semibold text-tone-bad-fg">{counts.absent}</span>
                </p>
              </div>
            </div>
          </MobileCard>
        </>
      )}

      {view === "list" && (
        <MobileCard>
          <div className="mb-1 flex items-center justify-between">
            <Button variant="outline" size="icon" aria-label="Previous month" onClick={prevMonth}>
              <ChevronLeft />
            </Button>
            <h2 className="text-[15px] font-semibold text-ink-1">
              {months[month]} {year}
            </h2>
            <Button variant="outline" size="icon" aria-label="Next month" onClick={nextMonth}>
              <ChevronRight />
            </Button>
          </div>
          <ul>
            {dailySummary.map((d) => {
              const dt = new Date(`${d.date}T00:00:00`);
              return (
                <li key={d.date} className="border-b border-line last:border-b-0">
                  <Button type="button" variant="ghost" className="!h-auto w-full justify-start gap-3 rounded-none px-0 py-3 font-normal hover:bg-transparent" onClick={() => openDayDetail(d)}>
                    <span className="w-14 text-[14px] font-semibold tabular-nums text-ink-1">
                      {dt.getDate()} {dt.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="flex-1 text-small text-ink-3">{dt.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <StatusBadge status={d.status} />
                  </Button>
                </li>
              );
            })}
          </ul>
        </MobileCard>
      )}

      {/* Day detail */}
      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-sm">
          {selectedDay ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="flex items-center justify-between gap-3">
                  {new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" })}
                  <StatusBadge status={selectedDay.status} />
                </DialogTitle>
                <DialogDescription>{selectedDay.date}</DialogDescription>
              </DialogHeader>

              {selectedDay.firstIn && selectedDay.lastOut && (
                <div className="rounded-card bg-surface-subtle p-4">
                  <div className="mb-2 flex items-center gap-2.5 font-semibold text-ink-1">
                    <Clock className="size-4 text-primary" /> Working hours
                  </div>
                  <div className="flex items-center justify-between text-small">
                    <div>
                      <p className="text-ink-3">Check in</p>
                      <p className="font-semibold text-ink-1">{fmt(selectedDay.firstIn)}</p>
                    </div>
                    <div className="text-ink-4">→</div>
                    <div>
                      <p className="text-ink-3">Check out</p>
                      <p className="font-semibold text-ink-1">{fmt(selectedDay.lastOut)}</p>
                    </div>
                  </div>
                  {selectedDay.minutes > 0 && (
                    <p className="mt-3 border-t border-line pt-3 text-small text-ink-3">
                      Total:{" "}
                      <span className="font-semibold text-primary">
                        {Math.floor(selectedDay.minutes / 60)}h {selectedDay.minutes % 60}m
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="day-note" className="mb-1.5 block text-small font-medium text-ink-2">
                  Add note
                </label>
                <Textarea id="day-note" rows={4} value={selectedDay.note || ""} placeholder="Add a note about this day..." onChange={(e) => setSelectedDay({ ...selectedDay, note: e.target.value })} />
              </div>

              <DialogFooter className="flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedDay(null)}>
                  Close
                </Button>
                <Button className="flex-1" onClick={saveNote} disabled={savingNote}>
                  {savingNote ? "Saving..." : "Save note"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </MobilePage>
  );
};

// --- Helper Components ---

function Stat({ value, label, tone }) {
  return (
    <div className="flex-1 rounded-[10px] bg-surface px-1 py-2.5 text-center">
      <div className={`text-[20px] font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[11.5px] text-ink-3">{label}</div>
    </div>
  );
}

function fmt(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default MyAttendance;
