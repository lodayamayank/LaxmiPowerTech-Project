import React from "react";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormField } from "./FormField";

/**
 * FilterBar: row of filter controls that wraps on small screens.
 *
 * Props:
 * - children {node}: usually <FilterField> items
 * - onClear {()=>void}: when given and showClear is true, a ghost "Clear filters" button ends the bar
 * - showClear {boolean}: true when at least one filter is applied (a status tab is not a filter)
 * - className {string}
 * - ...props spread onto the root div
 */
export const FilterBar = ({ children, onClear, showClear = false, className, ...props }) => (
  <div
    className={cn("flex flex-wrap items-end gap-3 border-b border-line px-5 py-3", className)}
    {...props}
  >
    {children}
    {onClear && showClear ? (
      <Button type="button" variant="ghost" onClick={onClear} className="shrink-0 text-ink-3">
        <FilterX /> Clear filters
      </Button>
    ) : null}
  </div>
);

/**
 * FilterField: a FormField sized for a FilterBar.
 *
 * Props: all FormField props, plus
 * - grow {number} default 1: flex-grow weight (basis auto), so fields share spare width in that ratio
 * - minWidth {number|string} default 140: smallest width before the bar wraps
 */
export const FilterField = ({ grow = 1, minWidth = 140, style, ...props }) => (
  <FormField style={{ flex: `${grow} 1 auto`, minWidth, ...style }} {...props} />
);

export default FilterBar;
