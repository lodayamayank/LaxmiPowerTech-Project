import React from "react";
import {
	FaCheckCircle,
	FaTimesCircle,
	FaClock,
	FaUmbrellaBeach,
	FaNotesMedical,
	FaCalendarDay,
	FaHourglassHalf,
	FaExclamationTriangle,
} from "react-icons/fa";
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";

// Single source of truth for status -> color, used for chart fills, badges
// and calendar cells across the whole attendance feature.
export const STATUS_COLORS = {
	Present: "#16a34a",
	"Half Day": "#eab308",
	Absent: "#dc2626",
	"Week Off": "#64748b",
	Future: "#cbd5e1",
	Pending: "#94a3b8",
	"In Progress": "#0ea5e9",
	Incomplete: "#f59e0b",
	"Paid Leave": "#2563eb",
	"Unpaid Leave": "#9333ea",
	"Sick Leave": "#f97316",
	"Casual Leave": "#4f46e5",
};

const STATUS_TAILWIND = {
	Present: "bg-gradient-to-br from-green-400 to-green-500 text-white",
	"Half Day": "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white",
	Absent: "bg-gradient-to-br from-red-400 to-red-500 text-white",
	"Week Off": "bg-gradient-to-br from-gray-300 to-gray-400 text-white",
	Future: "bg-gray-100 text-gray-400 border-2 border-gray-200",
	Pending: "bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300",
	"In Progress": "bg-gradient-to-br from-sky-400 to-sky-500 text-white",
	Incomplete: "bg-gradient-to-br from-amber-400 to-amber-500 text-white",
	"Paid Leave": "bg-gradient-to-br from-blue-400 to-blue-500 text-white",
	"Unpaid Leave": "bg-gradient-to-br from-purple-400 to-purple-500 text-white",
	"Sick Leave": "bg-gradient-to-br from-orange-400 to-orange-500 text-white",
	"Casual Leave": "bg-gradient-to-br from-pink-400 to-pink-500 text-white",
};

const STATUS_BADGE_CONFIG = {
	Present: { bg: "bg-green-500", icon: FaCheckCircle },
	"Half Day": { bg: "bg-yellow-500", icon: FaClock },
	Absent: { bg: "bg-red-500", icon: FaTimesCircle },
	"Week Off": { bg: "bg-gray-500", icon: FaUmbrellaBeach },
	Future: { bg: "bg-gray-200 text-gray-500", icon: FaCalendarDay },
	Pending: { bg: "bg-gray-400", icon: FaCalendarDay },
	"In Progress": { bg: "bg-sky-500", icon: FaHourglassHalf },
	Incomplete: { bg: "bg-amber-500", icon: FaExclamationTriangle },
	"Paid Leave": { bg: "bg-blue-500", icon: FaUmbrellaBeach },
	"Unpaid Leave": { bg: "bg-purple-500", icon: FaUmbrellaBeach },
	"Sick Leave": { bg: "bg-orange-500", icon: FaNotesMedical },
	"Casual Leave": { bg: "bg-pink-500", icon: FaUmbrellaBeach },
};

export function statusColor(status) {
	return STATUS_TAILWIND[status] || "bg-gray-100";
}

export function StatusBadge({ status }) {
	const { bg, icon: Icon } = STATUS_BADGE_CONFIG[status] || {
		bg: "bg-gray-200",
		icon: FaCalendarDay,
	};
	return (
		<Badge className={`${bg} text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm border-transparent`}>
			<Icon size={10} />
			{status}
		</Badge>
	);
}

// Full month calendar, one colored cell per day. Used for the employee's
// own "Calendar" view and for the admin's monthly attendance-graph view.
export function CalendarGrid({ dailySummary, onDayClick, month, year, cellSize = "h-14" }) {
	const firstDay = new Date(year, month, 1).getDay();
	const offset = (firstDay + 6) % 7; // Monday-first grid

	return (
		<div className="grid grid-cols-7 gap-2">
			{Array.from({ length: offset }).map((_, i) => (
				<div key={`blank-${i}`} className={cellSize}></div>
			))}
			{dailySummary.map((day) => (
				<div
					key={day.date}
					role={onDayClick ? "button" : undefined}
					tabIndex={onDayClick ? 0 : undefined}
					className={`${cellSize} flex items-center justify-center rounded-xl font-semibold text-sm transition-all shadow-sm ${statusColor(day.status)} ${
						onDayClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""
					}`}
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
				</div>
			))}
		</div>
	);
}

// Compact 7-cell strip for a single week, used by the admin attendance-graph
// modal's "weekly" view.
export function WeekStrip({ dailySummary, onDayClick }) {
	return (
		<div className="grid grid-cols-7 gap-2">
			{dailySummary.map((day) => (
				<div key={day.date} className="flex flex-col items-center gap-1.5">
					<span className="text-xs font-medium text-gray-500">
						{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
					</span>
					<div
						role={onDayClick ? "button" : undefined}
						tabIndex={onDayClick ? 0 : undefined}
						className={`h-14 w-full flex items-center justify-center rounded-xl font-semibold text-sm shadow-sm transition-all ${statusColor(day.status)} ${
							onDayClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""
						}`}
						onClick={() => onDayClick?.(day)}
						title={day.status}
					>
						{new Date(`${day.date}T00:00:00`).getDate()}
					</div>
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
		<div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-4 border border-gray-200">
			<p className="text-xs font-semibold text-gray-700 mb-3">Legend</p>
			<div className="grid grid-cols-2 gap-2 text-xs">
				{list.map((item) => (
					<div key={item.label} className="flex items-center gap-2">
						<span
							className="w-4 h-4 rounded shadow-sm"
							style={{ backgroundColor: STATUS_COLORS[item.status] }}
						></span>
						<span className="text-gray-700">{item.label}</span>
					</div>
				))}
			</div>
		</div>
	);
}

export function YearGraphTooltip({ active, payload, label }) {
	if (!active || !payload || !payload.length) return null;
	const data = payload[0].payload;
	return (
		<div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs space-y-0.5">
			<p className="font-semibold text-gray-800">{label}</p>
			<p className="text-gray-600">
				Attendance: <span className="font-semibold text-gray-800">{data.pct}%</span>
			</p>
			<p className="text-green-600">Present: <span className="font-semibold">{data.present}</span></p>
			<p className="text-yellow-600">Half Day: <span className="font-semibold">{data.half}</span></p>
			<p className="text-red-600">Absent: <span className="font-semibold">{data.absent}</span></p>
			{data.incomplete > 0 && (
				<p className="text-amber-600">Incomplete: <span className="font-semibold">{data.incomplete}</span></p>
			)}
		</div>
	);
}


export function YearAttendanceChart({ yearlySummary, height = 220 }) {
	return (
		<>
			<ResponsiveContainer width="100%" height={height}>
				<ComposedChart data={yearlySummary} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
					<XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} />
					<YAxis
						yAxisId="days"
						allowDecimals={false}
						tick={{ fontSize: 11, fill: "#6b7280" }}
						axisLine={false}
					/>
					<YAxis
						yAxisId="pct"
						orientation="right"
						domain={[0, 100]}
						tickFormatter={(v) => `${v}%`}
						tick={{ fontSize: 11, fill: "#6b7280" }}
						axisLine={false}
					/>
					<Tooltip content={<YearGraphTooltip />} />
					<Bar yAxisId="days" dataKey="present" name="Present" stackId="days" fill={STATUS_COLORS.Present} radius={[0, 0, 0, 0]} barSize={22} />
					<Bar yAxisId="days" dataKey="half" name="Half Day" stackId="days" fill={STATUS_COLORS["Half Day"]} barSize={22} />
					<Bar yAxisId="days" dataKey="absent" name="Absent" stackId="days" fill={STATUS_COLORS.Absent} radius={[6, 6, 0, 0]} barSize={22} />
					<Line yAxisId="pct" type="monotone" dataKey="pct" name="Attendance %" stroke="#1e293b" strokeWidth={2} dot={false} />
				</ComposedChart>
			</ResponsiveContainer>
			<div className="flex flex-wrap gap-3 justify-center mt-1 text-[11px] text-gray-600">
				{[
					{ label: "Present", color: STATUS_COLORS.Present },
					{ label: "Half Day", color: STATUS_COLORS["Half Day"] },
					{ label: "Absent", color: STATUS_COLORS.Absent },
					{ label: "Attendance %", color: "#1e293b" },
				].map((item) => (
					<span key={item.label} className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }}></span>
						{item.label}
					</span>
				))}
			</div>
		</>
	);
}

// Turns raw punch records into the 12-month { month, present, half, absent, pct }
export function buildYearlySummary(computeDailyStatuses, records, year) {
	const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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