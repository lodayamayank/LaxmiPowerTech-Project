import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "../utils/axios";
import { Button } from "@/components/ui/button";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { computeDailyStatuses } from "../utils/attendanceCalculations";
import {
	CalendarGrid,
	Legend,
	WeekStrip,
	YearAttendanceChart,
	buildYearlySummary,
} from "./AttendanceVisuals";

const PERIODS = ["weekly", "monthly", "yearly"];

const toDateKey = (date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
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
		return `${range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${range.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
	}
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const movePeriod = (date, period, amount) => {
	const next = new Date(date);
	if (period === "yearly") next.setFullYear(next.getFullYear() + amount);
	else if (period === "monthly") next.setMonth(next.getMonth() + amount);
	else next.setDate(next.getDate() + amount * 7);
	return next;
};

const getUserId = (user) => String(
	typeof user === "string" ? user : user?._id || user?.id || ""
);

const AttendanceGraphModal = ({ user, onClose }) => {
	const [period, setPeriod] = useState("monthly");
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const token = localStorage.getItem("token");

	const range = useMemo(() => getRange(period, selectedDate), [period, selectedDate]);

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
				const userId = getUserId(user);
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
	}, [range.end, range.start, token, user]);

	const dailyStatuses = useMemo(() => {
		if (period === "yearly") return [];
		const statuses = computeDailyStatuses(records, range.start.getMonth(), range.start.getFullYear());
		if (range.start.getMonth() !== range.end.getMonth()) {
			statuses.push(...computeDailyStatuses(records, range.end.getMonth(), range.end.getFullYear()));
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
		const withData = yearlySummary.filter((m) => m.pct > 0 || m.present + m.absent > 0);
		if (!withData.length) return 0;
		return Math.round(withData.reduce((a, b) => a + b.pct, 0) / withData.length);
	}, [yearlySummary]);

	const counts = dailyStatuses.reduce((summary, day) => {
		summary[day.status] = (summary[day.status] || 0) + 1;
		return summary;
	}, {});

	return createPortal((
		<div className="fixed !inset-0 z-[100] m-0 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
			<div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800" onMouseDown={(event) => event.stopPropagation()}>
				<div className="flex items-center justify-between border-b px-5 py-4 dark:border-gray-700">
					<div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Graph</h2>
						<p className="text-sm text-gray-500 dark:text-gray-300">{user?.name || user?.username}</p>
					</div>
					<Button variant="ghost" size="icon" onClick={onClose} aria-label="Close attendance graph">
						<FaTimes />
					</Button>
				</div>

				<div className="space-y-5 p-5">
					<div className="flex flex-wrap gap-2">
						{PERIODS.map((option) => (
							<Button
								key={option}
								variant={period === option ? "default" : "outline"}
								className={`${period === option ? "bg-orange-500 hover:bg-orange-600" : ""} capitalize text-sm font-medium`}
								onClick={() => setPeriod(option)}
							>
								{option}
							</Button>
						))}
					</div>

					<div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
						<Button variant="ghost" size="icon" onClick={() => setSelectedDate(movePeriod(selectedDate, period, -1))} aria-label="Previous period">
							<FaChevronLeft />
						</Button>
						<span className="text-sm font-semibold text-gray-700 dark:text-gray-100">{formatRange(period, selectedDate)}</span>
						<Button variant="ghost" size="icon" onClick={() => setSelectedDate(movePeriod(selectedDate, period, 1))} aria-label="Next period">
							<FaChevronRight />
						</Button>
					</div>

					{loading ? (
						<div className="py-16 text-center text-sm text-gray-500 dark:text-gray-300">Loading attendance...</div>
					) : error ? (
						<div className="py-16 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
					) : (
						<>
							{period === "weekly" && <WeekStrip dailySummary={dailyStatuses} />}

							{period === "monthly" && (
								<>
									<div className="grid grid-cols-7 gap-2 mb-1">
										{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
											<div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-300">
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

							{period === "yearly" && (
								<div>
									<YearAttendanceChart yearlySummary={yearlySummary} />
									<p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-2">
										Overall percentage{" "}
										<span className="font-bold text-gray-800 dark:text-white">{overallYearPct}%</span>
									</p>
								</div>
							)}

							{period === "yearly" ? null : (
								<>
									<div className="flex flex-wrap gap-2 text-xs">
										{Object.entries(counts).map(([status, count]) => (
											<span key={status} className="rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
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
			</div>
		</div>
	), document.body);
};

export default AttendanceGraphModal;