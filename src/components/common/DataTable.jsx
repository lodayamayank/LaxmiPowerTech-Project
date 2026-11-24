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
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" };

/**
 * DataTable: table built from a column config, using only the ui/table primitives.
 *
 * Props:
 * - columns {Array<{ key:string, header:node, cell?:(row, index)=>node, align?:"left"|"center"|"right", className?:string, width?:string|number }>}
 * - rows {object[]}
 * - rowKey {string | (row, index)=>string}: default "id", falling back to "_id", then the index
 * - loading {boolean}: shows 5 skeleton rows
 * - emptyState {node}: shown when rows is empty (default: <EmptyState title="No records found" />)
 * - onRowClick {(row)=>void}: makes rows clickable (and keyboard-activatable)
 * - footer {node}: rendered under the table (usually <PaginationBar />)
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
  className,
}) => {
  const getKey = (row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return row?.[rowKey] ?? row?._id ?? index;
  };

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
                  className={cn(ALIGN[col.align], col.className)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(ALIGN[col.align], col.className)}>
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
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(ALIGN[col.align], col.className)}>
                      {col.cell ? col.cell(row, index) : row?.[col.key]}
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
