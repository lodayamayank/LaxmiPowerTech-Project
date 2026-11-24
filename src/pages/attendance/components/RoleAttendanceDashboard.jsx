// src/pages/attendance/components/RoleAttendanceDashboard.jsx
// Attendance register for one role over a date range. Replaces the three near-identical
// Supervisor / Subcontractor / Labour dashboards; the page files just pass `role`.
// One request: GET /attendance/summary with { role, startDate, endDate } (same params and headers as before).
import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Download } from "lucide-react";
import { toast } from "sonner";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { getCurrentMonthDateRange } from "@/lib/dateRange";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import AttendanceRegister from "./AttendanceRegister";
import DateRangeFilter from "./DateRangeFilter";
import RoleTabs from "./RoleTabs";
import { normalizeRow } from "./attendanceRows";

const RoleAttendanceDashboard = ({ role }) => {
  const [records, setRecords] = useState([]);
  const [searchStaff, setSearchStaff] = useState("");
  const [dateRange, setDateRange] = useState(getCurrentMonthDateRange);
  const [loading, setLoading] = useState(false);
  const token = getToken();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/attendance/summary", {
          headers: { Authorization: `Bearer ${token}` },
          params: { role, ...dateRange },
        });
        setRecords(res.data || []);
      } catch (err) {
        console.error(`Failed to fetch ${role} summary`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, dateRange, role]);

  const filtered = useMemo(
    () => records.filter((r) => r.name?.toLowerCase().includes(searchStaff.toLowerCase())),
    [records, searchStaff],
  );
  const rows = useMemo(() => filtered.map((item, i) => normalizeRow(item, i)), [filtered]);

  const exportToCSV = () => {
    if (!filtered.length) {
      toast.error("No records to export");
      return;
    }

    const headers = ["Name", "Employee ID", "Present", "Absent", "Half Day", "Week Off", "Paid Leave", "Unpaid Leave", "Sick Leave", "Casual Leave", "Overtime"];
    const csvRows = filtered.map((item) => [
      item.name,
      item.employeeId,
      item.present,
      item.absent,
      item.halfDay,
      item.weekOff,
      item.paidLeave || 0,
      item.unpaidLeave || 0,
      item.sickLeave || 0,
      item.casualLeave || 0,
      item.overtime,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvRows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `${role.charAt(0).toUpperCase() + role.slice(1)}_Attendance_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="People / Attendance register"
        title="Attendance register"
        description="Monthly attendance by role."
        actions={
          <Button variant="outline" onClick={exportToCSV}>
            <Download /> Export CSV
          </Button>
        }
      />
      <AttendanceRegister
        rows={rows}
        loading={loading}
        search=""
        tabs={<RoleTabs role={role} />}
        emptyState={<EmptyState icon={CalendarOff} title="No records found" description="No attendance records for this role and date range." />}
        filters={
          <>
            <FilterField label="Search" htmlFor="role-att-search" grow={22} minWidth={220}>
              <SearchInput
                id="role-att-search"
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                onClear={() => setSearchStaff("")}
                placeholder="Search by name..."
              />
            </FilterField>
            <DateRangeFilter value={dateRange} onApply={setDateRange} />
          </>
        }
      />
    </DashboardLayout>
  );
};

export default RoleAttendanceDashboard;
