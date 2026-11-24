// src/pages/payroll/components/SlipDetailsDialog.jsx
// One salary slip. Same fields and expressions as the old modal; only markup and colors changed.
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatRupees, MONTH_NAMES } from "../payrollFormat";

const Row = ({ label, children, total }) => (
  <div className={total ? "flex justify-between border-t border-line pt-2" : "flex justify-between"}>
    <span className={total ? "font-semibold text-ink-2" : "text-ink-3"}>{label}</span>
    <span className={total ? "font-semibold tabular-nums text-tone-bad-fg" : "font-medium tabular-nums text-ink-1"}>{children}</span>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <span className="text-ink-3">{label}</span>
    <p className="font-medium text-ink-1">{children}</p>
  </div>
);

export default function SlipDetailsDialog({ slip, onClose }) {
  return (
    <Dialog open={Boolean(slip)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {slip ? (
          <>
            <DialogHeader>
              <DialogTitle>Salary Slip</DialogTitle>
              <DialogDescription>
                {MONTH_NAMES[slip.month - 1]} {slip.year} • {slip.employeeDetails.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="rounded-card bg-surface-subtle p-4">
                <h3 className="mb-3 text-small font-semibold text-ink-1">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4 text-small md:grid-cols-4">
                  <Field label="Name:">{slip.employeeDetails.name}</Field>
                  <Field label="Employee ID:">{slip.employeeDetails.employeeId}</Field>
                  <Field label="Role:">{slip.employeeDetails.role}</Field>
                  <Field label="Department:">{slip.employeeDetails.department || "N/A"}</Field>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-card border border-line-card p-4">
                  <h4 className="mb-3 text-small font-semibold text-ink-1">Attendance</h4>
                  <div className="space-y-2 text-small">
                    <Row label="Present:">{slip.attendance.presentDays}</Row>
                    <Row label="Absent:">{slip.attendance.absentDays}</Row>
                    <Row label="Half Days:">{slip.attendance.halfDays}</Row>
                    <Row label="Paid Leave:">{slip.attendance.effectivePaidLeaveDays || 0}</Row>
                  </div>
                </div>

                <div className="rounded-card border border-line-card p-4">
                  <h4 className="mb-3 text-small font-semibold text-ink-1">Earnings</h4>
                  <div className="space-y-2 text-small">
                    <Row label="Gross Salary:">{formatRupees(slip.grossSalary)}</Row>
                    {slip.travel && slip.travel.total > 0 && <Row label="Travel:">{formatRupees(slip.travel.total)}</Row>}
                    {slip.overtime && slip.overtime.total > 0 && <Row label="Overtime:">{formatRupees(slip.overtime.total)}</Row>}
                    {slip.reimbursements && slip.reimbursements.total > 0 && (
                      <Row label="Reimbursements:">{formatRupees(slip.reimbursements.total)}</Row>
                    )}
                  </div>
                </div>

                <div className="rounded-card border border-line-card p-4">
                  <h4 className="mb-3 text-small font-semibold text-ink-1">Deductions</h4>
                  <div className="space-y-2 text-small">
                    <Row label="Absent:">{formatRupees(slip.deductions.absent)}</Row>
                    <Row label="Half Day:">{formatRupees(slip.deductions.halfDay)}</Row>
                    <Row label="Unpaid Leave:">{formatRupees(slip.deductions.unpaidLeave)}</Row>
                    <Row label="Total:" total>
                      {formatRupees(slip.deductions.total)}
                    </Row>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-card bg-primary-soft p-5">
                <div>
                  <p className="text-small text-ink-3">Net Salary</p>
                  <p className="mt-1 text-kpi tabular-nums text-ink-1">{formatRupees(slip.netSalary)}</p>
                </div>
                <div className="text-right">
                  <p className="text-small text-ink-3">Payment Status</p>
                  <p className="mt-1 text-card-title text-ink-1">
                    {slip.paymentStatus.charAt(0).toUpperCase() + slip.paymentStatus.slice(1)}
                  </p>
                  {slip.paymentDate && (
                    <p className="mt-1 text-caption text-ink-3">Paid on {new Date(slip.paymentDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
