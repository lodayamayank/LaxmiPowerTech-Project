// src/pages/admin/components/vendorColumns.jsx
// DataTable columns and mobile card for the vendor list.
import { memo } from "react";
import { Building2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/common/IconTile";

const Dash = () => <span className="text-ink-4">—</span>;

const CompanyCell = memo(function CompanyCell({ v }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={Building2} tone="neutral" />
      <span className="font-medium text-ink-1">{v.companyName}</span>
    </div>
  );
});

const GstCell = memo(function GstCell({ v }) {
  return v.gst ? <Badge variant="neutral">{v.gst}</Badge> : <Dash />;
});

const VendorActions = memo(function VendorActions({ v, onEdit, onDelete, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-1"}>
      <Button variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onEdit(v)}>
        <Pencil /> Edit
      </Button>
      <Button variant="ghost" size="icon" className="h-control-sm w-control-sm text-tone-bad-fg" aria-label={`Delete ${v.companyName}`} title="Delete" onClick={() => onDelete(v._id)}>
        <Trash2 />
      </Button>
    </div>
  );
});

export function getVendorColumns(handlers) {
  return [
    { key: "company", header: "Company", cell: (v) => <CompanyCell v={v} /> },
    { key: "contact", header: "Contact", cell: (v) => v.contact || <Dash /> },
    { key: "mobile", header: "Mobile", cell: (v) => <span className="tabular-nums">{v.mobile}</span> },
    { key: "email", header: "Email", truncate: true, maxWidth: 260, cell: (v) => v.email },
    { key: "gst", header: "GST", cell: (v) => <GstCell v={v} /> },
    { key: "actions", header: "Actions", align: "right", sticky: "right", cell: (v) => <VendorActions v={v} {...handlers} /> },
  ];
}

/** Stacked card for one vendor (DataTable `mobileCard`, below md). */
export function getVendorMobileCard(handlers) {
  return function VendorMobileCard(v) {
    return (
      <>
        <CompanyCell v={v} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-small">
          <span className="text-ink-3">Contact</span>
          <span className="text-ink-2">{v.contact || "—"}</span>
          <span className="text-ink-3">Mobile</span>
          <span className="tabular-nums text-ink-2">{v.mobile}</span>
          <span className="text-ink-3">Email</span>
          <span className="break-all text-ink-2">{v.email}</span>
          <span className="text-ink-3">GST</span>
          <span className="text-ink-2">{v.gst || "—"}</span>
        </div>
        <VendorActions v={v} full {...handlers} />
      </>
    );
  };
}
