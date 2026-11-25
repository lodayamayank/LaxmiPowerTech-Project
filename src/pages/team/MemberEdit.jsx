// src/pages/team/MemberEdit.jsx  (route: /admin/my-team/:userId/edit)
// Full-page member editor, laid out like the Member edit design. The form state, save request and set-password request
// live in components/useMemberEdit.js (moved unchanged from the old edit dialog).
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Banknote, Briefcase, IdCard, KeyRound, Lock, TriangleAlert, User, Wallet } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { FormField } from "@/components/common/FormField";
import { Notice } from "@/components/common/Notice";
import { RadioCards } from "@/components/common/RadioCards";
import { SectionCard } from "@/components/common/SectionCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { queryClient } from "@/lib/queryClient";
import { ROUTES } from "@/lib/routes";
import { USERS_KEY } from "@/hooks/useUsers";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { cn } from "@/lib/utils";
import BranchPicker from "./components/BranchPicker";
import useMemberEdit from "./components/useMemberEdit";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "supervisor", label: "Supervisor" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "labour", label: "Labour" },
];
const SECTIONS = [
  { id: "basic", label: "Basic info", icon: <User /> },
  { id: "personal", label: "Personal", icon: <IdCard /> },
  { id: "employment", label: "Employment", icon: <Briefcase /> },
  { id: "salary", label: "Salary", icon: <Wallet /> },
  { id: "allow", label: "Allowances & overtime", icon: <Banknote /> },
  { id: "security", label: "Security", icon: <Lock /> },
];
const GRID = "grid grid-cols-1 gap-[18px] sm:grid-cols-2";
const day = (v) => (typeof v === "string" ? v.split("T")[0] : "") || "";

const MemberEdit = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const profilePath = `${ROUTES.myTeam}/${userId}`;
  const e = useMemberEdit(userId, () => {
    queryClient.invalidateQueries({ queryKey: USERS_KEY });
    navigate(profilePath);
  });
  const { user, loading, loadError, form, setField, handleChange, handleSubmit, passwordForm, setPasswordForm, passwordSaving, handlePasswordSubmit, passwordKeyDown, branches, projects, dirty, discard } = e;
  const [active, setActive] = useState("basic");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver((entries) => entries.forEach((en) => en.isIntersecting && setActive(en.target.id)), { rootMargin: "-20% 0px -65% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading, user]);

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }
  if (loadError || !user) {
    return (
      <DashboardLayout>
        <SectionCard>
          <EmptyState title={loadError || "Member not found"} action={<Button variant="outline" asChild><Link to={ROUTES.myTeam}>Back to My team</Link></Button>} />
        </SectionCard>
      </DashboardLayout>
    );
  }

  const digits = String(form.mobileNumber || "").replace(/\s/g, "");
  const mobileError = digits && !/^\d{10}$/.test(digits) ? `Mobile numbers have 10 digits. This one has ${digits.length}.` : "";
  const errorCount = mobileError ? 1 : 0;
  const month = new Date().toLocaleDateString("en-IN", { month: "long" });
  const toggleBranch = (id) => setField("assignedBranches")((form.assignedBranches || []).includes(id) ? form.assignedBranches.filter((b) => b !== id) : [...(form.assignedBranches || []), id]);
  const jump = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  // Radix reports "" when the stored value is not (yet) one of the options; ignore that so loading never edits the form.
  const select = (name, options, placeholder) => (
    <Select value={form[name] || ""} onValueChange={(v) => v && setField(name)(v)}>
      <SelectTrigger id={`edit-${name}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const text = (name, label, props = {}, hint) => (
    <FormField label={label} htmlFor={`edit-${name}`} hint={hint}>
      <Input id={`edit-${name}`} name={name} value={form[name] ?? ""} onChange={handleChange} {...props} />
    </FormField>
  );

  const doDelete = async () => {
    try {
      await axios.delete(`/users/${userId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      navigate(ROUTES.myTeam);
    } catch (err) {
      console.error("Failed to delete user", err);
      toast.error("Failed to delete user");
    }
    setConfirmDelete(false);
  };

  return (
    <DashboardLayout>
      <Link to={profilePath} className="inline-flex w-max items-center gap-1.5 text-body font-semibold text-primary hover:text-primary-strong">
        <ArrowLeft className="size-4" /> Back to profile
      </Link>

      <div className="flex flex-wrap items-center gap-3.5">
        <UserAvatar name={user.name} tone="purple" className="size-12 rounded-2xl" />
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-primary">Edit {user.name}</h1>
          <div className="text-body text-ink-3">
            @{user.username} · <span className="capitalize">{user.role}</span>
            {user.employeeId ? <> · <span className="font-data text-small">{user.employeeId}</span></> : null}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-6">
        <nav aria-label="Form sections" className="sticky top-4 hidden w-[220px] shrink-0 flex-col gap-0.5 lg:flex">
          {SECTIONS.map(({ id, label, icon }) => (
            <Button key={id} type="button" variant="ghost" onClick={() => jump(id)} className={cn("justify-start gap-2.5 px-2.5", active === id ? "bg-primary-soft font-semibold text-primary hover:bg-primary-soft" : "font-medium text-ink-2")}>
              {icon} {label}
            </Button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 basis-[560px] flex-col gap-4">
          <SectionCard id="basic" title="Basic info" description="Name, login and where they work" className="scroll-mt-4">
            <div className={GRID}>
              {text("name", "Full name")}
              {text("username", "Username")}
              <FormField label="Mobile number" htmlFor="edit-mobileNumber" error={mobileError}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-body text-ink-3">+91</span>
                  <Input id="edit-mobileNumber" name="mobileNumber" value={form.mobileNumber ?? ""} onChange={handleChange} aria-invalid={mobileError ? true : undefined} className={cn("pl-11", mobileError && "border-tone-bad-fg ring-2 ring-tone-bad-soft")} />
                </div>
              </FormField>
              <FormField label="Project" htmlFor="edit-project">
                {select("project", projects.map((p) => ({ value: p._id, label: p.name })), "Select project")}
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Role">
                  <RadioCards aria-label="Role" className="flex flex-wrap" value={form.role} onChange={setField("role")} options={ROLE_OPTIONS} />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Assigned branches" htmlFor="edit-branches" hint="Punch-in is only allowed inside these branches’ geofence.">
                  <BranchPicker id="edit-branches" branches={branches} selectedIds={form.assignedBranches || []} onToggle={toggleBranch} />
                </FormField>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="personal" title="Personal" description="Private details, visible to admins only" className="scroll-mt-4">
            <div className={GRID}>
              {text("personalEmail", "Personal email", { type: "email" })}
              <FormField label="Date of birth" htmlFor="edit-dateOfBirth">
                <Input id="edit-dateOfBirth" name="dateOfBirth" type="date" value={day(form.dateOfBirth)} onChange={handleChange} />
              </FormField>
              <FormField label="Marital status" htmlFor="edit-maritalStatus">
                {select("maritalStatus", [{ value: "single", label: "Single" }, { value: "married", label: "Married" }, { value: "other", label: "Other" }], "Select")}
              </FormField>
              {text("emergencyContact", "Emergency contact", { type: "tel" })}
              {text("aadhaarNumber", "Aadhaar number", { placeholder: "XXXX XXXX XXXX" }, "Stored masked. Only the last 4 digits are shown.")}
              {text("panNumber", "PAN number", { placeholder: "ABCDE1234F" })}
              {text("drivingLicense", "Driving licence", { placeholder: "DL number" })}
              <div className="sm:col-span-2">
                <FormField label="Address" htmlFor="edit-address">
                  <Textarea id="edit-address" name="address" rows={3} value={form.address ?? ""} onChange={handleChange} />
                </FormField>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="employment" title="Employment" description="Job and contract details" className="scroll-mt-4">
            <div className={GRID}>
              <FormField label="Employee type" htmlFor="edit-employeeType">
                {select("employeeType", [{ value: "permanent", label: "Permanent" }, { value: "contract", label: "Contract" }, { value: "intern", label: "Intern" }, { value: "consultant", label: "Consultant" }], "Select")}
              </FormField>
              {text("employeeId", "Employee ID")}
              {text("department", "Department")}
              {text("jobTitle", "Job title")}
              <FormField label="Date of joining" htmlFor="edit-dateOfJoining">
                <Input id="edit-dateOfJoining" name="dateOfJoining" type="date" value={day(form.dateOfJoining)} onChange={handleChange} />
              </FormField>
              <FormField label="Date of leaving" htmlFor="edit-dateOfLeaving" hint="Setting this ends their access on that date.">
                <Input id="edit-dateOfLeaving" name="dateOfLeaving" type="date" value={day(form.dateOfLeaving)} onChange={handleChange} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard id="salary" title="Salary" description="Changes create a new salary record from the effective date" className="scroll-mt-4">
            <div className="space-y-4">
              <div className={GRID}>
                {text("ctcAmount", "CTC amount (₹)", { type: "number", min: "0", step: "1000", placeholder: "Enter CTC amount" }, "Annual CTC in rupees")}
                <FormField label="Salary type" htmlFor="edit-salaryType">
                  {select("salaryType", [{ value: "monthly", label: "Monthly" }, { value: "weekly", label: "Weekly" }, { value: "daily", label: "Daily" }], "Select")}
                </FormField>
                <FormField label="Effective from" htmlFor="edit-salaryEffectiveDate" hint="Leave blank for this month">
                  <Input id="edit-salaryEffectiveDate" name="salaryEffectiveDate" type="date" value={day(form.salaryEffectiveDate)} onChange={handleChange} />
                </FormField>
              </div>
              <Notice tone="info">Past salary runs are not changed. New CTC shows in the {month} salary run after recalculation.</Notice>
            </div>
          </SectionCard>

          <SectionCard id="allow" title="Allowances & overtime" description="Added to or deducted from net pay each month" className="scroll-mt-4">
            <div className={GRID}>
              {text("perDayTravelAllowance", "Travel allowance per day (₹)", { type: "number", min: "0", step: "10" }, "Per working day")}
              {text("railwayPassAmount", "Railway pass per month (₹)", { type: "number", min: "0", step: "100" }, "Fixed monthly reimbursement")}
              {text("standardDailyHours", "Standard daily hours", { type: "number", min: "1", max: "24", step: "0.5" }, "Hours before overtime starts")}
              {text("overtimeRateMultiplier", "Overtime rate", { type: "number", min: "1", max: "3", step: "0.1", placeholder: "e.g., 1.5" }, "1.0× = normal rate, 1.5× = time-and-a-half, 2.0× = double time")}
              {text("otherAmount", "Other amount (₹)", { type: "number", min: "0", step: "100" })}
              <FormField label="Other amount type" htmlFor="edit-otherAmountType">
                {select("otherAmountType", [{ value: "earning", label: "Earning (add to net)" }, { value: "deduction", label: "Deduction (subtract from net)" }], "Select")}
              </FormField>
            </div>
          </SectionCard>

          <SectionCard id="security" title="Security" description="Passwords are never shown. Set a new one if they can’t sign in." className="scroll-mt-4">
            <div className="space-y-4">
              <div className={GRID}>
                <FormField label="New password" htmlFor="edit-newPassword">
                  <Input id="edit-newPassword" type="password" placeholder="At least 8 characters" value={passwordForm.newPassword} onKeyDown={passwordKeyDown} onChange={(ev) => setPasswordForm((prev) => ({ ...prev, newPassword: ev.target.value }))} />
                </FormField>
                <FormField label="Confirm password" htmlFor="edit-confirmPassword">
                  <Input id="edit-confirmPassword" type="password" placeholder="Repeat password" value={passwordForm.confirmPassword} onKeyDown={passwordKeyDown} onChange={(ev) => setPasswordForm((prev) => ({ ...prev, confirmPassword: ev.target.value }))} />
                </FormField>
              </div>
              <Button type="button" variant="secondary" onClick={handlePasswordSubmit} disabled={passwordSaving}>
                <KeyRound /> {passwordSaving ? "Updating..." : "Set New Password"}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Danger zone" description="Deactivate sets their date of leaving to today: they show as Inactive and their history is kept. Delete removes the member permanently." className="border-tone-bad-border">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDeactivate(true)}
              >
                Deactivate
              </Button>
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
                Delete member
              </Button>
            </div>
          </SectionCard>

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line-card bg-surface px-5 py-3 shadow-md">
            <div className="flex flex-wrap items-center gap-2 text-small text-ink-3">
              {errorCount ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-tone-bad-fg">
                  <TriangleAlert className="size-4" /> {errorCount} field needs fixing
                </span>
              ) : null}
              {errorCount && dirty ? <span aria-hidden="true">·</span> : null}
              {dirty ? <span>Unsaved changes</span> : errorCount ? null : <span>No changes</span>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={!dirty} onClick={discard}>
                Discard
              </Button>
              <Button type="submit">Save changes</Button>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title="Deactivate this member?"
        description={`${user.name} (${user.username}) will be marked as left today and shown as Inactive. Their attendance and payroll history is kept. You still need to press Save changes to apply it.`}
        confirmLabel="Deactivate"
        tone="destructive"
        onConfirm={() => {
          setField("dateOfLeaving")(new Date().toISOString().split("T")[0]);
          setConfirmDeactivate(false);
          toast.info("Date of leaving set to today", { description: "Save changes to apply." });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this user?"
        description={`Are you sure you want to delete ${user.name} (${user.username})? This action cannot be undone.`}
        confirmLabel="Delete User"
        tone="destructive"
        onConfirm={doDelete}
      />
    </DashboardLayout>
  );
};

export default MemberEdit;
