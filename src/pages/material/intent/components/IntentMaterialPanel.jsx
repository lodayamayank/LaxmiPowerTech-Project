// src/pages/material/intent/components/IntentMaterialPanel.jsx
// "Add material" / "Edit material" panel inside the purchase order details dialog: optional reference image with
// zoom, the material form, and the list of materials already on the order. All state lives in useAdminIntent.js.
import { useState } from "react";
import { CheckCircle2, ExternalLink, Pencil, RotateCcw, Save, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";
import { Notice } from "@/components/common/Notice";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resolveFileUrl } from "./useAdminIntent";

const UNITS = ["Nos", "pcs", "bags", "kg", "mtr", "box", "set"];
const NONE = "all";

// Image that swaps to a message when the file cannot be loaded
function ReferenceImage({ src, alt, zoom, fallback }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="flex min-h-48 items-center justify-center p-6 text-center text-small text-ink-3">{fallback}</div>;
  return <img loading="lazy" decoding="async" src={src} alt={alt} className="mx-auto max-w-none bg-surface object-contain transition-all duration-150" style={zoom ? { width: `${zoom}%` } : undefined} onError={() => setFailed(true)} />;
}

export default function IntentMaterialPanel({ t }) {
  const { selectedIndent: po, manualMaterial, manualMaterialMode, addingMaterial, materialSuccessMessage, imageZoom, setImageZoom, lastAddedMaterialId, categories, vendors } = t;
  const poId = po.purchaseOrderId || po.indentId;
  const isEdit = manualMaterialMode === "edit";
  const set = (field) => (e) => t.updateManualMaterial(field, e.target.value);
  const hasVendors = Array.isArray(vendors) && vendors.length > 0;

  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="flex flex-col gap-3 border-b border-line bg-surface-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-h3 font-semibold text-ink-1">{isEdit ? "Edit material" : po.imageUrl ? "Add material from uploaded image" : "Add material"}</h3>
          <p className="text-small text-ink-3">
            {isEdit ? `Update this material without creating a duplicate on ${poId}.` : po.imageUrl ? `Keep the image visible while saving materials to ${poId}.` : `Save materials directly to ${poId}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {materialSuccessMessage ? (
            <Notice tone="ok" icon={CheckCircle2} className="py-2">
              {materialSuccessMessage}
            </Notice>
          ) : null}
          <Button variant="outline" size="sm" onClick={t.closeManualMaterialForm} disabled={addingMaterial}>
            Close form
          </Button>
        </div>
      </div>

      <div className={cn("grid grid-cols-1", po.imageUrl && "lg:grid-cols-[minmax(0,48%)_minmax(0,52%)]")}>
        {po.imageUrl ? (
          <div className="flex flex-col gap-3 border-b border-line bg-surface-subtle p-4 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-small font-semibold text-ink-2">Uploaded image reference</p>
                <p className="text-caption text-ink-3">Zoom: {imageZoom}%</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Zoom out" title="Zoom out" onClick={() => setImageZoom((prev) => Math.max(60, prev - 20))}>
                  <ZoomOut />
                </Button>
                <Button variant="outline" size="icon" aria-label="Reset zoom" title="Reset zoom" onClick={() => setImageZoom(100)}>
                  <RotateCcw />
                </Button>
                <Button variant="outline" size="icon" aria-label="Zoom in" title="Zoom in" onClick={() => setImageZoom((prev) => Math.min(220, prev + 20))}>
                  <ZoomIn />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={resolveFileUrl(po.imageUrl)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Full
                  </a>
                </Button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-control border border-line bg-surface">
              <ReferenceImage src={resolveFileUrl(po.imageUrl)} alt="Uploaded intent reference" zoom={imageZoom} fallback="Image could not be loaded. Open the full image from the button above." />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-4 p-4">
          <section className="rounded-card border border-line p-4">
            <h4 className="text-body font-semibold text-ink-1">{isEdit ? "Update material details" : "Material details"}</h4>
            <p className="mb-4 text-small text-ink-3">Required fields are marked with *</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Material / Category" htmlFor="pom-category" required>
                <Input id="pom-category" value={manualMaterial.category} onChange={set("category")} list="manual-material-categories" placeholder="Select or type material" />
                <datalist id="manual-material-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Sub category" htmlFor="pom-sub">
                <Input id="pom-sub" value={manualMaterial.subCategory} onChange={set("subCategory")} list="manual-material-subcategories" placeholder="Select or type sub category" />
                <datalist id="manual-material-subcategories">
                  {t.getSubcategories(manualMaterial.category).map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Sub category 1" htmlFor="pom-sub1">
                <Input id="pom-sub1" value={manualMaterial.subCategory1} onChange={set("subCategory1")} list="manual-material-subcategory1" placeholder="Select or type sub category 1" />
                <datalist id="manual-material-subcategory1">
                  {t.getSubSubcategories(manualMaterial.category, manualMaterial.subCategory).map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Sub category 2" htmlFor="pom-sub2">
                <Input id="pom-sub2" value={manualMaterial.subCategory2} onChange={set("subCategory2")} list="manual-material-subcategory2" placeholder="Select or type sub category 2" />
                <datalist id="manual-material-subcategory2">
                  {t.getSubCategory2(manualMaterial.category, manualMaterial.subCategory, manualMaterial.subCategory1).map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Quantity" htmlFor="pom-qty" required>
                <Input id="pom-qty" type="number" min="1" value={manualMaterial.quantity} onChange={set("quantity")} placeholder="Enter quantity" />
              </FormField>
              <FormField label="Unit" htmlFor="pom-uom">
                <Select value={manualMaterial.uom} onValueChange={(value) => t.updateManualMaterial("uom", value)}>
                  <SelectTrigger id="pom-uom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Vendor" htmlFor="pom-vendor" className="md:col-span-2">
                <Select value={manualMaterial.vendor || NONE} onValueChange={(value) => t.updateManualMaterial("vendor", value === NONE ? "" : value)} disabled={!hasVendors}>
                  <SelectTrigger id="pom-vendor">
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
              </FormField>
              <FormField label="Remarks / specification" htmlFor="pom-remarks" className="md:col-span-2">
                <Textarea id="pom-remarks" value={manualMaterial.remarks} onChange={set("remarks")} rows={3} placeholder="Add size, brand, specification, or note" />
              </FormField>
            </div>
          </section>

          <section className="rounded-card border border-line">
            <div className="border-b border-line bg-surface-subtle px-4 py-3">
              <h4 className="text-body font-semibold text-ink-1">Added materials ({po.materials?.length || 0})</h4>
            </div>
            {po.materials && po.materials.length > 0 ? (
              <ul className="max-h-72 divide-y divide-line overflow-auto">
                {po.materials.map((material, index) => {
                  const rowKey = t.getMaterialRowKey(material, index);
                  return (
                    <li key={rowKey} className={cn("px-4 py-3 text-small transition-colors", rowKey === lastAddedMaterialId && "bg-tone-ok-soft")}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-1">{material.itemName || "-"}</p>
                          <p className="mt-1 text-caption text-ink-3">{[material.category, material.subCategory, material.subCategory1, material.subCategory2].filter(Boolean).join(" / ") || "No category details"}</p>
                        </div>
                        <span className="rounded-full bg-primary-soft px-2 py-1 text-caption font-semibold text-primary-soft-foreground">
                          {material.quantity || "-"} {material.uom || "Nos"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => t.handleEditManualMaterial(material)}>
                          <Pencil /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-tone-bad-fg" onClick={() => t.setMaterialToDelete(material)}>
                          <Trash2 /> Delete
                        </Button>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-caption text-ink-3 sm:grid-cols-2">
                        <span>Vendor: {material.vendor?.companyName || "N/A"}</span>
                        <span>Added: {material.createdAt ? formatDate(material.createdAt, { withTime: true }) : formatDate(po.updatedAt || po.createdAt, { withTime: true })}</span>
                      </div>
                      {material.remarks ? <p className="mt-2 text-caption text-ink-3">{material.remarks}</p> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-small text-ink-3">No materials added to this Intent PO yet.</p>
            )}
          </section>

          <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={t.closeManualMaterialForm} disabled={addingMaterial}>
              Cancel
            </Button>
            {!isEdit ? (
              <Button variant="outline" onClick={() => t.handleSaveManualMaterial(true)} disabled={addingMaterial}>
                {addingMaterial ? "Saving..." : "Save & add another"}
              </Button>
            ) : null}
            <Button onClick={() => t.handleSaveManualMaterial(false)} disabled={addingMaterial}>
              <Save /> {addingMaterial ? "Saving..." : isEdit ? "Update material" : "Save material"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
