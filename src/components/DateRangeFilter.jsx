import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getCurrentMonthDateRange, isValidDateRange } from '../utils/dateRange';

const DateRangeFilter = ({ value, onApply }) => {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const apply = (event) => {
    event.preventDefault();

    if (!draft.startDate || !draft.endDate) {
      setError('Both dates are required.');
      return;
    }

    if (draft.startDate > today || draft.endDate > today) {
      setError('Future dates cannot be selected.');
      return;
    }

    if (!isValidDateRange(draft)) {
      setError(
        draft.startDate > draft.endDate
          ? 'From date cannot be after To date.'
          : 'Enter valid dates.'
      );
      return;
    }

    setError('');
    onApply(draft);
  };

  const reset = () => {
    const defaultRange = getCurrentMonthDateRange();
    setDraft(defaultRange);
    setError('');
    onApply(defaultRange);
  };

  return (
    <form onSubmit={apply} className="sm:col-span-2">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
        Date Range
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          aria-label="From Date"
          type="date"
          max={today}
          required
          value={draft.startDate}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              startDate: event.target.value,
            }))
          }
          className="min-w-0 flex-1 w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        <span
          className="hidden sm:inline text-gray-400"
          aria-hidden="true"
        >
          →
        </span>

        <input
          aria-label="To Date"
          type="date"
          max={today}
          required
          value={draft.endDate}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              endDate: event.target.value,
            }))
          }
          className="min-w-0 flex-1 w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        <div className="flex shrink-0 gap-2">
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600"
          >
            Apply Filter
          </Button>

          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  );
};

export default DateRangeFilter;

