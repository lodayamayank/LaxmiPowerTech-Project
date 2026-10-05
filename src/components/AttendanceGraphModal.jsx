import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { computeDailyStatuses } from "../utils/attendanceCalculations";
import {
  CalendarGrid,
  Legend,
  WeekStrip,
  YearAttendanceChart,
  buildYearlySummary,
} from "./AttendanceVisuals";

const PERIODS = ["weekly", "monthly", "yearly", "custom"];

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
  const [customStart, setCustomStart] = useState(() => toDateKey(startOfWeek(new Date())));
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
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
        const response = await axios.get("/attendance", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: toDateKey(range.start),
            endDate: toDateKey(range.end),
          },
        });

        if (ignore) return;
        const rows = Array.isArray(response.data) ? response.data : response.data?.rows || [];
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
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cursor <= range.end) {
      statuses.push(...computeDailyStatuses(records, cursor.getMonth(), cursor.getFullYear()));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return statuses
      .filter((day) => day.date >= toDateKey(range.start) && day.date <= toDateKey(range.end))
      .filter((day, index, allDays) => allDays.findIndex((item) => item.date === day.date) === index);
  }, [period, range.end, range.start, records]);

  const yearlySummary = useMemo(() => {
    if (period !== "yearly") return [];

    return buildYearlySummary(computeDailyStatuses, records, selectedDate.getFullYear());
  }, [period, records, selectedDate]);

  const overallYearPct = useMemo(() => {
    const withData = yearlySummary.filter(
      (month) => month.pct > 0 || month.present + month.absent > 0
    );

    if (!withData.length) return 0;

    return Math.round(withData.reduce((total, month) => total + month.pct, 0) / withData.length);
  }, [yearlySummary]);

  const counts = dailyStatuses.reduce((summary, day) => {
    summary[day.status] = (summary[day.status] || 0) + 1;
    return summary;
  }, {});

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl gap-0 overflow-y-auto p-0 dark:bg-gray-800">
        <DialogHeader className="border-b px-5 py-4 text-left dark:border-gray-700">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Attendance Graph
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-300">
            {user?.name || user?.username}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {/* Period tabs */}
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              {PERIODS.map((option) => (
                <TabsTrigger
                  key={option}
                  value={option}
                  className="capitalize text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  {option}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Period navigation (custom uses date pickers instead) */}
          {period !== "custom" ? (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(movePeriod(selectedDate, period, -1))}
              aria-label="Previous period"
            >
              <FaChevronLeft />
            </Button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">
              {formatRange(period, selectedDate)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(movePeriod(selectedDate, period, 1))}
              aria-label="Next period"
            >
              <FaChevronRight />
            </Button>
          </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 px-3 py-3 sm:grid-cols-2 dark:bg-gray-700">
              <label className="space-y-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                From
                <Input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(event) => {
                    if (event.target.value) setCustomStart(event.target.value);
                  }}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                To
                <Input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(event) => {
                    if (event.target.value) setCustomEnd(event.target.value);
                  }}
                />
              </label>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-300">
              Loading attendance...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : (
            <>
              {period === "weekly" && <WeekStrip dailySummary={dailyStatuses} />}

              {period === "monthly" && (
                <>
                  <div className="mb-1 grid grid-cols-7 gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-semibold text-gray-500 dark:text-gray-300"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <CalendarGrid
                    dailySummary={dailyStatuses}
                    month={range.start.getMonth()}
                    year={range.start.getFullYear()}
                  />
                </>
              )}

              {period === "custom" && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-100">
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
                <div>
                  <YearAttendanceChart yearlySummary={yearlySummary} />

                  <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
                    Overall percentage{" "}
                    <span className="font-bold text-gray-800 dark:text-white">{overallYearPct}%</span>
                  </p>
                </div>
              )}

              {period !== "yearly" && (
                <>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(counts).map(([status, count]) => (
                      <span
                        key={status}
                        className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      >
                        {status}: {count}
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