// src/pages/team/components/AddEmployeeModal.jsx
// "Add team member" side panel, laid out like the Add member design (same props as before: open, onOpenChange, onCreated).
// Form logic lives in useAddMember.js.
import { Camera, Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetPanel, SheetPanelBody, SheetPanelFooter, SheetPanelHeader } from "@/components/ui/sheet";
import { FormField } from "@/components/common/FormField";
import { RadioCards } from "@/components/common/RadioCards";
import { ROLES } from "@/lib/constants";
import { useBranches } from "@/hooks/useBranches";
import BranchPicker from "./BranchPicker";
import useAddMember, { roleLabel, roleValue } from "./useAddMember";

const SALARY_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
];

const AddEmployeeModal = ({ open, onOpenChange, onCreated }) => {
  const m = useAddMember({ open, onOpenChange, onCreated });
  const { data: branchesRaw } = useBranches();
  const branches = branchesRaw.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const { formData, roleOptions, showPassword, setShowPassword, submitting, setUsernameTouched, errors, handleOpenChange, set, setName, toggleBranch, submit } = m;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetPanel className="sm:max-w-[520px]">
        <SheetPanelHeader className="px-6 py-5" title="Add team member" description="They can sign in to the mobile app once created." />
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
        >
          <SheetPanelBody className="space-y-[18px] p-6">
            <div className="flex items-center gap-4">
              <Button type="button" variant="ghost" aria-label="Upload profile photo" onClick={() => toast.info("Profile photo upload is not available yet")} className="!size-16 shrink-0 rounded-full bg-surface-muted text-ink-3 hover:bg-surface-muted">
                <Camera className="!size-6" />
              </Button>
              <div>
                <div className="text-body font-semibold text-ink-1">Profile photo</div>
                <div className="text-caption-lg text-ink-3">Used to match attendance selfies. Optional.</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="add-member-name" required error={errors.name}>
                <Input id="add-member-name" autoFocus placeholder="e.g. Rahul Kannaujiya" value={formData.name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Mobile" htmlFor="add-member-mobile" error={errors.mobileNumber}>
                <Input id="add-member-mobile" inputMode="numeric" maxLength={10} placeholder="10-digit number" value={formData.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value.replace(/\D/g, ""))} />
              </FormField>
              <FormField label="Username" htmlFor="add-member-username" required error={errors.username}>
                <Input
                  id="add-member-username"
                  placeholder="Used to sign in"
                  value={formData.username}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    set("username", e.target.value);
                  }}
                />
              </FormField>
              <FormField label="Employee ID" htmlFor="add-member-empid">
                <Input id="add-member-empid" placeholder="Optional, e.g. EMP-014" value={formData.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
              </FormField>
            </div>

            <FormField label="Role" error={errors.role}>
              <RadioCards aria-label="Role" value={formData.role} onChange={(v) => set("role", v)} options={(Array.isArray(roleOptions) ? roleOptions : []).map((r) => ({ value: roleValue(r), label: roleLabel(r) }))} />
            </FormField>

            {formData.role !== ROLES.admin && (
              <FormField label="Branches" htmlFor="add-member-branches" hint="Geofence check uses these branches at punch-in.">
                <BranchPicker id="add-member-branches" branches={branches} selectedIds={formData.assignedBranches} onToggle={toggleBranch} tone="highlight" />
              </FormField>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Salary type" htmlFor="add-member-salary-type">
                <Select value={formData.salaryType} onValueChange={(v) => set("salaryType", v)}>
                  <SelectTrigger id="add-member-salary-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Monthly CTC (₹)" htmlFor="add-member-ctc" error={errors.ctcAmount}>
                <Input id="add-member-ctc" inputMode="decimal" placeholder="0" value={formData.ctcAmount} onChange={(e) => set("ctcAmount", e.target.value.replace(/[^\d.]/g, ""))} />
              </FormField>
            </div>

            <FormField label="Temporary password" htmlFor="add-member-password">
              <div className="relative">
                <Input id="add-member-password" type={showPassword ? "text" : "password"} className="pr-11" placeholder="They’ll be asked to change it" value={formData.password} onChange={(e) => set("password", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-control-sm w-control-sm -translate-y-1/2 text-ink-3" title={showPassword ? "Hide" : "Show"} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((p) => !p)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </FormField>
          </SheetPanelBody>
          <SheetPanelFooter className="justify-end px-6 py-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              <UserPlus /> {submitting ? "Saving…" : "Create member"}
            </Button>
          </SheetPanelFooter>
        </form>
      </SheetPanel>
    </Sheet>
  );
};

export default AddEmployeeModal;
