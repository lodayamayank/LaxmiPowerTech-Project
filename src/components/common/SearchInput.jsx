import React, { useId } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * SearchInput: ui/Input with a search icon and an optional clear button.
 *
 * Props:
 * - value {string}
 * - onChange {(event)=>void}: native change handler, same as <Input />
 * - placeholder {string} default "Search..."
 * - onClear {()=>void}: shows an X button when value is non-empty
 * - label {string}: visually hidden label for screen readers (default "Search")
 * - className {string}: merged onto the wrapper
 * - ...props spread onto the Input
 */
export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
  label = "Search",
  className,
  id,
  ...props
}) => {
  const autoId = useId();
  const inputId = id || autoId;
  const showClear = Boolean(onClear) && value !== undefined && value !== null && String(value) !== "";
  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
        aria-hidden="true"
      />
      <Input
        id={inputId}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn("pl-9 [&::-webkit-search-cancel-button]:hidden", showClear && "pr-9")}
        {...props}
      />
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-control text-ink-4 hover:bg-surface-muted hover:text-ink-2"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

export default SearchInput;
