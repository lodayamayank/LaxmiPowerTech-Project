// src/pages/supervisor/components/LabourFormFields.jsx
// The labour fields shared by "Add labour" and "Labour details" (mobile). `onChange` receives the same
// `{ target: { name, value } }` shape as a native input event, so the pages' handleChange is unchanged.
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";
import MobileCard from "@/layouts/mobile/MobileCard";

const LABOUR_TYPES = ["Mason", "M/F helper", "Carpenter", "Electrician", "Plumber", "Painter", "Helper", "Other"];
const WAGE_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const HOURS = ["4", "6", "8", "10", "12"];

export default function LabourFormFields({ formData, onChange, disabled }) {
  const pick = (name) => (value) => onChange({ target: { name, value } });
  return (
    <>
      <MobileCard title="Labour" className="flex flex-col gap-3.5">
        <FormField label="Full name" htmlFor="labour-name" required>
          <Input id="labour-name" name="name" value={formData.name} onChange={onChange} placeholder="Enter full name" disabled={disabled} />
        </FormField>
        <FormField label="Labour type" htmlFor="labour-type" required>
          <Select value={formData.labourType || undefined} onValueChange={pick("labourType")} disabled={disabled}>
            <SelectTrigger id="labour-type">
              <SelectValue placeholder="Select labour type" />
            </SelectTrigger>
            <SelectContent>
              {LABOUR_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Username" htmlFor="labour-username">
          <Input id="labour-username" name="username" value={formData.username} onChange={onChange} placeholder="Username" disabled={disabled} />
        </FormField>
        <FormField label="Mobile number" htmlFor="labour-mobile">
          <Input id="labour-mobile" type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={onChange} placeholder="Enter mobile number" disabled={disabled} />
        </FormField>
        <FormField label="Emergency contact" htmlFor="labour-emergency">
          <Input id="labour-emergency" type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={onChange} placeholder="Enter emergency contact" disabled={disabled} />
        </FormField>
      </MobileCard>

      <MobileCard title="Wages" className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <FormField label="Wage type" htmlFor="labour-wage-type">
            <Select value={formData.wageType} onValueChange={pick("wageType")} disabled={disabled}>
              <SelectTrigger id="labour-wage-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAGE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Working hours" htmlFor="labour-hours">
            <Select value={formData.workingHours} onValueChange={pick("workingHours")} disabled={disabled}>
              <SelectTrigger id="labour-hours">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h} hrs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <FormField label={"Daily wage (\u20b9)"} htmlFor="labour-daily-wage">
            <Input id="labour-daily-wage" type="number" name="dailyWage" value={formData.dailyWage} onChange={onChange} placeholder="Enter amount" disabled={disabled} />
          </FormField>
          <FormField label={"Overtime rate (\u20b9/hr)"} htmlFor="labour-overtime-rate">
            <Input id="labour-overtime-rate" type="number" name="overtimeWage" value={formData.overtimeWage} onChange={onChange} placeholder="Enter rate" disabled={disabled} />
          </FormField>
        </div>
      </MobileCard>
    </>
  );
}
