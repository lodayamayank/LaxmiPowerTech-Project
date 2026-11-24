import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Generates an array of page numbers with ellipsis placeholders.
 *
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {number} [maxPagesToShow=5]
 * @returns {Array<number|string>}
 */
function generatePageNumbers(currentPage, totalPages, maxPagesToShow = 5) {
  const pages = [];

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push("...", totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, "...");
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
  }

  return pages;
}

const DEFAULT_PAGE_SIZES = [10, 20, 25, 50];

/** Per-page dropdown shared by every variant. */
const PageSizeSelect = ({ value, options, onChange }) => (
  <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
    <SelectTrigger className="h-control-sm w-auto gap-2 px-2.5 text-small" aria-label="Rows per page">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((n) => (
        <SelectItem key={n} value={String(n)}>
          {n} / page
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/**
 * PaginationBar: pagination controls driven only by numbers, so it works for both
 * client-side and server-side pagination. `currentPage` is 1-based.
 *
 * Variants:
 * - "footer" (default): table-footer bar. "Showing a-b of N", per-page select, Prev/Next, numbered pages
 * - "compact": table footer "Showing a–b of N {itemNoun}", rows-per-page select and icon-only previous / next buttons
 * - "full": Card with first / prev / numbered pages / next / last (legacy)
 * - "simple": Card with Prev / Next (legacy)
 *
 * Props:
 * - currentPage {number}: active page, 1-based
 * - totalPages {number}
 * - onPageChange {(page:number)=>void}
 * - totalItems {number}: total rows (legacy alias: totalRecords); "Showing" text hidden when undefined
 * - pageSize {number}: rows per page (legacy alias: rowsPerPage)
 * - onPageSizeChange {(n:number)=>void}: shows the per-page select when given (legacy alias: onRowsPerPageChange)
 * - pageSizeOptions {number[]} default [10, 20, 25, 50] (legacy alias: rowsPerPageOptions)
 * - itemNoun {string} default "records": noun in the compact variant ("members")
 * - variant {"footer"|"compact"|"full"|"simple"}
 * - className {string}
 */
export const PaginationBar = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  totalRecords,
  pageSize,
  rowsPerPage,
  onPageSizeChange,
  onRowsPerPageChange,
  pageSizeOptions,
  rowsPerPageOptions,
  variant = "footer",
  itemNoun = "records",
  className,
}) => {
  const total = totalItems ?? totalRecords;
  const size = pageSize ?? rowsPerPage;
  const changeSize = onPageSizeChange ?? onRowsPerPageChange;
  const sizeOptions = pageSizeOptions ?? rowsPerPageOptions ?? DEFAULT_PAGE_SIZES;
  const safeTotalPages = Math.max(1, totalPages || 1);

  const pageNumbers = useMemo(
    () => (variant === "simple" ? [] : generatePageNumbers(currentPage, safeTotalPages)),
    [currentPage, safeTotalPages, variant]
  );

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= safeTotalPages;

  const sizeSelect =
    size != null && changeSize ? (
      <PageSizeSelect
        value={size}
        options={sizeOptions.includes(size) ? sizeOptions : [...sizeOptions, size].sort((a, b) => a - b)}
        onChange={changeSize}
      />
    ) : null;

  // Footer variant: the design's table footer.
  if (variant === "footer") {
    const hasRange = total != null && size != null;
    const from = total === 0 ? 0 : (currentPage - 1) * (size || 0) + 1;
    const to = hasRange ? Math.min(currentPage * size, total) : 0;
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line px-4 py-2.5 text-small text-ink-3",
          className
        )}
      >
        <div>
          {total != null ? (
            hasRange ? (
              <>
                Showing <span className="font-medium text-ink-2">{from}-{to}</span> of{" "}
                <span className="font-medium text-ink-2">{total}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-ink-2">{total}</span> records
              </>
            )
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sizeSelect}
          <Button
            variant="outline"
            size="sm"
            disabled={isFirst}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft /> Prev
          </Button>
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} className="px-1.5 text-ink-4">
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant="ghost"
                  size="sm"
                  aria-current={currentPage === page ? "page" : undefined}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    "min-w-8 px-2",
                    currentPage === page && "bg-primary-soft font-semibold text-primary-soft-foreground hover:bg-primary-soft"
                  )}
                >
                  {page}
                </Button>
              )
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isLast}
            onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </div>
    );
  }

  // Compact variant: "Showing 1–14 of 61 members", rows per page, previous / next icons.
  if (variant === "compact") {
    const range = total != null && size != null;
    const from = total === 0 ? 0 : (currentPage - 1) * (size || 0) + 1;
    const to = range ? Math.min(currentPage * size, total) : 0;
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-small text-ink-3", className)}>
        <span>{range ? `Showing ${from}–${to} of ${total} ${itemNoun}` : total != null ? `${total} ${itemNoun}` : null}</span>
        <div className="flex items-center gap-2">
          {sizeSelect ? (
            <>
              <span>Rows per page</span>
              {sizeSelect}
            </>
          ) : null}
          <Button variant="outline" size="icon" aria-label="Previous page" disabled={isFirst} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next page" disabled={isLast} onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
    );
  }

  // Legacy variants ("full" and "simple"): Card wrapper.
  const infoText = (
    <div className="text-small text-ink-3">
      Page <span className="font-semibold text-ink-1">{currentPage}</span> of{" "}
      <span className="font-semibold text-ink-1">{safeTotalPages}</span>
      {total != null && (
        <>
          {" · "}
          <span className="font-semibold text-ink-1">{total}</span> records
        </>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-between gap-4 py-3 sm:flex-row">
        {infoText}

        <div className="flex items-center gap-2">
          {sizeSelect}

          {variant === "full" ? (
            <>
              <Button onClick={() => onPageChange(1)} disabled={isFirst} variant="outline" size="icon" title="First Page">
                <ChevronsLeft />
              </Button>
              <Button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={isFirst}
                variant="outline"
                size="icon"
                title="Previous Page"
              >
                <ChevronLeft />
              </Button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((page, index) =>
                  page === "..." ? (
                    <span key={`ellipsis-${index}`} className="px-3 py-1 text-ink-4">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      onClick={() => onPageChange(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              <Button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={isLast}
                variant="outline"
                size="icon"
                title="Next Page"
              >
                <ChevronRight />
              </Button>
              <Button
                onClick={() => onPageChange(safeTotalPages)}
                disabled={isLast}
                variant="outline"
                size="icon"
                title="Last Page"
              >
                <ChevronsRight />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isFirst}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isLast}
                onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
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
