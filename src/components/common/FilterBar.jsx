import React from "react";
import { cn } from "@/lib/utils";
import { FormField } from "./FormField";

/**
 * FilterBar: row of filter controls that wraps on small screens.
 *
 * Props:
 * - children {node}: usually <FilterField> items
 * - className {string}
 * - ...props spread onto the root div
 */
export const FilterBar = ({ children, className, ...props }) => (
  <div
    className={cn("flex flex-wrap items-end gap-3 border-b border-line px-5 py-4", className)}
    {...props}
  >
    {children}
  </div>
);

/**
 * FilterField: a FormField sized for a FilterBar.
 *
 * Props: all FormField props, plus
 * - flex {string} default "1 1 160px": CSS `flex` shorthand (grow / shrink / basis)
 */
export const FilterField = ({ flex = "1 1 160px", style, ...props }) => (
  <FormField style={{ flex, ...style }} {...props} />
);

export default FilterBar;
