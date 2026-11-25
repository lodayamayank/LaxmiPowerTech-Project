import React, { memo, useEffect, useState, useMemo } from "react";
import { CalendarDays, Info, Plus } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import axios from "@/api/client";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { FormField } from "@/components/common/FormField";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";

// Holiday dates are UTC midnights: format them in UTC so the day never shifts (same as before).
const utcParts = (date) => {
  const d = new Date(date);
  return {
    day: d.getUTCDate(),
    monthShort: d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
    year: d.getUTCFullYear(),
    weekday: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
  };
};
const formatHolidayDate = (date) => {
  const p = utcParts(date);
  return `${p.weekday}, ${p.day} ${p.monthShort} ${p.year}`;
};

const YEARS = [2024, 2025, 2026, 2027];

const HolidayItem = memo(function HolidayItem({ h, onToggle }) {
  const p = utcParts(h.date);
  return (
    <li className={h.isActive ? "flex items-center gap-4 px-5 py-3" : "flex items-center gap-4 px-5 py-3 opacity-60"}>
      <div className="flex w-[52px] shrink-0 flex-col items-center rounded-control bg-surface-muted py-1.5">
        <span className="text-caption uppercase text-ink-3">{p.monthShort}</span>
        <span className="text-card-title tabular-nums text-ink-1">{p.day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className={h.isActive ? "truncate font-semibold text-ink-1" : "truncate font-semibold text-ink-1 line-through"}>{h.name}</div>
        <div className="text-caption-lg text-ink-3">{formatHolidayDate(h.date)}</div>
      </div>
      <Badge variant={h.source === "manual" ? "info" : "neutral"}>{h.source === "manual" ? "Custom" : "System · India"}</Badge>
      <label className="flex items-center gap-2 text-small text-ink-2">
        <Switch checked={h.isActive} onCheckedChange={(on) => onToggle(h, on)} aria-label={`Active: ${h.name}`} />
        <span className="hidden sm:inline">Active</span>
      </label>
    </li>
  );
});

const HolidayCalendar = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState("active"); // "active" | "off" | "all"
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    name: "",
  });

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/holidays", { params: { year } });
      setHolidays(res.data || []);
    } catch {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const activeHolidays = useMemo(
    () => holidays.filter((h) => h.isActive),
    [holidays]
  );
  const inactiveHolidays = useMemo(
    () => holidays.filter((h) => !h.isActive),
    [holidays]
  );

  const handleAdd = async () => {
    if (!newHoliday.date || !newHoliday.name.trim()) {
      toast.error("Date and name are required");
      return;
    }
    setAdding(true);
    try {
      await axios.post("/holidays", newHoliday);
      toast.success("Holiday added");
      setNewHoliday({ date: "", name: "" });
      setShowAddForm(false);
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add holiday");
    } finally {
      setAdding(false);
    }
  };

 const handleDelete = async (id, name) => {
   setDeleteDialog({
     open: true,
     id,
     name,
   });
 };

 const confirmDelete = async () => {
   const { id, name } = deleteDialog;

   setDeleteDialog({ open: false, id: null, name: "" });

   try {
     await axios.delete(`/holidays/${id}`);
     toast.success(`"${name}" deactivated`);
     fetchHolidays();
   } catch {
     toast.error("Failed to deactivate holiday");
   }
 };

  const handleRestore = async (id, name) => {
    try {
      await axios.patch(`/holidays/${id}/restore`);
      toast.success(`"${name}" restored`);
      fetchHolidays();
    } catch {
      toast.error("Failed to restore holiday");
    }
  };

  // The switch: off asks first (deactivate), on restores straight away, as the old buttons did.
  const handleToggle = (h, on) => (on ? handleRestore(h._id, h.name) : handleDelete(h._id, h.name));

  const displayHolidays = view === "all" ? holidays : view === "off" ? inactiveHolidays : activeHolidays;

  const viewOptions = [
    { value: "active", label: "Active", count: activeHolidays.length },
    { value: "off", label: "Switched off", count: inactiveHolidays.length },
    { value: "all", label: "All", count: holidays.length },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Payroll / Holidays"
        title="Holidays"
        description="Paid and unpaid holiday days used by payroll."
        actions={
          <Button onClick={() => setShowAddForm(true)}>
            <Plus /> Add holiday
          </Button>
        }
      />

      <Notice tone="neutral" icon={Info}>
        System holidays come from India's public holiday list. Switch one off to leave it out of salary calculations; you
        can switch it back on any time.
      </Notice>

      <SectionCard
        flush
        title={`Holidays in ${year}`}
        description={`${activeHolidays.length} active · ${inactiveHolidays.length} switched off`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl aria-label="Show holidays" options={viewOptions} value={view} onChange={setView} />
            <Select value={String(year)} onValueChange={(value) => setYear(parseInt(value, 10))}>
              <SelectTrigger className="h-control-sm w-auto gap-2 px-2.5 text-small" aria-label="Year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {loading ? (
          <ul className="divide-y divide-line">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-3">
                <Skeleton className="h-[52px] w-[52px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-24" />
              </li>
            ))}
          </ul>
        ) : displayHolidays.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No holidays found"
            description={`No holidays found for ${year}. Open this page while connected to load India's public holidays.`}
          />
        ) : (
          <ul className="divide-y divide-line">
            {displayHolidays.map((h) => (
              <HolidayItem key={h._id} h={h} onToggle={handleToggle} />
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Holiday</DialogTitle>
            <DialogDescription>A custom holiday counts in payroll like a public one.</DialogDescription>
          </DialogHeader>
          <FormField label="Holiday date" htmlFor="holiday-date">
            <Input
              id="holiday-date"
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
            />
          </FormField>
          <FormField label="Holiday name" htmlFor="holiday-name">
            <Input
              id="holiday-name"
              type="text"
              placeholder="Holiday name (e.g. Company Foundation Day)"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday((p) => ({ ...p, name: e.target.value }))}
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? "Adding..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, id: null, name: "" });
          }
        }}
        title="Deactivate Holiday?"
        description={`Deactivate "${deleteDialog.name}"? It will be removed from salary calculations but can be restored later.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
};

export default HolidayCalendar;
