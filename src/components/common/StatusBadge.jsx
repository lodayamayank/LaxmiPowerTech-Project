import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusTone, formatStatusLabel } from "@/utils/status";

// Class strings (outline Badge) used by the legacy `colorMap` prop. Literal strings
// so Tailwind can see them. Tokens only.
const OK = "bg-tone-ok-soft text-tone-ok-fg border-tone-ok-border";
const BAD = "bg-tone-bad-soft text-tone-bad-fg border-tone-bad-border";
const WARN = "bg-tone-warn-soft text-tone-warn-fg border-tone-warn-fg/30";
const INFO = "bg-tone-info-soft text-tone-info-fg border-tone-info-fg/30";
const NEUTRAL = "bg-tone-neutral-soft text-tone-neutral-fg border-line";

/** Fallback style when a legacy colorMap has no entry for a status. */
const FALLBACK_STYLE = NEUTRAL;

/**
 * Pre-defined domain-specific color maps that pages can import and pass
 * as the `colorMap` prop (legacy API; kept for existing consumers).
 */
export const LEAVE_STATUS_COLORS = {
  approved: OK,
  rejected: BAD,
  pending: WARN,
};

export const REIMBURSEMENT_STATUS_COLORS = {
  approved: OK,
  rejected: BAD,
  pending: WARN,
  paid: INFO,
};

export const TRANSFER_STATUS_COLORS = {
  pending: WARN,
  approved: INFO,
  rejected: BAD,
  completed: OK,
};

/**
 * StatusBadge: status pill. With no `colorMap` the tone comes from `getStatusTone`
 * (utils/status.js) and renders a toned Badge with a dot.
 *
 * Props:
 * - status {string}: status text (any case; "in_progress" -> "In Progress")
 * - tone {string}: override the tone (ok, warn, bad, info, neutral, highlight, purple, pink)
 * - label {string}: override the displayed text
 * - colorMap {Record<string,string>}: legacy per-status class map; when given, renders the
 *   outline Badge styled by that map instead of a tone
 * - className {string}: extra classes
 */
export const StatusBadge = ({ status, tone, label, colorMap, className, ...props }) => {
  if (colorMap) {
    const colorClasses = colorMap[(status || "").toLowerCase()] || FALLBACK_STYLE;
    return (
      <Badge
        variant="outline"
        className={cn("capitalize font-medium", colorClasses, className)}
        {...props}
      >
        {label ?? (status || "N/A")}
      </Badge>
    );
  }
  return (
    <Badge variant={tone || getStatusTone(status)} dot className={className} {...props}>
      {label ?? (formatStatusLabel(status) || "N/A")}
    </Badge>
  );
};

export default StatusBadge;
