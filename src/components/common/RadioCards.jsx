import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * RadioCards: single-choice cards, each with a radio dot and a label (e.g. a role picker).
 *
 * Props:
 * - options {Array<{ value:string, label:node }>}
 * - value {string}: selected value
 * - onChange {(value)=>void}
 * - className {string}: layout classes for the group (default: a wrapping grid, 130px columns)
 * - ...props spread onto the root div (use aria-label)
 */
export const RadioCards = ({ options, value, onChange, className, ...props }) => (
  <div role="radiogroup" className={cn("grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2", className)} {...props}>
    {options.map((o) => {
      const on = o.value === value;
      return (
        <Button
          key={o.value}
          type="button"
          variant="outline"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.value)}
          className={cn(
            "!h-auto justify-start gap-2 whitespace-normal px-3 py-[9px] text-left font-medium",
            on ? "border-primary bg-primary-soft text-ink-1 hover:bg-primary-soft" : "text-ink-1"
          )}
        >
          <span aria-hidden="true" className={cn("flex size-[18px] shrink-0 items-center justify-center rounded-full border", on ? "border-primary" : "border-line-input")}>
            {on ? <span className="size-2.5 rounded-full bg-primary" /> : null}
          </span>
          {o.label}
        </Button>
      );
    })}
  </div>
);

export default RadioCards;
