// src/pages/material/indent/components/IndentTable.jsx
// Rows of the uploaded indent sheet (the columns come from the Excel header), with search, the same alphabetical sort
// by the first column as before, and client-side paging.
import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";

export default function IndentTable({ data }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstKey = Object.keys(data[0])[0];
    return data
      .filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => String(a[firstKey] || "").toLowerCase().localeCompare(String(b[firstKey] || "").toLowerCase()));
  }, [data, search]);

  useEffect(() => {
    setPage(1);
  }, [data, search, pageSize]);

  const columns = useMemo(
    () => (data && data.length ? Object.keys(data[0]).map((col) => ({ key: col, header: col, cell: (row) => String(row[col] || "-") })) : []),
    [data],
  );

  if (!data || data.length === 0) {
    return <EmptyState icon={FileSpreadsheet} title="No data found" description="This sheet has no rows." />;
  }

  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <FilterBar onClear={() => setSearch("")} showClear={Boolean(search)}>
        <FilterField label="Search rows" htmlFor="indent-search" grow={22} minWidth={220}>
          <SearchInput id="indent-search" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search..." />
        </FilterField>
      </FilterBar>
      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(_, i) => String((currentPage - 1) * pageSize + i)}
        emptyState={<EmptyState icon={FileSpreadsheet} title="No matching rows" description="Try a different search." />}
        footer={
          <PaginationBar
            variant="compact"
            itemNoun="rows"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={rows.length}
            pageSize={pageSize}
            pageSizeOptions={[25, 50, 100, 200]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        }
      />
    </>
  );
}
