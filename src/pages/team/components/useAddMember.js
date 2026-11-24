// src/pages/team/components/useAddMember.js
// Form state, branch/role loading, validation and the POST /users/register request of the Add member panel
// (moved unchanged from AddEmployeeModal.jsx).
import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import { USERS_KEY } from "@/hooks/useUsers";
import axios from "@/api/client";
import { toast } from "sonner";

export const roleValue = (r) => (typeof r === "string" ? r : r?.role || "");
export const roleLabel = (r) => {
  const role = roleValue(r);
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const EMPTY_FORM = {
  name: "",
  username: "",
  password: "default123",
  mobileNumber: "",
  role: "labour",
  assignedBranches: [],
};

const slugify = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");

export default function useAddMember({ open, onOpenChange, onCreated }) {
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
    const headers = { Authorization: `Bearer ${getToken()}` };
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
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
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
  return {
    formData, roleOptions, showPassword, setShowPassword, submitting, setUsernameTouched, branchQuery, setBranchQuery, errors,
    filteredBranches, handleOpenChange, set, setName, toggleBranch, allSelected, toggleAll, submit,
  };
}
