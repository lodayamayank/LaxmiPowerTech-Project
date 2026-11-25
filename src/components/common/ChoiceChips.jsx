import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ChoiceChips: single-choice pills (mobile filters and pickers, e.g. a project or a leave type).
 *
 * Props:
 * - options {Array<{ value:string, label:node }>}
 * - value {string}: selected value
 * - onChange {(value)=>void}
 * - className {string}: layout classes for the group (default: wrapping row)
 * - ...props spread onto the root div (use aria-label)
 */
export const ChoiceChips = ({ options, value, onChange, className, ...props }) => (
  <div role="radiogroup" className={cn("flex flex-wrap gap-2", className)} {...props}>
    {options.map((o) => {
      const on = o.value === value;
      return (
        <Button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={on}
          variant="outline"
          onClick={() => onChange(o.value)}
          className={cn(
            "!h-10 rounded-full px-3.5 font-medium",
            on ? "border-primary bg-primary text-primary-foreground hover:bg-primary-strong hover:text-primary-foreground" : "text-ink-2"
          )}
        >
          {o.label}
        </Button>
      );
    })}
  </div>
);

export default ChoiceChips;
