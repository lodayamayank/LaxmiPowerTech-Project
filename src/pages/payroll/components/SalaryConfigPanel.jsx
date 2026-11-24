// src/pages/payroll/components/SalaryConfigPanel.jsx
// "Other amounts" editor (extra earnings / deductions added every month) for one employee.
// State and handlers live in useSalaryRun; this only renders them.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";

export default function SalaryConfigPanel({ userId, edit, onAdd, onUpdate, onRemove, onSave }) {
  if (!edit) return null;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h4 className="mb-3 text-small font-semibold text-ink-2">
        Other Amounts <span className="font-normal text-ink-3">(added/deducted each month)</span>
      </h4>

      <div className="space-y-3">
        {edit.items.length === 0 && <p className="text-caption text-ink-4">No other amounts added.</p>}

        {edit.items.map((it) => (
          <div key={it.key} className="flex flex-wrap items-end gap-3">
            <FormField label="Type" htmlFor={`type-${it.key}`}>
              <Select value={it.type} onValueChange={(v) => onUpdate(userId, it.key, "type", v)}>
                <SelectTrigger id={`type-${it.key}`} className="w-[150px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earning">Earning (+)</SelectItem>
                  <SelectItem value="deduction">Deduction (−)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Reason / Description" htmlFor={`label-${it.key}`} className="min-w-[200px] flex-1">
              <Input
                id={`label-${it.key}`}
                type="text"
                maxLength={100}
                placeholder="e.g. Performance bonus, Advance recovery"
                value={it.label}
                onChange={(e) => onUpdate(userId, it.key, "label", e.target.value)}
              />
            </FormField>

            <FormField label="Amount (₹)" htmlFor={`amount-${it.key}`}>
              <Input
                id={`amount-${it.key}`}
                type="number"
                min="0"
                value={it.amount}
                onChange={(e) => onUpdate(userId, it.key, "amount", e.target.value)}
                className="w-32"
              />
            </FormField>

            <Button size="sm" variant="reject" onClick={() => onRemove(userId, it.key)} disabled={edit.saving}>
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <Button size="sm" variant="outline" onClick={() => onAdd(userId)} disabled={edit.saving}>
          + Add Amount
        </Button>
        <Button size="sm" onClick={() => onSave(userId)} disabled={edit.saving}>
          {edit.saving ? "Saving..." : "Save All"}
        </Button>
      </div>
    </div>
  );
}
