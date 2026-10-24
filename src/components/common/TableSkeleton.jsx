import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * TableSkeleton — Renders placeholder skeleton rows for table loading states.
 *
 * @param {number} [rows=5] — Number of skeleton rows to render
 * @param {Array<string|{width: string, height?: string, rounded?: boolean}>} columns
 *   — Column specifications. Each entry is either:
 *     - A width string (e.g. "w-28") → renders <Skeleton className="h-4 {width}" />
 *     - An object { width, height?, rounded? } for full control
 *       e.g. { width: "w-16", height: "h-5", rounded: true }
 */
const TableSkeleton = ({ rows = 5, columns = [] }) => {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <TableRow key={`skeleton-${rowIndex}`}>
      {columns.map((col, colIndex) => {
        const isString = typeof col === "string";
        const width = isString ? col : col.width;
        const height = isString ? "h-4" : (col.height || "h-4");
        const rounded = isString ? false : !!col.rounded;

        return (
          <TableCell key={colIndex}>
            <Skeleton
              className={`${height} ${width}${rounded ? " rounded-full" : ""}`}
            />
          </TableCell>
        );
      })}
    </TableRow>
  ));
};

export default TableSkeleton;
