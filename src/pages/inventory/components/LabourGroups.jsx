// src/pages/inventory/components/LabourGroups.jsx
// Labour grouped by branch: one expandable row per branch, with that branch's labour table inside.
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DataTable } from "@/components/common/DataTable";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatMonthYear } from "./useLabourOverview";

const GRID = "grid-cols-[minmax(180px,2fr)_repeat(4,minmax(0,1fr))_24px]";

const money = (v) => <span className="tabular-nums">{formatCurrency(v)}</span>;

function labourColumns() {
  return [
    {
      key: "name",
      header: "Name",
      cell: (l) => (
        <div>
          <div className="font-medium text-ink-1">{l.name || "-"}</div>
          <div className="text-caption-lg text-ink-3">{l.username || "—"}</div>
        </div>
      ),
    },
    { key: "branch", header: "Branch", cell: (l) => l.branchName },
    { key: "project", header: "Project", cell: (l) => l.projectName || "Unassigned" },
    { key: "hours", header: "Work Time", cell: (l) => (l.workingHours ? `${l.workingHours} hrs` : "—") },
    { key: "salary", header: "Salary", cell: (l) => <span className="font-medium text-ink-1">{money(l.monthlySalary)}</span> },
    { key: "paid", header: "Paid", cell: (l) => <span className="text-tone-ok-fg">{money(l.paidAmount)}</span> },
    { key: "pending", header: "Pending", cell: (l) => <span className={cn("font-medium", l.pendingAmount > 0 ? "text-tone-bad-fg" : "text-tone-ok-fg")}>{money(l.pendingAmount)}</span> },
    { key: "joined", header: "Joined", cell: (l) => <span className="tabular-nums text-ink-3">{formatDate(l.dateOfJoining)}</span> },
  ];
}

export default function LabourGroups({ groups, month, year, expandedRow, setExpandedRow }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className={cn("grid items-center gap-2 bg-surface-subtle px-5 py-3 text-caption-lg font-semibold uppercase tracking-wide text-ink-3", GRID)}>
          <div>Branch</div>
          <div>Labours</div>
          <div>Monthly Salary</div>
          <div>Paid ({formatMonthYear(month, year)})</div>
          <div>Pending</div>
          <div />
        </div>

        <Accordion type="single" collapsible value={expandedRow ? String(expandedRow) : ""} onValueChange={(value) => setExpandedRow(value || null)}>
          {groups.map((group) => {
            const groupKey = group.branchId || group.branchName;
            return (
              <AccordionItem key={groupKey} value={String(groupKey)} className="border-b border-line last:border-b-0">
                <AccordionTrigger className={cn("grid w-full items-center gap-2 px-5 py-3 text-left hover:bg-surface-subtle hover:no-underline", GRID)}>
                  <div className="font-semibold text-ink-1">{group.branchName}</div>
                  <div className="tabular-nums text-ink-2">{group.totalLabours}</div>
                  <div className="text-ink-1">{money(group.totalSalary)}</div>
                  <div className="text-ink-2">{money(group.totalPaid)}</div>
                  <div className={cn("font-medium", group.totalPending > 0 ? "text-tone-bad-fg" : "text-tone-ok-fg")}>{money(group.totalPending)}</div>
                </AccordionTrigger>

                <AccordionContent className="bg-surface-subtle px-5 pb-5 pt-2">
                  <div className="overflow-hidden rounded-card border border-line-card bg-surface">
                    <h4 className="border-b border-line px-4 py-3 text-small font-semibold text-ink-1">{group.branchName}</h4>
                    {group.labours?.length ? (
                      <DataTable columns={labourColumns()} rows={group.labours} rowKey={(l) => l.id || `${l.name}-${l.username}`} />
                    ) : (
                      <p className="p-4 text-small text-ink-3">No labours in this branch.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
