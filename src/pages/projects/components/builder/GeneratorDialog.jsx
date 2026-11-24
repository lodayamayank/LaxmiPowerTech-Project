// src/pages/projects/components/builder/GeneratorDialog.jsx
// Smart Tower Generator dialog: same fields, same defaults, same preview text as the old modal. Logic stays in SmartTowerBuilder.
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";
import {
  BASEMENT_MIX_PRESETS, BUILDING_USE_OPTIONS, COMMERCIAL_MIX_PRESETS, FLAT_TYPES, ROOM_TYPES,
  formatCommercialMix, parseNonNegativeInt, parsePositiveInt,
} from "./generatorConstants";
import MixControls from "./MixControls";
import OptionTile from "./OptionTile";

const BASEMENT_OPTIONS = [
  { value: "none", label: "No Basement" },
  { value: "b1", label: "B1" },
  { value: "b1_b2", label: "B1 + B2" },
  { value: "custom", label: "Custom" },
];

/** A toggle (podium / common areas / staircases) with an optional count field. */
function CountToggle({ id, label, checked, onChecked, countLabel, value, onValue, hint }) {
  return (
    <div className="rounded-card border border-line bg-surface-muted p-4">
      <label className="flex cursor-pointer items-center gap-3">
        <Checkbox checked={checked} onCheckedChange={onChecked} />
        <span className="text-small font-semibold text-ink-1">{label}</span>
      </label>
      {checked && (
        <FormField label={countLabel} htmlFor={id} hint={hint} className="mt-3">
          <Input id={id} type="number" min="1" max="10" value={value} onChange={(e) => onValue(e.target.value)} placeholder="Enter number (e.g., 1, 2, 3)" />
        </FormField>
      )}
    </div>
  );
}

export default function GeneratorDialog({ g }) {
  const {
    open, onClose, towerConfig, setTowerConfig, setConfigFlag, handleNumberInputChange, handleResidentialFlatTypeChange,
    toggleRoom, getPreviewCounts, saveGeneratedTower,
  } = g;
  const set = (field) => (value) => setTowerConfig({ ...towerConfig, [field]: value });
  const commercial = ["commercial", "mixed"].includes(towerConfig.buildingUse);
  const residential = towerConfig.buildingUse !== "commercial";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-line px-6 py-4 text-left">
          <DialogTitle>Smart Tower Generator</DialogTitle>
          <DialogDescription>Configure once and generate complete structure automatically</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          <FormField label="Tower Name" htmlFor="gen-tower-name">
            <Input id="gen-tower-name" type="text" value={towerConfig.towerName} onChange={(e) => set("towerName")(e.target.value)} placeholder="e.g., Tower A, Sunrise Block" />
          </FormField>

          <div>
            <p className="mb-3 text-small font-semibold text-ink-1">Building Usage</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {BUILDING_USE_OPTIONS.map((option) => (
                <OptionTile key={option.value} selected={towerConfig.buildingUse === option.value} onClick={() => set("buildingUse")(option.value)} className="p-4">
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-caption-lg text-ink-3">{option.hint}</span>
                </OptionTile>
              ))}
            </div>
          </div>

          <CountToggle
            id="gen-podium-count"
            label="🏛️ Does this tower have Podium?"
            checked={towerConfig.hasPodium}
            onChecked={(checked) => setConfigFlag("hasPodium", checked)}
            countLabel="Number of Podiums"
            value={towerConfig.podiumCount}
            onValue={set("podiumCount")}
            hint="Will generate: P1, P2, P3..."
          />
          <CountToggle
            id="gen-common-count"
            label="🏢 Does this tower have Common Areas?"
            checked={towerConfig.hasCommonArea}
            onChecked={(checked) => setConfigFlag("hasCommonArea", checked)}
            countLabel="Number of Common Areas"
            value={towerConfig.commonAreaCount}
            onValue={set("commonAreaCount")}
            hint="Will generate: CA1, CA2, CA3... (Gym, Pool, etc.)"
          />
          <CountToggle
            id="gen-stair-count"
            label="🪜 Does this tower have Staircases?"
            checked={towerConfig.hasStaircase}
            onChecked={(checked) => setConfigFlag("hasStaircase", checked)}
            countLabel="Number of Staircases"
            value={towerConfig.staircaseCount}
            onValue={set("staircaseCount")}
            hint="Will generate: Staircase 1, Staircase 2, Staircase 3..."
          />

          <div>
            <p className="mb-2 text-small font-semibold text-ink-1">🅱️ Basement Configuration</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {BASEMENT_OPTIONS.map((option) => (
                <OptionTile key={option.value} selected={towerConfig.basementType === option.value} onClick={() => set("basementType")(option.value)} className="items-center justify-center py-3 text-center">
                  {option.label}
                </OptionTile>
              ))}
            </div>
            {towerConfig.basementType === "custom" && (
              <Input type="number" min="1" max="10" value={towerConfig.customBasements} onChange={(e) => set("customBasements")(e.target.value)} placeholder="Number of basement levels" className="mt-3" aria-label="Number of basement levels" />
            )}
          </div>

          <FormField label="🏢 Total Floors Above Ground" htmlFor="gen-total-floors" hint={`System will auto-generate: Ground Floor + ${towerConfig.totalFloors || 0} upper floors`}>
            <Input id="gen-total-floors" type="number" min="0" max="100" value={towerConfig.totalFloors} onChange={(e) => set("totalFloors")(e.target.value)} placeholder="Enter floors above ground (e.g., 0, 10, 20, 40)" />
          </FormField>

          {commercial && (
            <div className="space-y-4 rounded-card border border-line bg-surface-muted p-4">
              <h4 className="text-small font-semibold text-ink-1">Commercial Configuration</h4>
              {towerConfig.buildingUse === "mixed" && (
                <FormField
                  label="Commercial Floors Above Ground"
                  htmlFor="gen-commercial-floors"
                  hint="Ground floor is commercial by default; upper floors after this count become residential."
                >
                  <Input
                    id="gen-commercial-floors"
                    type="number"
                    min="0"
                    max={parseNonNegativeInt(towerConfig.totalFloors, 0)}
                    value={towerConfig.commercialFloors}
                    onChange={(e) => handleNumberInputChange("commercialFloors", e.target.value)}
                    placeholder="e.g., 1 for 1st floor commercial"
                  />
                </FormField>
              )}
              <MixControls
                g={g}
                title="Commercial Floor Mix"
                subtitle="Pick a preset, then adjust only the small changes you need."
                presetField="commercialPreset"
                mixField="commercialMix"
                presets={COMMERCIAL_MIX_PRESETS}
              />
              {towerConfig.basementType !== "none" && (
                <div className="border-t border-line pt-4">
                  <MixControls
                    g={g}
                    title="Basement Unit Mix"
                    subtitle="Use this when basement has godowns, offices, stores, or support rooms."
                    presetField="basementPreset"
                    mixField="basementMix"
                    presets={BASEMENT_MIX_PRESETS}
                  />
                </div>
              )}
            </div>
          )}

          {residential && (
            <div>
              <p className="mb-2 text-small font-semibold text-ink-1">🚪 Residential Flats Per Floor</p>
              <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                {[1, 2, 3, 4, 6, 8].map((num) => (
                  <OptionTile
                    key={num}
                    selected={parsePositiveInt(towerConfig.defaultFlatsPerFloor, 1) === num}
                    onClick={() => set("defaultFlatsPerFloor")(num)}
                    className="items-center justify-center py-3 text-center text-card-title"
                  >
                    {num}
                  </OptionTile>
                ))}
              </div>
              <Input
                type="number"
                min="1"
                max="50"
                value={towerConfig.defaultFlatsPerFloor}
                onChange={(e) => handleNumberInputChange("defaultFlatsPerFloor", e.target.value)}
                placeholder="Or enter custom number (e.g., 5, 7, 10)"
                className="mt-2"
                aria-label="Custom flats per floor"
              />
            </div>
          )}

          {residential && (
            <FormField label="🏠 Residential Flat Type" htmlFor="gen-flat-type">
              <Select value={towerConfig.defaultFlatType} onValueChange={handleResidentialFlatTypeChange}>
                <SelectTrigger id="gen-flat-type">
                  <SelectValue placeholder="Select flat type" />
                </SelectTrigger>
                <SelectContent>
                  {FLAT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {residential && (
            <div className="rounded-card border border-line bg-surface-muted p-4">
              <h4 className="mb-3 text-small font-semibold text-ink-1">🛏️ Room Configuration</h4>
              <div className="mb-3 grid grid-cols-3 gap-4">
                {[
                  ["bedroomCount", "Bedrooms"],
                  ["bathroomCount", "Bathrooms"],
                  ["balconyCount", "Balconies"],
                ].map(([field, label]) => (
                  <FormField key={field} label={label} htmlFor={`gen-${field}`}>
                    <Input id={`gen-${field}`} type="number" min="0" max="10" value={towerConfig[field]} onChange={(e) => handleNumberInputChange(field, e.target.value)} />
                  </FormField>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-small">
                  <Checkbox checked={towerConfig.hasLivingRoom} onCheckedChange={(checked) => setConfigFlag("hasLivingRoom", checked)} />
                  <span>Living Room / Hall</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-small">
                  <Checkbox checked={towerConfig.hasKitchen} onCheckedChange={(checked) => setConfigFlag("hasKitchen", checked)} />
                  <span>Kitchen</span>
                </label>
              </div>
              <div className="mt-3 rounded-control border border-line bg-surface p-2">
                <p className="text-caption-lg text-ink-2">
                  <strong>Will generate:</strong>
                  {towerConfig.hasLivingRoom && " Living Room/Hall,"}
                  {parseNonNegativeInt(towerConfig.bedroomCount, 0) > 0 && ` Bedroom 1-${towerConfig.bedroomCount},`}
                  {towerConfig.hasKitchen && " Kitchen,"}
                  {parseNonNegativeInt(towerConfig.bathroomCount, 0) > 0 && ` Bathroom 1-${towerConfig.bathroomCount},`}
                  {parseNonNegativeInt(towerConfig.balconyCount, 0) > 0 && ` Balcony 1-${towerConfig.balconyCount}`}
                </p>
              </div>
            </div>
          )}

          {residential && (
            <div>
              <p className="mb-1 text-small font-semibold text-ink-1">🏠 Additional Room Types (Optional - for special rooms)</p>
              <p className="mb-3 text-caption-lg text-ink-3">Select additional rooms like Dining, Study, Pooja Room, Terrace, etc.</p>
              <div className="grid grid-cols-2 gap-3">
                {ROOM_TYPES.map((room) => {
                  const on = towerConfig.defaultRooms.includes(room.value);
                  return (
                    <label
                      key={room.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 ${on ? "border-primary bg-tone-info-soft" : "border-line bg-surface hover:bg-surface-muted"}`}
                    >
                      <Checkbox checked={on} onCheckedChange={() => toggleRoom(room.value)} />
                      <span className="text-card-title">{room.icon}</span>
                      <span className="text-small font-medium text-ink-1">{room.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-caption-lg text-ink-3">Selected: {towerConfig.defaultRooms.length} room types</p>
            </div>
          )}

          <div className="rounded-card border border-line bg-tone-ok-soft p-4">
            <p className="mb-2 text-small font-semibold text-ink-1">✨ Preview:</p>
            <ul className="space-y-1 text-small text-ink-2">
              <li>
                • Usage:{" "}
                {BUILDING_USE_OPTIONS.find((option) => option.value === towerConfig.buildingUse)?.label}
              </li>
              {towerConfig.hasPodium && (
                <li>
                  • 🏛️ Podiums: {towerConfig.podiumCount || 1} (P1, P2,
                  P3...)
                </li>
              )}
              {towerConfig.hasCommonArea && (
                <li>
                  • 🏢 Common Areas: {towerConfig.commonAreaCount || 1}{" "}
                  (CA1, CA2, CA3...)
                </li>
              )}
              {towerConfig.hasStaircase && (
                <li>
                  • 🪜 Staircases: {towerConfig.staircaseCount || 1}{" "}
                  (Staircase 1, Staircase 2...)
                </li>
              )}
              <li>
                •{" "}
                {towerConfig.basementType !== "none"
                  ? `Basements: ${
                      towerConfig.basementType === "custom"
                        ? towerConfig.customBasements || 0
                        : towerConfig.basementType === "b1_b2"
                        ? "2 (B2, B1)"
                        : "1 (B1)"
                    }`
                  : "No basements"}
              </li>
              <li>
                • Floors: Ground Floor + {towerConfig.totalFloors || 0}{" "}
                upper floors + {getPreviewCounts().basementCount} basements
                = {getPreviewCounts().totalFloors} total
              </li>
              {commercial && (
                <li>
                  • Commercial:{" "}
                  {getPreviewCounts().commercialFloorsWithGround} floor(s),{" "}
                  {formatCommercialMix(towerConfig.commercialMix)} per
                  commercial floor
                </li>
              )}
              {commercial && towerConfig.basementType !== "none" && (
                <li>
                  • Basement:{" "}
                  {formatCommercialMix(towerConfig.basementMix)} per
                  basement level
                </li>
              )}
              {residential && (
                <li>
                  • Residential:{" "}
                  {getPreviewCounts().residentialFloorsWithGround} floor(s),{" "}
                  {towerConfig.defaultFlatsPerFloor} flat(s) per residential
                  floor
                </li>
              )}
              <li>
                • Total units:{" "}
                {getPreviewCounts().commercialUnits +
                  getPreviewCounts().residentialUnits}
              </li>
              {residential && (
                <li>
                  • Rooms per residential flat:{" "}
                  {parseNonNegativeInt(towerConfig.bedroomCount, 0)}{" "}
                  Bedrooms,{" "}
                  {parseNonNegativeInt(towerConfig.bathroomCount, 0)}{" "}
                  Bathrooms,{" "}
                  {parseNonNegativeInt(towerConfig.balconyCount, 0)}{" "}
                  Balconies +{" "}
                  {(towerConfig.hasLivingRoom ? 1 : 0) +
                    (towerConfig.hasKitchen ? 1 : 0)}{" "}
                  other rooms
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t border-line px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={saveGeneratedTower}>
            <Check /> Generate Tower
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
