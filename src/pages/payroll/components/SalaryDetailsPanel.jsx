// src/pages/payroll/components/SalaryDetailsPanel.jsx
// The five breakdown sections (attendance, salary, deductions, benefits, overtime) of one employee's run.
// Every expression below is the one the page used before; only the markup and colors changed.
import { memo } from "react";
import { formatRupees } from "../payrollFormat";

const Row = ({ label, children, strong, total }) => (
  <div className={total ? "flex justify-between border-t border-line pt-2" : "flex justify-between"}>
    <span className={strong || total ? "font-semibold text-ink-2" : "text-ink-3"}>{label}</span>
    <span className={total ? "font-semibold tabular-nums text-ink-1" : "font-medium tabular-nums text-ink-1"}>{children}</span>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <h4 className="mb-3 text-small font-semibold text-ink-2">{title}</h4>
    <div className="space-y-2 text-small">{children}</div>
  </div>
);

function SalaryDetailsPanel({ item }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Section title="Attendance">
        <Row label="Present:">{item.attendance.presentDays}</Row>
        <Row label="Absent:">{item.attendance.absentDays}</Row>
        <Row label="Half Days:">{item.attendance.halfDays}</Row>
        <Row label="Paid Leave:">
          {item.attendance.effectivePaidLeaveDays || item.attendance.paidLeaveDays || 0}
        </Row>
        <Row label="Unpaid:">
          {item.attendance.effectiveUnpaidLeaveDays || item.attendance.unpaidLeaveDays || 0}
        </Row>
        {item.attendance.totalHoursWorked && (
          <div className="flex justify-between border-t border-line pt-2">
            <span className="text-ink-3">Total Hours:</span>
            <span className="font-medium">{item.attendance.totalHoursWorked}h</span>
          </div>
        )}
      </Section>

      <Section title="Salary">
        <Row label="Gross:">{formatRupees(item.grossSalary)}</Row>
        <Row label="Per Day:">{formatRupees(item.perDaySalary)}</Row>
        {item.perHourRate && <Row label="Per Hour:">{formatRupees(item.perHourRate)}</Row>}
        <Row label="Payable Days:">{item.payableDays}</Row>
        {item.otherAmounts?.map((o, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-ink-3">{o.label}:</span>
            <span className={o.type === "deduction" ? "font-medium tabular-nums text-tone-bad-fg" : "font-medium tabular-nums text-tone-info-fg"}>
              {o.type === "deduction" ? "−" : "+"}
              {formatRupees(o.amount)}
            </span>
          </div>
        ))}
        <Row label="Net Salary:" total>
          {formatRupees(item.netSalary)}
        </Row>
      </Section>

      <Section title="Deductions">
        <Row label="Absent:">{formatRupees(item.deductions.absent)}</Row>
        <Row label="Half Day:">{formatRupees(item.deductions.halfDay)}</Row>
        <Row label="Unpaid Leave:">{formatRupees(item.deductions.unpaidLeave)}</Row>
        <Row label="Total:" total>
          {formatRupees(item.deductions.total)}
        </Row>
      </Section>

      <Section title="Benefits">
        {item.travel && (
          <>
            <Row label="Daily Travel:">{formatRupees(item.travel.perDayAllowance || 0)}</Row>
            <Row label="Railway Pass:">{formatRupees(item.travel.railwayPass || 0)}</Row>
          </>
        )}
        {item.reimbursements && (
          <div className="flex justify-between">
            <span className="text-ink-3">Reimbursements:</span>
            <span className="font-medium tabular-nums text-ink-1">
              {formatRupees(item.reimbursements.total || 0)}
              {item.reimbursements.count > 0 && <span className="ml-1 text-caption">({item.reimbursements.count})</span>}
            </span>
          </div>
        )}
        <Row label="Total Benefits:" total>
          {formatRupees((item.travel?.total || 0) + (item.reimbursements?.total || 0))}
        </Row>
      </Section>

      <Section title="Overtime">
        {item.overtime ? (
          <>
            <Row label="OT Hours:">{item.overtime.hours || 0}h</Row>
            <Row label="Hourly Rate:">{formatRupees(item.overtime.rate || 0)}</Row>
            <Row label="Multiplier:">{item.overtime.multiplier || 1.0}x</Row>
            <Row label="OT Pay:" total>
              {formatRupees(item.overtime?.total ?? item.overtime?.pay ?? 0)}
            </Row>
          </>
        ) : (
          <p className="text-caption text-ink-4">No overtime</p>
        )}
      </Section>
    </div>
  );
}

export default memo(SalaryDetailsPanel);
