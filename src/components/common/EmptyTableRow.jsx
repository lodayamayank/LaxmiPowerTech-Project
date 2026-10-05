import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";

/**
 * EmptyTableRow — Renders a centered "no data" message spanning all columns.
 *
 * @param {number} colSpan — Number of columns to span
 * @param {string} [message="No records found"] — Display message
 */
const EmptyTableRow = ({ colSpan, message = "No records found" }) => {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="text-center text-muted-foreground py-6"
      >
        {message}
      </TableCell>
    </TableRow>
  );
};

export default EmptyTableRow;
