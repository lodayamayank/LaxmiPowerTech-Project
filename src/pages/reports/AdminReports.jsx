// src/pages/reports/AdminReports.jsx
// Data, requests and the Excel / PDF exports live in components/useAdminReports.js (moved unchanged).
import { Check, ChevronDown, Download, FileSpreadsheet, FileText, HardHat, Loader2, Warehouse } from "lucide-react";
import { Briefcase } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";
import { IconTile } from "@/components/common/IconTile";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import ReportSections from "./components/ReportSections";
import useAdminReports from "./components/useAdminReports";
import { formatCurrency } from "./reportFormat";
import { cn } from "@/lib/utils";

const NO_PROJECT = "__none__"; // Radix SelectItem cannot use ""; mapped back to "" below

const REPORT_TYPES = [
  {
    key: "workOrder",
    label: "Work Order Report",
    description: "View work order value, billing and retention summary.",
    icon: Briefcase,
    bullets: ["Value vs billed", "Retention due dates", "Bill-wise breakdown"],
  },
  {
    key: "material",
    label: "Material Inventory Report",
    description: "Track GRN invoices, material costs and supplier details.",
    icon: Warehouse,
    bullets: ["Spend by category", "Invoices and payments", "Supplier summary"],
  },
  {
    key: "labour",
    label: "Labour Inventory Report",
    description: "Analyse labour cost, payouts and attendance insights.",
    icon: HardHat,
    bullets: ["Days worked by person", "Payouts by branch", "Overtime summary"],
  },
];

const AdminReports = () => {
  const {
    projects, selectedProject, setSelectedProject, selectedMonth, setSelectedMonth, activeReportType, setActiveReportType,
    reportData, loading, error, summaryCard, exportToExcel, exportToPDF,
  } = useAdminReports();

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Projects / Reports"
        title="Reports"
        description="Project-wise financial and operational reports."
      />

      <SectionCard>
        <div className="flex flex-wrap items-end gap-4">
          <FormField label="Project" htmlFor="report-project" className="min-w-[220px] flex-1 sm:max-w-xs">
            <Select value={selectedProject || NO_PROJECT} onValueChange={(v) => setSelectedProject(v === NO_PROJECT ? "" : v)}>
              <SelectTrigger id="report-project">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>Select Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Month" htmlFor="report-month" className="w-full sm:w-44">
            <Input id="report-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </FormField>
        </div>
      </SectionCard>

      {reportData?.projectName && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <StatCard label="Project" value={<span className="text-card-title">{reportData.projectName}</span>} />
          <StatCard label="Billing (Period)" value={formatCurrency(summaryCard?.billing)} />
          <StatCard label="Expenses (Material + Labour)" value={formatCurrency(summaryCard?.expenses)} />
          <StatCard label="Outstanding" value={formatCurrency(summaryCard?.outstanding)} />
          <StatCard
            label="Profit / Loss"
            value={<span className={summaryCard?.profitOrLoss >= 0 ? "text-tone-ok-fg" : "text-tone-bad-fg"}>{formatCurrency(summaryCard?.profitOrLoss)}</span>}
          />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {REPORT_TYPES.map((type) => {
          const isActive = activeReportType === type.key;
          return (
            <div
              key={type.key}
              className={cn(
                "flex flex-col gap-3 rounded-card border bg-surface p-5",
                isActive ? "border-primary ring-1 ring-primary" : "border-line-card"
              )}
            >
              <IconTile icon={type.icon} tone={isActive ? "brand" : "highlight"} />
              <div>
                <h2 className="text-card-title text-ink-1">{type.label}</h2>
                <p className="mt-1 text-small text-ink-3">{type.description}</p>
              </div>
              <ul className="space-y-1.5">
                {type.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-small text-ink-2">
                    <Check className="size-4 shrink-0 text-tone-ok-fg" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Button type="button" variant="outline" aria-pressed={isActive} onClick={() => setActiveReportType(type.key)}>
                  Preview
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" disabled={!reportData}>
                      <Download /> Download <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={exportToExcel}>
                      <FileSpreadsheet /> Excel (full project report)
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={exportToPDF}>
                      <FileText /> PDF (full project report)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <SectionCard>
          <div className="flex items-center justify-center gap-3 p-6 text-ink-3">
            <Loader2 className="animate-spin text-primary" /> Generating report...
          </div>
        </SectionCard>
      )}

      {error && !loading && <Notice tone="bad">{error}</Notice>}

      {!loading && !error && (
        <ReportSections reportData={reportData} activeReportType={activeReportType} selectedProject={selectedProject} />
      )}

      {reportData && (
        <SectionCard title="Final Summary">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <StatCard label="Total Billing" value={formatCurrency(summaryCard?.billing)} />
            <StatCard label="Material Cost" value={formatCurrency(summaryCard?.materialCost)} />
            <StatCard label="Labour Cost" value={formatCurrency(summaryCard?.labourCost)} />
            <StatCard label="Outstanding" value={formatCurrency(summaryCard?.outstanding)} />
            <StatCard
              label="Profit / Loss"
              value={<span className={summaryCard?.profitOrLoss >= 0 ? "text-tone-ok-fg" : "text-tone-bad-fg"}>{formatCurrency(summaryCard?.profitOrLoss)}</span>}
            />
          </div>
        </SectionCard>
      )}
    </DashboardLayout>
  );
};

export default AdminReports;
