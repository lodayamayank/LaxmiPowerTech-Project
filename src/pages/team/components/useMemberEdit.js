// src/pages/team/components/useMemberEdit.js
// Loads one member (GET /users/:id) and holds the edit form: field state, save (PUT /users/:id with the whole form,
// password excluded) and the separate set-password request. The form logic is moved unchanged from EditUserModal.jsx;
// only the member loading, the unsaved-changes tracking and discard are new.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getToken } from "@/lib/session";
import { useProjects } from "@/hooks/useProjects";
import { useBranches } from "@/hooks/useBranches";
import axios from "@/api/client";

export default function useMemberEdit(userId, onSave) {
  const token = getToken();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;
    axios
      .get(`/users/${userId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => !ignore && setUser(res.data))
      .catch(() => !ignore && setLoadError("Failed to load this member"))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [userId]);

  const [form, setForm] = useState(user || {});
  const { data: branchesRaw } = useBranches();
  const branches = useMemo(
    () =>
      branchesRaw
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
    [branchesRaw]
  );
  const { data: projects } = useProjects();
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
  }, [user, user?._id]);

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
  // Unsaved changes: the first initialised form is the baseline.
  const [baseline, setBaseline] = useState(null);
  useEffect(() => {
    if (form._id && baseline === null) setBaseline(JSON.stringify(form));
  }, [form, baseline]);
  const dirty = baseline !== null && JSON.stringify(form) !== baseline;
  const discard = () => baseline && setForm(JSON.parse(baseline));

  return {
    user, loading, loadError, form, setForm, handleChange, setField, handleSubmit, passwordForm, setPasswordForm, passwordSaving,
    handlePasswordSubmit, passwordKeyDown, branches, projects, dirty, discard,
  };
}
