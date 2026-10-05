import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Default color map covering the most common statuses across the application.
 * Each key maps to a Tailwind class string for light + dark mode.
 */
const DEFAULT_COLOR_MAP = {
  approved:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  rejected:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
  paid:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  completed:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
};

/** Fallback style when a status has no matching color entry. */
const FALLBACK_STYLE =
  "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600";

/**
 * Pre-defined domain-specific color maps that pages can import and pass
 * as the `colorMap` prop.
 */
export const LEAVE_STATUS_COLORS = {
  approved:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  rejected:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
};

export const REIMBURSEMENT_STATUS_COLORS = {
  approved:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  rejected:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
  paid:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
};

export const TRANSFER_STATUS_COLORS = {
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
  approved:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  rejected:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  completed:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
};

/**
 * StatusBadge — Generic status badge with configurable color mapping.
 *
 * @param {string} status — The status string to display
 * @param {Record<string, string>} [colorMap] — Optional domain-specific color map
 *   (overrides the default map entirely when provided)
 * @param {string} [className] — Additional classes to merge
 */
const StatusBadge = ({ status, colorMap, className }) => {
  const map = colorMap || DEFAULT_COLOR_MAP;
  const statusKey = (status || "").toLowerCase();
  const colorClasses = map[statusKey] || FALLBACK_STYLE;

  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium", colorClasses, className)}
    >
      {status || "N/A"}
    </Badge>
  );
};

export default StatusBadge;
