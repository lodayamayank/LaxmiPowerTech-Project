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

function FilterSelect({ id, label, value, onChange, allLabel, children }) {
  return (
    <FilterField label={label} htmlFor={id}>
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

function LeaveFilters({ filters, onFilter, branches, searchInput, onSearchInput, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <FilterBar>
        <FilterField label="Search" htmlFor="leave-search" flex="2 1 220px">
          <SearchInput
            id="leave-search"
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            onClear={() => onSearchInput("")}
            placeholder="Search reason/username"
          />
        </FilterField>
        <FilterSelect id="leave-role" label="Role" value={filters.role} onChange={(v) => onFilter({ role: v })} allLabel="All Roles">
          {ROLE_OPTIONS.map(([value, text]) => (
            <SelectItem key={value} value={value}>{text}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect id="leave-branch" label="Branch" value={filters.branchId} onChange={(v) => onFilter({ branchId: v })} allLabel="All Branches">
          {branches.map((b) => (
            <SelectItem key={b._id} value={String(b._id)}>{b.name}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect id="leave-type" label="Leave type" value={filters.type} onChange={(v) => onFilter({ type: v })} allLabel="All Types">
          {TYPE_OPTIONS.map(([value, text]) => (
            <SelectItem key={value} value={value}>{text}</SelectItem>
          ))}
        </FilterSelect>
        <FilterField label="From" htmlFor="leave-from" flex="0 1 150px">
          <Input id="leave-from" type="date" value={filters.from} onChange={(e) => onFilter({ from: e.target.value })} />
        </FilterField>
        <FilterField label="To" htmlFor="leave-to" flex="0 1 150px">
          <Input id="leave-to" type="date" value={filters.to} onChange={(e) => onFilter({ to: e.target.value })} />
        </FilterField>
      </FilterBar>
    </form>
  );
}

export default memo(LeaveFilters);
