// src/pages/material/transfers/components/TransferDetailsDialog.jsx
// Details / edit dialog of one site transfer. All state and requests live in useSiteTransfers.js.
import { Download, ExternalLink, Paperclip, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { FILE_BASE_URL } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";
import MaterialLineItem from "@/pages/material/components/MaterialLineItem";

const STATUSES = ["pending", "approved", "transferred", "cancelled"];

const Info = ({ label, children }) => (
  <div>
    <div className="text-small text-ink-3">{label}</div>
    <div className="mt-0.5 text-body font-medium text-ink-1">{children}</div>
  </div>
);

const materialColumns = [
  { key: "n", header: "#", cell: (_, i) => i + 1, width: 48 },
  { key: "itemName", header: "Item name", nowrap: false, cell: (m) => <span className="font-medium text-ink-1">{m.itemName || "-"}</span> },
  { key: "quantity", header: "Quantity", cell: (m) => m.quantity || "-" },
  { key: "uom", header: "UOM", cell: (m) => m.uom || "-" },
  { key: "remarks", header: "Remarks", nowrap: false, cell: (m) => <span className="text-ink-3">{m.remarks || "-"}</span> },
];

export default function TransferDetailsDialog({ t }) {
  const { selectedTransfer: tr, showDetailsModal, editing, formData, setFormData, saving, deletingAttachment, categories, editingMaterialId, setEditingMaterialId } = t;
  if (!tr) return null;
  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  return (
    <Dialog open={showDetailsModal} onOpenChange={(open) => !open && t.closeModal()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-line px-6 py-4 text-left">
          <DialogTitle>Site transfer details</DialogTitle>
          <DialogDescription>
            {tr.siteTransferId} · requested {formatDate(tr.requestDate || tr.createdAt, { withTime: true })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Site transfer ID">{tr.siteTransferId}</Info>
            {editing ? (
              <FormField label="Status" htmlFor="st-status">
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="st-status">
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
                <StatusBadge status={tr.status} />
              </Info>
            )}
            {editing ? (
              <>
                <FormField label="From site" htmlFor="st-from">
                  <Input id="st-from" value={formData.fromSite} onChange={set("fromSite")} />
                </FormField>
                <FormField label="To site" htmlFor="st-to">
                  <Input id="st-to" value={formData.toSite} onChange={set("toSite")} />
                </FormField>
                <FormField label="Requested by" htmlFor="st-by">
                  <Input id="st-by" value={formData.requestedBy} onChange={set("requestedBy")} />
                </FormField>
              </>
            ) : (
              <>
                <Info label="From site">{tr.fromSite}</Info>
                <Info label="To site">{tr.toSite}</Info>
                <Info label="Requested by">{tr.requestedBy}</Info>
              </>
            )}
            <Info label="Request date">{formatDate(tr.requestDate || tr.createdAt, { withTime: true })}</Info>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
              <h3 className="text-h3 font-semibold text-ink-1">Materials ({editing ? formData.materials?.length : tr.materials?.length || 0} items)</h3>
              {editing ? (
                <Button size="sm" onClick={t.addMaterialRow}>
                  <Plus /> Add material
                </Button>
              ) : null}
            </div>
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
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-line">
                <DataTable columns={materialColumns} rows={tr.materials || []} rowKey={(_, i) => String(i)} />
              </div>
            )}
          </section>

          {tr.attachments?.length > 0 ? (
            <section className="space-y-3">
              <h3 className="border-b border-line pb-2 text-h3 font-semibold text-ink-1">Attachments ({tr.attachments.length})</h3>
              <ul className="space-y-3">
                {tr.attachments.map((attachment, index) => {
                  // Cloudinary object { url, publicId } or a legacy string path
                  const attachmentURL = typeof attachment === "object" ? attachment.url : attachment;
                  const fileURL = attachmentURL.startsWith("http") ? attachmentURL : `${FILE_BASE_URL}/${attachmentURL}`;
                  const fileName = attachmentURL.split("/").pop();
                  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachmentURL);
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
              <p className="font-medium text-ink-2">{formatDate(tr.createdAt, { withTime: true })}</p>
            </div>
            {tr.updatedAt ? (
              <div>
                <p className="text-ink-3">Last updated</p>
                <p className="font-medium text-ink-2">{formatDate(tr.updatedAt, { withTime: true })}</p>
              </div>
            ) : null}
          </section>
        </div>

        <DialogFooter className="border-t border-line px-6 py-4">
          {editing ? (
            <>
              <Button variant="outline" onClick={t.handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={t.handleSaveChanges} disabled={saving}>
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
      </DialogContent>
    </Dialog>
  );
}
