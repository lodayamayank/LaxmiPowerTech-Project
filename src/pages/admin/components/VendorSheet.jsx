// src/pages/admin/components/VendorSheet.jsx
// Add / edit vendor in a right-side panel. Same fields, validation messages and submit as the old inline card.
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetPanel, SheetPanelBody, SheetPanelFooter, SheetPanelHeader } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/FormField";

export default function VendorSheet({ v }) {
  const { sheetOpen, editId, formData, setFormData, errors, handleSubmit, handleCancel } = v;
  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  return (
    <Sheet open={sheetOpen} onOpenChange={(open) => !open && handleCancel()}>
      <SheetPanel onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <SheetPanelHeader title={editId ? "Edit vendor" : "Add vendor"} description="Mobile and email are required." />
        <SheetPanelBody className="space-y-4">
          <FormField label="Company Name" htmlFor="vendor-company-name" required error={errors.companyName}>
            <Input id="vendor-company-name" placeholder="Enter company name" value={formData.companyName} onChange={set("companyName")} />
          </FormField>
          <FormField label="Contact Person" htmlFor="vendor-contact">
            <Input id="vendor-contact" placeholder="Enter contact person" value={formData.contact} onChange={set("contact")} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Mobile No." htmlFor="vendor-mobile" required error={errors.mobile}>
              <Input id="vendor-mobile" placeholder="Enter mobile number" value={formData.mobile} onChange={set("mobile")} />
            </FormField>
            <FormField label="Office No." htmlFor="vendor-office">
              <Input id="vendor-office" placeholder="Enter office number" value={formData.office} onChange={set("office")} />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="vendor-email" required error={errors.email}>
            <Input id="vendor-email" placeholder="Enter email address" value={formData.email} onChange={set("email")} />
          </FormField>
          <FormField label="GST No." htmlFor="vendor-gst">
            <Input id="vendor-gst" placeholder="Enter GST number" value={formData.gst} onChange={set("gst")} />
          </FormField>
          <FormField label="Address" htmlFor="vendor-address">
            <Textarea id="vendor-address" className="resize-none" placeholder="Enter complete address" rows={3} value={formData.address} onChange={set("address")} />
          </FormField>
        </SheetPanelBody>
        <SheetPanelFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {editId ? <Check /> : <Plus />}
            {editId ? "Update Vendor" : "Add Vendor"}
          </Button>
        </SheetPanelFooter>
      </SheetPanel>
    </Sheet>
  );
}
