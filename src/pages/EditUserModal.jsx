import React, { useState, useEffect } from "react";
import axios from "../utils/axios";
import { toast } from "react-toastify";
import {
  FaUser,
  FaUserTag,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaBriefcase,
  FaMapMarkerAlt,
  FaIdCard,
  FaTimes,
  FaBuilding,
  FaUserCircle,
  FaAddressCard,
  FaUserTie,
  FaRupeeSign,
  FaMoneyBillWave,
  FaKey,
  FaLock,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";
const orangeFocus =
  "focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30";

/**
 * Label + shadcn Input (+ optional leading icon and hint text).
 * Replaces the old custom InputField so every field looks the same.
 */
const Field = ({
  label,
  name,
  icon,
  hint,
  type = "text",
  value,
  onChange,
  ...rest
}) => {
  const id = `edit-user-${name}`;
  return (
    <div>
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <Input
          id={id}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          className={`w-full bg-white ${icon ? "pl-9" : ""} ${orangeFocus}`}
          {...rest}
        />
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
};

/** Label + shadcn Select. options: [{ value, label }] */
const SelectField = ({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  options,
}) => (
  <div>
    <Label htmlFor={id} className={labelClass}>
      {label}
    </Label>
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={`w-full bg-white ${orangeFocus}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "supervisor", label: "Supervisor" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "labour", label: "Labour" },
];

const EditUserModal = ({ user, onClose, onSave }) => {
  const token = localStorage.getItem("token");
  const [activeTab, setActiveTab] = useState("basic");
  const [form, setForm] = useState(user || {});
  const [branches, setBranches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user) {
      // Initialize with all possible fields to ensure controlled inputs
      setForm({
        // Basic Info
        name: user.name || "",
        username: user.username || "",
        mobileNumber: user.mobileNumber || "",
        role: user.role || "",
        jobTitle: user.jobTitle || "",

        // Relational
        project: user.project?._id || user.project || "",
        assignedBranches:
          user.assignedBranches?.map((b) =>
            typeof b === "object" ? b._id : b
          ) || [],

        // Personal Details
        personalEmail: user.personalEmail || "",
        dateOfBirth: user.dateOfBirth || "",
        maritalStatus: user.maritalStatus || "",
        aadhaarNumber: user.aadhaarNumber || "",
        panNumber: user.panNumber || "",
        drivingLicense: user.drivingLicense || "",
        emergencyContact: user.emergencyContact || "",
        address: user.address || "",

        // Employee Details
        employeeType: user.employeeType || "",
        dateOfJoining: user.dateOfJoining || "",
        dateOfLeaving: user.dateOfLeaving || "",
        employeeId: user.employeeId || "",
        department: user.department || "",

        // Salary Details
        ctcAmount: user.ctcAmount || 0,
        salaryType: user.salaryType || "monthly",
        salaryEffectiveDate: user.salaryEffectiveDate || "",

        // Travel Allowance & Overtime
        perDayTravelAllowance: user.perDayTravelAllowance || 0,
        railwayPassAmount: user.railwayPassAmount || 0,
        standardDailyHours: user.standardDailyHours || 9,
        overtimeRateMultiplier: user.overtimeRateMultiplier || 1.0,
        otherAmount: user.otherAmount || 0,
        otherAmountType: user.otherAmountType || "earning",

        // Keep other fields that might exist
        _id: user._id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        __v: user.__v,
      });
    }
    fetchMeta();
  }, [user, user?._id]);

  const fetchMeta = async () => {
    try {
      const [projRes, branchRes] = await Promise.all([
        axios.get("/projects", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/branches", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setProjects(projRes.data || []);
      const sorted = (branchRes.data || [])
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
      setBranches(sorted);
    } catch (err) {
      console.error("Failed to load meta data", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ✅ Create payload and exclude password
      const updatePayload = { ...form };
      delete updatePayload.password;

      console.log("🔍 [EditUserModal] Form state:", form);
      console.log("📤 [EditUserModal] Sending payload:", updatePayload);

      const res = await axios.put(`/users/${user._id}`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📥 [EditUserModal] Response data:", res.data);

      toast.success("User updated successfully");

      // ✅ Pass the updated user back
      if (onSave && res.data) {
        onSave(res.data);
      }

      // ✅ Update local form state with response
      setForm({
        ...res.data,
        project: res.data.project?._id || res.data.project || "",
        assignedBranches:
          res.data.assignedBranches?.map((b) =>
            typeof b === "object" ? b._id : b
          ) || [],
      });
    } catch (err) {
      toast.error("Failed to update user");
      console.error("❌ [EditUserModal] Error:", err);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill both password fields");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Password and confirm password do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      await axios.put(
        `/users/${user._id}`,
        {
          password: passwordForm.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Password updated successfully");
      setPasswordForm({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
      console.error("Failed to update password", err);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Enter inside a password field should set the password, not submit the whole user form
  const passwordKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePasswordSubmit(e);
    }
  };

  const tabTriggerClass =
    "h-auto min-h-10 w-full gap-2 px-3 py-2 text-base font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl sm:max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-gray-200 px-6 py-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <FaUserCircle className="text-orange-500 text-xl" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Edit User
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Update user information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          {/* Tabs */}
          <div className="shrink-0 border-b border-gray-200 px-6 py-3">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="basic" className={tabTriggerClass}>
                <FaUser size={14} /> Basic Info
              </TabsTrigger>
              <TabsTrigger value="personal" className={tabTriggerClass}>
                <FaAddressCard size={14} /> Personal
              </TabsTrigger>
              <TabsTrigger value="employee" className={tabTriggerClass}>
                <FaBriefcase size={14} /> Employment
              </TabsTrigger>
              <TabsTrigger value="security" className={tabTriggerClass}>
                <FaKey size={14} /> Security
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6">
              {/* BASIC */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Full Name"
                    name="name"
                    icon={<FaUser size={14} />}
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={handleChange}
                  />
                  <Field
                    label="Username"
                    name="username"
                    icon={<FaUserTag size={14} />}
                    placeholder="Enter username"
                    value={form.username}
                    onChange={handleChange}
                  />
                  <Field
                    label="Mobile Number"
                    name="mobileNumber"
                    icon={<FaPhone size={14} />}
                    placeholder="Enter mobile number"
                    value={form.mobileNumber}
                    onChange={handleChange}
                  />

                  <SelectField
                    id="edit-user-role"
                    label="Role"
                    value={form.role}
                    placeholder="Select Role"
                    options={ROLE_OPTIONS}
                    onValueChange={setField("role")}
                  />

                  <SelectField
                    id="edit-user-project"
                    label="Project"
                    value={form.project?._id || form.project}
                    placeholder="Select Project"
                    options={projects.map((p) => ({
                      value: p._id,
                      label: p.name,
                    }))}
                    onValueChange={setField("project")}
                  />
                </div>

                {/* Assigned Branches */}
                <div>
                  <Label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assigned Branches
                  </Label>
                  <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded-lg p-3 min-h-[50px] bg-gray-50">
                    {(form.assignedBranches || []).map((branchItem) => {
                      const branchId =
                        typeof branchItem === "object"
                          ? branchItem._id
                          : branchItem;
                      const branch = branches.find((b) => b._id === branchId);
                      return (
                        <Badge
                          key={branchId}
                          variant="secondary"
                          className="gap-1.5 bg-orange-100 text-orange-700 rounded-full pl-3 pr-1 py-1 text-sm font-medium hover:bg-orange-200"
                        >
                          <FaMapMarkerAlt size={12} />
                          {branch?.name || "Unknown Branch"}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${branch?.name || "branch"}`}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                assignedBranches: prev.assignedBranches.filter(
                                  (b) =>
                                    (typeof b === "object" ? b._id : b) !==
                                    branchId
                                ),
                              }))
                            }
                            className="h-5 w-5 rounded-full text-orange-700 hover:bg-orange-300 hover:text-orange-900"
                          >
                            <FaTimes size={10} />
                          </Button>
                        </Badge>
                      );
                    })}

                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!value) return;

                        setForm((prev) => ({
                          ...prev,
                          assignedBranches: [
                            ...(prev.assignedBranches || []),
                            value,
                          ],
                        }));
                      }}
                    >
                      <SelectTrigger
                        aria-label="Add branch"
                        className="w-full flex-1 min-w-[200px] bg-white"
                      >
                        <SelectValue placeholder="+ Add Branch" />
                      </SelectTrigger>

                      <SelectContent>
                        {branches
                          .filter(
                            (branch) =>
                              !(form.assignedBranches || []).some(
                                (item) =>
                                  (typeof item === "object"
                                    ? item._id
                                    : item) === branch._id
                              )
                          )
                          .map((branch) => (
                            <SelectItem key={branch._id} value={branch._id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* PERSONAL */}
              <TabsContent value="personal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Personal Email"
                    name="personalEmail"
                    type="email"
                    icon={<FaEnvelope size={14} />}
                    placeholder="email@example.com"
                    value={form.personalEmail || ""}
                    onChange={handleChange}
                  />
                  <Field
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    icon={<FaCalendarAlt size={14} />}
                    value={form.dateOfBirth?.split("T")[0] || ""}
                    onChange={handleChange}
                  />

                  <SelectField
                    id="edit-user-maritalStatus"
                    label="Marital Status"
                    value={form.maritalStatus}
                    placeholder="Select Marital Status"
                    options={[
                      { value: "single", label: "Single" },
                      { value: "married", label: "Married" },
                      { value: "other", label: "Other" },
                    ]}
                    onValueChange={setField("maritalStatus")}
                  />

                  <Field
                    label="Aadhaar Number"
                    name="aadhaarNumber"
                    icon={<FaIdCard size={14} />}
                    placeholder="XXXX-XXXX-XXXX"
                    value={form.aadhaarNumber}
                    onChange={handleChange}
                  />
                  <Field
                    label="PAN Number"
                    name="panNumber"
                    icon={<FaIdCard size={14} />}
                    placeholder="ABCDE1234F"
                    value={form.panNumber}
                    onChange={handleChange}
                  />
                  <Field
                    label="Driving License"
                    name="drivingLicense"
                    icon={<FaIdCard size={14} />}
                    placeholder="DL Number"
                    value={form.drivingLicense}
                    onChange={handleChange}
                  />

                  <div className="md:col-span-2">
                    <Label htmlFor="edit-user-address" className={labelClass}>
                      Address
                    </Label>
                    <Textarea
                      id="edit-user-address"
                      name="address"
                      value={form.address || ""}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Enter complete address"
                      className={`w-full bg-white resize-none ${orangeFocus}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Field
                      label="Emergency Contact"
                      name="emergencyContact"
                      icon={<FaPhone size={14} />}
                      placeholder="Emergency contact number"
                      value={form.emergencyContact}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* EMPLOYMENT */}
              <TabsContent value="employee" className="space-y-6">
                {/* Employee Information Section */}
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaBriefcase className="text-orange-500" />
                    Employee Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                      id="edit-user-employeeType"
                      label="Employee Type"
                      value={form.employeeType}
                      placeholder="Select Employee Type"
                      options={[
                        { value: "permanent", label: "Permanent" },
                        { value: "contract", label: "Contract" },
                        { value: "intern", label: "Intern" },
                        { value: "consultant", label: "Consultant" },
                      ]}
                      onValueChange={setField("employeeType")}
                    />

                    <Field
                      label="Employee ID"
                      name="employeeId"
                      icon={<FaIdCard size={14} />}
                      placeholder="EMP-001"
                      value={form.employeeId || ""}
                      onChange={handleChange}
                    />
                    <Field
                      label="Department"
                      name="department"
                      icon={<FaBuilding size={14} />}
                      placeholder="e.g., Engineering"
                      value={form.department || ""}
                      onChange={handleChange}
                    />
                    <Field
                      label="Job Title"
                      name="jobTitle"
                      icon={<FaUserTie size={14} />}
                      placeholder="e.g., Electrician"
                      value={form.jobTitle || ""}
                      onChange={handleChange}
                    />
                    <Field
                      label="Date of Joining"
                      name="dateOfJoining"
                      type="date"
                      icon={<FaCalendarAlt size={14} />}
                      value={form.dateOfJoining?.split("T")[0] || ""}
                      onChange={handleChange}
                    />
                    <Field
                      label="Date of Leaving"
                      name="dateOfLeaving"
                      type="date"
                      icon={<FaCalendarAlt size={14} />}
                      value={form.dateOfLeaving?.split("T")[0] || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Salary Information Section */}
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaMoneyBillWave className="text-green-500" />
                    Salary Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <Field
                      label={
                        <>
                          CTC Amount{" "}
                          <span className="text-gray-500 text-xs">(₹)</span>
                        </>
                      }
                      name="ctcAmount"
                      type="number"
                      icon={<FaRupeeSign size={14} />}
                      value={form.ctcAmount || 0}
                      onChange={handleChange}
                      placeholder="Enter CTC amount"
                      min="0"
                      step="1000"
                      hint="Enter annual CTC in rupees"
                    />

                    <SelectField
                      id="edit-user-salaryType"
                      label="Salary Type"
                      value={form.salaryType || "monthly"}
                      placeholder="Select Salary Type"
                      options={[
                        { value: "monthly", label: "Monthly" },
                        { value: "weekly", label: "Weekly" },
                        { value: "daily", label: "Daily" },
                      ]}
                      onValueChange={setField("salaryType")}
                    />

                    <div className="md:col-span-2">
                      <Field
                        label="Effective Date of Change"
                        name="salaryEffectiveDate"
                        type="date"
                        icon={<FaCalendarAlt size={14} />}
                        value={form.salaryEffectiveDate?.split("T")[0] || ""}
                        onChange={handleChange}
                        hint="Date when this salary becomes effective (leave blank for current date)"
                      />
                    </div>
                  </div>
                </div>

                {/* Travel & Overtime Configuration Section */}
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaRupeeSign className="text-blue-500" />
                    Travel Allowance & Overtime
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Field
                      label={
                        <>
                          Per Day Travel Allowance{" "}
                          <span className="text-gray-500 text-xs">(₹)</span>
                        </>
                      }
                      name="perDayTravelAllowance"
                      type="number"
                      icon={<FaRupeeSign size={14} />}
                      value={form.perDayTravelAllowance || 0}
                      onChange={handleChange}
                      placeholder="Enter per day amount"
                      min="0"
                      step="10"
                      hint="Daily travel allowance per working day"
                    />

                    <Field
                      label={
                        <>
                          Monthly Railway Pass{" "}
                          <span className="text-gray-500 text-xs">(₹)</span>
                        </>
                      }
                      name="railwayPassAmount"
                      type="number"
                      icon={<FaRupeeSign size={14} />}
                      value={form.railwayPassAmount || 0}
                      onChange={handleChange}
                      placeholder="Enter pass amount"
                      min="0"
                      step="100"
                      hint="Fixed monthly railway pass reimbursement"
                    />

                    <Field
                      label="Standard Daily Hours"
                      name="standardDailyHours"
                      type="number"
                      value={form.standardDailyHours || 9}
                      onChange={handleChange}
                      placeholder="e.g., 9"
                      min="1"
                      max="24"
                      step="0.5"
                      hint="Hours per day before overtime applies"
                    />

                    <Field
                      label="Overtime Rate Multiplier"
                      name="overtimeRateMultiplier"
                      type="number"
                      value={form.overtimeRateMultiplier || 1.0}
                      onChange={handleChange}
                      placeholder="e.g., 1.5"
                      min="1"
                      max="3"
                      step="0.1"
                      hint="1.0 = normal rate, 1.5 = time-and-a-half, 2.0 = double time"
                    />

                    <Field
                      label={
                        <>
                          Other Amount{" "}
                          <span className="text-gray-500 text-xs">(₹)</span>
                        </>
                      }
                      name="otherAmount"
                      type="number"
                      icon={<FaRupeeSign size={14} />}
                      value={form.otherAmount || 0}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      step="100"
                      hint="Fixed monthly addition or deduction"
                    />

                    <SelectField
                      id="edit-user-otherAmountType"
                      label="Other Amount Type"
                      value={form.otherAmountType || "earning"}
                      placeholder="Select Amount Type"
                      options={[
                        { value: "earning", label: "Earning (add to net)" },
                        {
                          value: "deduction",
                          label: "Deduction (subtract from net)",
                        },
                      ]}
                      onValueChange={setField("otherAmountType")}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* SECURITY */}
              <TabsContent value="security" className="space-y-5">
                <Alert className="border-orange-100 bg-orange-50">
                  <FaLock className="text-orange-600" />
                  <AlertTitle className="text-base font-semibold text-gray-900">
                    Password Access
                  </AlertTitle>
                  <AlertDescription className="text-sm text-gray-600">
                    Current password is securely protected and cannot be viewed.
                    Set a new password here if this user needs help logging in.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="New Password"
                    name="newPassword"
                    type="password"
                    icon={<FaLock size={14} />}
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onKeyDown={passwordKeyDown}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                  <Field
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    icon={<FaLock size={14} />}
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onKeyDown={passwordKeyDown}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                </div>

                <Button
                  type="button"
                  onClick={handlePasswordSubmit}
                  disabled={passwordSaving}
                  className="bg-gray-900 hover:bg-gray-800 text-white shadow-md"
                >
                  <FaKey size={14} />
                  {passwordSaving ? "Updating..." : "Set New Password"}
                </Button>
              </TabsContent>
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="shrink-0 border-t border-gray-200 px-6 py-4 gap-3 sm:gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;
