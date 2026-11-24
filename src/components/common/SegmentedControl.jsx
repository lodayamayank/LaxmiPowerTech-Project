import React, { useRef } from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  md: "h-control-seg px-3 text-small",
  sm: "h-7 px-2.5 text-caption",
};

/**
 * SegmentedControl: single-choice toggle group (role="radiogroup").
 * Arrow keys move and select; Home/End jump to the first/last option.
 *
 * Props:
 * - options {Array<{ value:string|number, label:node, icon?:React.ComponentType, count?:number|string }>}
 * - value {string|number}: selected option value
 * - onChange {(value)=>void}
 * - size {"md"|"sm"} default "md"
 * - className {string}
 * - ...props spread onto the root div (use aria-label to name the group)
 */
export const SegmentedControl = ({ options, value, onChange, size = "md", className, ...props }) => {
  const refs = useRef([]);

  const move = (from, step) => {
    const n = options.length;
    const next = (from + step + n) % n;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e, index) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(index, -1);
        break;
      case "Home":
        e.preventDefault();
        move(-1, 1);
        break;
      case "End":
        e.preventDefault();
        move(options.length, -1);
        break;
      default:
    }
  };

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="radiogroup"
      className={cn("inline-flex gap-0.5 rounded-[9px] bg-surface-muted p-[3px]", className)}
      {...props}
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] font-medium text-ink-3 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              SIZE_CLASSES[size] || SIZE_CLASSES.md,
              active && "bg-surface font-semibold text-ink-1 shadow-control"
            )}
          >
            {Icon ? <Icon size={14} aria-hidden="true" /> : null}
            {opt.label}
            {opt.count !== undefined && opt.count !== null ? (
              <span className="tabular-nums text-ink-4">{opt.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
