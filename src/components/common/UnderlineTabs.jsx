import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * UnderlineTabs: section tabs with an underline on the active one and an optional count pill.
 *
 * Props:
 * - options {Array<{ value:string, label:node, count?:number|string }>}
 * - value {string}: active tab value
 * - onChange {(value)=>void}
 * - className {string}
 * - ...props spread onto the root div (use aria-label)
 */
export const UnderlineTabs = ({ options, value, onChange, className, ...props }) => (
  <div role="tablist" className={cn("flex flex-wrap gap-1 border-b border-line", className)} {...props}>
    {options.map((o) => {
      const active = o.value === value;
      return (
        <Button
          key={o.value}
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={active}
          onClick={() => onChange(o.value)}
          className={cn(
            "-mb-px !h-[42px] gap-2 rounded-none border-0 border-b-2 px-3 hover:bg-transparent",
            active ? "border-primary font-semibold text-primary hover:text-primary" : "border-transparent font-medium text-ink-3 hover:text-ink-1"
          )}
        >
          {o.label}
          {o.count !== undefined ? (
            <span className={cn("rounded-full px-[7px] py-px text-caption font-medium", active ? "bg-primary-soft text-primary" : "bg-surface-muted text-ink-2")}>{o.count}</span>
          ) : null}
        </Button>
      );
    })}
  </div>
);

export default UnderlineTabs;
