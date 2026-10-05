import {
  FaClipboardList,
  FaUsers,
  FaBoxes,
  FaUserCog,
  FaMoneyBillWave,
  FaTasks,
  FaHardHat,
  FaChevronDown,
  FaChevronUp,
  FaPowerOff,
  FaSitemap,
  FaTimes,
  FaUserCircle,
  FaFileUpload,
  FaTruck,
  FaClipboardCheck,
  FaShoppingCart,
} from "react-icons/fa";
import { MdSettings, MdInventory } from "react-icons/md";
import { IoDocumentTextOutline } from "react-icons/io5";
import { BiUserCheck } from "react-icons/bi";
import { NavLink, useLocation, matchPath } from "react-router-dom";
import logo from "../../assets/logo.png";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Shared class strings ─────────────────────────────────────────────────────
// Top-level rows: full width + roomy when expanded, centered icon when collapsed.
const ROW_BASE =
  "flex items-center w-full h-auto rounded-lg text-sm transition-all gap-3 px-4 py-3 " +
  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3 " +
  "group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!h-auto";

// Thin, white-tinted scrollbar that suits the orange sidebar.
// When collapsed it stays scrollable but the bar is hidden.
const SCROLL_CLASSES =
  "overflow-y-auto overflow-x-hidden " +
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.35)_transparent] " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/35 " +
  "group-data-[collapsible=icon]:!overflow-y-auto group-data-[collapsible=icon]:!overflow-x-hidden " +
  "group-data-[collapsible=icon]:[scrollbar-width:none] " +
  "group-data-[collapsible=icon]:[&::-webkit-scrollbar]:hidden";

const AppSidebar = ({
  user,
  pendingLeaveCount = 0,
  pendingReimbursementCount = 0,
  openMenus = {},
  onToggleMenu = () => {},
  onLogout = () => {},
}) => {
  const { isMobile, setOpenMobile, state, setOpen } = useSidebar();
  const { pathname } = useLocation();

  const isCollapsed = state === "collapsed" && !isMobile;

  // NavLink's function-className breaks under `asChild` (Radix Slot stringifies it),
  // so we compute the active state ourselves and pass plain strings.
  const isPathActive = (path) =>
    !!path && !!matchPath({ path, end: path === "/dashboard" }, pathname);

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const menuItems = [
    { label: "Dashboard", icon: <FaClipboardList />, path: "/dashboard" },
    { label: "My Team", icon: <FaUsers />, path: "/admin/my-team" },
    {
      label: "Attendance",
      icon: <BiUserCheck />,
      children: [
        { label: "Live Dashboard", path: "/dashboard/live-attendance" },
        { label: "Supervisor", path: "/attendance/supervisor" },
        { label: "Subcontractor", path: "/attendance/subcontractor" },
        { label: "Labour", path: "/attendance/labour" },
        { label: "Notes", path: "/attendance/notes" },
        { label: "Leaves", path: "/attendance/leaves", badge: pendingLeaveCount },
        { label: "Reimbursements", path: "/admin/reimbursements", badge: pendingReimbursementCount },
        { label: "Delete Records", path: "/admin/attendance/delete" },
        {
          label: "Salary",
          icon: <FaMoneyBillWave />,
          children: [
            { label: "Dashboard", path: "/admin/salary" },
            { label: "History", path: "/admin/salary-history" },
            { label: "Holidays", path: "/admin/holidays" },
            { label: "Policy", path: "/admin/salary-policy" },
          ],
        },
      ],
    },
    { label: "Projects", icon: <FaClipboardList />, path: "/admin/projects" },
    { label: "Tasks", icon: <FaTasks />, path: "/admin/tasks" },
    {
      label: "Inventory",
      icon: <FaBoxes />,
      children: [
        {
          label: "Material",
          icon: <MdInventory />,
          children: [
            { label: "Upload Indent List", path: "/dashboard/material/uploadindent", icon: <FaFileUpload /> },
            { label: "Intent (PO)", path: "/dashboard/material/intent", icon: <FaShoppingCart /> },
            { label: "Site Transfers", path: "/dashboard/material/site-transfers", icon: <FaTruck /> },
            { label: "Upcoming Deliveries", path: "/dashboard/material/upcoming-deliveries", icon: <FaClipboardCheck /> },
            { label: "GRN", path: "/dashboard/material/grn", icon: <FaClipboardList /> },
          ],
        },
        {
          label: "Labour",
          icon: <FaHardHat />,
          children: [
            { label: "Manage Labour", path: "/dashboard/inventory/labour/manage" },
          ],
        },
      ],
    },
    { label: "Work Orders", icon: <IoDocumentTextOutline />, path: "/dashboard/work-orders" },
    { label: "Reports", icon: <FaClipboardList />, path: "/dashboard/report" },
    { label: "Vendors", icon: <FaUserCog />, path: "/dashboard/vendors" },
    { label: "Branches", icon: <FaSitemap />, path: "/dashboard/branches" },
    { label: "Settings", icon: <MdSettings />, path: "/dashboard/settings", disabled: true },
  ];

  // Does this group (or any nested group) contain the current page?
  const groupHasActiveChild = (item) =>
    (item.children || []).some((child) =>
      child.children ? groupHasActiveChild(child) : isPathActive(child.path)
    );

  const renderMenuItem = (item, depth = 0, parentKey = "") => {
    const key = parentKey ? `${parentKey}>${item.label}` : item.label;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isOpen = !!openMenus[key];

    // ── Group with children ──────────────────────────────────────────────────
    if (hasChildren) {
      if (depth === 0) {
        const containsActive = groupHasActiveChild(item);

        const handleGroupClick = () => {
          // Collapsed rail has no room for sub-items: expand first, then open the group.
          if (isCollapsed) {
            setOpen(true);
            if (!isOpen) onToggleMenu(key);
            return;
          }
          onToggleMenu(key);
        };

        return (
          <SidebarMenuItem key={key}>
            <SidebarMenuButton
              tooltip={item.label}
              onClick={handleGroupClick}
              className={cn(
                ROW_BASE,
                "justify-between text-white bg-white/20 hover:bg-white/30 hover:text-white active:bg-white/30 active:text-white",
                (isOpen || containsActive) && "font-semibold",
                // Collapsed: brighter when the current page lives inside this group
                containsActive && "group-data-[collapsible=icon]:bg-white/40"
              )}
            >
              <div className="flex items-center gap-3 min-w-0 group-data-[collapsible=icon]:gap-0">
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
              </div>
              <span className="group-data-[collapsible=icon]:hidden">
                {isOpen ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
              </span>
            </SidebarMenuButton>

            {isOpen && (
              <SidebarMenuSub className="border-white/20 mt-1 space-y-1 group-data-[collapsible=icon]:hidden">
                {item.children.map((child) => renderMenuItem(child, depth + 1, key))}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        );
      }

      // Nested group (depth > 0, e.g. Attendance > Salary, Inventory > Material)
      return (
        <SidebarMenuSubItem key={key}>
          <SidebarMenuSubButton
            role="button"
            onClick={() => onToggleMenu(key)}
            className={cn(
              "flex items-center justify-between w-full h-auto py-2 px-3 text-sm transition-all rounded-lg cursor-pointer",
              "text-white/90 bg-white/10 hover:bg-white/20 hover:text-white active:bg-white/20 active:text-white",
              isOpen && "font-semibold"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {item.icon && <span className="text-sm shrink-0">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </div>
            <span>
              {isOpen ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
            </span>
          </SidebarMenuSubButton>

          {isOpen && (
            <SidebarMenuSub className="border-white/20 mt-1 space-y-1 ml-2">
              {item.children.map((child) => renderMenuItem(child, depth + 1, key))}
            </SidebarMenuSub>
          )}
        </SidebarMenuSubItem>
      );
    }

    // ── Disabled item (e.g. Settings) ────────────────────────────────────────
    if (item.disabled) {
      return (
        <SidebarMenuItem key={key}>
          <SidebarMenuButton
            tooltip={`${item.label} (Coming Soon)`}
            disabled
            className={cn(ROW_BASE, "text-white/70 cursor-not-allowed my-1 disabled:opacity-100")}
          >
            <span className="text-sm shrink-0">{item.icon}</span>
            <span className="group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    const active = isPathActive(item.path);

    // ── Leaf item (NavLink) at depth 0 ───────────────────────────────────────
    if (depth === 0) {
      return (
        <SidebarMenuItem key={key}>
          <SidebarMenuButton
            asChild
            tooltip={item.label}
            className={cn(
              ROW_BASE,
              active
                ? "bg-white text-orange-500 font-semibold shadow-md hover:bg-white hover:text-orange-500 active:bg-white active:text-orange-500"
                : "text-white hover:bg-white/20 hover:text-white active:bg-white/30 active:text-white"
            )}
          >
            <NavLink to={item.path} onClick={closeMobile}>
              <span className="text-sm shrink-0">{item.icon}</span>
              <span className="group-data-[collapsible=icon]:hidden flex-1 truncate">
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className="group-data-[collapsible=icon]:hidden min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    // ── Leaf item (NavLink) at depth > 0 ─────────────────────────────────────
    return (
      <SidebarMenuSubItem key={key}>
        <SidebarMenuSubButton
          asChild
          className={cn(
            "flex items-center w-full h-auto py-2 px-3 text-sm transition-all rounded-lg",
            active
              ? "bg-white/40 text-white font-semibold hover:bg-white/40 hover:text-white active:bg-white/40 active:text-white"
              : "text-white/80 hover:bg-white/20 hover:text-white active:bg-white/30 active:text-white"
          )}
        >
          <NavLink to={item.path} onClick={closeMobile}>
            {item.icon && <span className="text-sm mr-2 shrink-0">{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="bg-orange-500 dark:bg-gray-800 text-white rounded-r-2xl shadow-2xl border-0 overflow-hidden [&_[data-sidebar=sidebar]]:bg-transparent"
    >
      {/* ── Header: logo (or LP badge when collapsed) + close (mobile) + user ── */}
      <SidebarHeader className="p-4 border-b border-white/20 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between">
          {/* Full logo — expanded / mobile */}
          <div className="flex-1 rounded-lg bg-white/80 p-2 flex items-center justify-center group-data-[collapsible=icon]:hidden">
            <img src={logo} alt="Laxmi Powertech" className="w-full" />
          </div>

          {/* Compact badge — collapsed rail only */}
          <div
            className="hidden group-data-[collapsible=icon]:flex mx-auto h-12 w-12 items-center justify-center rounded-lg bg-white/90 text-lg font-extrabold text-orange-500"
            title="Laxmi Powertech"
          >
            LP
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-2 text-white hover:bg-white/30 hover:text-white rounded-full shrink-0"
            onClick={() => setOpenMobile(false)}
            aria-label="Close sidebar"
          >
            <FaTimes size={18} />
          </Button>
        </div>

        {user && (
          <div className="pt-4 border-t border-white/20 mt-4">
            <div
              className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
              title={user.name || "User"}
            >
              <FaUserCircle className="text-3xl text-white/90 shrink-0" />
              <div className="group-data-[collapsible=icon]:hidden min-w-0">
                <div className="text-sm font-semibold truncate">{user.name || "User"}</div>
                <div className="text-xs text-white/70 capitalize truncate">{user.role || "Supervisor"}</div>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      {/* ── Navigation: this is the only scroll container ── */}
      <SidebarContent className={cn("p-2", SCROLL_CLASSES)}>
        <SidebarMenu className="gap-1 pb-2">
          {menuItems.map((item) => renderMenuItem(item))}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer: logout (always visible) ── */}
      <SidebarFooter className="p-2 border-t border-white/20 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={onLogout}
              className={cn(
                ROW_BASE,
                "text-white hover:bg-white/20 hover:text-white active:bg-white/30 active:text-white"
              )}
            >
              <FaPowerOff className="shrink-0 text-sm" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;