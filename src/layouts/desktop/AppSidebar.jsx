// src/layouts/desktop/AppSidebar.jsx
// Desktop sidebar. Renders navConfig through the ui/sidebar primitives; colors come from the
// --sidebar-* tokens, so only layout classes live here.
import { memo, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import Logo from "@/components/common/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, filterNavByRole } from './navConfig';
import { isRouteActive } from './useSidebarMenus';

// Collapsed: every row is a centered 40px tile (same rhythm for links and accordion parents).
const ROW = 'h-auto min-h-[38px] gap-2.5 rounded-control px-2.5 text-body font-medium group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:min-h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0';
// Links also set their color explicitly (the global `a` rule would otherwise tint them).
const ROW_IDLE = 'text-sidebar-foreground hover:bg-surface-muted hover:text-ink-1';
const ROW_ACTIVE = 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
const COLLAPSED_HIDE = 'group-data-[collapsible=icon]:hidden';

function Badge({ count }) {
  if (!(count > 0)) return null;
  return (
    <span className={cn('ml-auto flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-highlight-foreground px-1.5 text-[11px] font-semibold text-surface', COLLAPSED_HIDE)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function AppSidebar({ role, pendingLeaveCount = 0, pendingReimbursementCount = 0, openMenus, onToggleMenu }) {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const { pathname } = useLocation();
  const groups = useMemo(() => filterNavByRole(NAV_GROUPS, role), [role]);
  const counts = { leaves: pendingLeaveCount, reimbursements: pendingReimbursementCount };
  const isCollapsed = state === 'collapsed' && !isMobile;
  const closeMobile = () => isMobile && setOpenMobile(false);

  const renderLeaf = (item) => {
    const active = isRouteActive(item.to, pathname);
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild tooltip={item.label} isActive={active} className={cn(ROW, active ? ROW_ACTIVE : ROW_IDLE)}>
          <NavLink to={item.to} onClick={closeMobile}>
            <Icon size={18} strokeWidth={1.8} className="shrink-0" />
            <span className={cn('truncate', COLLAPSED_HIDE)}>{item.label}</span>
            <Badge count={counts[item.badgeKey]} />
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderParent = (item) => {
    const isOpen = !!openMenus[item.label];
    const containsActive = item.children.some((c) => isRouteActive(c.to, pathname));
    const Icon = item.icon;
    if (isCollapsed) {
      // Collapsed rail: the icon opens a small flyout of sub-pages (links) on the right.
      return (
        <SidebarMenuItem key={item.label}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton aria-label={item.label} className={cn(ROW, containsActive ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : ROW_IDLE)}>
                <Icon size={18} strokeWidth={1.8} className="shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={12} className="min-w-[200px]">
              <DropdownMenuLabel className="px-2 py-1.5 text-caption font-semibold uppercase tracking-[0.06em] text-ink-4">{item.label}</DropdownMenuLabel>
              {item.children.map((child) => {
                const active = isRouteActive(child.to, pathname);
                return (
                  <DropdownMenuItem key={child.to} asChild className={cn('cursor-pointer text-small', active && 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground')}>
                    <NavLink to={child.to} className="text-ink-1">{child.label}</NavLink>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      );
    }
    return (
      <SidebarMenuItem key={item.label}>
        <Accordion
          type="single"
          collapsible
          value={isOpen ? item.label : ''}
          onValueChange={() => onToggleMenu(item.label)}
        >
          <AccordionItem value={item.label} className="border-0">
            <AccordionTrigger
              title={item.label}
              className={cn(
                ROW,
                'w-full justify-between py-0 hover:no-underline group-data-[collapsible=icon]:[&>svg]:hidden',
                containsActive ? 'font-semibold text-sidebar-accent-foreground' : ROW_IDLE,
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                <span className={cn('truncate', COLLAPSED_HIDE)}>{item.label}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <SidebarMenuSub className={cn('mt-1 space-y-0.5', COLLAPSED_HIDE)}>
                {item.children.map((child) => {
                  const active = isRouteActive(child.to, pathname);
                  return (
                    <SidebarMenuSubItem key={child.to}>
                      <SidebarMenuSubButton asChild isActive={active} className={cn('h-auto min-h-8 rounded-control px-2.5 py-1.5 text-small', active ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : ROW_IDLE)}>
                        <NavLink to={child.to} onClick={closeMobile}>
                          <span className="truncate">{child.label}</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border shadow-none">
      <SidebarHeader className="px-3 pb-0 pt-[18px] group-data-[collapsible=icon]:px-2">
        <div className="mb-1 flex items-center justify-between border-b border-line px-2 pb-3.5">
          <div className={cn('flex flex-1 justify-start', COLLAPSED_HIDE)}>
            <Logo width={134} height={48} priority className="h-auto w-full max-h-12 object-contain object-left" />
          </div>
          {/* Compact badge: collapsed rail only */}
          <div className="mx-auto hidden h-10 w-10 items-center justify-center rounded-control bg-primary text-body font-extrabold text-primary-foreground group-data-[collapsible=icon]:flex" title="Laxmi Powertech">
            LP
          </div>
          <Button variant="ghost" size="icon" className="ml-2 shrink-0 text-ink-3 lg:hidden" onClick={() => setOpenMobile(false)} aria-label="Close sidebar">
            <X size={18} />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 pb-[18px] group-data-[collapsible=icon]:px-2">
        {groups.map((group, index) => (
          <SidebarGroup key={group.header} className="p-0">
            {index > 0 && <div className="mx-auto my-2 hidden h-px w-8 bg-line group-data-[collapsible=icon]:block" aria-hidden="true" />}
            <SidebarGroupLabel className={cn('h-auto px-2.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4', COLLAPSED_HIDE)}>
              {group.header}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => (item.children ? renderParent(item) : renderLeaf(item)))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export default memo(AppSidebar);
