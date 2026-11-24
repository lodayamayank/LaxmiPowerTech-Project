// src/pages/projects/components/builder/StructureSummary.jsx
// Counts of the structure being built (same sums as before).
import { SectionCard } from "@/components/common/SectionCard";

export default function StructureSummary({ buildings }) {
  const sum = (fn) => buildings.reduce((total, t) => total + fn(t), 0);
  const items = [
    ["Towers", buildings.length, "text-ink-1"],
    ["Staircases", sum((t) => t.staircases?.length || 0), "text-tone-purple-fg"],
    ["Podiums", sum((t) => t.podiums?.length || 0), "text-tone-warn-fg"],
    ["Common Areas", sum((t) => t.commonAreas?.length || 0), "text-tone-info-fg"],
    ["Total Floors", sum((t) => t.wings?.[0]?.floors?.length || 0), "text-tone-info-fg"],
    [
      "Total Flats",
      sum((t) => t.wings?.[0]?.floors?.reduce((fSum, f) => fSum + (f.flats?.length || 0), 0) || 0),
      "text-tone-ok-fg",
    ],
    ["Basements", sum((t) => t.wings?.[0]?.floors?.filter((f) => f.isBasement)?.length || 0), "text-ink-3"],
  ];
  return (
    <SectionCard title="Project Summary" className="mt-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {items.map(([label, value, color]) => (
          <div key={label} className="rounded-control bg-surface-muted p-2">
            <p className="text-caption-lg text-ink-3">{label}</p>
            <p className={`text-card-title tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
