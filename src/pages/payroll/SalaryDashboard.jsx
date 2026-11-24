// src/pages/payroll/SalaryDashboard.jsx  (route: Salary run)
// Data and handlers live in components/useSalaryRun.js (moved unchanged); this file lays out the page.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Banknote, Download, History, Info, MinusCircle, RefreshCw, Users, Wallet } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import GenerateSlipsDialog from "./components/GenerateSlipsDialog";
import SalaryDetailsDialog from "./components/SalaryDetailsDialog";
import useSalaryRun from "./components/useSalaryRun";
import { getSalaryColumns, getSalaryMobileCard } from "./components/salaryRunColumns";
import { formatRupees } from "./payrollFormat";

const ALL = "__all__"; // Radix SelectItem cannot use ""; mapped back to "" before touching the filter
const YEARS = [2024, 2025, 2026, 2027];
const ROLE_OPTIONS = [
  ["staff", "Staff"],
  ["supervisor", "Supervisor"],
  ["labour", "Labour"],
  ["subcontractor", "Subcontractor"],
];
const PERIOD_TRIGGER = "h-control-sm w-auto gap-2 px-2.5 text-small";

const SalaryDashboard = () => {
  const run = useSalaryRun();
  const {
    salaryData, pagination, PAGE_SIZE, loading, computedAt, recalculating, showGenerateModal, setShowGenerateModal,
    generating, month, setMonth, year, setYear, roleFilter, setRoleFilter, searchTerm, setSearchTerm, expandedRow,
    setExpandedRow, otherEdits, salaryDateInfo, filteredData, summary, handleRecalculate, toggleRow, addOtherItem,
    updateOtherItem, removeOtherItem, saveOtherAmounts, exportToCSV, handleGenerateSlips, monthNames, setPage,
  } = run;

  const columns = useMemo(() => getSalaryColumns({ onDetails: toggleRow }), [toggleRow]);
  const mobileCard = useMemo(() => getSalaryMobileCard({ onDetails: toggleRow }), [toggleRow]);
  const detailsItem = expandedRow ? filteredData.find((entry) => entry.userId === expandedRow) : null;

  const periodLabel = `${monthNames[month - 1]} ${year}`;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Payroll / Salary run"
        title="Salary run"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Period
            <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
              <SelectTrigger className={PERIOD_TRIGGER} aria-label="Month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, index) => (
                  <SelectItem key={name} value={String(index + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
              <SelectTrigger className={PERIOD_TRIGGER} aria-label="Year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={ROUTES.salary.history}>
                <History /> History
              </Link>
            </Button>
            {!loading && salaryData.length > 0 ? (
              <Button variant="outline" onClick={exportToCSV}>
                <Download /> Export CSV
              </Button>
            ) : null}
            <Button onClick={() => setShowGenerateModal(true)}>
              <Banknote /> Generate slips
            </Button>
          </>
        }
      />

      <Notice
        tone="info"
        icon={Info}
        title={`${periodLabel} · ${salaryDateInfo.isPaymentPending ? "finalized" : "in progress"}`}
        action={
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating || loading}>
            <RefreshCw className={recalculating ? "animate-spin" : undefined} />
            {recalculating ? "Recalculating..." : "Recalculate"}
          </Button>
        }
      >
        {salaryDateInfo.autoMessage}.{" "}
        {salaryDateInfo.isPaymentPending
          ? "This salary is finalized and ready for payment."
          : "Calculated from attendance so far."}
        {computedAt
          ? ` Last computed ${computedAt.toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}.`
          : ""}{" "}
        Salary date {salaryDateInfo.formattedDate}.
      </Notice>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Employees" value={summary.employeeCount} icon={Users} tone="info" />
        <StatCard label="Gross salary" value={formatRupees(summary.totalGross)} icon={Wallet} tone="ok" />
        <StatCard label="Deductions" value={formatRupees(summary.totalDeductions)} icon={MinusCircle} tone="bad" />
        <StatCard
          label="Net payable"
          value={formatRupees(summary.totalNet)}
          sub={salaryDateInfo.isPaymentPending ? "Ready for payment" : "In progress"}
          icon={Banknote}
          tone="highlight"
        />
      </div>

      <SectionCard flush>
        <FilterBar>
          <FilterField label="Search employee" htmlFor="salary-search" grow={22} minWidth={220}>
            <SearchInput
              id="salary-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
              placeholder="Search by name, username, or employee ID..."
            />
          </FilterField>
          <FilterField label="Role" htmlFor="salary-role" grow={14} minWidth={140} maxWidth={240}>
            <Select value={roleFilter || ALL} onValueChange={(value) => setRoleFilter(value === ALL ? "" : value)}>
              <SelectTrigger id="salary-role">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Roles</SelectItem>
                {ROLE_OPTIONS.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={filteredData}
          rowKey="userId"
          loading={loading}
          mobileCard={mobileCard}
          emptyState={
            <EmptyState
              icon={Info}
              title="No Salary Data"
              description="No employees found with salary information for the selected period."
            />
          }
          footer={
            <PaginationBar
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          }
        />
      </SectionCard>

      <SalaryDetailsDialog
        item={detailsItem}
        edit={detailsItem ? otherEdits[detailsItem.userId] : null}
        onClose={() => setExpandedRow(null)}
        onAdd={addOtherItem}
        onUpdate={updateOtherItem}
        onRemove={removeOtherItem}
        onSave={saveOtherAmounts}
      />

      <GenerateSlipsDialog
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        generating={generating}
        periodLabel={periodLabel}
        count={filteredData.length}
        totalNet={summary.totalNet}
        onGenerate={handleGenerateSlips}
      />
    </DashboardLayout>
  );
};

export default SalaryDashboard;
