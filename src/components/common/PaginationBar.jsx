import React, { useMemo } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Generates an array of page numbers with ellipsis placeholders.
 * Matches the existing getPageNumbers() logic used across admin pages.
 *
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {number} [maxPagesToShow=5]
 * @returns {Array<number|string>}
 */
function generatePageNumbers(currentPage, totalPages, maxPagesToShow = 5) {
  const pages = [];

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("...");
      pages.push(totalPages);
    }
  }

  return pages;
}

/**
 * PaginationBar — Reusable pagination controls.
 *
 * Supports two variants:
 *   - "full": First / Prev / page numbers with ellipsis / Next / Last
 *   - "simple": Prev / Next text buttons
 *
 * Optionally includes:
 *   - Total records display
 *   - Rows-per-page selector
 *
 * @param {number} currentPage — Current active page (1-indexed)
 * @param {number} totalPages — Total number of pages
 * @param {(page: number) => void} onPageChange — Callback when page changes
 * @param {number} [totalRecords] — Optional total record count for display
 * @param {"full"|"simple"} [variant="full"] — Pagination style
 * @param {number} [rowsPerPage] — Current rows-per-page value
 * @param {number[]} [rowsPerPageOptions] — Rows-per-page dropdown options
 * @param {(n: number) => void} [onRowsPerPageChange] — Rows-per-page change handler
 */
const PaginationBar = ({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  variant = "full",
  rowsPerPage,
  rowsPerPageOptions,
  onRowsPerPageChange,
}) => {
  const pageNumbers = useMemo(
    () => (variant === "full" ? generatePageNumbers(currentPage, totalPages) : []),
    [currentPage, totalPages, variant]
  );

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  // Info text
  const infoText = (
    <div className="text-sm text-gray-600 dark:text-gray-300">
      Page{" "}
      <span className="font-semibold text-gray-900 dark:text-white">
        {currentPage}
      </span>{" "}
      of{" "}
      <span className="font-semibold text-gray-900 dark:text-white">
        {totalPages}
      </span>
      {totalRecords != null && (
        <>
          {" · "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {totalRecords}
          </span>{" "}
          records
        </>
      )}
    </div>
  );

  // Rows per page selector
  const rowsSelector =
    rowsPerPage != null && rowsPerPageOptions && onRowsPerPageChange ? (
      <select
        value={rowsPerPage}
        onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {rowsPerPageOptions.map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>
    ) : null;

  return (
    <Card>
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
        {infoText}

        <div className="flex items-center gap-2">
          {rowsSelector}

          {variant === "full" ? (
            <>
              {/* First Page */}
              <Button
                onClick={() => onPageChange(1)}
                disabled={isFirst}
                variant="outline"
                size="icon"
                title="First Page"
              >
                <FaAngleDoubleLeft size={14} />
              </Button>

              {/* Previous Page */}
              <Button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={isFirst}
                variant="outline"
                size="icon"
                title="Previous Page"
              >
                <FaChevronLeft size={14} />
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, index) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-3 py-1 text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      onClick={() => onPageChange(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={
                        currentPage === page
                          ? "bg-orange-500 hover:bg-orange-600"
                          : ""
                      }
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              {/* Next Page */}
              <Button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={isLast}
                variant="outline"
                size="icon"
                title="Next Page"
              >
                <FaChevronRight size={14} />
              </Button>

              {/* Last Page */}
              <Button
                onClick={() => onPageChange(totalPages)}
                disabled={isLast}
                variant="outline"
                size="icon"
                title="Last Page"
              >
                <FaAngleDoubleRight size={14} />
              </Button>
            </>
          ) : (
            <>
              {/* Simple Prev */}
              <Button
                variant="outline"
                size="sm"
                disabled={isFirst}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                Prev
              </Button>

              {/* Simple Next */}
              <Button
                variant="outline"
                size="sm"
                disabled={isLast}
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
              >
                Next
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaginationBar;
