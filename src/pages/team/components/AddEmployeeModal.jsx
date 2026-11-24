// src/pages/team/components/AddEmployeeModal.jsx
// "Add team member" side panel (same props as before: open, onOpenChange, onCreated). Form logic lives in useAddMember.js.
import { Check, Eye, EyeOff, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetPanel, SheetPanelBody, SheetPanelFooter, SheetPanelHeader } from "@/components/ui/sheet";
import { FormField } from "@/components/common/FormField";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import useAddMember, { roleLabel, roleValue } from "./useAddMember";

const AddEmployeeModal = ({ open, onOpenChange, onCreated }) => {
  const m = useAddMember({ open, onOpenChange, onCreated });
  const {
    formData, roleOptions, showPassword, setShowPassword, submitting, setUsernameTouched, branchQuery, setBranchQuery, errors,
    filteredBranches, handleOpenChange, set, setName, toggleBranch, allSelected, toggleAll, submit,
  } = m;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetPanel>
        <SheetPanelHeader title="Add team member" description="They can sign in to the mobile app once created." />
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
        >
          <SheetPanelBody className="space-y-5">
            <FormField label="Full name" htmlFor="add-member-name" required error={errors.name}>
              <Input id="add-member-name" autoFocus placeholder="e.g. Ravi Kumar" value={formData.name} onChange={(e) => setName(e.target.value)} />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Mobile" htmlFor="add-member-mobile" error={errors.mobileNumber}>
                <Input
                  id="add-member-mobile"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={formData.mobileNumber}
                  onChange={(e) => set("mobileNumber", e.target.value.replace(/\D/g, ""))}
                />
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
            </div>

            <FormField label="Role" error={errors.role}>
              <SegmentedControl
                aria-label="Role"
                className="max-w-full overflow-x-auto"
                value={formData.role}
                onChange={(v) => set("role", v)}
                options={(Array.isArray(roleOptions) ? roleOptions : []).map((r) => ({ value: roleValue(r), label: roleLabel(r) }))}
              />
            </FormField>

            {formData.role !== ROLES.admin && (
              <FormField label="Branches" hint="Geofence check uses these branches at punch-in.">
                <div className="space-y-2 rounded-card border border-line-card p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {formData.assignedBranches.length === 0 ? <span className="text-small text-ink-3">No branches selected</span> : null}
                    {filteredBranches
                      .filter((b) => formData.assignedBranches.includes(b._id))
                      .map((b) => (
                        <Button key={b._id} type="button" size="sm" variant="secondary" className="h-control-sm rounded-full px-3" onClick={() => toggleBranch(b._id)} aria-label={`Remove ${b.name}`}>
                          {b.name} <X />
                        </Button>
                      ))}
                  </div>
                  <div className="flex items-center gap-2 border-t border-line pt-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" aria-hidden="true" />
                      <Input className="h-control-sm pl-8" placeholder="Search branches" aria-label="Search branches" value={branchQuery} onChange={(e) => setBranchQuery(e.target.value)} />
                    </div>
                    <span className="text-caption-lg text-ink-3">{formData.assignedBranches.length} selected</span>
                    <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                      {allSelected ? "Clear" : "Select all"}
                    </Button>
                  </div>
                  <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                    {filteredBranches.length === 0 && <p className="text-small text-ink-3">No branches found</p>}
                    {filteredBranches.map((branch) => {
                      const on = formData.assignedBranches.includes(branch._id);
                      return (
                        <Button
                          key={branch._id}
                          type="button"
                          size="sm"
                          variant={on ? "default" : "outline"}
                          aria-pressed={on}
                          className={cn("h-control-sm rounded-full px-3 font-normal", !on && "text-ink-2")}
                          onClick={() => toggleBranch(branch._id)}
                        >
                          {on ? <Check /> : null}
                          {branch.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </FormField>
            )}

            <FormField label="Temporary password" htmlFor="add-member-password" hint="Leave as default123 or set one. Share it with the user after saving.">
              <div className="relative">
                <Input
                  id="add-member-password"
                  type={showPassword ? "text" : "password"}
                  className="pr-11"
                  value={formData.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-control-sm w-control-sm -translate-y-1/2 text-ink-3"
                  title={showPassword ? "Hide" : "Show"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </FormField>
          </SheetPanelBody>
          <SheetPanelFooter className="flex-wrap">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => submit(true)} disabled={submitting}>
                Save &amp; add another
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Create member"}
              </Button>
            </div>
          </SheetPanelFooter>
        </form>
      </SheetPanel>
    </Sheet>
  );
};

export default AddEmployeeModal;
