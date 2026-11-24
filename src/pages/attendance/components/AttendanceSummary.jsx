// src/pages/attendance/components/AttendanceSummary.jsx
// Monthly attendance summary for one role, by project and month. Used by AdminAttendance and AttendancePage.
// One request: GET /attendance/summary?project=&month=&year=&role= (same URL and headers as before).
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff } from "lucide-react";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { useProjects } from "@/hooks/useProjects";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterField } from "@/components/common/FilterBar";
import { SearchInput } from "@/components/common/SearchInput";
import AttendanceRegister from "./AttendanceRegister";
import { normalizeRow } from "./attendanceRows";

const NO_PROJECT = "__none__"; // Radix SelectItem cannot use ""; mapped back to "" below

const monthValue = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;

function AttendanceSummary({ role, tabs }) {
  const [summary, setSummary] = useState([]);
  const { data: projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const token = getToken();

  const fetchAttendanceSummary = useCallback(async () => {
    try {
      setLoading(true);
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const res = await axios.get(
        `/attendance/summary?project=${selectedProject}&month=${month}&year=${year}&role=${role}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to fetch attendance summary", err);
    } finally {
      setLoading(false);
    }
  }, [role, selectedMonth, selectedProject, token]);

  useEffect(() => {
    if (selectedProject && selectedMonth) {
      fetchAttendanceSummary();
    }
  }, [fetchAttendanceSummary, selectedProject, selectedMonth]);

  // This endpoint nests the person: { user: { _id, name, employeeId }, present, ... }.
  const rows = useMemo(() => summary.map((item) => normalizeRow({ ...item, ...item.user }, item.user?._id)), [summary]);

  const emptyState = selectedProject ? (
    <EmptyState icon={CalendarOff} title="No attendance records found" description="Nothing matches this project, month and search." />
  ) : (
    <EmptyState icon={CalendarOff} title="Select a project" description="Pick a project and month to see the attendance summary." />
  );

  return (
    <AttendanceRegister
      rows={rows}
      loading={loading}
      search={searchTerm}
      tabs={tabs}
      onClear={() => setSearchTerm("")}
      showClear={Boolean(searchTerm)}
      emptyState={emptyState}
      filters={
        <>
          <FilterField label="Project" htmlFor="att-project" grow={16} minWidth={200} maxWidth={280}>
            <Select value={selectedProject || NO_PROJECT} onValueChange={(v) => setSelectedProject(v === NO_PROJECT ? "" : v)}>
              <SelectTrigger id="att-project" aria-label="Select project">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>Select Project</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj._id} value={String(proj._id)}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Month" htmlFor="att-month" grow={10} minWidth={160} maxWidth={200}>
            <Input id="att-month" type="month" value={monthValue(selectedMonth)} onChange={(e) => setSelectedMonth(new Date(e.target.value))} />
          </FilterField>
          <FilterField label="Search" htmlFor="att-search" grow={22} minWidth={220}>
            <SearchInput
              id="att-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
              placeholder="Search staff name"
            />
          </FilterField>
        </>
      }
    />
  );
}

export default memo(AttendanceSummary);
