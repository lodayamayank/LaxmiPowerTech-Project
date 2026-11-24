import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * ProgressRow: label | bar | trailing text.
 *
 * Props:
 * - label {node}
 * - value {number}, max {number} default 100: bar fill = value / max
 * - trailing {node}: right-aligned text (e.g. "62%")
 * - className {string}
 * - ...props spread onto the root div
 */
export const ProgressRow = ({ label, value = 0, max = 100, trailing, className, ...props }) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cn("grid grid-cols-[110px_1fr_64px] items-center gap-3 text-body", className)}
      {...props}
    >
      <span className="truncate text-ink-2">{label}</span>
      <Progress value={pct} />
      <span className="text-right tabular-nums text-ink-3">{trailing}</span>
    </div>
  );
};

export default ProgressRow;
