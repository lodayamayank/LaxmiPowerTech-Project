import React, { useEffect, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/* -------------------------------------------------------------------------
 * AttendanceVisuals — restyled with the "Attendance Studio" look:
 * soft tinted calendar cells, dashed future days, dot markers, emerald
 * primary, a gradient area line, and a donut breakdown.
 *
 * Every export from the previous version is kept with the same props
 * (STATUS_COLORS, statusColor, StatusBadge, CalendarGrid, WeekStrip, Legend,
 * YearGraphTooltip, YearAttendanceChart, buildYearlySummary), so existing
 * pages keep working. New exports: StatusDonut, buildBreakdown, MetricCard.
 *
 * react-icons is no longer needed here (badges use a colour dot instead).
 * ----------------------------------------------------------------------- */

// Single source of truth for status -> solid colour (chart fills, legend dots).
export const STATUS_COLORS = {
  Present: "#34a583",
  "Half Day": "#e6b422",
  Absent: "#ea6f62",
  "Week Off": "#b4bcb8",
  Future: "#d9dedc",
  Pending: "#a3adaa",
  "In Progress": "#38a9e0",
  Incomplete: "#f59e0b",
  "Paid Leave": "#5b9bd5",
  "Unpaid Leave": "#9a6fd1",
  "Sick Leave": "#f08a4b",
  // Matches the pink calendar cells so the legend swatch is accurate.
  "Casual Leave": "#ec6fa8",
};

// Soft tinted style per status, used by calendar cells and badges.
const STATUS_TAILWIND = {
  Present:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Half Day":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300",
  Absent: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  "Week Off":
    "bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400",
  Future:
    "bg-white text-gray-300 border border-dashed border-gray-200 dark:bg-transparent dark:text-gray-600 dark:border-gray-700",
  Pending:
    "bg-white text-gray-400 border border-dashed border-gray-300 dark:bg-transparent dark:text-gray-500 dark:border-gray-600",
  "In Progress": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Incomplete:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  "Paid Leave":
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Unpaid Leave":
    "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  "Sick Leave":
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  "Casual Leave":
    "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
};

export function statusColor(status) {
  return (
    STATUS_TAILWIND[status] ||
    "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
  );
}

// Badges can't use the dashed-border cell style, so Future/Pending get a flat pill.
function badgeStyle(status) {
  if (status === "Future" || status === "Pending") {
    return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300";
  }
  return statusColor(status);
}

// Recharts takes colours as JS values, so Tailwind's dark: classes can't
// reach the chart. This reports whether <html> has the `dark` class.
function useIsDark() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() =>
      setIsDark(el.classList.contains("dark"))
    );
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function StatusBadge({ status }) {
  return (
    <Badge
      className={`${badgeStyle(
        status
      )} text-[11px] font-medium flex items-center gap-1.5 border-transparent shadow-none hover:opacity-90`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

const clickableCellClass =
  "cursor-pointer hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function DayCell({ day, onDayClick, className }) {
  return (
    <div
      role={onDayClick ? "button" : undefined}
      tabIndex={onDayClick ? 0 : undefined}
      aria-label={`${day.date}: ${day.status}`}
      className={`${className} relative flex items-center justify-center rounded-md text-xs font-medium transition-transform duration-150 ${statusColor(
        day.status
      )} ${onDayClick ? clickableCellClass : ""}`}
      onClick={() => onDayClick?.(day)}
      onKeyDown={(e) => {
        if (onDayClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onDayClick(day);
        }
      }}
      title={day.status}
    >
      {new Date(`${day.date}T00:00:00`).getDate()}
      <span className="absolute bottom-1.5 h-[3px] w-[3px] rounded-full bg-current opacity-60" />
    </div>
  );
}

// Full month calendar, one soft-tinted cell per day. Used for the employee's
// own "Calendar" view and for the admin's monthly attendance-graph view.
export function CalendarGrid({
  dailySummary,
  onDayClick,
  month,
  year,
  cellSize = "h-11",
  showWeekdays = true,
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7; // Monday-first grid

  return (
    <div>
      {showWeekdays && (
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`blank-${i}`} className={cellSize}></div>
        ))}
        {dailySummary.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            onDayClick={onDayClick}
            className={cellSize}
          />
        ))}
      </div>
    </div>
  );
}

// Compact 7-cell strip for a single week, used by the admin attendance-graph
// modal's "weekly" view.
export function WeekStrip({ dailySummary, onDayClick }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {dailySummary.map((day) => (
        <div key={day.date} className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
            {new Date(`${day.date}T00:00:00`)
              .toLocaleDateString("en-US", { weekday: "short" })
              .toUpperCase()}
          </span>
          <DayCell day={day} onDayClick={onDayClick} className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }) {
  const defaultItems = [
    { label: "Present", status: "Present" },
    { label: "Half Day", status: "Half Day" },
    { label: "Absent", status: "Absent" },
    { label: "Week Off", status: "Week Off" },
    { label: "In Progress", status: "In Progress" },
    { label: "Incomplete", status: "Incomplete" },
    { label: "Paid Leave", status: "Paid Leave" },
    { label: "Sick Leave", status: "Sick Leave" },
    { label: "Unpaid Leave", status: "Unpaid Leave" },
    { label: "Casual Leave", status: "Casual Leave" },
  ];
  const list = items || defaultItems;

  return (
    <Card className="rounded-lg border-gray-200 bg-white shadow-none dark:border-gray-700 dark:bg-gray-800">
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-semibold text-gray-700 dark:text-gray-100">
          Legend
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          {list.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[item.status] }}
              ></span>
              <span className="text-gray-500 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function YearGraphTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const Row = ({ name, value, color }) => (
    <p className="flex items-center justify-between gap-6 text-gray-500 dark:text-gray-300">
      <span className="flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {name}
      </span>
      <span className="font-semibold text-gray-800 dark:text-gray-100">
        {value}
      </span>
    </p>
  );
  return (
    <div className="space-y-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800">
      <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
      <Row
        name="Attendance"
        value={`${data.pct}%`}
        color={STATUS_COLORS.Present}
      />
      <Row name="Present" value={data.present} color={STATUS_COLORS.Present} />
      <Row
        name="Half Day"
        value={data.half}
        color={STATUS_COLORS["Half Day"]}
      />
      <Row name="Absent" value={data.absent} color={STATUS_COLORS.Absent} />
      {data.incomplete > 0 && (
        <Row
          name="Incomplete"
          value={data.incomplete}
          color={STATUS_COLORS.Incomplete}
        />
      )}
    </div>
  );
}

export function YearAttendanceChart({ yearlySummary, height = 240 }) {
  const isDark = useIsDark();

  const primary = isDark ? "#4cc9a4" : "#2a9275";
  const tickColor = isDark ? "#9ca3af" : "#7a8a85";
  const gridColor = isDark ? "#374151" : "#e6ebe9";

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={yearlySummary}
          margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="attendance-pct-fill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={primary} stopOpacity={0.22} />
              <stop offset="100%" stopColor={primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={gridColor}
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            yAxisId="days"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<YearGraphTooltip />}
            cursor={{
              fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(42,146,117,0.06)",
            }}
          />
          <Bar
            yAxisId="days"
            dataKey="present"
            name="Present"
            stackId="days"
            fill={STATUS_COLORS.Present}
            fillOpacity={0.35}
            barSize={18}
          />
          <Bar
            yAxisId="days"
            dataKey="half"
            name="Half Day"
            stackId="days"
            fill={STATUS_COLORS["Half Day"]}
            fillOpacity={0.85}
            barSize={18}
          />
          <Bar
            yAxisId="days"
            dataKey="absent"
            name="Absent"
            stackId="days"
            fill={STATUS_COLORS.Absent}
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
            barSize={18}
          />
          <Area
            yAxisId="pct"
            type="monotone"
            dataKey="pct"
            name="Attendance %"
            stroke={primary}
            strokeWidth={3}
            fill="url(#attendance-pct-fill)"
            dot={{
              r: 3.5,
              strokeWidth: 2,
              fill: isDark ? "#111827" : "#fff",
              stroke: primary,
            }}
            activeDot={{ r: 5.5 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-500 dark:text-gray-300">
        {[
          { label: "Present", color: STATUS_COLORS.Present },
          { label: "Half Day", color: STATUS_COLORS["Half Day"] },
          { label: "Absent", color: STATUS_COLORS.Absent },
          { label: "Attendance %", color: primary },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            ></span>
            {item.label}
          </span>
        ))}
      </div>
    </>
  );
}

// Donut breakdown with the total in the centre.
// data: [{ name, value, status }]  (status picks the colour from STATUS_COLORS)
export function StatusDonut({
  data,
  centerLabel = "working days",
  height = 200,
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="76%"
              outerRadius="94%"
              paddingAngle={4}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={STATUS_COLORS[d.status || d.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} days`]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-3xl font-extrabold text-gray-900 dark:text-gray-50">
            {total}
          </strong>
          <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-2 px-1">
        {data.map((d) => (
          <div
            key={d.name}
            className="flex items-center justify-between text-xs"
          >
            <span className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[d.status || d.name] }}
              />
              {d.name}
            </span>
            <span className="flex items-center gap-4 font-medium text-gray-800 dark:text-gray-100">
              {d.value}
              <small className="min-w-[28px] text-right text-[11px] font-normal text-gray-400">
                {total ? Math.round((d.value / total) * 100) : 0}%
              </small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sums a yearlySummary (from buildYearlySummary) into StatusDonut data.
export function buildBreakdown(yearlySummary) {
  const sum = (key) => yearlySummary.reduce((t, m) => t + (m[key] || 0), 0);
  return [
    { name: "Present", status: "Present", value: sum("present") },
    { name: "Half Day", status: "Half Day", value: sum("half") },
    { name: "Absent", status: "Absent", value: sum("absent") },
  ];
}

// Summary tile: label + big number + optional footer line.
//   <MetricCard label="Attendance rate" value="94.6" unit="%" icon={ChartNoAxesCombined} footer="+4.2% vs last year" />
export function MetricCard({ label, value, unit, icon: Icon, footer }) {
  return (
    <Card className="rounded-lg border-gray-200 bg-white shadow-none dark:border-gray-700 dark:bg-gray-800">
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          {label}
          {Icon && <Icon className="h-4 w-4" />}
        </div>
        <div className="mt-3 text-3xl font-extrabold text-gray-900 dark:text-gray-50">
          {value}
          {unit && (
            <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
              {unit}
            </span>
          )}
        </div>
        {footer && (
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            {footer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Turns raw punch records into the 12-month { month, present, half, absent, incomplete, pct }
export function buildYearlySummary(computeDailyStatuses, records, year) {
  const MONTHS_SHORT = [
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
  ];
  return MONTHS_SHORT.map((label, m) => {
    const days = computeDailyStatuses(records, m, year);
    const present = days.filter((d) => d.status === "Present").length;
    const half = days.filter((d) => d.status === "Half Day").length;
    const absent = days.filter((d) => d.status === "Absent").length;
    const incomplete = days.filter((d) => d.status === "Incomplete").length;
    const workingDays = days.filter(
      (d) => !["Week Off", "Future", "Pending"].includes(d.status)
    ).length;
    const pct = workingDays
      ? Math.round(((present + half * 0.5) / workingDays) * 100)
      : 0;
    return { month: label, present, half, absent, incomplete, pct };
  });
}
