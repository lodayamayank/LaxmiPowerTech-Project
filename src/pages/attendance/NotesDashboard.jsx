// src/pages/attendance/NotesDashboard.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, StickyNote, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { getRoleTone } from "@/lib/status";
import { useBranches } from "@/hooks/useBranches";
import useDebounce from "@/hooks/useDebounce";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { UserAvatar } from "@/components/common/UserAvatar";

const ALL = "__all__"; // Radix SelectItem cannot use ""; mapped back to "" before touching state
const LIMIT = 25;

const ROLE_OPTIONS = [
  ["labour", "Labour"],
  ["staff", "Staff"],
  ["subcontractor", "Subcontractor"],
  ["admin", "Admin"],
];

const COLUMNS = [
  {
    key: "person",
    header: "Person",
    cell: (n) => (
      <div className="flex items-center gap-2.5">
        <UserAvatar name={n.userName} size="sm" />
        <span className="font-medium text-ink-1">{n.userName || "N/A"}</span>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    cell: (n) => (
      <Badge variant={getRoleTone(n.role)} className="capitalize">
        {n.role || "N/A"}
      </Badge>
    ),
  },
  { key: "branch", header: "Branch", cell: (n) => (n.branch ? n.branch : <span className="text-ink-4">Not set</span>) },
  { key: "date", header: "Date", cell: (n) => formatDate(n.date) },
  {
    key: "note",
    header: "Note",
    truncate: true,
    maxWidth: 320,
    title: (n) => n.note || "",
    cell: (n) => (n.note ? n.note : <span className="text-ink-4">Empty note</span>),
  },
];

const mobileCard = (n) => (
  <>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <UserAvatar name={n.userName} size="sm" />
        <div className="min-w-0">
          <div className="truncate font-medium leading-tight text-ink-1">{n.userName || "N/A"}</div>
          <div className="text-caption-lg text-ink-3">{n.branch || "Not set"} · {formatDate(n.date)}</div>
        </div>
      </div>
      <Badge variant={getRoleTone(n.role)} className="capitalize">
        {n.role || "N/A"}
      </Badge>
    </div>
    <p className="text-small text-ink-2">{n.note || <span className="text-ink-4">Empty note</span>}</p>
  </>
);

const NotesDashboard = () => {
  const [notes, setNotes] = useState([]);
  const { data: branches } = useBranches();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = getToken();

  // Typing updates the `search` param (and resets to page 1) after a short pause.
  const debouncedSearch = useDebounce(searchInput, 300);
  useEffect(() => {
    setSearch(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("/attendanceNotes", {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, role, branch, page, limit: LIMIT },
      });
      setNotes(res.data.notes || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch notes", err);
      // Generic message only; backend details stay in the console.
      setError("We couldn't load the notes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, search, role, branch, page]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const totalPages = Math.max(Math.ceil(total / LIMIT), 1);

  const exportToCSV = () => {
    if (!notes.length) {
      toast.error("No notes to export");
      return;
    }

    const headers = ["User", "Role", "Branch", "Date", "Note"];
    const rows = notes.map((n) => [n.userName || "N/A", n.role || "N/A", n.branch || "N/A", n.date, n.note]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `attendance_notes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Counts cover the notes loaded on this page only (the API returns one page at a time).
  const roleCounts = useMemo(
    () =>
      notes.reduce((acc, note) => {
        acc[note.role] = (acc[note.role] || 0) + 1;
        return acc;
      }, {}),
    [notes],
  );

  const hasFilters = Boolean(searchInput || role || branch);
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRole("");
    setBranch("");
    setPage(1);
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="People / Attendance notes"
        title="Attendance notes"
        description="Notes people add when they punch in or out."
        actions={
          <Button variant="outline" onClick={exportToCSV}>
            <Download /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Total notes" value={total} icon={StickyNote} tone="highlight" />
        <StatCard label="From labour" value={roleCounts.labour || 0} sub="on this page" icon={Users} tone="ok" />
        <StatCard label="From staff" value={roleCounts.staff || 0} sub="on this page" icon={Users} tone="neutral" />
      </div>

      <SectionCard flush>
        <FilterBar onClear={clearFilters} showClear={hasFilters}>
          <FilterField label="Search" htmlFor="notes-search" grow={22} minWidth={220}>
            <SearchInput
              id="notes-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClear={() => setSearchInput("")}
              placeholder="Search notes, users, branches..."
            />
          </FilterField>
          <FilterField label="Role" htmlFor="notes-role" grow={14} minWidth={140} maxWidth={240}>
            <Select
              value={role || ALL}
              onValueChange={(value) => {
                setRole(value === ALL ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger id="notes-role">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Roles</SelectItem>
                {ROLE_OPTIONS.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Branch" htmlFor="notes-branch" grow={16} minWidth={140} maxWidth={240}>
            <Select
              value={branch || ALL}
              onValueChange={(value) => {
                setBranch(value === ALL ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger id="notes-branch">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>

        {error ? (
          <div className="px-5 pt-4">
            <Alert variant="destructive">
              <AlertTitle>Unable to load notes</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <DataTable
          columns={COLUMNS}
          rows={notes}
          rowKey="_id"
          loading={loading}
          mobileCard={mobileCard}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No notes found"
              description={hasFilters ? "No notes match these filters." : "No attendance notes have been added yet."}
            />
          }
          footer={
            <PaginationBar currentPage={page} totalPages={totalPages} totalItems={total} pageSize={LIMIT} onPageChange={setPage} />
          }
        />
      </SectionCard>
    </DashboardLayout>
  );
};

export default NotesDashboard;
