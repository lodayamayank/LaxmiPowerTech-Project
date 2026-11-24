// src/pages/leaves/components/LeaveFilters.jsx
// Filter row for the admin leave list. Filter state lives in the page; this only renders it.
import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { SearchInput } from "@/components/common/SearchInput";
import { ROLES } from "@/lib/constants";

// Radix SelectItem cannot use an empty-string value, so "All ..." options use this sentinel
// in the UI. It is mapped back to "" before touching the filters state.
const ALL = "__all__";

const ROLE_OPTIONS = [
  [ROLES.admin, "Admin"],
  [ROLES.staff, "Staff"],
  [ROLES.supervisor, "Supervisor"],
  [ROLES.subcontractor, "Subcontractor"],
  [ROLES.labour, "Labour"],
];
const TYPE_OPTIONS = [
  ["paid", "Paid"],
  ["unpaid", "Unpaid"],
  ["sick", "Sick"],
  ["casual", "Casual"],
];

function FilterSelect({ id, label, value, onChange, allLabel, grow, children }) {
  return (
    <FilterField label={label} htmlFor={id} grow={grow} minWidth={140} maxWidth={240}>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger id={id} aria-label={`Filter by ${label.toLowerCase()}`}>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </FilterField>
  );
}

function LeaveFilters({ filters, onFilter, branches, searchInput, onSearchInput, onSubmit, onClear, showClear }) {
  return (
    <form onSubmit={onSubmit}>
      <FilterBar onClear={onClear} showClear={showClear}>
        <FilterField label="Search" htmlFor="leave-search" grow={22} minWidth={220}>
          <SearchInput
            id="leave-search"
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            onClear={() => onSearchInput("")}
            placeholder="Search reason/username"
          />
        </FilterField>
        <FilterSelect id="leave-role" label="Role" grow={14} value={filters.role} onChange={(v) => onFilter({ role: v })} allLabel="All Roles">
          {ROLE_OPTIONS.map(([value, text]) => (
            <SelectItem key={value} value={value}>{text}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect id="leave-branch" label="Branch" grow={16} value={filters.branchId} onChange={(v) => onFilter({ branchId: v })} allLabel="All Branches">
          {branches.map((b) => (
            <SelectItem key={b._id} value={String(b._id)}>{b.name}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect id="leave-type" label="Leave type" grow={16} value={filters.type} onChange={(v) => onFilter({ type: v })} allLabel="All Types">
          {TYPE_OPTIONS.map(([value, text]) => (
            <SelectItem key={value} value={value}>{text}</SelectItem>
          ))}
        </FilterSelect>
        <FilterField label="From" htmlFor="leave-from" grow={15} minWidth={150} maxWidth={180}>
          <Input id="leave-from" type="date" value={filters.from} onChange={(e) => onFilter({ from: e.target.value })} />
        </FilterField>
        <FilterField label="To" htmlFor="leave-to" grow={15} minWidth={150} maxWidth={180}>
          <Input id="leave-to" type="date" value={filters.to} onChange={(e) => onFilter({ to: e.target.value })} />
        </FilterField>
      </FilterBar>
    </form>
  );
}

export default memo(LeaveFilters);
