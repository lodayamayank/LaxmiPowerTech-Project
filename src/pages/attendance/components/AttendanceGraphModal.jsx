import React, { useEffect, useMemo, useState } from "react";
import { getToken } from '@/lib/session';
import axios from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, CalendarX, ChevronLeft, ChevronRight, Lightbulb, TrendingUp } from "lucide-react";
import { computeDailyStatuses } from "@/lib/attendanceCalculations";
import {
  CalendarGrid,
  Legend,
  MetricCard,
  STATUS_COLORS,
  StatusDonut,
  WeekStrip,
  YearAttendanceChart,
  buildBreakdown,
  buildYearlySummary,
} from "./AttendanceVisuals";

const PERIODS = ["weekly", "monthly", "yearly", "custom"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ── Date utility functions ────────────────────────────────────────────────────
const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const startOfWeek = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date, amount) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const getRange = (period, date) => {
  if (period === "weekly") {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 6) };
  }

  if (period === "yearly") {
    return {
      start: new Date(date.getFullYear(), 0, 1),
      end: new Date(date.getFullYear(), 11, 31),
    };
  }

  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  };
};

const formatRange = (period, date) => {
  if (period === "yearly") return String(date.getFullYear());

  if (period === "weekly") {
    const range = getRange(period, date);

    return `${range.start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${range.end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const movePeriod = (date, period, amount) => {
  const next = new Date(date);

  if (period === "yearly") {
    next.setFullYear(next.getFullYear() + amount);
  } else if (period === "monthly") {
    // Pin to day 1 so e.g. Jan 31 + 1 month doesn't skip February
    next.setDate(1);
    next.setMonth(next.getMonth() + amount);
  } else {
    next.setDate(next.getDate() + amount * 7);
  }

  return next;
};

const getUserId = (user) =>
  String(typeof user === "string" ? user : user?._id || user?.id || "");

// ── AttendanceGraphModal ──────────────────────────────────────────────────────
// Props: user, onClose
const AttendanceGraphModal = ({ user, onClose }) => {
  const [period, setPeriod] = useState("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(() =>
    toDateKey(startOfWeek(new Date()))
  );
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = getToken();
  const userId = getUserId(user);

  const range = useMemo(() => {
    if (period === "custom") {
      const start = parseDateKey(customStart);
      const end = parseDateKey(customEnd);
      return { start, end: end < start ? start : end };
    }
    return getRange(period, selectedDate);
  }, [period, selectedDate, customStart, customEnd]);

  useEffect(() => {
    let ignore = false;

    const fetchAttendance = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(`/attendance/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: toDateKey(range.start),
            endDate: toDateKey(range.end),
          },
        });

        if (ignore) return;
        const rows = Array.isArray(response.data)
          ? response.data
          : response.data?.rows || [];
        setRecords(rows.filter((record) => getUserId(record.user) === userId));
      } catch (requestError) {
        if (ignore) return;
        console.error("Failed to load attendance graph", requestError);
        setError("Failed to load attendance data");
        setRecords([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAttendance();

    return () => {
      ignore = true;
    };
  }, [range, token, userId]);

  const dailyStatuses = useMemo(() => {
    if (period === "yearly") return [];
    const statuses = [];
    const cursor = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      1
    );
    while (cursor <= range.end) {
      statuses.push(
        ...computeDailyStatuses(
          records,
          cursor.getMonth(),
          cursor.getFullYear()
        )
      );
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return statuses
      .filter(
        (day) =>
          day.date >= toDateKey(range.start) && day.date <= toDateKey(range.end)
      )
      .filter(
        (day, index, allDays) =>
          allDays.findIndex((item) => item.date === day.date) === index
      );
  }, [period, range.end, range.start, records]);

  const yearlySummary = useMemo(() => {
    if (period !== "yearly") return [];

    return buildYearlySummary(
      computeDailyStatuses,
      records,
      selectedDate.getFullYear()
    );
  }, [period, records, selectedDate]);

  const monthsWithData = useMemo(
    () =>
      yearlySummary.filter(
        (month) => month.pct > 0 || month.present + month.absent > 0
      ),
    [yearlySummary]
  );

  const overallYearPct = useMemo(() => {
    if (!monthsWithData.length) return 0;

    return Math.round(
      monthsWithData.reduce((total, month) => total + month.pct, 0) /
        monthsWithData.length
    );
  }, [monthsWithData]);

  // Yearly extras: donut data, totals and the strongest month
  const breakdown = useMemo(
    () => buildBreakdown(yearlySummary),
    [yearlySummary]
  );
  const breakdownTotal = breakdown.reduce((sum, item) => sum + item.value, 0);
  const presentTotal =
    breakdown.find((item) => item.status === "Present")?.value || 0;
  const absentTotal =
    breakdown.find((item) => item.status === "Absent")?.value || 0;

  const bestMonth = useMemo(() => {
    if (!monthsWithData.length) return null;
    return monthsWithData.reduce((best, month) =>
      month.pct > best.pct ? month : best
    );
  }, [monthsWithData]);

  const counts = dailyStatuses.reduce((summary, day) => {
    summary[day.status] = (summary[day.status] || 0) + 1;
    return summary;
  }, {});

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* sm:max-w-3xl is needed because newer shadcn DialogContent sets sm:max-w-lg */}
      <DialogContent className="max-h-[90vh] w-full max-w-3xl sm:max-w-3xl gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="text-lg font-bold text-ink-1">
            Attendance overview
            <span className="text-tone-ok-fg">.</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-3">
            {user?.name || user?.username}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {/* Period tabs */}
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="h-9 rounded-lg bg-surface-muted p-[3px]">
              {PERIODS.map((option) => (
                <TabsTrigger
                  key={option}
                  value={option}
                  className="rounded-md px-4 text-xs font-medium capitalize text-ink-3 data-[state=active]:bg-surface data-[state=active]:text-tone-ok-fg data-[state=active]:shadow-sm"
                >
                  {option}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Period navigation (custom uses date pickers instead) */}
          {period !== "custom" ? (
            <div className="flex items-center justify-between rounded-lg border border-line-card px-2 py-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-3"
                onClick={() =>
                  setSelectedDate(movePeriod(selectedDate, period, -1))
                }
                aria-label="Previous period"
              >
                <ChevronLeft />
              </Button>
              <span className="text-sm font-semibold text-ink-2">
                {formatRange(period, selectedDate)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-3"
                onClick={() =>
                  setSelectedDate(movePeriod(selectedDate, period, 1))
                }
                aria-label="Next period"
              >
                <ChevronRight />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-line-card px-3 py-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="attendance-custom-start"
                  className="text-xs font-semibold text-ink-2"
                >
                  From
                </Label>
                <Input
                  id="attendance-custom-start"
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(event) => {
                    if (event.target.value) setCustomStart(event.target.value);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="attendance-custom-end"
                  className="text-xs font-semibold text-ink-2"
                >
                  To
                </Label>
                <Input
                  id="attendance-custom-end"
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(event) => {
                    if (event.target.value) setCustomEnd(event.target.value);
                  }}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3 py-4" aria-label="Loading attendance">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              {period === "weekly" && (
                <WeekStrip dailySummary={dailyStatuses} />
              )}

              {/* CalendarGrid now draws its own MON-SUN header row */}
              {period === "monthly" && (
                <CalendarGrid
                  dailySummary={dailyStatuses}
                  month={range.start.getMonth()}
                  year={range.start.getFullYear()}
                />
              )}

              {period === "custom" && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-ink-2">
                    Attendance:{" "}
                    {range.start.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {range.end.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  <WeekStrip dailySummary={dailyStatuses} />
                </div>
              )}

              {period === "yearly" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <MetricCard
                      label="Attendance rate"
                      value={overallYearPct}
                      unit="%"
                      icon={TrendingUp}
                      footer="Average across months with data"
                    />
                    <MetricCard
                      label="Days present"
                      value={presentTotal}
                      unit={`/ ${breakdownTotal} days`}
                      icon={CalendarCheck}
                    />
                    <MetricCard
                      label="Days absent"
                      value={absentTotal}
                      unit="days"
                      icon={CalendarX}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink-1">
                      Showing up, over time
                    </h3>
                    <p className="mb-2 text-xs text-ink-3">
                      Attendance rhythm through {selectedDate.getFullYear()}
                    </p>
                    <YearAttendanceChart yearlySummary={yearlySummary} />
                  </div>

                  {bestMonth && (
                    <div className="flex items-center gap-2.5 rounded-md bg-tone-ok-soft px-3.5 py-2.5 text-xs text-tone-ok-fg">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Strongest month was{" "}
                        <strong>
                          {MONTH_NAMES[
                            [
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ].indexOf(bestMonth.month)
                          ] || bestMonth.month}
                        </strong>
                        , with a{" "}
                        <strong>{bestMonth.pct}% attendance rate.</strong>
                      </span>
                    </div>
                  )}

                  {breakdownTotal > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-ink-1">
                        The full picture
                      </h3>
                      <p className="mb-3 text-xs text-ink-3">
                        Where the working days went
                      </p>
                      <div className="mx-auto max-w-sm">
                        <StatusDonut data={breakdown} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {period !== "yearly" && (
                <>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(counts).map(([status, count]) => (
                      <span
                        key={status}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line-card bg-surface px-3 py-1 text-xs text-ink-2"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[status] }}
                        />
                        {status}
                        <strong className="font-semibold text-ink-1">
                          {count}
                        </strong>
                      </span>
                    ))}
                  </div>
                  <Legend />
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceGraphModal;
