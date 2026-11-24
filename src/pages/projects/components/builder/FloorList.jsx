// src/pages/projects/components/builder/FloorList.jsx
// Floors of one wing (each with its flats). Rows are plain: the builder mutates its state in place, so rows re-render with the tree.
import { DoorOpen, Layers, Plus, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import FlatPanel from "./FlatPanel";
import { FLAT_TYPES } from "./hierarchyConstants";

const TRIGGER = "h-8 w-8 flex-none justify-center rounded p-1 text-ink-3 hover:text-ink-1 hover:no-underline";
const DELETE = "h-control-sm w-control-sm shrink-0 text-tone-bad-fg";

function FlatRow({ flat, flatIdx, tIdx, wIdx, fIdx, h }) {
  const flatKey = `${tIdx}-${wIdx}-${fIdx}-${flatIdx}`;
  const upd = (field, value) => h.updateFlat(tIdx, wIdx, fIdx, flatIdx, field, value);
  return (
    <AccordionItem value={`flat-${flatKey}`} className="rounded-card border border-line bg-surface">
      <div className="p-3">
        <div className="flex items-center gap-2">
          <AccordionTrigger aria-label={`Toggle flat ${flat.name || flatIdx + 1}`} className={TRIGGER} />
          <DoorOpen className="size-4 shrink-0 text-tone-ok-fg" aria-hidden="true" />
          <Input type="text" value={flat.name} onChange={(e) => upd("name", e.target.value)} placeholder="Flat Name" aria-label="Flat name" className="h-control-sm flex-1 font-medium" />
          <Input type="text" value={flat.flatNumber || ""} onChange={(e) => upd("flatNumber", e.target.value)} placeholder="Flat No." aria-label="Flat number" className="h-control-sm w-24 flex-none" />
          <Select value={flat.flatType || "2BHK"} onValueChange={(val) => h.handleFlatTypeChange(tIdx, wIdx, fIdx, flatIdx, val)}>
            <SelectTrigger aria-label="Flat type" className="h-control-sm w-32 flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLAT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="icon" variant="ghost" aria-label="Delete flat" onClick={() => h.deleteFlat(tIdx, wIdx, fIdx, flatIdx)} className={DELETE}>
            <Trash2 />
          </Button>
        </div>
      </div>
      <AccordionContent>
        <FlatPanel flat={flat} tIdx={tIdx} wIdx={wIdx} fIdx={fIdx} flatIdx={flatIdx} h={h} />
      </AccordionContent>
    </AccordionItem>
  );
}

function FloorRow({ floor, fIdx, tIdx, wIdx, h }) {
  const floorKey = `${tIdx}-${wIdx}-${fIdx}`;
  return (
    <AccordionItem value={`floor-${floorKey}`} className={cn("rounded-card border border-line", floor.isBasement ? "bg-surface-muted" : "bg-tone-info-soft")}>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <AccordionTrigger aria-label={`Toggle floor ${floor.name || fIdx + 1}`} className={TRIGGER} />
          <Layers className={cn("size-4 shrink-0", floor.isBasement ? "text-ink-3" : "text-tone-info-fg")} aria-hidden="true" />
          <Input type="text" value={floor.name} onChange={(e) => h.updateFloor(tIdx, wIdx, fIdx, "name", e.target.value)} placeholder="Floor Name" aria-label="Floor name" className="flex-1 font-medium" />
          <Button type="button" size="sm" variant="outline" onClick={() => h.addFlat(tIdx, wIdx, fIdx)}>
            <Plus /> Unit
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Delete floor" onClick={() => h.deleteFloor(tIdx, wIdx, fIdx)} className={DELETE}>
            <Trash2 />
          </Button>
        </div>
      </div>
      <AccordionContent className="p-3 pt-0">
        {floor.flats?.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No units added" description='Click "Add Unit" to add units to this floor.' />
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {floor.flats.map((flat, flatIdx) => (
              <FlatRow key={flatIdx} flat={flat} flatIdx={flatIdx} tIdx={tIdx} wIdx={wIdx} fIdx={fIdx} h={h} />
            ))}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function FloorList({ wing, tIdx, wIdx, h }) {
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button type="button" size="sm" onClick={() => h.addFloor(tIdx, wIdx)}>
          <Plus /> Add Floor
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => h.addBasement(tIdx, wIdx)}>
          <Plus /> Add Basement
        </Button>
      </div>
      {wing.floors?.length === 0 ? (
        <EmptyState icon={Layers} title="No floors added yet" description="Add a floor or basement to get started." />
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {wing.floors.map((floor, fIdx) => (
            <FloorRow key={fIdx} floor={floor} fIdx={fIdx} tIdx={tIdx} wIdx={wIdx} h={h} />
          ))}
        </Accordion>
      )}
    </div>
  );
}
