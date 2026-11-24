// src/pages/reports/components/ReportSections.jsx
// The inline report content (work orders, material, labour) for the selected report type.
// Same fields, values and empty messages as before; only the markup and colors changed.
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDate } from "../reportFormat";

const STATS_GRID = "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4";
const num = "tabular-nums";

/** DataTable columns with the old `render(value, row)` contract kept as it was. */
const toColumns = (cols) =>
  cols.map((c) => ({
    key: c.key,
    header: c.label,
    align: c.align,
    cell: (row) => {
      const rawValue = row[c.key];
      const content = c.render ? c.render(rawValue, row) : rawValue ?? "-";
      return content === "" ? "-" : content;
    },
  }));

const MATERIAL_COLUMNS = toColumns([
  { key: "transferNumber", label: "Reference" },
  { key: "invoiceNumber", label: "Invoice No." },
  { key: "materialName", label: "Material" },
  { key: "quantity", label: "Qty", align: "right", render: (v) => (v != null ? v : "-") },
  { key: "rate", label: "Rate", align: "right", render: (v) => (v != null ? formatCurrency(v) : "-") },
  { key: "billDate", label: "Invoice Date", render: (value) => formatDate(value) },
  { key: "totalAmount", label: "Amount", align: "right", render: (value) => formatCurrency(value) },
  { key: "companyName", label: "Company" },
  { key: "status", label: "Status" },
]);

const LABOUR_COLUMNS = toColumns([
  { key: "name", label: "Name" },
  { key: "employeeId", label: "Employee ID" },
  { key: "role", label: "Role" },
  { key: "salaryType", label: "Salary Type", render: (value) => value?.toUpperCase?.() || value },
  { key: "grossSalary", label: "Gross Salary", align: "right", render: (value) => formatCurrency(value) },
  { key: "netSalary", label: "Net Payout", align: "right", render: (value) => formatCurrency(value) },
  { key: "deductions", label: "Deductions", align: "right", render: (value) => formatCurrency(value) },
  { key: "travelAllowance", label: "Travel Allow.", align: "right", render: (value) => formatCurrency(value) },
  { key: "overtimePay", label: "Overtime", align: "right", render: (value) => formatCurrency(value) },
  { key: "dataSource", label: "Source", render: (value) => (value === "salarySlip" ? "Salary Slip" : "Estimated") },
]);

const BILL_COLUMNS = [
  { key: "billNo", header: "Invoice No.", cell: (bill) => bill.billNo || "-" },
  { key: "billDate", header: "Date", cell: (bill) => formatDate(bill.billDate) },
  { key: "total", header: "Total", align: "right", cell: (bill) => <span className={num}>{formatCurrency(bill.totalBillValue)}</span> },
  { key: "retention", header: "Retention", align: "right", cell: (bill) => <span className={num}>{formatCurrency(bill.retentionAmount)}</span> },
  { key: "holding", header: "Holding", align: "right", cell: (bill) => <span className={num}>{formatCurrency(bill.holdingAmount)}</span> },
];

const WO_STATUS_TONE = { active: "ok", completed: "info" };

function WorkOrderReport({ reportData }) {
  const rows = reportData.woData || [];
  const totals = reportData.woSummary || {};
  return (
    <section className="space-y-4">
      <div className={STATS_GRID}>
        <StatCard label="Total Work Orders" value={totals.totalWorkOrders || 0} />
        <StatCard label="Total WO Value" value={formatCurrency(totals.totalWorkOrderValue)} />
        <StatCard label="Billed (Selected Period)" value={formatCurrency(totals.totalBilledInPeriod)} />
        <StatCard label="Lifetime Outstanding" value={formatCurrency(totals.outstandingLifetime)} />
      </div>

      {rows.length === 0 ? (
        <SectionCard>
          <EmptyState title="No work orders found for this project." />
        </SectionCard>
      ) : (
        rows.map((wo, index) => (
          <SectionCard
            key={wo.id || index}
            flush
            title={
              <span>
                Work Order: {wo.workOrderNo || index + 1}
                <span className="mx-2 font-normal text-ink-4">|</span>
                <span className="text-primary">Total Value: {formatCurrency(wo.totalValue)}</span>
              </span>
            }
            description={wo.name || undefined}
          >
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Total Bill", wo.billedInPeriod],
                  ["Total Retention", wo.retentionInPeriod],
                  ["Total Holding", wo.holdingInPeriod],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-control border border-line p-3 text-center">
                    <p className="text-caption uppercase text-ink-4">{label}</p>
                    <p className={`text-card-title text-ink-1 ${num}`}>{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>

              {wo.bills && wo.bills.length > 0 && (
                <div>
                  <p className="mb-2 text-small font-semibold text-ink-3">Bill Details</p>
                  <div className="overflow-hidden rounded-control border border-line">
                    <DataTable columns={BILL_COLUMNS} rows={wo.bills} rowKey="id" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-small">
                <span className="text-ink-3">
                  Lifetime Billed: <strong className="text-ink-1">{formatCurrency(wo.lifetimeBilled)}</strong>
                </span>
                <span className="text-ink-3">
                  Outstanding: <strong className="text-primary">{formatCurrency(wo.outstandingLifetime)}</strong>
                </span>
                <StatusBadge status={wo.status || "N/A"} tone={WO_STATUS_TONE[wo.status] || "neutral"} />
              </div>
            </div>
          </SectionCard>
        ))
      )}
    </section>
  );
}

function MaterialReport({ reportData }) {
  const rows = reportData.materialData || [];
  const totals = reportData.materialSummary || {};
  return (
    <section className="space-y-4">
      <div className={STATS_GRID}>
        <StatCard label="Deliveries" value={totals.deliveriesCount || 0} />
        <StatCard label="Gross Material Value" value={formatCurrency(totals.totalMaterialPrice)} />
        <StatCard label="Material Discount" value={formatCurrency(totals.totalMaterialDiscount)} />
        <StatCard label="Total Material Cost" value={formatCurrency(totals.totalMaterialCost)} />
      </div>
      <SectionCard flush>
        <DataTable
          columns={MATERIAL_COLUMNS}
          rows={rows}
          rowKey={(row, i) => row.id || row._id || i}
          emptyState={<EmptyState title="No GRN invoices recorded for the selected period." />}
        />
      </SectionCard>
    </section>
  );
}

function LabourReport({ reportData }) {
  const rows = reportData.labourData || [];
  const totals = reportData.labourSummary || {};
  return (
    <section className="space-y-4">
      <div className={STATS_GRID}>
        <StatCard label="Team Members" value={totals.labourCount || 0} />
        <StatCard label="Total Labour Cost" value={formatCurrency(totals.totalLabourCost)} />
        <StatCard
          label="Data Source"
          value={
            totals.dataSource === "salarySlip" ? "Salary Slip" : totals.dataSource === "mixed" ? "Salary Slip + Estimates" : "Estimated"
          }
        />
      </div>
      <SectionCard flush>
        <DataTable
          columns={LABOUR_COLUMNS}
          rows={rows}
          rowKey={(row, i) => row.id || row._id || i}
          emptyState={<EmptyState title="No labour cost records available for the selected period." />}
        />
      </SectionCard>
    </section>
  );
}

export default function ReportSections({ reportData, activeReportType, selectedProject }) {
  if (!reportData) {
    return (
      <SectionCard>
        <EmptyState
          title={selectedProject ? "Select a report type to view detailed analytics." : "Choose a project and period to generate reports."}
        />
      </SectionCard>
    );
  }
  if (activeReportType === "workOrder") return <WorkOrderReport reportData={reportData} />;
  if (activeReportType === "material") return <MaterialReport reportData={reportData} />;
  if (activeReportType === "labour") return <LabourReport reportData={reportData} />;
  return null;
}
