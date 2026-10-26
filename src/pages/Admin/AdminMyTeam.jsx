import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../utils/axios";
import EditUserModal from "../EditUserModal";
import AttendanceGraphModal from "../../components/AttendanceGraphModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaUserPlus,
  FaSearch,
  FaUsers,
  FaUserShield,
  FaUserTie,
  FaHardHat,
  FaPen,
  FaChartBar,
  FaKey,
  FaTrashAlt,
  FaTimes,
} from "react-icons/fa";

const ADD_EMPLOYEE_PATH = "/admin/my-team/new";

const roleLabel = (r) => {
  const role = typeof r === "string" ? r : r?.role || "";
  return role.charAt(0).toUpperCase() + role.slice(1);
};
const roleValue = (r) => (typeof r === "string" ? r : r?.role || "");

// Role accent styles (theme-aware: uses primary / muted / destructive tokens)
const roleStyle = (role = "") => {
  const r = role.toLowerCase();
  if (r.includes("admin"))
    return {
      avatar: "bg-primary text-primary-foreground",
      badge: "bg-primary/10 text-primary border-primary/20",
    };
  if (r.includes("staff"))
    return {
      avatar: "bg-secondary text-secondary-foreground",
      badge: "bg-secondary text-secondary-foreground border-border",
    };
  return {
    avatar: "bg-muted text-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  };
};

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";

const StatCard = ({ icon: Icon, label, value, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
      active ? "border-primary ring-2 ring-primary/20" : "border-border"
    }`}
  >
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-primary/10 text-primary group-hover:bg-primary/15"
      }`}
    >
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-bold leading-tight text-foreground">
        {value}
      </p>
    </div>
  </button>
);

const ActionButton = ({ title, onClick, className, children }) => (
  <Button
    variant="ghost"
    size="icon"
    title={title}
    aria-label={title}
    onClick={onClick}
    className={`h-8 w-8 rounded-lg ${className}`}
  >
    {children}
  </Button>
);

const AdminMyTeam = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [filterRole, setFilterRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceUser, setAttendanceUser] = useState(null);

  // Confirmation dialog: { type: 'delete' | 'reset', user }
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
    fetchBranches();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users", { headers });
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
      const res = await axios.get("/projects", { headers });
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get("/branches", { headers });
      setBranches(
        (res.data || [])
          .slice()
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
          ),
      );
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

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
      toast.success("User deleted successfully!");
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
      toast.error("Failed to delete user");
    }
  };

  const resetPassword = async (username) => {
    try {
      await axios.post(`/users/reset-password/${username}`, {}, { headers });
      toast.success(`Password reset for ${username} to default123`);
    } catch (err) {
      console.error("Failed to reset password", err);
      toast.error("Error resetting password");
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
    setUsers((prev) =>
      prev.map((u) => (u._id === updatedUser._id ? updatedUser : u)),
    );
    setEditingUser(updatedUser);
    setTimeout(() => setEditingUser(null), 500);
  };

  // ── Stats ──
  const stats = useMemo(() => {
    const count = (fn) =>
      users.filter((u) => fn((u.role || "").toLowerCase())).length;
    return {
      total: users.length,
      admin: count((r) => r.includes("admin")),
      staff: count((r) => r.includes("staff")),
      field: count((r) => r.includes("labour") || r.includes("subcontractor")),
    };
  }, [users]);

  const findRole = (keyword) =>
    (Array.isArray(roleOptions) ? roleOptions : [])
      .map(roleValue)
      .find((v) => v.toLowerCase().includes(keyword)) || "";

  // ── Filtering & pagination ──
  const filteredUsers = users.filter(
    (user) =>
      (!filterRole || user.role === filterRole) &&
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const hasFilters = !!filterRole || !!searchTerm;

  if (loading) {
    return (
      <DashboardLayout title="My Team">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Card>
            <CardContent className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Team">
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Team members
              </h2>
              <Badge variant="secondary" className="rounded-full">
                {stats.total}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your staff, labour and subcontractors.
            </p>
          </div>
          <Button asChild className="shadow-sm">
            <Link to={ADD_EMPLOYEE_PATH}>
              <FaUserPlus className="mr-2" size={14} />
              Add Employee
            </Link>
          </Button>
        </div>

        {/* KPI cards — click to filter */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={FaUsers}
            label="Total team"
            value={stats.total}
            active={!filterRole}
            onClick={() => setFilterRole("")}
          />
          <StatCard
            icon={FaUserShield}
            label="Admins"
            value={stats.admin}
            active={!!filterRole && filterRole === findRole("admin")}
            onClick={() => setFilterRole(findRole("admin"))}
          />
          <StatCard
            icon={FaUserTie}
            label="Staff"
            value={stats.staff}
            active={!!filterRole && filterRole === findRole("staff")}
            onClick={() => setFilterRole(findRole("staff"))}
          />
          <StatCard
            icon={FaHardHat}
            label="Labour & Subcon."
            value={stats.field}
            active={!!filterRole && filterRole === findRole("labour")}
            onClick={() => setFilterRole(findRole("labour"))}
          />
        </div>

        {/* Unified table card */}
        <Card className="overflow-hidden rounded-xl shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <FaSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={13}
              />
              <Input
                type="text"
                placeholder="Search by name or username"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filterRole || "all"}
                onValueChange={(v) => setFilterRole(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Array.isArray(roleOptions) &&
                    roleOptions.map((r) => (
                      <SelectItem key={roleValue(r)} value={roleValue(r)}>
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterRole("");
                    setSearchTerm("");
                  }}
                  className="text-muted-foreground"
                >
                  <FaTimes className="mr-1" size={11} />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {["Employee", "Mobile", "Role", ""].map((h, i) => (
                    <TableHead
                      key={i}
                      className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                        i === 3 ? "text-right" : ""
                      }`}
                    >
                      {h || "Actions"}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <FaUsers size={18} />
                        </div>
                        <p className="font-medium text-foreground">
                          No team members found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {hasFilters
                            ? "Try a different search or role filter."
                            : "Add your first employee to get started."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((user) => {
                    const s = roleStyle(user.role);
                    return (
                      <TableRow key={user._id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.avatar}`}
                            >
                              {initials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {user.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {user.mobileNumber || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-full capitalize ${s.badge}`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <ActionButton
                              title="View / Edit"
                              onClick={() => setEditingUser(user)}
                              className="text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <FaPen size={12} />
                            </ActionButton>
                            <ActionButton
                              title="Attendance graph"
                              onClick={() => setAttendanceUser(user)}
                              className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            >
                              <FaChartBar size={13} />
                            </ActionButton>
                            <ActionButton
                              title="Reset password"
                              onClick={() => requestResetPassword(user)}
                              className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            >
                              <FaKey size={12} />
                            </ActionButton>
                            <ActionButton
                              title="Delete"
                              onClick={() => requestDelete(user)}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <FaTrashAlt size={12} />
                            </ActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer: count, rows per page, pagination */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {startIndex + 1}
                </span>
                –
                <span className="font-medium text-foreground">
                  {Math.min(endIndex, totalItems)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalItems}
                </span>
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows</span>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(v) => setItemsPerPage(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      title="First page"
                    >
                      <FaAngleDoubleLeft size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      title="Previous page"
                    >
                      <FaChevronLeft size={11} />
                    </Button>
                    {getPageNumbers().map((page, i) =>
                      page === "..." ? (
                        <span
                          key={`e${i}`}
                          className="px-1 text-muted-foreground"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={page}
                          onClick={() => goToPage(page)}
                          variant={currentPage === page ? "default" : "ghost"}
                          size="sm"
                          className="h-8 min-w-8 px-2"
                        >
                          {page}
                        </Button>
                      ),
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      title="Next page"
                    >
                      <FaChevronRight size={11} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      title="Last page"
                    >
                      <FaAngleDoubleRight size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

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

        <AlertDialog
          open={!!confirmDialog}
          onOpenChange={(open) => {
            if (!open && !confirming) setConfirmDialog(null);
          }}
        >
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <div
                className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full ${
                  confirmDialog?.type === "delete"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {confirmDialog?.type === "delete" ? (
                  <FaTrashAlt size={16} />
                ) : (
                  <FaKey size={16} />
                )}
              </div>
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
                  e.preventDefault();
                  handleConfirm();
                }}
                className={
                  confirmDialog?.type === "delete"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
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
