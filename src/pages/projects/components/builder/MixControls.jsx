// src/pages/projects/components/builder/MixControls.jsx
// Commercial / basement unit-mix picker (preset tiles + per-unit counts). Same fields and handlers as before.
import { Input } from "@/components/ui/input";
import { COMMERCIAL_UNIT_TYPES, formatCommercialMix } from "./generatorConstants";
import OptionTile from "./OptionTile";

export default function MixControls({ g, title, subtitle, presetField, mixField, presets }) {
  const { towerConfig, applyMixPreset, updateMixCount } = g;
  const selectedPreset = towerConfig[presetField];
  const mix = towerConfig[mixField];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-small font-semibold text-ink-1">{title}</p>
        <p className="text-caption-lg text-ink-3">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {presets.map((preset) => (
          <OptionTile key={preset.value} selected={selectedPreset === preset.value} onClick={() => applyMixPreset(presetField, mixField, preset)}>
            <span className="text-small font-semibold">{preset.label}</span>
            <span className="text-caption text-ink-3">{preset.hint}</span>
          </OptionTile>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {COMMERCIAL_UNIT_TYPES.map((unit) => (
          <label key={unit.value} className="rounded-card border border-line bg-surface p-3">
            <span className="block text-caption-lg font-semibold text-ink-2">{unit.label}</span>
            <Input
              type="number"
              min="0"
              max="50"
              value={mix?.[unit.value] ?? ""}
              onChange={(e) => updateMixCount(presetField, mixField, unit.value, e.target.value)}
              className="mt-2"
            />
          </label>
        ))}
      </div>
      <p className="text-caption-lg text-ink-3">
        Will generate per floor: <strong>{formatCommercialMix(mix)}</strong>
      </p>
    </div>
  );
}
