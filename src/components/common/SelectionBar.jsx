import React from "react";
import { cn } from "@/lib/utils";

/**
 * SelectionBar: strip above a selectable table showing how many rows are selected, with actions.
 * Renders nothing when count is 0.
 *
 * Props:
 * - count {number}: selected rows
 * - children {node}: action buttons
 * - className {string}
 */
export const SelectionBar = ({ count, children, className, ...props }) => {
  if (!count) return null;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3 border-b border-line bg-surface-subtle px-5 py-2.5", className)}
      {...props}
    >
      <span className="text-small font-semibold text-ink-1">{count} selected</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
};

export default SelectionBar;
