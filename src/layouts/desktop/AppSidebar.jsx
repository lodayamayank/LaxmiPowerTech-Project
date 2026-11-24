import {
  FaClipboardList,
  FaUsers,
  FaBoxes,
  FaUserCog,
  FaMoneyBillWave,
  FaTasks,
  FaHardHat,
  FaPowerOff,
  FaSitemap,
  FaTimes,
  FaFileUpload,
  FaTruck,
  FaClipboardCheck,
  FaShoppingCart,
} from "react-icons/fa";
import { MdSettings, MdInventory } from "react-icons/md";
import { ROUTES } from '@/lib/routes';
import { IoDocumentTextOutline } from "react-icons/io5";
import { BiUserCheck } from "react-icons/bi";
import { NavLink, useLocation, matchPath } from "react-router-dom";
import logo from "@/assets/logo.png";

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// ── Shared class strings ─────────────────────────────────────────────────────
// Top-level rows: full width + roomy when expanded, centered icon when collapsed.
const ROW_BASE =
  "flex items-center w-full h-auto rounded-lg text-sm transition-all gap-3 px-4 py-3 " +
  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3 " +
  "group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!h-auto";

// Row colour states (light sidebar, orange accent)
const ROW_IDLE =
  "text-foreground hover:bg-primary-soft hover:text-primary-soft-foreground active:bg-primary-soft active:text-primary-soft-foreground";
const ROW_ACTIVE =
  "relative bg-primary-soft text-primary-soft-foreground font-semibold hover:bg-primary-soft hover:text-primary-soft-foreground active:bg-primary-soft active:text-primary-soft-foreground " +
  "before:absolute before:-left-2 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-primary";

const BADGE =
  "min-w-[20px] h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center shrink-0";

// Thin grey scrollbar; when collapsed it stays scrollable but the bar is hidden.
const SCROLL_CLASSES =
  "overflow-y-auto overflow-x-hidden " +
  "[scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 " +
  "group-data-[collapsible=icon]:!overflow-y-auto group-data-[collapsible=icon]:!overflow-x-hidden " +
  "group-data-[collapsible=icon]:[scrollbar-width:none] " +
  "group-data-[collapsible=icon]:[&::-webkit-scrollbar]:hidden";

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "U";

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
    { label: "Dashboard", icon: <FaClipboardList />, path: ROUTES.dashboard },
    { label: "My Team", icon: <FaUsers />, path: ROUTES.myTeam },
    {
      label: "Attendance",
      icon: <BiUserCheck />,
      children: [
        { label: "Live Dashboard", path: ROUTES.attendance.live },
        { label: "Supervisor", path: ROUTES.attendance.supervisor },
        { label: "Subcontractor", path: ROUTES.attendance.subcontractor },
        { label: "Labour", path: ROUTES.attendance.labour },
        { label: "Notes", path: ROUTES.attendance.notes },
        { label: "Leaves", path: ROUTES.attendance.leaves, badge: pendingLeaveCount },
        { label: "Reimbursements", path: ROUTES.adminReimbursements, badge: pendingReimbursementCount },
        { label: "Delete Records", path: ROUTES.deleteAttendance },
        {
          label: "Salary",
          icon: <FaMoneyBillWave />,
          children: [
            { label: "Dashboard", path: ROUTES.salary.dashboard },
            { label: "History", path: ROUTES.salary.history },
            { label: "Holidays", path: ROUTES.salary.holidays },
            { label: "Policy", path: ROUTES.salary.policy },
          ],
        },
      ],
    },
    { label: "Projects", icon: <FaClipboardList />, path: ROUTES.projects },
    { label: "Tasks", icon: <FaTasks />, path: ROUTES.tasks },
    {
      label: "Inventory",
      icon: <FaBoxes />,
      children: [
        {
          label: "Material",
          icon: <MdInventory />,
          children: [
            { label: "Upload Indent List", path: ROUTES.adminMaterial.uploadIndent, icon: <FaFileUpload /> },
            { label: "Intent (PO)", path: ROUTES.adminMaterial.intent, icon: <FaShoppingCart /> },
            { label: "Site Transfers", path: ROUTES.adminMaterial.siteTransfers, icon: <FaTruck /> },
            { label: "Upcoming Deliveries", path: ROUTES.adminMaterial.upcomingDeliveries, icon: <FaClipboardCheck /> },
            { label: "GRN", path: ROUTES.adminMaterial.grn, icon: <FaClipboardList /> },
          ],
        },
        {
          label: "Labour",
          icon: <FaHardHat />,
          children: [
            { label: "Manage Labour", path: ROUTES.inventoryLabourManage },
          ],
        },
      ],
    },
    { label: "Work Orders", icon: <IoDocumentTextOutline />, path: ROUTES.workOrders },
    { label: "Reports", icon: <FaClipboardList />, path: ROUTES.reports },
    { label: "Vendors", icon: <FaUserCog />, path: ROUTES.vendors },
    { label: "Branches", icon: <FaSitemap />, path: ROUTES.branches },
    { label: "Settings", icon: <MdSettings />, path: ROUTES.settings, disabled: true },
  ];

  // Settings sits in the footer (above Logout), everything else in the scroll area
  const mainItems = menuItems.filter((item) => item.label !== "Settings");
  const settingsItem = menuItems.find((item) => item.label === "Settings");

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

        return (
          <SidebarMenuItem key={key}>
            <Accordion
              type="single"
              collapsible
              value={isOpen ? key : ""}
              onValueChange={() => {
                if (isCollapsed) {
                  setOpen(true);
                  if (!isOpen) onToggleMenu(key);
                  return;
                }
                onToggleMenu(key);
              }}
            >
              <AccordionItem value={key} className="border-0">
                <AccordionTrigger
                  title={item.label}
                  className={cn(
                    ROW_BASE,
                    "justify-between hover:no-underline group-data-[collapsible=icon]:[&>svg]:hidden",
                    containsActive ? ROW_ACTIVE : ROW_IDLE,
                    isOpen && "font-semibold",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 group-data-[collapsible=icon]:gap-0">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="group-data-[collapsible=icon]:hidden truncate">
                      {item.label}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <SidebarMenuSub className="border-sidebar-border mt-1 space-y-1 group-data-[collapsible=icon]:hidden">
                    {item.children.map((child) =>
                      renderMenuItem(child, depth + 1, key),
                    )}
                  </SidebarMenuSub>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SidebarMenuItem>
        );
      }

      // Nested group (depth > 0, e.g. Attendance > Salary, Inventory > Material)
      return (
        <SidebarMenuSubItem key={key}>
          <Accordion
            type="single"
            collapsible
            value={isOpen ? key : ""}
            onValueChange={() => onToggleMenu(key)}
          >
            <AccordionItem value={key} className="border-0">
              <AccordionTrigger
                className={cn(
                  "flex items-center justify-between w-full h-auto py-2 px-3 text-sm transition-all rounded-lg cursor-pointer hover:no-underline",
                  "text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground active:bg-primary-soft active:text-primary-soft-foreground",
                  isOpen && "font-semibold",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {item.icon && (
                    <span className="text-sm shrink-0">{item.icon}</span>
                  )}
                  <span className="truncate">{item.label}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <SidebarMenuSub className="border-sidebar-border mt-1 space-y-1 ml-2">
                  {item.children.map((child) =>
                    renderMenuItem(child, depth + 1, key),
                  )}
                </SidebarMenuSub>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
            className={cn(ROW_BASE, "text-muted-foreground/60 cursor-not-allowed disabled:opacity-100")}
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
            className={cn(ROW_BASE, active ? ROW_ACTIVE : ROW_IDLE)}
          >
            <NavLink to={item.path} onClick={closeMobile}>
              <span className="text-sm shrink-0">{item.icon}</span>
              <span className="group-data-[collapsible=icon]:hidden flex-1 truncate">
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className={cn(BADGE, "group-data-[collapsible=icon]:hidden")}>
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
              ? "bg-primary-soft text-primary-soft-foreground font-semibold hover:bg-primary-soft hover:text-primary-soft-foreground active:bg-primary-soft active:text-primary-soft-foreground"
              : "text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground active:bg-primary-soft active:text-primary-soft-foreground",
          )}
        >
          <NavLink to={item.path} onClick={closeMobile}>
            {item.icon && (
              <span className="text-sm mr-2 shrink-0">{item.icon}</span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge > 0 && (
              <span className={BADGE}>
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
      className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-none overflow-hidden [&_[data-sidebar=sidebar]]:bg-transparent"
    >
      {/* ── Header: logo (or LP badge when collapsed) + close (mobile) + user card ── */}
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between">
          {/* Full logo — expanded / mobile */}
          <div className="flex-1 flex items-center justify-start group-data-[collapsible=icon]:hidden">
            <img width={134} height={48}
              src={logo}
              alt="Laxmi Powertech"
              className="h-auto w-full max-h-12 object-contain object-left"
            />
          </div>

          {/* Compact badge — collapsed rail only */}
          <div
            className="hidden group-data-[collapsible=icon]:flex mx-auto h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-extrabold text-primary-foreground"
            title="Laxmi Powertech"
          >
            LP
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full shrink-0"
            onClick={() => setOpenMobile(false)}
            aria-label="Close sidebar"
          >
            <FaTimes size={18} />
          </Button>
        </div>

        {user && (
          <div
            className="mt-4 rounded-xl border border-border bg-card p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
            title={user.name || "User"}
          >
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary-soft text-primary-soft-foreground text-xs font-bold flex items-center justify-center">
                {initialsOf(user.name)}
              </div>
              <div className="group-data-[collapsible=icon]:hidden min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {user.name || "User"}
                </div>
                <div className="text-xs text-muted-foreground capitalize truncate">
                  {user.role || "Supervisor"}
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      {/* ── Navigation: this is the only scroll container ── */}
      <SidebarContent className={cn("p-2", SCROLL_CLASSES)}>
        <SidebarMenu className="gap-1 pb-2">
          {mainItems.map((item) => renderMenuItem(item))}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer: settings + logout (always visible) ── */}
      <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
        <SidebarMenu>
          {settingsItem && renderMenuItem(settingsItem)}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={onLogout}
              className={cn(ROW_BASE, ROW_IDLE)}
            >
              <FaPowerOff className="shrink-0 text-sm" />
              <span className="group-data-[collapsible=icon]:hidden">
                Logout
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;