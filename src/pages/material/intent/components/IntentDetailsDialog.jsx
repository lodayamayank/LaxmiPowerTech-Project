// src/pages/material/intent/components/IntentDetailsDialog.jsx
// Details / edit dialog of one purchase order (or photo indent). All state and requests live in useAdminIntent.js;
// the add / edit material panel is IntentMaterialPanel.jsx.
import { useState } from "react";
import { CheckCircle2, Download, ExternalLink, Paperclip, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import MaterialLineItem from "@/pages/material/components/MaterialLineItem";
import IntentMaterialPanel from "./IntentMaterialPanel";
import { resolveFileUrl } from "./useAdminIntent";

const STATUSES = ["pending", "approved", "transferred", "cancelled"];
const NONE = "all";

const Info = ({ label, children }) => (
  <div>
    <div className="text-small text-ink-3">{label}</div>
    <div className="mt-0.5 text-body font-medium text-ink-1">{children}</div>
  </div>
);

const SectionTitle = ({ children }) => <h3 className="border-b border-line pb-2 text-h3 font-semibold text-ink-1">{children}</h3>;

const joinPath = (m) => [m.category, m.subCategory, m.subCategory1, m.subCategory2].filter(Boolean).join(" / ") || "-";

// Uploaded intent image with a message when the file cannot be loaded
function UploadedImage({ src }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="flex min-h-48 items-center justify-center p-6 text-center text-small text-ink-3">Image could not be loaded. The file may be missing or unavailable.</div>;
  return <img loading="lazy" decoding="async" src={src} alt="Uploaded intent" className="max-h-[60vh] w-full bg-surface object-contain" onError={() => setFailed(true)} />;
}

export default function IntentDetailsDialog({ t }) {
  const { selectedIndent: po, showDetailsModal, editing, formData, setFormData, saving, deletingAttachment, categories, vendors, editingMaterialId, setEditingMaterialId, showManualMaterialForm } = t;
  if (!po || !showDetailsModal) return null;
  const poId = po.purchaseOrderId || po.indentId;
  const requestedBy = po.requestedBy?.name || po.requestedBy || "N/A";
  const hasVendors = Array.isArray(vendors) && vendors.length > 0;

  const materialColumns = [
    { key: "n", header: "#", cell: (_, i) => i + 1, width: 48 },
    { key: "itemName", header: "Item name", nowrap: false, cell: (m) => <span className="font-medium text-ink-1">{m.itemName || "-"}</span> },
    { key: "path", header: "Category / type", nowrap: false, cell: (m) => <span className="text-ink-3">{joinPath(m)}</span> },
    { key: "quantity", header: "Quantity", cell: (m) => m.quantity || "-" },
    { key: "uom", header: "UOM", cell: (m) => m.uom || "-" },
    { key: "vendor", header: "Vendor", nowrap: false, cell: (m) => <span className="text-ink-3">{m.vendor?.companyName || "N/A"}</span> },
    { key: "remarks", header: "Remarks", nowrap: false, cell: (m) => <span className="text-ink-3">{m.remarks || "-"}</span> },
    { key: "added", header: "Added", cell: (m) => <span className="text-small text-ink-3">{m.createdAt ? formatDate(m.createdAt, { withTime: true }) : formatDate(po.updatedAt || po.createdAt, { withTime: true })}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (m) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" onClick={() => t.handleEditManualMaterial(m)}>
            <Pencil /> Edit
          </Button>
          <Button variant="outline" size="sm" className="text-tone-bad-fg" onClick={() => t.setMaterialToDelete(m)}>
            <Trash2 /> Delete
          </Button>
        </div>
      ),
    },
  ];

  const vendorColumns = [
    { key: "n", header: "#", cell: (_, i) => i + 1, width: 48 },
    { key: "material", header: "Material", nowrap: false, cell: (m) => [m.category, m.subCategory, m.subCategory1, m.subCategory2].filter(Boolean).join(" - ") },
    { key: "quantity", header: "Quantity", cell: (m) => `${m.quantity || "-"} ${m.uom || "Nos"}` },
    {
      key: "vendor",
      header: "Vendor",
      cell: (m) => (
        <Select value={m.vendor || NONE} onValueChange={(value) => t.updateMaterial(m.id, { vendor: value === NONE ? "" : value })} disabled={!hasVendors}>
          <SelectTrigger aria-label="Vendor" className="min-w-48">
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Select vendor</SelectItem>
            {hasVendors
              ? vendors.map((vendor) => (
                  <SelectItem key={vendor._id} value={vendor._id}>
                    {vendor.companyName}
                  </SelectItem>
                ))
              : null}
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <Dialog open={showDetailsModal} onOpenChange={(open) => !open && t.closeModal()}>
      <DialogContent className={cn("flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-4xl", showManualMaterialForm && "sm:max-w-6xl")}>
        <DialogHeader className="border-b border-line px-6 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle>Purchase order details</DialogTitle>
              <DialogDescription>
                {poId} · {formatDate(po.requestDate || po.createdAt, { withTime: true })} · {requestedBy}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={po.status} />
              {po.imageUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={resolveFileUrl(po.imageUrl)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Open image
                  </a>
                </Button>
              ) : null}
              {po.status?.toLowerCase() === "pending" ? (
                <Button variant="approve" size="sm" onClick={() => t.handleApproveIntent(po)} disabled={saving}>
                  <CheckCircle2 /> {saving ? "Approving..." : "Approve"}
                </Button>
              ) : null}
              <Button size="sm" onClick={t.handleOpenManualMaterialForm}>
                <Plus /> Add material
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {showManualMaterialForm ? (
            <IntentMaterialPanel t={t} />
          ) : (
            <>
              <section className="space-y-3">
                <SectionTitle>Intent PO information</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Info label="PO ID">{poId}</Info>
                  {editing ? (
                    <FormField label="Status" htmlFor="po-status">
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger id="po-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  ) : (
                    <Info label="Status">
                      <StatusBadge status={po.status} />
                    </Info>
                  )}
                  {editing ? (
                    <FormField label="Delivery site" htmlFor="po-site">
                      <Input id="po-site" value={formData.deliverySite} onChange={(e) => setFormData({ ...formData, deliverySite: e.target.value })} />
                    </FormField>
                  ) : (
                    <Info label="Delivery site">{po.deliverySite || "N/A"}</Info>
                  )}
                  {/* Requested by is read-only in every mode */}
                  <Info label="Requested by">{requestedBy}</Info>
                  <Info label="Request date">{formatDate(po.requestDate || po.createdAt, { withTime: true })}</Info>
                </div>
              </section>

              {po.imageUrl ? (
                <section className="space-y-3">
                  <SectionTitle>Uploaded intent image</SectionTitle>
                  <div className="overflow-hidden rounded-card border border-line bg-surface-subtle">
                    <UploadedImage src={resolveFileUrl(po.imageUrl)} />
                    <div className="flex justify-end border-t border-line bg-surface px-4 py-3">
                      <Button variant="outline" size="sm" asChild>
                        <a href={resolveFileUrl(po.imageUrl)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink /> Open image
                        </a>
                      </Button>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <SectionTitle>Added materials ({editing ? formData.materials?.length : po.materials?.length || 0} items)</SectionTitle>
                {editing ? (
                  <div className="space-y-2">
                    {Array.isArray(formData.materials) && formData.materials.length > 0 ? (
                      formData.materials.map((material, idx) => (
                        <MaterialLineItem
                          key={material.id}
                          material={material}
                          index={idx}
                          isEditing={editingMaterialId === material.id}
                          onEdit={() => setEditingMaterialId(material.id)}
                          onDoneEditing={() => setEditingMaterialId(null)}
                          onRemove={() => t.removeMaterialRow(material.id)}
                          onUpdate={(fieldName, value) => {
                            if (fieldName === "category") t.updateMaterial(material.id, { category: value, subCategory: "", subCategory1: "", subCategory2: "" });
                            else if (fieldName === "subCategory") t.updateMaterial(material.id, { subCategory: value, subCategory1: "", subCategory2: "" });
                            else if (fieldName === "subCategory1") t.updateMaterial(material.id, { subCategory1: value, subCategory2: "" });
                            else t.updateMaterial(material.id, { [fieldName]: value });
                          }}
                          categories={categories}
                          getSubcategories={t.getSubcategories}
                          getSubSubcategories={t.getSubSubcategories}
                          getSubSubSubcategories={t.getSubCategory2}
                        />
                      ))
                    ) : (
                      <p className="py-4 text-center text-small text-ink-3">No materials added</p>
                    )}

                    {Array.isArray(formData.materials) && formData.materials.length > 0 ? (
                      <div className="space-y-2 pt-3">
                        <h4 className="text-body font-semibold text-ink-2">Assign vendors to materials</h4>
                        <div className="overflow-hidden rounded-card border border-line">
                          <DataTable columns={vendorColumns} rows={formData.materials} rowKey="id" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : po.materials && po.materials.length > 0 ? (
                  <div className="overflow-hidden rounded-card border border-line">
                    <DataTable columns={materialColumns} rows={po.materials} rowKey={(_, i) => String(i)} />
                  </div>
                ) : (
                  <p className="text-small text-ink-3">No materials listed</p>
                )}
              </section>

              {po.attachments && po.attachments.length > 0 ? (
                <section className="space-y-3">
                  <SectionTitle>Attachments ({po.attachments.length})</SectionTitle>
                  <ul className="space-y-3">
                    {po.attachments.map((attachment, index) => {
                      // Old string format or the newer { url } object format
                      const attachmentUrl = typeof attachment === "string" ? attachment : attachment.url;
                      const fileURL = resolveFileUrl(attachmentUrl);
                      const fileName = attachmentUrl.split("/").pop();
                      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachmentUrl);
                      return (
                        <li key={index} className="flex flex-wrap items-center gap-4 rounded-card border border-line-card p-3">
                          {isImage ? (
                            <img loading="lazy" decoding="async" src={fileURL} alt={fileName} className="size-16 shrink-0 rounded border border-line object-cover" />
                          ) : (
                            <span className="flex size-16 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-3">
                              <Paperclip className="size-6" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body font-medium text-ink-1">{fileName}</p>
                            <p className="text-small text-ink-3">
                              {isImage ? "Image" : "File"} · Attachment {index + 1}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={fileURL} target="_blank" rel="noopener noreferrer">
                                <ExternalLink /> View
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={fileURL} download={fileName}>
                                <Download /> Download
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" className="text-tone-bad-fg" aria-label="Delete attachment" disabled={deletingAttachment === index} onClick={() => t.requestDeleteAttachment(index)}>
                              <Trash2 /> {deletingAttachment === index ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              <section className="grid grid-cols-2 gap-4 rounded-card bg-surface-muted p-4 text-small">
                <div>
                  <p className="text-ink-3">Created at</p>
                  <p className="font-medium text-ink-2">{formatDate(po.createdAt, { withTime: true })}</p>
                </div>
                {po.updatedAt ? (
                  <div>
                    <p className="text-ink-3">Last updated</p>
                    <p className="font-medium text-ink-2">{formatDate(po.updatedAt, { withTime: true })}</p>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>

        {!showManualMaterialForm ? (
          <DialogFooter className="border-t border-line px-6 py-4">
            {editing ? (
              <>
                <Button variant="outline" onClick={t.handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={t.handleSaveEdit} disabled={saving}>
                  <Save /> {saving ? "Saving..." : "Save changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={t.closeModal}>
                  Close
                </Button>
                <Button onClick={t.handleEdit}>
                  <Pencil /> Edit
                </Button>
              </>
            )}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
