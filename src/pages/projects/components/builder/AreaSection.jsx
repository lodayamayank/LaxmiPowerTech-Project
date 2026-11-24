// src/pages/projects/components/builder/AreaSection.jsx
// Reusable block for Staircases / Podiums / Common Areas, plus the small numeric field used by the flat panel.
import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/FormField";

export function AreaSection({
  title, addLabel, emptyText, items, tone, nameClassName, namePlaceholder, secondField, secondPlaceholder, onAdd, onDelete, onUpdate,
}) {
  return (
    <div className={`rounded-card border p-4 ${tone.card}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className={`text-small font-semibold ${tone.title}`}>{title}</h4>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus /> {addLabel}
        </Button>
      </div>
      {!items || items.length === 0 ? (
        <p className="text-small text-ink-3">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-control border border-line bg-surface p-2">
              <Input
                type="text"
                value={item.name}
                onChange={(e) => onUpdate(idx, "name", e.target.value)}
                className={`h-control-sm ${nameClassName}`}
                placeholder={namePlaceholder}
                aria-label={namePlaceholder}
              />
              <Input
                type="text"
                value={item[secondField] || ""}
                onChange={(e) => onUpdate(idx, secondField, e.target.value)}
                className="h-control-sm flex-1"
                placeholder={secondPlaceholder}
                aria-label={secondPlaceholder}
              />
              <Button type="button" size="icon" variant="ghost" aria-label="Delete" onClick={() => onDelete(idx)} className="h-control-sm w-control-sm shrink-0 text-tone-bad-fg">
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CountInput({ label, value, onChange }) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id}>
      <Input
        id={id}
        type="number"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
      />
    </FormField>
  );
}
