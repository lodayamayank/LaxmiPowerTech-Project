import {
  FaBell,
  FaCalendarAlt,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSun,
  FaMoon,
  FaPowerOff,
  FaFileUpload,
  FaTruck,
  FaClipboardCheck,
  FaShoppingCart,
  FaClipboardList,
} from "react-icons/fa";
import { MdNotificationsActive } from "react-icons/md";
import { EVENTS } from '@/lib/events';
import usePolling from '@/hooks/usePolling';
import { queryClient } from '@/lib/queryClient';
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import axios from "@/api/client";

// ── shadcn/ui components ──────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";

const LEAVE_CACHE_KEY = "pendingLeaveCount";
const REIMBURSEMENT_CACHE_KEY = "pendingReimbursementCount";

const readCachedCount = (key) => {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
const writeCachedCount = (key, count) => {
  try {
    sessionStorage.setItem(key, String(count));
  } catch {}
};
const canSeeApprovals = (user) =>
  user?.role === "admin" || user?.role === "supervisor";

// Orange icon button used in the topbar (hamburger, theme toggle, bell, calendar)
const ICON_BTN =
  "text-primary hover:bg-primary-soft hover:text-primary-soft-foreground";
const NOTIFICATION_TONES = {
  danger: "bg-danger-soft text-danger-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
};
// ── Utility: build an object with every ancestor key set to true ──────────────
const getMenuBranch = (key) => {
  const parts = key.split('>');
  return parts.reduce((branch, _part, index) => {
    branch[parts.slice(0, index + 1).join('>')] = true;
    return branch;
  }, {});
};

// ── Inner layout shell consuming useSidebar() ────────────────────────────────
const DashboardLayoutContent = ({
  title,
  user,
  today,
  darkMode,
  toggleDarkMode,
  notifications,
  notificationsLoading,
  showNotifications,
  setShowNotifications,
  loadNotifications,
  pendingLeaveCount,
  pendingReimbursementCount,
  openMenus,
  toggleMenu,
  handleLogout,
  children,
}) => {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();

  const materialQuickLinks = [
    { label: "Upload", path: "/dashboard/material/uploadindent", icon: <FaFileUpload /> },
    { label: "Intent PO", path: "/dashboard/material/intent", icon: <FaShoppingCart /> },
    { label: "Transfers", path: "/dashboard/material/site-transfers", icon: <FaTruck /> },
    { label: "Deliveries", path: "/dashboard/material/upcoming-deliveries", icon: <FaClipboardCheck /> },
    { label: "GRN", path: "/dashboard/material/grn", icon: <FaClipboardList /> },
  ];

  const showMaterialQuickLinks = location.pathname.startsWith('/dashboard/material/');
  const LEAVE_CACHE_KEY = "pendingLeaveCount";
  const REIMBURSEMENT_CACHE_KEY = "pendingReimbursementCount";

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-muted">
      {/* ── AppSidebar: Official shadcn Sidebar Architecture ───────────────── */}
      <AppSidebar
        user={user}
        pendingLeaveCount={pendingLeaveCount}
        pendingReimbursementCount={pendingReimbursementCount}
        openMenus={openMenus}
        onToggleMenu={toggleMenu}
        onLogout={handleLogout}
      />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="flex justify-between items-center px-4 lg:px-6 py-4 bg-card shadow-sm rounded-xl z-10">
          {/* Left: Mobile hamburger + Desktop collapse toggle + Page title */}
          <div className="flex items-center gap-4">
            {/* Mobile hamburger — only visible below lg */}
            <Button
              variant="ghost"
              size="icon"
              className={`lg:hidden ${ICON_BTN}`}
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <FaBars className="text-xl" />
            </Button>

            {/* Desktop collapse/expand — only visible on lg+ */}
            <Button
              variant="outline"
              size="icon"
              className="hidden lg:flex w-9 h-9 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={toggleSidebar}
              title={
                state === "collapsed" ? "Expand Sidebar" : "Collapse Sidebar"
              }
            >
              {state === "collapsed" ? (
                <FaChevronRight size={14} />
              ) : (
                <FaChevronLeft size={14} />
              )}
            </Button>

            {title && (
              <h1 className="text-lg lg:text-xl font-bold text-foreground">
                {title}
              </h1>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex gap-3 lg:gap-4 items-center">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className={ICON_BTN}
            >
              {darkMode ? (
                <FaSun className="text-lg lg:text-xl" />
              ) : (
                <FaMoon className="text-lg lg:text-xl" />
              )}
            </Button>

            {/* Notifications: Popover */}
            <Popover
              open={showNotifications}
              onOpenChange={(open) => {
                setShowNotifications(open);
                if (open) loadNotifications();
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`relative ${ICON_BTN}`}
                  title="Notifications"
                >
                  <FaBell className="text-lg lg:text-xl" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-card" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Notifications
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNotifications(false)}
                    title="Close notifications"
                  >
                    <FaTimes size={12} />
                  </Button>
                </div>

                {/* Panel body */}
                <div className="max-h-80 overflow-y-auto p-3">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <MdNotificationsActive className="mx-auto mb-2 text-3xl text-muted-foreground/40" />
                      <p className="text-sm font-semibold text-foreground">
                        No notifications
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        You are all caught up.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-lg px-3 py-2 ${
                            NOTIFICATION_TONES[notification.severity] ??
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="text-sm font-semibold">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs leading-5">
                            {notification.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Calendar */}
            <Button variant="ghost" size="icon" className={ICON_BTN}>
              <FaCalendarAlt className="text-lg lg:text-xl" />
            </Button>

            {/* Today's date */}
            <span className="hidden sm:block text-xs lg:text-sm text-muted-foreground font-medium bg-primary-soft px-3 py-1 rounded-full">
              {today}
            </span>

            {/* Topbar logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 rounded-full border-primary/30 bg-primary-soft text-primary-soft-foreground shadow-sm hover:bg-primary/20 hover:text-primary-soft-foreground"
              title="Logout"
            >
              <FaPowerOff className="text-sm" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Material quick-links bar */}
        {showMaterialQuickLinks && (
          <div className="border-b border-primary/20 bg-card/95 px-4 py-3 shadow-sm">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {materialQuickLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-primary/30 bg-primary-soft text-primary-soft-foreground hover:bg-primary/20"
                    }`
                  }
                >
                  <span className="text-sm">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Children (Main page content) */}
        <div className="flex-1 overflow-y-auto bg-muted p-4 lg:p-6">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

// ── Main DashboardLayout component ───────────────────────────────────────────
const DashboardLayout = ({ children, title }) => {
  const today = new Date().toLocaleDateString("en-GB");
  const navigate = useNavigate();
  const location = useLocation();

  // ── State ────────────────────────────────────────────────────────────────────
  const [openMenus, setOpenMenus] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  // tracks how many leave, reimbursements requests are pending
  const [pendingLeaveCount, setPendingLeaveCount] = useState(() =>
    readCachedCount(LEAVE_CACHE_KEY),
  );
  const [pendingReimbursementCount, setPendingReimbursementCount] = useState(
    () => readCachedCount(REIMBURSEMENT_CACHE_KEY),
  );

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatCurrency = (value) =>
    `₹${(Number(value) || 0).toLocaleString("en-IN")}`;

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ── Notification helpers ─────────────────────────────────────────────────────
  const getRetentionNotification = (order) => {
    if (
      !order?.isTriggered ||
      !order.retentionAmount ||
      !order.retentionDueDate
    )
      return null;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const dueDate = new Date(order.retentionDueDate);
    dueDate.setHours(0, 0, 0, 0);
    const reminderDate = new Date(
      order.retentionReminderDate || order.retentionDueDate,
    );
    reminderDate.setHours(0, 0, 0, 0);

    if (todayDate < reminderDate) return null;

    const overdue = todayDate > dueDate;
    return {
      id: order._id,
      title: overdue ? "Retention overdue" : "Retention due soon",
      message: `${order.project?.name || "Project"} / ${
        order.workOrderNo
      }: pay ${formatCurrency(order.retentionAmount)} by ${formatDate(
        order.retentionDueDate,
      )}.`,
      severity: overdue ? "danger" : "warning",
    };
  };

  // ── API data loaders ─────────────────────────────────────────────────────────
  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const res = await axios.get("/work-orders/retention-notifications");
      const orders = res.data?.data || [];
      setNotifications(orders.map(getRetentionNotification).filter(Boolean));
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadPendingLeaveCount = async () => {
    try {
      const res = await axios.get("/leaves/pending-count");
      const count = res.data?.count ?? 0;
      setPendingLeaveCount(count);
      writeCachedCount(LEAVE_CACHE_KEY, count);
    } catch (error) {
      console.error("Failed to load pending leave count:", error);
    }
  };

  const loadPendingReimbursementCount = async () => {
    try {
      const res = await axios.get("/reimbursements/pending-count");
      const count = res.data?.count ?? 0;
      setPendingReimbursementCount(count);
      writeCachedCount(REIMBURSEMENT_CACHE_KEY, count);
    } catch (error) {
      console.error("Failed to load pending reimbursement count:", error);
    }
  };

  // ── useEffect: dark mode + user ──────────────────────────────────────────────
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    }

    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error("Failed to parse user data", err);
      }
    }
  }, []);

  // ── useEffect: pending badge counts (admin / supervisor only) ────────────────
  const refreshPendingCounts = () => {
    loadPendingLeaveCount();
    loadPendingReimbursementCount();
  };
  const approvalsEnabled = canSeeApprovals(user);
  // initial load, then every 60 s (paused while the tab is hidden)
  usePolling(refreshPendingCounts, 60_000, { enabled: approvalsEnabled, immediate: true });
  useEffect(() => {
    if (!approvalsEnabled) return;
    const refresh = () => refreshPendingCounts();
    window.addEventListener(EVENTS.pendingCountsRefresh, refresh);
    return () => window.removeEventListener(EVENTS.pendingCountsRefresh, refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);
  // ── Toggle dark mode ─────────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // ── useEffect: path-based menu auto-open ─────────────────────────────────────
  useEffect(() => {
    const path = location.pathname;

    const isAttendance =
      path.includes("/attendance/") ||
      path.includes("/live-attendance") ||
      path.startsWith("/admin/reimbursements");
    const isMaterial =
      path.includes("/dashboard/material/") || path.includes("/material/");
    const isInventoryRoot = path.includes("/dashboard/inventory/");
    const isLabourInventory = path.includes("/dashboard/inventory/labour");
    const isSalary =
      path.startsWith("/admin/salary") ||
      path.startsWith("/admin/holidays") ||
      path.startsWith("/admin/salary-policy");

    if (isAttendance) {
      setOpenMenus(getMenuBranch("Attendance"));
      return;
    }

    if (isSalary) {
      setOpenMenus(getMenuBranch("Attendance>Salary"));
      return;
    }

    if (isMaterial) {
      setOpenMenus(getMenuBranch("Inventory>Material"));
      return;
    }

    if (isLabourInventory) {
      setOpenMenus(getMenuBranch("Inventory>Labour"));
      return;
    }

    if (isInventoryRoot) {
      setOpenMenus(getMenuBranch("Inventory"));
      return;
    }

    setOpenMenus({});
  }, [location.pathname]);

  // ── toggleMenu ───────────────────────────────────────────────────────────────
  const toggleMenu = (key) => {
    setOpenMenus((prev) => {
      if (!prev[key]) {
        return getMenuBranch(key);
      }

      const next = { ...prev };
      Object.keys(next).forEach((openKey) => {
        if (openKey === key || openKey.startsWith(`${key}>`)) {
          delete next[openKey];
        }
      });
      return next;
    });
  };

  // ── handleLogout ─────────────────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem(LEAVE_CACHE_KEY);
    sessionStorage.removeItem(REIMBURSEMENT_CACHE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    queryClient.clear();
    localStorage.removeItem("role");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("selectedBranchId");
    localStorage.removeItem("selectedBranchName");
    navigate("/login", { replace: true });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardLayoutContent
        title={title}
        user={user}
        today={today}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        showNotifications={showNotifications}
        pendingLeaveCount={pendingLeaveCount}
        pendingReimbursementCount={pendingReimbursementCount}
        setShowNotifications={setShowNotifications}
        loadNotifications={loadNotifications}
        openMenus={openMenus} 
        toggleMenu={toggleMenu}
        handleLogout={handleLogout}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
};

export default DashboardLayout;