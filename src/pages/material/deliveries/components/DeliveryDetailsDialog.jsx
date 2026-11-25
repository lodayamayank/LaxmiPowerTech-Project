// src/pages/material/deliveries/components/DeliveryDetailsDialog.jsx
// Details / receive dialog of one upcoming delivery. All state and requests live in useAdminDeliveries.js.
import { ImageIcon, Pencil, Save, Trash2, Upload } from "lucide-react";
import axios, { FILE_BASE_URL } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";

const Info = ({ label, children }) => (
  <div>
    <div className="text-small text-ink-3">{label}</div>
    <div className="mt-0.5 text-body font-medium text-ink-1">{children}</div>
  </div>
);

export default function DeliveryDetailsDialog({ d }) {
  const { selectedDelivery: dv, showDetailsModal, editing, formData, setFormData, saving, relatedIndent, uploadingReceipt, deletingAttachment, fileInputRef } = d;
  if (!dv) return null;
  const items = editing ? formData.items : dv.items;

  const lineStatus = (item) => {
    const requested = d.getRequestedQuantity(item);
    const received = d.getReceivedQuantity(item, dv.status);
    const pending = d.getPendingQuantity(item, dv.status);
    return { requested, received, pending, full: pending === 0 && requested > 0, partial: received > 0 && pending > 0 };
  };

  const columns = [
    { key: "name", header: "Category", nowrap: false, cell: (i) => <span className="font-medium text-ink-1">{i.name || i.category || "—"}</span> },
    { key: "sub", header: "Sub category", cell: (i) => i.sub_category || "—" },
    { key: "sub1", header: "Sub category 1", cell: (i) => i.sub_category1 || "—" },
    { key: "req", header: "Requested", align: "right", cell: (i) => <span className="tabular-nums">{d.formatQuantity(lineStatus(i).requested)}</span> },
    {
      key: "rec",
      header: "Received",
      align: "right",
      cell: (i, index) =>
        editing ? (
          <Input
            type="number"
            min="0"
            max={i.st_quantity}
            aria-label="Received quantity"
            value={i.received_quantity}
            onChange={(e) => d.updateItem(index, "received_quantity", e.target.value)}
            className="ml-auto w-24 text-right"
          />
        ) : (
          <span className="tabular-nums">{d.formatQuantity(lineStatus(i).received)}</span>
        ),
    },
    { key: "pend", header: "Pending", align: "right", cell: (i) => <span className="tabular-nums">{d.formatQuantity(lineStatus(i).pending)}</span> },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (i, index) => {
        if (editing) {
          return (
            <Checkbox
              checked={!!i.is_received}
              aria-label="Mark item as received"
              onCheckedChange={(checked) => {
                const isChecked = checked === true;
                const updatedItems = [...formData.items];
                const current = updatedItems[index];
                updatedItems[index] = { ...current, is_received: isChecked, received_quantity: isChecked ? current.st_quantity : current.received_quantity };
                setFormData({ ...formData, items: updatedItems });
              }}
            />
          );
        }
        const s = lineStatus(i);
        return s.full ? <StatusBadge status="Complete" tone="ok" /> : s.partial ? <StatusBadge status="Partial" tone="warn" /> : <StatusBadge status="Pending" tone="neutral" />;
      },
    },
  ];

  return (
    <Dialog open={showDetailsModal} onOpenChange={(open) => !open && d.closeModal()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-line px-6 py-4 text-left">
          <DialogTitle>Delivery details · {dv.st_id}</DialogTitle>
          <DialogDescription>Transfer number: {dv.transfer_number}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Info label="From">{dv.from}</Info>
            <Info label="To">{dv.to}</Info>
            <Info label="Date">{formatDate(dv.date, { withTime: true })}</Info>
            <Info label="Status">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={dv.status} />
                {editing ? <span className="text-small font-normal italic text-primary">→ Auto-updates on save</span> : null}
              </div>
            </Info>
            <Info label="Created by">{dv.createdBy || "-"}</Info>
            <Info label="Type">{dv.type || "ST"}</Info>
          </section>

          {dv.type === "PO" && relatedIndent?.imageUrl ? (
            <section className="space-y-3">
              <h3 className="text-h3 font-semibold text-ink-1">Uploaded image</h3>
              <Button
                type="button"
                variant="ghost"
                className="!h-auto overflow-hidden rounded-card border border-line p-0"
                aria-label="Open uploaded image"
                onClick={() => window.open(`${axios.defaults.baseURL.replace("/api", "")}${relatedIndent.imageUrl}`, "_blank")}
              >
                <img
                  loading="lazy"
                  decoding="async"
                  src={`${axios.defaults.baseURL.replace("/api", "")}${relatedIndent.imageUrl}`}
                  alt="Intent"
                  className="max-h-96 max-w-full object-contain"
                  onError={(e) => {
                    e.target.style.visibility = "hidden";
                  }}
                />
              </Button>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-h3 font-semibold text-ink-1">Materials</h3>
            <div className="overflow-hidden rounded-card border border-line">
              <DataTable columns={columns} rows={items || []} rowKey={(i, index) => String(i._id || index)} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
              <h3 className="text-h3 font-semibold text-ink-1">Attachments ({dv.attachments?.length || 0})</h3>
              <Button size="sm" disabled={uploadingReceipt} onClick={() => fileInputRef.current?.click()}>
                <Upload /> {uploadingReceipt ? "Uploading..." : "Upload receipt"}
              </Button>
              <Input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" aria-label="Upload receipt images" disabled={uploadingReceipt} onChange={(e) => d.handleUploadReceipts(e.target.files)} />
            </div>

            {dv.attachments?.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {dv.attachments.map((attachment, index) => {
                  // old string format and the Cloudinary object format
                  const attachmentUrl = typeof attachment === "string" ? attachment : attachment.url;
                  const fileURL = attachmentUrl.startsWith("http") ? attachmentUrl : `${FILE_BASE_URL}${attachmentUrl}`;
                  const fileName = attachmentUrl.split("/").pop();
                  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachmentUrl);
                  return (
                    <li key={index} className="overflow-hidden rounded-card border border-line-card bg-surface">
                      <div className="relative">
                        {isImage ? (
                          <img loading="lazy" decoding="async" src={fileURL} alt={fileName} className="h-48 w-full object-cover" />
                        ) : (
                          <div className="flex h-48 w-full items-center justify-center bg-surface-muted text-ink-4">
                            <ImageIcon className="size-12" />
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          aria-label="Delete attachment"
                          className="absolute right-2 top-2 rounded-full"
                          disabled={deletingAttachment === index}
                          onClick={() => d.requestDeleteAttachment(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="border-t border-line p-3">
                        <p className="truncate text-body font-medium text-ink-1">{fileName}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-small text-ink-3">
                            {isImage ? "Image" : "File"} · Attachment {index + 1}
                          </p>
                          <Button variant="link" size="sm" asChild className="h-auto p-0">
                            <a href={fileURL} target="_blank" rel="noopener noreferrer">
                              View full
                            </a>
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-card border border-dashed border-line-input">
                <EmptyState icon={ImageIcon} title="No attachments" description="Upload delivery receipt images here" />
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="border-t border-line px-6 py-4">
          {editing ? (
            <>
              <Button variant="outline" onClick={d.handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={d.handleSaveChanges} disabled={saving}>
                <Save /> {saving ? "Saving..." : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={d.closeModal}>
                Close
              </Button>
              <Button onClick={d.handleEdit}>
                <Pencil /> Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
