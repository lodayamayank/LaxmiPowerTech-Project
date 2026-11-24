const MINUTES_HALF_DAY = 240;
const MINUTES_FULL_DAY = 480;
const WEEK_OFF_DAYS = [0];


const keyOf = (iso) => {
    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) return null;

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
};


const summarizeSessions = (punches) => {
    const sorted = punches
        .filter(
            (punch) =>
                (punch.punchType === "in" || punch.punchType === "out") &&
                punch.createdAt &&
                !Number.isNaN(new Date(punch.createdAt).getTime())
        )
        .slice()
        .sort(
            (a, b) =>
                new Date(a.createdAt) - new Date(b.createdAt)
        );

    let minutes = 0;
    let openIn = null;
    let firstIn = null;
    let lastOut = null;
    let hasCompletePair = false;

    for (const punch of sorted) {
        const time = new Date(punch.createdAt);

        if (punch.punchType === "in") {
            if (!firstIn) firstIn = time;

            // Ignore back-to-back "in" punches.
            if (!openIn) openIn = time;
        } else if (punch.punchType === "out" && openIn) {
            minutes += Math.max(
                0,
                Math.round((time - openIn) / 60000)
            );

            lastOut = time;
            openIn = null;
            hasCompletePair = true;
        }
    }

    return {
        minutes,
        firstIn,
        lastOut,
        hasCompletePair,
        stillClockedIn: openIn !== null,
    };
};

export function computeDailyStatuses(records, month, year) {
    const byDay = new Map();

    for (const punch of records) {
        const timestamp = punch.createdAt;

        if (!timestamp) continue;

        const key = keyOf(timestamp);

        // Ignore invalid timestamps instead of creating a "null" day.
        if (!key) continue;

        if (!byDay.has(key)) {
            byDay.set(key, []);
        }

        byDay.get(key).push(punch);
    }

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayKey = keyOf(today);

    const result = [];

    for (
        let day = new Date(start);
        day <= end;
        day.setDate(day.getDate() + 1)
    ) {
        const key = keyOf(day);
        const isToday = key === todayKey;
        const punches = byDay.get(key) || [];

        const dayOfWeek = day.getDay();
        const isWeekOffDay = WEEK_OFF_DAYS.includes(dayOfWeek);

        let status;
        let firstIn = null;
        let lastOut = null;
        let minutes = 0;

        if (day.getTime() > today.getTime()) {
            status = "Future";
        } else if (
            punches.some((punch) => punch.punchType === "leave")
        ) {
            const leavePunch = punches.find(
                (punch) => punch.punchType === "leave"
            );

            const type = leavePunch?.leaveId?.type || "unpaid";

            status =
                type === "paid"
                    ? "Paid Leave"
                    : type === "unpaid"
                    ? "Unpaid Leave"
                    : type === "sick"
                    ? "Sick Leave"
                    : "Casual Leave";
        } else {
            const session = summarizeSessions(punches);

            firstIn = session.firstIn;
            lastOut = session.lastOut;
            minutes = session.minutes;

            if (isToday && session.stillClockedIn) {
                status = "In Progress";
            } else if (session.hasCompletePair) {
                if (isWeekOffDay) {
                    status = "Week Off";
                } else {
                    status =
                        minutes >= MINUTES_FULL_DAY
                            ? "Present"
                            : minutes >= MINUTES_HALF_DAY
                            ? "Half Day"
                            : "Absent";
                }
            } else if (punches.length && !isWeekOffDay) {
                status = "Incomplete";
            } else if (isWeekOffDay) {
                status = "Week Off";
            } else if (isToday) {
                status = "Pending";
            } else {
                status = "Absent";
            }
        }

        result.push({
            date: key,
            status,
            minutes,
            firstIn,
            lastOut,
            punches,
        });
    }

    return result;
}