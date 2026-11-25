// src/pages/material/grn/components/GrnDetailsDialog.jsx
// GRN details / billing dialog. All state and requests live in useAdminGrn.js.
import { Download, Eye, FileText, Pencil, Save, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAYMENT_TONE } from "./grnShared";

const Info = ({ label, children }) => (
  <div>
    <div className="text-small text-ink-3">{label}</div>
    <div className="mt-0.5 text-body font-medium text-ink-1">{children}</div>
  </div>
);

const Total = ({ label, value, className = "" }) => (
  <div className="rounded-card border border-line p-3 text-center">
    <div className="text-small text-ink-3">{label}</div>
    <div className={`mt-1 text-card-title tabular-nums ${className}`}>{value}</div>
  </div>
);

const SectionTitle = ({ children }) => <h3 className="text-h3 font-semibold text-ink-1">{children}</h3>;

export default function GrnDetailsDialog({ g }) {
  const { selectedDelivery: dv, showDetailsModal, isEditMode, billingData, setBillingData, isSaving, safeNumber } = g;
  if (!dv) return null;

  const billingColumns = [
    { key: "name", header: "Material name", nowrap: false, cell: (m) => <span className="font-medium text-ink-1">{m.materialName}</span> },
    { key: "qty", header: "Qty", align: "center", cell: (m) => <span className="tabular-nums">{safeNumber(m.quantity)}</span> },
    {
      key: "price",
      header: "Unit price (₹)",
      cell: (m) =>
        isEditMode ? (
          <Input
            type="number"
            value={safeNumber(m.price)}
            onChange={(e) => g.handleMaterialBillingChange(m.materialId, "price", e.target.value)}
            className="w-36"
            placeholder="Unit price"
            aria-label={`Unit price for ${m.materialName}`}
            step="0.01"
            min="0"
          />
        ) : (
          <span className="font-medium tabular-nums text-ink-1">{formatCurrency(safeNumber(m.price))}</span>
        ),
    },
    {
      key: "discount",
      header: "Discount",
      cell: (m) =>
        isEditMode ? (
          <div className="flex min-w-[300px] items-center gap-2">
            <Select value={m.discountType || "flat"} onValueChange={(v) => g.handleMaterialBillingChange(m.materialId, "discountType", v)}>
              <SelectTrigger className="w-[72px] shrink-0" aria-label={`Discount type for ${m.materialName}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">₹</SelectItem>
                <SelectItem value="percentage">%</SelectItem>
              </SelectContent>
            </Select>
            <Select value={m.discountScope || "total"} onValueChange={(v) => g.handleMaterialBillingChange(m.materialId, "discountScope", v)}>
              <SelectTrigger className="w-[110px] shrink-0" aria-label={`Discount scope for ${m.materialName}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="perUnit">Per Qty</SelectItem>
                <SelectItem value="total">Total</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={safeNumber(m.discount)}
              onChange={(e) => g.handleMaterialBillingChange(m.materialId, "discount", e.target.value)}
              className="min-w-[80px] flex-1"
              placeholder="Amount"
              aria-label={`Discount amount for ${m.materialName}`}
              step={m.discountType === "percentage" ? "1" : "0.01"}
              min="0"
              max={m.discountType === "percentage" ? "100" : undefined}
            />
          </div>
        ) : (
          <span className="text-ink-2">
            {safeNumber(m.discount) > 0
              ? `${m.discountType === "percentage" ? `${safeNumber(m.discount)}%` : `₹${safeNumber(m.discount)}`} ${m.discountScope === "perUnit" ? "/ qty" : "total"}`
              : "-"}
          </span>
        ),
    },
    { key: "total", header: "Total (₹)", align: "right", cell: (m) => <span className="font-semibold tabular-nums text-ink-1">{formatCurrency(safeNumber(m.totalAmount))}</span> },
  ];

  const receivedColumns = [
    { key: "item", header: "Item", nowrap: false, cell: (i) => <span className="font-medium text-ink-1">{i.category || i.name || "N/A"}</span> },
    { key: "cat", header: "Category", nowrap: false, cell: (i) => [i.sub_category, i.sub_category1, i.sub_category2].filter(Boolean).join(" - ") || "-" },
    { key: "approved", header: "Approved qty", align: "center", cell: (i) => <span className="tabular-nums">{i.st_quantity || 0}</span> },
    { key: "received", header: "Received qty", align: "center", cell: (i) => <span className="font-semibold tabular-nums">{i.received_quantity || 0}</span> },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (i) => ((i.received_quantity || 0) >= (i.st_quantity || 0) ? <StatusBadge status="Complete" tone="ok" /> : <StatusBadge status="Partial" tone="warn" />),
    },
  ];

  const readonlyOr = (editing, input, text) => (editing ? input : <div className="rounded-control border border-line bg-surface-subtle px-3 py-2 text-body font-medium text-ink-1">{text}</div>);

  return (
    <Dialog open={showDetailsModal} onOpenChange={g.setShowDetailsModal}>
      <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col gap-0 p-0 sm:max-w-6xl">
        <DialogHeader className="border-b border-line px-6 py-4 text-left">
          <DialogTitle>GRN details</DialogTitle>
          <DialogDescription>
            {`${dv.st_id || dv.transfer_number} - `}View and manage GRN billing information.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Info label={dv.type === "PO" ? "Intent PO ID" : "Site Transfer ID"}>{dv.transfer_number || dv.st_id}</Info>
            <Info label="Type">{dv.type === "PO" ? "Purchase Order" : "Site Transfer"}</Info>
            <Info label="From">{dv.from || "N/A"}</Info>
            <Info label="To">{dv.to || "N/A"}</Info>
            <Info label="Requested by">{dv.createdBy || "N/A"}</Info>
            <Info label="Intent request date & time">{formatDate(dv.createdAt, { withTime: true })}</Info>
            <Info label="Delivery date & time (challan upload)">{formatDate(dv.updatedAt, { withTime: true })}</Info>
            <Info label="Status">
              <StatusBadge status={dv.status} />
            </Info>
          </section>

          <section className="space-y-4 rounded-card border border-line-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle>Billing details</SectionTitle>
              {!isEditMode ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={g.handleEditClick}>
                    <WalletCards /> Add payment
                  </Button>
                  <Button onClick={g.handleEditClick}>
                    <Pencil /> Edit billing
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={g.handleCancelEdit} disabled={isSaving}>
                    <X /> Cancel
                  </Button>
                  <Button onClick={g.handleSaveBilling} disabled={isSaving}>
                    <Save /> {isSaving ? "Saving..." : "Save billing"}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Invoice number" htmlFor="grn-invoice">
                {readonlyOr(
                  isEditMode,
                  <Input id="grn-invoice" type="text" value={billingData.invoiceNumber || ""} onChange={(e) => setBillingData({ ...billingData, invoiceNumber: e.target.value })} placeholder="Enter invoice number" />,
                  billingData.invoiceNumber || "Not set"
                )}
              </FormField>
              <FormField label="Bill date" htmlFor="grn-bill-date">
                {readonlyOr(
                  isEditMode,
                  <Input id="grn-bill-date" type="date" value={billingData.billDate || ""} onChange={(e) => setBillingData({ ...billingData, billDate: e.target.value })} />,
                  billingData.billDate ? formatDate(billingData.billDate) : "Not set"
                )}
              </FormField>
              <FormField label="Client paid amount" htmlFor="grn-paid">
                {readonlyOr(
                  isEditMode,
                  <Input
                    id="grn-paid"
                    type="number"
                    value={safeNumber(billingData.paidAmount)}
                    onChange={(e) => g.handlePaymentChange(e.target.value)}
                    placeholder="Enter paid amount"
                    step="0.01"
                    min="0"
                    max={safeNumber(billingData.finalAmount)}
                  />,
                  formatCurrency(safeNumber(billingData.paidAmount))
                )}
              </FormField>
              <FormField label="Payment status">
                <div className="flex h-control items-center">
                  <StatusBadge status={billingData.paymentStatus} tone={PAYMENT_TONE[billingData.paymentStatus] || "bad"} label={g.getPaymentStatusLabel(billingData.paymentStatus)} />
                </div>
              </FormField>
              <FormField label="Company name" htmlFor="grn-company" className="sm:col-span-2">
                {readonlyOr(
                  isEditMode,
                  <Input id="grn-company" type="text" value={billingData.companyName || "Laxmi Powertech Private Limited"} onChange={(e) => setBillingData({ ...billingData, companyName: e.target.value })} placeholder="Enter company name" />,
                  billingData.companyName || "Laxmi Powertech Private Limited"
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Total label="Total price" value={formatCurrency(safeNumber(billingData.totalPrice))} className="text-ink-1" />
              <Total label="Total discount" value={formatCurrency(safeNumber(billingData.totalDiscount))} className="text-tone-bad-fg" />
              <Total label="Final amount" value={formatCurrency(safeNumber(billingData.finalAmount))} className="text-ink-1" />
              <Total label="Paid amount" value={formatCurrency(safeNumber(billingData.paidAmount))} className="text-tone-ok-fg" />
              <Total label="Pending amount" value={formatCurrency(safeNumber(billingData.pendingAmount))} className="text-tone-warn-fg" />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle>Material-wise billing</SectionTitle>
            <div className="overflow-hidden rounded-card border border-line">
              <DataTable columns={billingColumns} rows={billingData.materialBilling} rowKey="materialId" density="list" />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle>Materials received</SectionTitle>
            <div className="overflow-hidden rounded-card border border-line">
              <DataTable columns={receivedColumns} rows={dv.items || []} rowKey={(i, index) => String(index)} />
            </div>
          </section>

          {dv.attachments?.length > 0 ? (
            <section className="space-y-3">
              <SectionTitle>Attachments ({dv.attachments.length})</SectionTitle>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {dv.attachments.map((attachment, index) => {
                  const attachmentUrl = typeof attachment === "string" ? attachment : attachment.url;
                  const fileName = attachmentUrl.split("/").pop();
                  const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(attachmentUrl);
                  return (
                    <li key={index} className="overflow-hidden rounded-card border border-line-card bg-surface">
                      {isImage ? (
                        <img loading="lazy" decoding="async" src={attachmentUrl} alt={`Challan ${index + 1}`} className="h-48 w-full bg-surface-muted object-contain" />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-surface-muted text-ink-4">
                          <FileText className="size-12" />
                        </div>
                      )}
                      <div className="space-y-2 border-t border-line p-3">
                        <p className="truncate text-body text-ink-2">{fileName}</p>
                        <div className="flex gap-2">
                          <Button asChild size="sm" className="flex-1">
                            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                              <Eye /> View
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="flex-1">
                            <a href={attachmentUrl} download>
                              <Download /> Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <DialogFooter className="border-t border-line px-6 py-4">
          <Button variant="outline" onClick={() => g.setShowDetailsModal(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
