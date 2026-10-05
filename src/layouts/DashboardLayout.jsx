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
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import axios from "../utils/axios";

// ── shadcn/ui components ──────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";

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

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
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
        <div className="flex justify-between items-center px-4 lg:px-6 py-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl z-10">
          {/* Left: Mobile hamburger + Desktop collapse toggle + Page title */}
          <div className="flex items-center gap-4">
            {/* Mobile hamburger — only visible below lg */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-orange-500 hover:text-orange-600 hover:bg-orange-50"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <FaBars className="text-xl" />
            </Button>

            {/* Desktop collapse/expand — only visible on lg+ */}
            <Button
              variant="outline"
              size="icon"
              className="hidden lg:flex w-9 h-9 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
              onClick={toggleSidebar}
              title={state === "collapsed" ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {state === "collapsed" ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
            </Button>

            {title && (
              <h1 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex gap-3 lg:gap-4 items-center">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-gray-700"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <FaSun className="text-lg lg:text-xl" /> : <FaMoon className="text-lg lg:text-xl" />}
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
                  className="relative text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-gray-700"
                  title="Notifications"
                >
                  <FaBell className="text-lg lg:text-xl" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    onClick={() => setShowNotifications(false)}
                    title="Close notifications"
                  >
                    <FaTimes size={12} />
                  </Button>
                </div>

                {/* Panel body */}
                <div className="max-h-80 overflow-y-auto p-3">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <MdNotificationsActive className="mx-auto mb-2 text-3xl text-gray-300 dark:text-gray-500" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No notifications</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">You are all caught up.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-lg px-3 py-2 ${notification.color}`}
                        >
                          <p className="text-sm font-semibold">{notification.title}</p>
                          <p className="mt-1 text-xs leading-5">{notification.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Calendar */}
            <Button
              variant="ghost"
              size="icon"
              className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-gray-700"
            >
              <FaCalendarAlt className="text-lg lg:text-xl" />
            </Button>

            {/* Today's date */}
            <span className="hidden sm:block text-xs lg:text-sm text-gray-600 dark:text-gray-300 font-medium bg-orange-50 dark:bg-gray-700 px-3 py-1 rounded-full">
              {today}
            </span>

            {/* Topbar logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 rounded-full border-orange-200 bg-orange-50 text-orange-600 shadow-sm hover:bg-orange-100 dark:border-gray-600 dark:bg-gray-700 dark:text-orange-300 dark:hover:bg-gray-600"
              title="Logout"
            >
              <FaPowerOff className="text-sm" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Material quick-links bar */}
        {showMaterialQuickLinks && (
          <div className="border-b border-orange-100 bg-white/95 px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/95">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {materialQuickLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                        : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-gray-600 dark:bg-gray-700 dark:text-orange-300 dark:hover:bg-gray-600'
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
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
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
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingReimbursementCount, setPendingReimbursementCount] = useState(0);

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ── Notification helpers ─────────────────────────────────────────────────────
  const getRetentionNotification = (order) => {
    if (!order?.isTriggered || !order.retentionAmount || !order.retentionDueDate) return null;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const dueDate = new Date(order.retentionDueDate);
    dueDate.setHours(0, 0, 0, 0);
    const reminderDate = new Date(order.retentionReminderDate || order.retentionDueDate);
    reminderDate.setHours(0, 0, 0, 0);

    if (todayDate < reminderDate) return null;

    const overdue = todayDate > dueDate;
    return {
      id: order._id,
      title: overdue ? 'Retention overdue' : 'Retention due soon',
      message: `${order.project?.name || 'Project'} / ${order.workOrderNo}: pay ${formatCurrency(order.retentionAmount)} by ${formatDate(order.retentionDueDate)}.`,
      color: overdue ? 'text-red-600 bg-red-50' : 'text-yellow-700 bg-yellow-50',
    };
  };

  // ── API data loaders ─────────────────────────────────────────────────────────
  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const res = await axios.get('/work-orders/retention-notifications');
      const orders = res.data?.data || [];
      setNotifications(orders.map(getRetentionNotification).filter(Boolean));
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadPendingLeaveCount = async () => {
    try {
      const res = await axios.get("/leaves?status=pending&page=1&limit=1");
      setPendingLeaveCount(res.data?.total || 0);
    } catch (error) {
      console.error("Failed to load pending leave count:", error);
      setPendingLeaveCount(0);
    }
  };

  const loadPendingReimbursementCount = async () => {
    try {
      const res = await axios.get("/reimbursements?status=pending&page=1&limit=1");
      setPendingReimbursementCount(res.data?.total || 0);
    } catch (error) {
      console.error("Failed to load pending reimbursement count:", error);
      setPendingReimbursementCount(0);
    }
  };

  // ── useEffect: dark mode + user + initial badge counts ───────────────────────
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Failed to parse user data', err);
      }
    }

    loadPendingLeaveCount();
    loadPendingReimbursementCount();
  }, []);

  // ── Toggle dark mode ─────────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // ── useEffect: path-based menu auto-open ─────────────────────────────────────
  useEffect(() => {
    const path = location.pathname;

    const isAttendance = path.includes('/attendance/') || path.includes('/live-attendance') || path.startsWith('/admin/reimbursements');
    const isMaterial = path.includes('/dashboard/material/') || path.includes('/material/');
    const isInventoryRoot = path.includes('/dashboard/inventory/');
    const isLabourInventory = path.includes('/dashboard/inventory/labour');
    const isSalary = path.startsWith('/admin/salary') || path.startsWith('/admin/holidays') || path.startsWith('/admin/salary-policy');

    if (isAttendance) {
      setOpenMenus(getMenuBranch('Attendance'));
      return;
    }

    if (isSalary) {
      setOpenMenus(getMenuBranch('Attendance>Salary'));
      return;
    }

    if (isMaterial) {
      setOpenMenus(getMenuBranch('Inventory>Material'));
      return;
    }

    if (isLabourInventory) {
      setOpenMenus(getMenuBranch('Inventory>Labour'));
      return;
    }

    if (isInventoryRoot) {
      setOpenMenus(getMenuBranch('Inventory'));
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('selectedBranchId');
    localStorage.removeItem('selectedBranchName');
    navigate('/login', { replace: true });
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
        setShowNotifications={setShowNotifications}
        loadNotifications={loadNotifications}
        pendingLeaveCount={pendingLeaveCount}
        pendingReimbursementCount={pendingReimbursementCount}
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