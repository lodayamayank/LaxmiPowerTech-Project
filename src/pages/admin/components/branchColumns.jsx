// src/pages/admin/components/branchColumns.jsx
// DataTable columns and mobile card for the branch list.
import { memo } from "react";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/common/IconTile";

const coords = (b) => `${b.lat?.toFixed(6)}, ${b.lng?.toFixed(6)}`;

const BranchCell = memo(function BranchCell({ b }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={MapPin} tone="neutral" />
      <span className="font-medium text-ink-1">{b.name}</span>
    </div>
  );
});

const BranchActions = memo(function BranchActions({ b, onEdit, onDelete, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-1"}>
      <Button variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onEdit(b)}>
        <Pencil /> Edit
      </Button>
      <Button variant="ghost" size="icon" className="h-control-sm w-control-sm text-tone-bad-fg" aria-label={`Delete ${b.name}`} title="Delete" onClick={() => onDelete(b._id)}>
        <Trash2 />
      </Button>
    </div>
  );
});

export function getBranchColumns(handlers) {
  return [
    { key: "name", header: "Branch", cell: (b) => <BranchCell b={b} /> },
    { key: "address", header: "Address", truncate: true, maxWidth: 360, cell: (b) => <span className="text-ink-2">{b.address || "—"}</span> },
    { key: "radius", header: "Radius", cell: (b) => <span className="tabular-nums">{b.radius} m</span> },
    { key: "coords", header: "Coordinates", cell: (b) => <span className="font-data text-caption-lg text-ink-3">{coords(b)}</span> },
    { key: "actions", header: "Actions", align: "right", sticky: "right", cell: (b) => <BranchActions b={b} {...handlers} /> },
  ];
}

/** Stacked card for one branch (DataTable `mobileCard`, below md). */
export function getBranchMobileCard(handlers) {
  return function BranchMobileCard(b) {
    return (
      <>
        <BranchCell b={b} />
        <div className="text-small text-ink-2">{b.address || "—"}</div>
        <div className="flex items-center justify-between gap-2 text-caption-lg text-ink-3">
          <span className="tabular-nums">{b.radius} m</span>
          <span className="font-data">{coords(b)}</span>
        </div>
        <BranchActions b={b} full {...handlers} />
      </>
    );
  };
}
