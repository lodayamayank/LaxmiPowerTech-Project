// src/pages/projects/components/builder/FlatPanel.jsx
// Body of an expanded flat: unit configuration + manual room selection. Handlers come from TowerHierarchyBuilder (`h`).
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/common/FormField";
import { SectionCard } from "@/components/common/SectionCard";
import { cn } from "@/lib/utils";
import { CountInput } from "./AreaSection";
import { ROOM_TYPES } from "./hierarchyConstants";

export default function FlatPanel({ flat, tIdx, wIdx, fIdx, flatIdx, h }) {
  const upd = (field, value) => h.updateFlat(tIdx, wIdx, fIdx, flatIdx, field, value);
  const idBase = `flat-${tIdx}-${wIdx}-${fIdx}-${flatIdx}`;

  return (
    <div className="space-y-4 px-3 pb-3">
      <SectionCard title="Unit Configuration" description="Configure bedroom, bathroom, balcony, and unit details">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Variation" htmlFor={`${idBase}-variation`}>
            <Input
              id={`${idBase}-variation`}
              type="text"
              value={flat.variation || "Standard"}
              onChange={(e) => upd("variation", e.target.value)}
              placeholder="e.g., Premium, Standard, Deluxe"
            />
          </FormField>
          <CountInput label="Bedrooms" value={flat.bedroomCount ?? 2} onChange={(val) => h.handleBedroomCountChange(tIdx, wIdx, fIdx, flatIdx, val)} />
          <CountInput label="Bathrooms" value={flat.bathroomCount ?? 2} onChange={(val) => upd("bathroomCount", val)} />
          <CountInput label="Balconies" value={flat.balconyCount ?? 1} onChange={(val) => upd("balconyCount", val)} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
          <Label className="flex cursor-pointer items-center gap-2 rounded-control border border-line bg-surface-muted p-3 hover:bg-line">
            <Checkbox checked={flat.hasLivingRoom !== false} onCheckedChange={(checked) => upd("hasLivingRoom", checked === true)} />
            <span className="text-small font-medium text-ink-2">Living Room</span>
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-control border border-line bg-surface-muted p-3 hover:bg-line">
            <Checkbox checked={flat.hasKitchen !== false} onCheckedChange={(checked) => upd("hasKitchen", checked === true)} />
            <span className="text-small font-medium text-ink-2">Kitchen</span>
          </Label>
        </div>

        <Button type="button" onClick={() => h.autoGenerateRooms(tIdx, wIdx, fIdx, flatIdx)} className="mt-4 w-full">
          <Zap /> Auto-Generate Rooms
        </Button>
      </SectionCard>

      <SectionCard title="Room Types (Manual Selection)" description="Manually select additional room types if needed">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {ROOM_TYPES.map((roomType) => {
            const selected = !!h.isRoomSelected(flat, roomType);
            return (
              <Label
                key={roomType.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-control border p-3",
                  selected ? "border-primary bg-tone-info-soft" : "border-line bg-surface hover:bg-surface-muted"
                )}
              >
                <Checkbox checked={selected} onCheckedChange={() => h.toggleRoom(tIdx, wIdx, fIdx, flatIdx, roomType)} />
                <span className="text-small font-medium text-ink-2">{roomType.label}</span>
              </Label>
            );
          })}
        </div>

        {flat.rooms?.length > 0 && (
          <div className="mt-4 rounded-control border border-line bg-surface-muted p-3">
            <p className="mb-2 text-caption-lg font-semibold text-ink-2">Selected Rooms ({flat.rooms.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {flat.rooms.map((r, rIdx) => (
                <Badge key={`${r.type}-${rIdx}`} variant="neutral">
                  {r.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
