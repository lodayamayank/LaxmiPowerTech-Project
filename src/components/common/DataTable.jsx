import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" };

// Sticky-right column: pinned while the table wrapper scrolls. The inset shadow draws the left edge
// (borders are lost on sticky cells under border-collapse); hover bg follows the row's hover.
const STICKY_CELL =
  "sticky right-0 z-[1] bg-surface shadow-[inset_1px_0_0_hsl(var(--line))] group-hover/row:bg-surface-subtle";
const STICKY_HEAD = "sticky right-0 z-[2] bg-surface-subtle shadow-[inset_1px_0_0_hsl(var(--line))]";

const DENSITY = { compact: "px-3 py-2.5", comfortable: "px-4 py-3.5" };

const textOf = (node) => (typeof node === "string" || typeof node === "number" ? String(node) : undefined);

const colClass = (col, isHead) =>
  cn(
    ALIGN[col.align],
    col.nowrap !== false && "whitespace-nowrap",
    col.sticky === "right" && (isHead ? STICKY_HEAD : STICKY_CELL),
    col.className
  );

/**
 * DataTable: table built from a column config, using only the ui/table primitives.
 *
 * Props:
 * - columns {Array<{ key:string, header:node, cell?:(row, index)=>node, align?:"left"|"center"|"right", className?:string, width?:string|number,
 *     sticky?:"right" (pinned while the wrapper scrolls), nowrap?:boolean (default true; false lets the cell wrap),
 *     truncate?:boolean + maxWidth?:string|number (ellipsis; the full text goes in a title attribute), title?:(row)=>string }>}
 * - rows {object[]}
 * - rowKey {string | (row, index)=>string}: default "id", falling back to "_id", then the index
 * - loading {boolean}: shows 5 skeleton rows
 * - emptyState {node}: shown when rows is empty (default: <EmptyState title="No records found" />)
 * - onRowClick {(row)=>void}: makes rows clickable (and keyboard-activatable)
 * - footer {node}: rendered under the table (usually <PaginationBar />)
 * - density {"compact"|"comfortable"}: cell padding, default "compact" (px-3 py-2.5)
 * - mobileCard {(row, index)=>node}: below md, rows render as a stacked card list (divide-y, p-4) instead of the table;
 *   loading and empty states work in both
 * - className {string}: merged onto the wrapper
 */
export const DataTable = ({
  columns,
  rows = [],
  rowKey = "id",
  loading = false,
  emptyState,
  onRowClick,
  footer,
  density = "compact",
  mobileCard,
  className,
}) => {
  const isNarrow = useIsMobile(768);
  const asCards = Boolean(mobileCard) && isNarrow;
  const cellPad = DENSITY[density] || DENSITY.compact;
  const renderCell = (col, row, index) => {
    const content = col.cell ? col.cell(row, index) : row?.[col.key];
    if (!col.truncate) return content;
    const title = col.title ? col.title(row) : textOf(content);
    return (
      <div className="truncate" style={col.maxWidth != null ? { maxWidth: col.maxWidth } : undefined} title={title}>
        {content}
      </div>
    );
  };

  const getKey = (row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return row?.[rowKey] ?? row?._id ?? index;
  };

  if (asCards) {
    return (
      <div className={cn("w-full", className)}>
        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={`skeleton-${i}`} className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          emptyState ?? <EmptyState title="No records found" />
        ) : (
          <div className="divide-y divide-line">
            {rows.map((row, index) => (
              <div
                key={getKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("flex flex-col gap-2 p-4", onRowClick && "cursor-pointer")}
              >
                {mobileCard(row, index)}
              </div>
            ))}
          </div>
        )}
        {footer}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  scope="col"
                  style={col.width != null ? { width: col.width } : undefined}
                  className={cn(colClass(col, true), cellPad)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={`skeleton-${i}`} className="group/row hover:bg-transparent">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(colClass(col), cellPad)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyState ?? <EmptyState title="No records found" />}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={getKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn("group/row", onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(colClass(col), cellPad)}>
                      {renderCell(col, row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {footer}
    </div>
  );
};

export default DataTable;
