// src/pages/team/components/useMyTeam.js
// Users, roles, filters, delete / reset-password confirmations and the edit-save cache update of the My team page
// (moved unchanged from AdminMyTeam.jsx; paging and the new branch filter are done in the page).
import React, { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import { useProjects } from "@/hooks/useProjects";
import { useBranches } from "@/hooks/useBranches";
import { useUsers, USERS_KEY, usersQueryKey } from "@/hooks/useUsers";
import axios from "@/api/client";
import { toast } from "sonner";

export const roleLabel = (r) => {
  const role = typeof r === "string" ? r : r?.role || "";
  return role.charAt(0).toUpperCase() + role.slice(1);
};
export const roleValue = (r) => (typeof r === "string" ? r : r?.role || "");

export default function useMyTeam() {
  const { data: users, isLoading: loading, error: usersError } = useUsers();
  const { data: branchesRaw } = useBranches();
  const branches = useMemo(
    () =>
      branchesRaw
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        ),
    [branchesRaw],
  );
  const { data: projects } = useProjects();
  const [roleOptions, setRoleOptions] = useState([]);
  const [filterRole, setFilterRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [attendanceUser, setAttendanceUser] = useState(null);

  // Confirmation dialog: { type: 'delete' | 'reset', user }
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirming, setConfirming] = useState(false);


  const token = getToken();
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (usersError) {
      console.error("Failed to fetch users", usersError);
      toast.error("Failed to load users");
    }
  }, [usersError]);

  const fetchRoles = async () => {
    try {
      const res = await axios.get("/roles", { headers });
      setRoleOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  };

  const requestDelete = (user) => setConfirmDialog({ type: "delete", user });
  const requestResetPassword = (user) =>
    setConfirmDialog({ type: "reset", user });

  const deleteUser = async (id) => {
    try {
      await axios.delete(`/users/${id}`, { headers });
      toast.success("Member deleted");
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    } catch (err) {
      console.error("Failed to delete user", err);
      toast.error("Couldn’t delete the member", {
        description: "Check your connection and try again.",
        action: { label: "Retry", onClick: () => deleteUser(id) },
      });
    }
  };

  const resetPassword = async (username) => {
    try {
      await axios.post(`/users/reset-password/${username}`, {}, { headers });
      toast.success("Password reset", { description: `${username}’s password is now default123.` });
    } catch (err) {
      console.error("Failed to reset password", err);
      toast.error("Couldn’t reset the password", {
        description: "Check your connection and try again.",
        action: { label: "Retry", onClick: () => resetPassword(username) },
      });
    }
  };

  const handleConfirm = async () => {
    if (!confirmDialog) return;
    const { type, user } = confirmDialog;
    setConfirming(true);
    try {
      if (type === "delete") await deleteUser(user._id);
      else if (type === "reset") await resetPassword(user.username);
    } finally {
      setConfirming(false);
      setConfirmDialog(null);
    }
  };

  const handleUserUpdated = (updatedUser) => {
    queryClient.setQueryData(usersQueryKey(), (prev = []) =>
      prev.map((u) => (u._id === updatedUser._id ? updatedUser : u)),
    );
    queryClient.invalidateQueries({ queryKey: USERS_KEY });
    setEditingUser(updatedUser);
    setTimeout(() => setEditingUser(null), 500);
  };
  return {
    users, loading, branches, projects, roleOptions, filterRole, setFilterRole, searchTerm, setSearchTerm, editingUser, setEditingUser,
    attendanceUser, setAttendanceUser, confirmDialog, setConfirmDialog, confirming, requestDelete, requestResetPassword, handleConfirm, handleUserUpdated,
  };
}
