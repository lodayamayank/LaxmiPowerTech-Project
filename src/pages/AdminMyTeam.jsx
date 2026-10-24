import React, { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import axios from "../utils/axios";
import EditUserModal from "./EditUserModal";
import AttendanceGraphModal from "../components/AttendanceGraphModal";
// import Select from '../components/Select';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { toast } from "react-toastify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FaEye,
  FaEyeSlash,
  FaUserTag,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";

const roleLabel = (r) => {
  const role = typeof r === "string" ? r : r?.role || "";
  return role.charAt(0).toUpperCase() + role.slice(1);
};
const roleValue = (r) => (typeof r === "string" ? r : r?.role || "");

const AdminMyTeam = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filterRole, setFilterRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editId, setEditId] = useState(null);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Start with loading=true so "Loading users..." shows while users are being fetched.
  const [loading, setLoading] = useState(true);
  const [attendanceUser, setAttendanceUser] = useState(null);

  // Confirmation dialog (replaces window.confirm)
  // { type: 'delete' | 'reset', user }
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "default123",
    mobileNumber: "", // ✅ Changed from 'contact' to 'mobileNumber'
    role: "labour",
    assignedBranches: [],
  });
  const [roleOptions, setRoleOptions] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUsers();
    fetchProjects();
    fetchBranches();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get("/branches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = (res.data || [])
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
      setBranches(sorted);
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get("/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoleOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.username || !formData.role) {
        toast.error("Please fill required fields (name, username, role)");
        return;
      }

      const payload = { ...formData };

      // ✅ Fixed password handling
      if (editId) {
        // When editing, only include password if it's been changed
        if (!formData.password || formData.password.trim() === "") {
          delete payload.password;
        } else {
          payload.password = formData.password.trim();
        }
      } else {
        // When creating new user, ensure password is set
        if (!payload.password || payload.password.trim() === "") {
          payload.password = "default123"; // ✅ Use default if empty
        }
      }

      // Remove project field if not set
      if (!payload.project || payload.project === "") {
        delete payload.project;
      }

      console.log("📤 Sending payload:", payload); // Debug log

      if (editId) {
        await axios.put(`/users/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEditId(null);
        toast.success("User updated successfully!");
      } else {
        await axios.post(`/users/register`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("User registered successfully!");
      }

      // Reset form with default password
      setFormData({
        name: "",
        username: "",
        password: "default123", // ✅ Reset to default123 instead of empty
        mobileNumber: "", // ✅ Changed from contact
        role: "labour",
        assignedBranches: [],
      });

      fetchUsers();
    } catch (err) {
      console.error(
        "Error submitting form",
        err?.response?.data || err.message
      );
      toast.error(`Error: ${err?.response?.data?.message || err.message}`);
    }
  };

  // ── Delete user ──
  // Step 1: the table button only opens the confirmation dialog
  const requestDelete = (user) => {
    setConfirmDialog({ type: "delete", user });
  };

  // Step 2: runs after the admin confirms
  const deleteUser = async (id) => {
    try {
      await axios.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("User deleted successfully!");

      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (!filterRole || user.role === filterRole) &&
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // ── Reset password ──
  // Step 1: the table button only opens the confirmation dialog
  const requestResetPassword = (user) => {
    setConfirmDialog({ type: "reset", user });
  };

  // Step 2: runs after the admin confirms
  const resetPassword = async (username) => {
    try {
      await axios.post(
        `/users/reset-password/${username}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(`Password reset for ${username} to default123`);
    } catch (err) {
      console.error("Failed to reset password", err);
      toast.error("Error resetting password");
    }
  };

  // Runs when the admin clicks the confirm button in the dialog
  const handleConfirm = async () => {
    if (!confirmDialog) return;
    const { type, user } = confirmDialog;

    setConfirming(true);
    try {
      if (type === "delete") {
        await deleteUser(user._id);
      } else if (type === "reset") {
        await resetPassword(user.username);
      }
    } finally {
      setConfirming(false);
      setConfirmDialog(null);
    }
  };

  const handleUserUpdated = (updatedUser) => {
    // Update the users list
    setUsers((prev) =>
      prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
    );

    // ✅ Update editingUser so if modal stays open, it shows updated data
    setEditingUser(updatedUser);

    // ✅ Optionally close modal after a brief delay to show success
    setTimeout(() => {
      setEditingUser(null);
    }, 500);
  };

  if (loading) {
    return (
      <DashboardLayout title="My Team">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Team">
      <div className="space-y-4">
        {/* Add/Edit User Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {editId ? "Edit User" : "Add New User"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Name *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Input
                placeholder="Username *"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />

              {editId ? (
                <div className="flex flex-col">
                  <label
                    htmlFor="change-password-toggle"
                    className="flex items-center gap-2 text-sm mb-1 text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <Checkbox
                      id="change-password-toggle"
                      checked={showPasswordField}
                      onCheckedChange={(checked) =>
                        setShowPasswordField(checked === true)
                      }
                      className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white"
                    />
                    Change Password
                  </label>

                  {showPasswordField && (
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={formData.password}
                        className="pr-10"
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 text-gray-500 dark:text-gray-400"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (default: default123)"
                    value={formData.password}
                    className="pr-10"
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-gray-500 dark:text-gray-400"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </div>
              )}

              <Input
                placeholder="Mobile Number"
                value={formData.mobileNumber}
                onChange={(e) =>
                  setFormData({ ...formData, mobileNumber: e.target.value })
                }
              />

              <div>
                {/* <Label className="block mb-1">Role</Label> */}

                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>

                  <SelectContent>
                    {Array.isArray(roleOptions) &&
                      roleOptions.map((r) => {
                        const value = roleValue(r);

                        return (
                          <SelectItem key={value} value={value}>
                            {roleLabel(r)}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {formData.role !== "admin" && (
                <div className="md:col-span-2">
                  <Label className="block mb-2">Branches</Label>

                  <div className="max-h-40 overflow-y-auto rounded-md border p-3 space-y-2">
                    {branches.map((branch) => (
                      <label
                        key={branch._id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={formData.assignedBranches.includes(
                            branch._id
                          )}
                          onCheckedChange={(checked) => {
                            setFormData((prev) => ({
                              ...prev,
                              assignedBranches: checked
                                ? [...prev.assignedBranches, branch._id]
                                : prev.assignedBranches.filter(
                                    (id) => id !== branch._id
                                  ),
                            }));
                          }}
                        />

                        <span className="text-sm">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSubmit}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {editId ? "Update User" : "Add User"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEditId(null);
                  setFormData({
                    name: "",
                    username: "",
                    password: "default123",
                    mobileNumber: "",
                    role: "labour",
                    assignedBranches: [],
                  });
                  setShowPasswordField(false);
                  setShowPassword(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            <Select
              value={filterRole || "all"}
              onValueChange={(value) =>
                setFilterRole(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>

                {Array.isArray(roleOptions) &&
                  roleOptions.map((r) => {
                    const value = roleValue(r);

                    return (
                      <SelectItem key={value} value={value}>
                        {roleLabel(r)}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder="Search by name or username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Results Info & Items Per Page */}
        {filteredUsers.length > 0 && (
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Showing{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(endIndex, totalItems)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalItems}
                </span>{" "}
                users
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Rows per page:</Label>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-[75px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="overflow-x-auto">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="text-gray-600 dark:text-gray-300">
                    Name
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-300">
                    Username
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-300">
                    Mobile
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-300">
                    Role
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-300">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-6"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((user) => (
                    <TableRow
                      key={user._id}
                      className="dark:border-gray-700 dark:hover:bg-gray-700/60"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {user.username}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {user.mobileNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => setEditingUser(user)}
                          >
                            View/Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => requestDelete(user)}
                          >
                            Delete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600"
                            onClick={() => requestResetPassword(user)}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => setAttendanceUser(user)}
                          >
                            Attendance Graph
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && totalPages > 1 && (
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Page{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalPages}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  title="First Page"
                  className="h-9 w-9"
                >
                  <FaAngleDoubleLeft size={14} />
                </Button>

                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Previous Page"
                  className="h-9 w-9"
                >
                  <FaChevronLeft size={14} />
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-3 py-1 text-muted-foreground"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        onClick={() => goToPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={
                          currentPage === page
                            ? "bg-orange-500 hover:bg-orange-600"
                            : ""
                        }
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>

                {/* Next Page */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Next Page"
                  className="h-9 w-9"
                >
                  <FaChevronRight size={14} />
                </Button>

                {/* Last Page */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last Page"
                  className="h-9 w-9"
                >
                  <FaAngleDoubleRight size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {editingUser && (
          <EditUserModal
            user={editingUser}
            branches={branches}
            projects={projects}
            onClose={() => setEditingUser(null)}
            onSave={handleUserUpdated}
          />
        )}

        {attendanceUser && (
          <AttendanceGraphModal
            user={attendanceUser}
            onClose={() => setAttendanceUser(null)}
          />
        )}

        {/* Confirmation dialog – replaces window.confirm for Delete and Reset Password */}
        <AlertDialog
          open={!!confirmDialog}
          onOpenChange={(open) => {
            // don't allow closing while the request is running
            if (!open && !confirming) setConfirmDialog(null);
          }}
        >
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog?.type === "delete"
                  ? "Delete this user?"
                  : "Reset password?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog?.type === "delete"
                  ? `Are you sure you want to delete ${confirmDialog.user.name} (${confirmDialog.user.username})? This action cannot be undone.`
                  : `Reset password for ${confirmDialog?.user?.username} to default123?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirming}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirming}
                onClick={(e) => {
                  // keep the dialog open until the request finishes
                  e.preventDefault();
                  handleConfirm();
                }}
                className={
                  confirmDialog?.type === "delete"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }
              >
                {confirming
                  ? "Processing..."
                  : confirmDialog?.type === "delete"
                  ? "Delete User"
                  : "Reset Password"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminMyTeam;
  