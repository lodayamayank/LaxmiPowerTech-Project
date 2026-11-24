// src/pages/attendance/components/DateRangeFilter.jsx
// From / To dates with Apply and Reset. Renders inside a FilterBar (the form uses `display: contents`),
// validates the same way as before and only calls onApply with a valid range.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterField } from "@/components/common/FilterBar";
import { getCurrentMonthDateRange, isValidDateRange } from "@/lib/dateRange";

const DateRangeFilter = ({ value, onApply }) => {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const apply = (event) => {
    event.preventDefault();

    if (!draft.startDate || !draft.endDate) {
      setError("Both dates are required.");
      return;
    }

    if (draft.startDate > today || draft.endDate > today) {
      setError("Future dates cannot be selected.");
      return;
    }

    if (!isValidDateRange(draft)) {
      setError(draft.startDate > draft.endDate ? "From date cannot be after To date." : "Enter valid dates.");
      return;
    }

    setError("");
    onApply(draft);
  };

  const reset = () => {
    const defaultRange = getCurrentMonthDateRange();
    setDraft(defaultRange);
    setError("");
    onApply(defaultRange);
  };

  return (
    <form onSubmit={apply} className="contents">
      <FilterField label="From" htmlFor="range-from" grow={15} minWidth={150} maxWidth={180}>
        <Input
          id="range-from"
          aria-label="From Date"
          type="date"
          max={today}
          required
          value={draft.startDate}
          onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
        />
      </FilterField>
      <FilterField label="To" htmlFor="range-to" grow={15} minWidth={150} maxWidth={180}>
        <Input
          id="range-to"
          aria-label="To Date"
          type="date"
          max={today}
          required
          value={draft.endDate}
          onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
        />
      </FilterField>
      <Button type="submit">Apply</Button>
      <Button type="button" variant="ghost" onClick={reset} className="text-ink-3">
        Reset
      </Button>
      {error ? (
        <p role="alert" className="basis-full text-caption text-tone-bad-fg">
          {error}
        </p>
      ) : null}
    </form>
  );
};

export default DateRangeFilter;
