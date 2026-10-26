// src/components/AddEmployeeModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaPhone,
  FaKey,
  FaSearch,
  FaCheck,
  FaSyncAlt,
  FaUserShield,
  FaUserTie,
  FaHardHat,
  FaHandshake,
} from "react-icons/fa";

const roleValue = (r) => (typeof r === "string" ? r : r?.role || "");
const roleLabel = (r) => {
  const role = roleValue(r);
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const ROLE_META = {
  admin: { icon: FaUserShield, hint: "Full access, all branches" },
  staff: { icon: FaUserTie, hint: "Manages day-to-day work" },
  labour: { icon: FaHardHat, hint: "On-site worker" },
  subcontractor: { icon: FaHandshake, hint: "External partner" },
};

const EMPTY_FORM = {
  name: "",
  username: "",
  password: "default123",
  mobileNumber: "",
  role: "labour",
  assignedBranches: [],
};

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const slugify = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");

const randomPassword = () =>
  Math.random().toString(36).slice(2, 6) +
  Math.random().toString(36).slice(2, 6).toUpperCase();

const Section = ({ step, title, children }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {step}
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    {children}
  </section>
);

const Field = ({ label, required, error, icon: Icon, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
      )}
      {children}
    </div>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

const AddEmployeeModal = ({ open, onOpenChange, onCreated }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [branches, setBranches] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open || (branches.length && roleOptions.length)) return;
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    axios
      .get("/branches", { headers })
      .then((res) =>
        setBranches(
          (res.data || [])
            .slice()
            .sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
            ),
        ),
      )
      .catch((err) => console.error("Failed to fetch branches", err));
    axios
      .get("/roles", { headers })
      .then((res) => setRoleOptions(res.data))
      .catch((err) => console.error("Failed to fetch roles", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredBranches = useMemo(
    () =>
      branches.filter((b) =>
        b.name.toLowerCase().includes(branchQuery.toLowerCase()),
      ),
    [branches, branchQuery],
  );

  const reset = () => {
    setFormData(EMPTY_FORM);
    setShowPassword(false);
    setUsernameTouched(false);
    setBranchQuery("");
    setErrors({});
  };

  const handleOpenChange = (next) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const set = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Auto-suggest username from name until user edits it
  const setName = (value) => {
    set("name", value);
    if (!usernameTouched) set("username", slugify(value));
  };

  const toggleBranch = (id) =>
    setFormData((prev) => ({
      ...prev,
      assignedBranches: prev.assignedBranches.includes(id)
        ? prev.assignedBranches.filter((b) => b !== id)
        : [...prev.assignedBranches, id],
    }));

  const allSelected =
    filteredBranches.length > 0 &&
    filteredBranches.every((b) => formData.assignedBranches.includes(b._id));

  const toggleAll = () =>
    setFormData((prev) => {
      const ids = filteredBranches.map((b) => b._id);
      return {
        ...prev,
        assignedBranches: allSelected
          ? prev.assignedBranches.filter((id) => !ids.includes(id))
          : Array.from(new Set([...prev.assignedBranches, ...ids])),
      };
    });

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Name is required";
    if (!formData.username.trim()) e.username = "Username is required";
    if (formData.mobileNumber && !/^\d{10}$/.test(formData.mobileNumber))
      e.mobileNumber = "Enter a 10-digit number";
    if (!formData.role) e.role = "Pick a role";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (stay = false) => {
    if (!validate()) return;
    const payload = {
      ...formData,
      password: formData.password?.trim() || "default123",
    };
    try {
      setSubmitting(true);
      await axios.post("/users/register", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success(`${formData.name} added successfully`);
      onCreated?.();
      reset();
      if (!stay) onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const RoleIcon = ROLE_META[formData.role]?.icon || FaUser;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Header with live preview */}
        <DialogHeader className="border-b bg-muted/40 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
              {initials(formData.name)}
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate">
                {formData.name || "Add New User"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5">
                <RoleIcon className="text-xs" />
                {formData.username ? `@${formData.username} · ` : ""}
                {roleLabel(formData.role)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <form
          className="flex-1 space-y-7 overflow-y-auto px-6 py-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
        >
          <Section step={1} title="Personal details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Full name" required error={errors.name} icon={FaUser}>
                <Input
                  autoFocus
                  className="pl-8"
                  placeholder="e.g. Ravi Kumar"
                  value={formData.name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Mobile number" error={errors.mobileNumber} icon={FaPhone}>
                <Input
                  className="pl-8"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={formData.mobileNumber}
                  onChange={(e) =>
                    set("mobileNumber", e.target.value.replace(/\D/g, ""))
                  }
                />
              </Field>
            </div>
          </Section>

          <Section step={2} title="Login credentials">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Username" required error={errors.username}>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  className="pl-7"
                  placeholder="ravi.kumar"
                  value={formData.username}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    set("username", e.target.value);
                  }}
                />
              </Field>
              <Field label="Password" icon={FaKey}>
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-8 pr-20"
                  value={formData.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2">
                  {/* <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    title="Generate password"
                    onClick={() => {
                      set("password", randomPassword());
                      setShowPassword(true);
                    }}
                  >
                    <FaSyncAlt className="text-xs" />
                  </Button> */}
                  <Button 
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    title={showPassword ? "Hide" : "Show"}
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </div>
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave as <code>default123</code> or generate one. Share it with the
              user after saving.
            </p>
          </Section>

          <Section step={3} title="Role">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.isArray(roleOptions) &&
                roleOptions.map((r) => {
                  const value = roleValue(r);
                  const meta = ROLE_META[value] || { icon: FaUser, hint: "" };
                  const Icon = meta.icon;
                  const active = formData.role === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => set("role", value)}
                      className={`relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "hover:border-foreground/30 hover:bg-muted/50"
                      }`}
                    >
                      {active && (
                        <FaCheck className="absolute right-2 top-2 text-xs text-primary" />
                      )}
                      <Icon
                        className={active ? "text-primary" : "text-muted-foreground"}
                      />
                      <span className="text-sm font-medium">{roleLabel(r)}</span>
                      {meta.hint && (
                        <span className="text-[11px] leading-tight text-muted-foreground">
                          {meta.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </Section>

          {formData.role !== "admin" && (
            <Section step={4} title="Branch access">
              <div className="rounded-lg border">
                <div className="flex items-center gap-2 border-b p-2">
                  <div className="relative flex-1">
                    <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                    <Input
                      className="h-8 border-0 pl-8 shadow-none focus-visible:ring-0"
                      placeholder="Search branches"
                      value={branchQuery}
                      onChange={(e) => setBranchQuery(e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formData.assignedBranches.length} selected
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                    {allSelected ? "Clear" : "Select all"}
                  </Button>
                </div>
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto p-3">
                  {filteredBranches.length === 0 && (
                    <p className="text-sm text-muted-foreground">No branches found</p>
                  )}
                  {filteredBranches.map((branch) => {
                    const on = formData.assignedBranches.includes(branch._id);
                    return (
                      <button
                        type="button"
                        key={branch._id}
                        onClick={() => toggleBranch(branch._id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {on && <FaCheck className="text-[10px]" />}
                        {branch.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}
        </form>

        {/* Sticky footer */}
        <div className="flex flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => submit(true)} disabled={submitting}>
              Save & add another
            </Button>
            <Button onClick={() => submit(false)} disabled={submitting}>
              {submitting ? "Saving…" : "Add user"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeModal;