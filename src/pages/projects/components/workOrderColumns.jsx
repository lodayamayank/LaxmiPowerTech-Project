// src/pages/projects/components/workOrderColumns.jsx
// DataTable columns and mobile card for the work order list. Values are the ones the page always derived.
import { memo } from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { rupeesOr0 } from "../workOrderFormat";

// Work order status -> badge tone (same meaning as the old colors).
const STATUS_TONE = { active: "ok", completed: "info", "on-hold": "warn", cancelled: "bad", triggered: "purple" };

const orderNo = (o) => o.workOrderNo || o.workOrderId || "N/A";
const orderName = (o) => o.workOrderName || o.name || o.title || "N/A";
const billedPct = (o) => {
  const value = Number(o.totalValue) || 0;
  return value > 0 ? Math.max(0, Math.min(100, ((Number(o.totalBillsAmount) || 0) / value) * 100)) : 0;
};

const OrderCell = memo(function OrderCell({ order }) {
  return (
    <div className="min-w-0">
      <div className="font-data font-medium text-ink-1">{orderNo(order)}</div>
      <div className="text-caption-lg text-ink-3">{orderName(order)}</div>
    </div>
  );
});

const BillingCell = memo(function BillingCell({ order }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={billedPct(order)} className="w-20" aria-label="Billing used" />
      <div className="text-caption-lg">
        <div className="tabular-nums text-ink-2">{rupeesOr0(order.totalBillsAmount)} billed</div>
        <div className="tabular-nums text-ink-3">{Math.round(billedPct(order))}%</div>
      </div>
    </div>
  );
});

const RetentionCell = memo(function RetentionCell({ order, state, formatCurrency, formatDate }) {
  if (!(order.retentionAmount && order.retentionDueDate)) return <span className="text-ink-4">-</span>;
  return (
    <div className="space-y-1">
      <Badge variant={state?.tone || "neutral"}>{state?.label || "Scheduled"}</Badge>
      <div className="font-semibold tabular-nums text-ink-1">{formatCurrency(order.retentionAmount)}</div>
      <div className="text-caption-lg text-ink-3">Pay by {formatDate(order.retentionDueDate)}</div>
      <div className="text-caption text-ink-4">Notify from {formatDate(order.retentionReminderDate)}</div>
    </div>
  );
});

const OrderActions = memo(function OrderActions({ order, onBills, onTrigger, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-2"}>
      <Button type="button" variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onBills(order)}>
        Bills
      </Button>
      {order.isTriggered ? (
        <Badge variant="purple">
          <Lock className="size-3" /> Triggered
        </Badge>
      ) : (
        <Button type="button" variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onTrigger(order)}>
          Trigger
        </Button>
      )}
    </div>
  );
});

const remainingClass = (n) => (n < 0 ? "text-tone-bad-fg" : "text-tone-ok-fg");

export function getWorkOrderColumns({ onBills, onTrigger, remainingFor, getRetentionState, formatCurrency, formatDate }) {
  return [
    { key: "order", header: "Work order", cell: (o) => <OrderCell order={o} /> },
    { key: "value", header: "Value", align: "right", cell: (o) => <span className="font-semibold tabular-nums text-ink-1">{rupeesOr0(o.totalValue)}</span> },
    { key: "billing", header: "Billing used", cell: (o) => <BillingCell order={o} /> },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      cell: (o) => <span className={`font-semibold tabular-nums ${remainingClass(remainingFor(o))}`}>{rupeesOr0(remainingFor(o))}</span>,
    },
    { key: "bills", header: "Bills", align: "right", cell: (o) => <span className="tabular-nums">{o.billsCount || 0}</span> },
    {
      key: "retention",
      header: "Retention",
      nowrap: false,
      cell: (o) => <RetentionCell order={o} state={getRetentionState(o)} formatCurrency={formatCurrency} formatDate={formatDate} />,
    },
    { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status || "N/A"} tone={STATUS_TONE[o.status]} /> },
    { key: "actions", header: "Actions", align: "right", sticky: "right", cell: (o) => <OrderActions order={o} onBills={onBills} onTrigger={onTrigger} /> },
  ];
}

/** Stacked card for one work order (DataTable `mobileCard`, below md). */
export function getWorkOrderMobileCard({ onBills, onTrigger, remainingFor, getRetentionState, formatCurrency, formatDate }) {
  return function WorkOrderMobileCard(o) {
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <OrderCell order={o} />
          <StatusBadge status={o.status || "N/A"} tone={STATUS_TONE[o.status]} />
        </div>
        <BillingCell order={o} />
        <div className="grid grid-cols-3 gap-2 text-small">
          <div>
            <div className="text-caption-lg text-ink-3">Value</div>
            <div className="font-semibold tabular-nums text-ink-1">{rupeesOr0(o.totalValue)}</div>
          </div>
          <div>
            <div className="text-caption-lg text-ink-3">Remaining</div>
            <div className={`font-semibold tabular-nums ${remainingClass(remainingFor(o))}`}>{rupeesOr0(remainingFor(o))}</div>
          </div>
          <div>
            <div className="text-caption-lg text-ink-3">Bills</div>
            <div className="tabular-nums text-ink-1">{o.billsCount || 0}</div>
          </div>
        </div>
        <RetentionCell order={o} state={getRetentionState(o)} formatCurrency={formatCurrency} formatDate={formatDate} />
        <OrderActions order={o} onBills={onBills} onTrigger={onTrigger} full />
      </>
    );
  };
}
