// src/pages/projects/components/WorkOrderDialogs.jsx
// The three work order dialogs: create, trigger (lock + retention reminder) and bills.
// State and handlers come from useWorkOrders; these only lay the forms out (same fields, validations and payloads).
import { Lock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FormField } from "@/components/common/FormField";
import { Notice } from "@/components/common/Notice";
import { rupeesOr0 } from "../workOrderFormat";

export function CreateWorkOrderDialog({ w }) {
  const { showAddModal, handleCloseModal, handleSubmitWorkOrder, projects, selectedProject, formData, setFormData, submitting } = w;
  return (
    <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
          <DialogDescription className="sr-only">Enter the work order number, name, date and total value.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitWorkOrder} className="space-y-4">
          <FormField label="Project" htmlFor="wo-project-display" required>
            <Input id="wo-project-display" type="text" value={projects.find((p) => p._id === selectedProject)?.name || ""} disabled />
          </FormField>
          <FormField label="Work Order Number" htmlFor="wo-number" required>
            <Input
              id="wo-number"
              type="text"
              placeholder="Enter Work Order Number (e.g., WO001)"
              value={formData.workOrderNo}
              onChange={(e) => setFormData({ ...formData, workOrderNo: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Work Order Name / Title" htmlFor="wo-name" required>
            <Input
              id="wo-name"
              type="text"
              placeholder="Enter Work Order Name"
              value={formData.workOrderName}
              onChange={(e) => setFormData({ ...formData, workOrderName: e.target.value })}
              required
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Work Order Date" htmlFor="wo-date" required>
              <Input id="wo-date" type="date" value={formData.workOrderDate} onChange={(e) => setFormData({ ...formData, workOrderDate: e.target.value })} required />
            </FormField>
            <FormField label="Total Work Order Value (₹)" htmlFor="wo-total-value" required hint="This will be the maximum billing limit for this work order">
              <Input
                id="wo-total-value"
                type="number"
                placeholder="Enter Total Value"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                min="1"
                step="0.01"
                required
              />
            </FormField>
          </div>
          <FormField label="Description / Notes" htmlFor="wo-description">
            <Textarea
              id="wo-description"
              placeholder="Enter description or notes (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="resize-none"
            />
          </FormField>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "+ Add Work Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const TRIGGER_PRESETS = [
  { label: "After 6 Months", months: 6 },
  { label: "After 9 Months", months: 9 },
  { label: "After 1 Year", months: 12 },
];

export function TriggerWorkOrderDialog({ w }) {
  const { showTriggerModal, triggerWorkOrder, submitting, closeTriggerModal, handleTriggerWorkOrder, triggerFormData, setTriggerFormData, getDateAfterMonths, subtractOneMonth, formatDate } = w;
  return (
    <Dialog open={showTriggerModal && !!triggerWorkOrder} onOpenChange={(open) => !open && !submitting && closeTriggerModal()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Trigger Work Order</DialogTitle>
          <DialogDescription>
            {triggerWorkOrder?.workOrderNo} - {triggerWorkOrder?.workOrderName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleTriggerWorkOrder} className="space-y-4">
          <Notice tone="warn" icon={Lock} title="This will lock the work order.">
            After triggering, no new bills can be added. The retention reminder starts one month before the due date.
          </Notice>

          <FormField label="Retention Amount (₹)" htmlFor="trigger-retention-amount" required>
            <Input
              id="trigger-retention-amount"
              type="number"
              placeholder="Amount to pay to client"
              value={triggerFormData.retentionAmount}
              onChange={(e) => setTriggerFormData({ ...triggerFormData, retentionAmount: e.target.value })}
              min="1"
              step="0.01"
              required
            />
          </FormField>

          <FormField
            label="Retention Due Date"
            htmlFor="trigger-due-date"
            required
            hint={`Reminder starts from ${
              triggerFormData.retentionDueDate ? formatDate(subtractOneMonth(triggerFormData.retentionDueDate)) : "one month before due date"
            }`}
          >
            <div className="mb-1 flex flex-wrap gap-2">
              {TRIGGER_PRESETS.map((option) => {
                const isActive = triggerFormData.retentionDueDate === getDateAfterMonths(option.months);
                return (
                  <Button
                    key={option.months}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => setTriggerFormData({ ...triggerFormData, retentionDueDate: getDateAfterMonths(option.months) })}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <Input
              id="trigger-due-date"
              type="date"
              value={triggerFormData.retentionDueDate}
              onChange={(e) => setTriggerFormData({ ...triggerFormData, retentionDueDate: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Notes" htmlFor="trigger-notes">
            <Textarea
              id="trigger-notes"
              placeholder="Optional retention/payment note"
              value={triggerFormData.retentionNotes}
              onChange={(e) => setTriggerFormData({ ...triggerFormData, retentionNotes: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </FormField>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={closeTriggerModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Triggering..." : "Trigger & Save Reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const Stat = ({ label, children, className }) => (
  <div>
    <p className="mb-1 text-caption text-ink-3">{label}</p>
    <p className={`text-card-title tabular-nums ${className || "text-ink-1"}`}>{children}</p>
  </div>
);

const BILL_COLUMNS = [
  { key: "billNo", header: "Bill No", cell: (b) => <span className="font-data font-medium text-ink-1">{b.billNo}</span> },
  { key: "billDate", header: "Bill Date", cell: (b) => (b.billDate ? new Date(b.billDate).toLocaleDateString() : "N/A") },
  { key: "total", header: "Total Value", align: "right", cell: (b) => <span className="font-semibold tabular-nums text-ink-1">{rupeesOr0(b.totalBillValue)}</span> },
  { key: "retention", header: "Retention", align: "right", cell: (b) => <span className="tabular-nums">{rupeesOr0(b.retentionAmount)}</span> },
  { key: "holding", header: "Holding", align: "right", cell: (b) => <span className="tabular-nums">{rupeesOr0(b.holdingAmount)}</span> },
  { key: "notes", header: "Notes", nowrap: false, cell: (b) => <span className="text-ink-3">{b.notes || "-"}</span> },
];

export function BillsDialog({ w, retentionBadge }) {
  const {
    showBillsModal, selectedWorkOrder, handleCloseBillsModal, remainingFor, bills, formatCurrency, formatDate, showAddBillForm,
    handleAddBillClick, loadingBills, billFormData, setBillFormData, handleSubmitBill, handleCancelAddBill, submitting,
  } = w;
  return (
    <Dialog open={showBillsModal && !!selectedWorkOrder} onOpenChange={(open) => !open && handleCloseBillsModal()}>
      <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 border-b border-line bg-surface-subtle px-6 py-4 text-left">
          <DialogTitle>Manage Bills</DialogTitle>
          <DialogDescription>
            Work Order: {selectedWorkOrder?.workOrderNo} - {selectedWorkOrder?.workOrderName}
          </DialogDescription>
        </DialogHeader>

        {selectedWorkOrder && (
          <div className="flex-1 overflow-y-auto">
            {selectedWorkOrder.isTriggered && (
              <Notice tone="info" icon={Lock} title="This Work Order is Triggered and Locked" className="rounded-none border-x-0 border-t-0">
                No new bills can be added. Retention payment: {formatCurrency(selectedWorkOrder.retentionAmount)} by {formatDate(selectedWorkOrder.retentionDueDate)}.
              </Notice>
            )}

            <div className="border-b border-line bg-surface-subtle p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Stat label="Total Work Order Value">{rupeesOr0(selectedWorkOrder.totalValue)}</Stat>
                <Stat label="Total Bills Amount" className="text-tone-info-fg">{rupeesOr0(selectedWorkOrder.totalBillsAmount)}</Stat>
                <Stat label="Remaining Amount" className={remainingFor(selectedWorkOrder) < 0 ? "text-tone-bad-fg" : "text-tone-ok-fg"}>
                  ₹{remainingFor(selectedWorkOrder).toLocaleString("en-IN")}
                </Stat>
                <Stat label="Number of Bills">{bills.length}</Stat>
              </div>

              {selectedWorkOrder.retentionAmount && selectedWorkOrder.retentionDueDate && (
                <Card className="mt-4 gap-0 py-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {retentionBadge(selectedWorkOrder, "Retention Reminder")}
                      <span className="text-small font-semibold tabular-nums text-ink-1">{formatCurrency(selectedWorkOrder.retentionAmount)}</span>
                      <span className="text-small text-ink-3">Pay by {formatDate(selectedWorkOrder.retentionDueDate)}</span>
                      <span className="text-small text-ink-4">Notify from {formatDate(selectedWorkOrder.retentionReminderDate)}</span>
                    </div>
                    {selectedWorkOrder.retentionNotes && <p className="mt-2 text-small text-ink-3">{selectedWorkOrder.retentionNotes}</p>}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="p-6">
              {!showAddBillForm && (
                <div className="mb-6">
                  {selectedWorkOrder.isTriggered ? (
                    <Badge variant="purple">
                      <Lock className="size-3" /> Work Order is locked — adding bills is disabled
                    </Badge>
                  ) : (
                    <Button type="button" onClick={handleAddBillClick} disabled={loadingBills}>
                      <Plus /> Add Bill
                    </Button>
                  )}
                </div>
              )}

              {showAddBillForm && (
                <Card className="mb-6 gap-0 py-0 shadow-none">
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-card-title text-ink-1">Add New Bill</h3>
                    <form onSubmit={handleSubmitBill}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Bill No" htmlFor="bill-no" required>
                          <Input id="bill-no" type="text" placeholder="Enter Bill Number" value={billFormData.billNo} onChange={(e) => setBillFormData({ ...billFormData, billNo: e.target.value })} required />
                        </FormField>
                        <FormField label="Bill Date" htmlFor="bill-date" required>
                          <Input id="bill-date" type="date" value={billFormData.billDate} onChange={(e) => setBillFormData({ ...billFormData, billDate: e.target.value })} required />
                        </FormField>
                        <FormField label="Total Bill Value (₹)" htmlFor="bill-total-value" required hint={`Remaining: ₹${remainingFor(selectedWorkOrder).toLocaleString("en-IN")}`}>
                          <Input
                            id="bill-total-value"
                            type="number"
                            placeholder="Enter Bill Amount"
                            value={billFormData.totalBillValue}
                            onChange={(e) => setBillFormData({ ...billFormData, totalBillValue: e.target.value })}
                            min="1"
                            step="0.01"
                            required
                          />
                        </FormField>
                        <FormField label="Retention Amount (₹)" htmlFor="bill-retention-amount">
                          <Input
                            id="bill-retention-amount"
                            type="number"
                            placeholder="Enter Retention Amount"
                            value={billFormData.retentionAmount}
                            onChange={(e) => setBillFormData({ ...billFormData, retentionAmount: e.target.value })}
                            min="0"
                            step="0.01"
                          />
                        </FormField>
                        <FormField label="Holding Amount (₹)" htmlFor="bill-holding-amount">
                          <Input
                            id="bill-holding-amount"
                            type="number"
                            placeholder="Enter Holding Amount"
                            value={billFormData.holdingAmount}
                            onChange={(e) => setBillFormData({ ...billFormData, holdingAmount: e.target.value })}
                            min="0"
                            step="0.01"
                          />
                        </FormField>
                        <FormField label="Notes" htmlFor="bill-notes" className="md:col-span-2">
                          <Textarea
                            id="bill-notes"
                            placeholder="Enter notes (optional)"
                            value={billFormData.notes}
                            onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })}
                            rows={3}
                            className="resize-none"
                          />
                        </FormField>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <Button type="button" variant="outline" onClick={handleCancelAddBill} disabled={submitting}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? "Adding..." : "Add Bill"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div>
                <h3 className="mb-4 text-card-title text-ink-1">Bills List</h3>
                {loadingBills ? (
                  <div className="space-y-3" aria-label="Loading bills">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-card border border-line-card">
                    <DataTable
                      columns={BILL_COLUMNS}
                      rows={bills}
                      rowKey={(b, i) => b._id || i}
                      emptyState={<EmptyState title="No bills found" description='Click "Add Bill" to create the first bill' />}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 border-t border-line bg-surface-subtle px-6 py-4">
          <Button type="button" variant="outline" onClick={handleCloseBillsModal}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
