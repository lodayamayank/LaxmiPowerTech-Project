// src/pages/projects/components/LocationPath.jsx
// A hierarchy as a row of segments separated by chevrons: Tower A › Wing › Floor 3 › Flat 301 › Room.
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props:
 * - parts {string[]}: segments from outermost to innermost (empty ones are skipped)
 * - max {number}: when there are more parts, show only the last `max` with a leading "..."
 * - className {string}
 */
export default function LocationPath({ parts = [], max, className }) {
  const clean = parts.filter((p) => p !== null && p !== undefined && p !== "");
  const shown = max && clean.length > max ? clean.slice(-max) : clean;
  const truncated = shown.length < clean.length;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-small text-ink-2", className)} title={clean.join(" › ")}>
      {truncated ? (
        <>
          <span>...</span>
          <ChevronRight className="size-3 shrink-0 text-ink-4" aria-hidden="true" />
        </>
      ) : null}
      {shown.map((part, i) => (
        <Fragment key={`${part}-${i}`}>
          {i > 0 ? <ChevronRight className="size-3 shrink-0 text-ink-4" aria-hidden="true" /> : null}
          <span>{part}</span>
        </Fragment>
      ))}
    </span>
  );
}
