// src/layouts/desktop/navConfig.js
// Desktop sidebar menu as plain data, grouped under the six design headers.
//
// Item fields:
//   label    text shown in the sidebar
//   to       route (omit when the item only has `children`)
//   icon     lucide-react component
//   roles    optional list of roles allowed to see it (omit = every role, as before)
//   badgeKey optional: "leaves" | "reimbursements" (pending-count badge)
//   children optional sub-pages (rendered as an accordion)
import {
  Activity,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  FileText,
  FolderKanban,
  HardHat,
  History,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Package,
  Receipt,
  ShieldCheck,
  StickyNote,
  Store,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/lib/routes';

export const NAV_GROUPS = [
  {
    header: 'Overview',
    items: [
      { label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
      { label: 'Live attendance', to: ROUTES.attendance.live, icon: Activity },
    ],
  },
  {
    header: 'People',
    items: [
      { label: 'My team', to: ROUTES.myTeam, icon: Users },
      {
        label: 'Attendance register',
        icon: ClipboardCheck,
        children: [
          { label: 'Supervisor', to: ROUTES.attendance.supervisor },
          { label: 'Subcontractor', to: ROUTES.attendance.subcontractor },
          { label: 'Labour', to: ROUTES.attendance.labour },
        ],
      },
      { label: 'Leaves', to: ROUTES.attendance.leaves, icon: CalendarClock, badgeKey: 'leaves' },
      { label: 'Reimbursements', to: ROUTES.adminReimbursements, icon: Receipt, badgeKey: 'reimbursements' },
      { label: 'Attendance notes', to: ROUTES.attendance.notes, icon: StickyNote },
    ],
  },
  {
    header: 'Payroll',
    items: [
      { label: 'Salary run', to: ROUTES.salary.dashboard, icon: Wallet },
      { label: 'Salary history', to: ROUTES.salary.history, icon: History },
      { label: 'Holidays', to: ROUTES.salary.holidays, icon: CalendarDays },
      { label: 'Payroll policy', to: ROUTES.salary.policy, icon: ShieldCheck },
    ],
  },
  {
    header: 'Projects',
    items: [
      { label: 'Projects', to: ROUTES.projects, icon: FolderKanban },
      { label: 'Tasks', to: ROUTES.tasks, icon: ListChecks },
      { label: 'Work orders', to: ROUTES.workOrders, icon: FileText },
      { label: 'Reports', to: ROUTES.reports, icon: ChartColumn },
    ],
  },
  {
    header: 'Inventory',
    items: [
      {
        label: 'Materials',
        icon: Package,
        children: [
          { label: 'Indent lists', to: ROUTES.adminMaterial.uploadIndent },
          { label: 'Purchase orders', to: ROUTES.adminMaterial.intent },
          { label: 'Site transfers', to: ROUTES.adminMaterial.siteTransfers },
          { label: 'Deliveries', to: ROUTES.adminMaterial.upcomingDeliveries },
          { label: 'GRN', to: ROUTES.adminMaterial.grn },
        ],
      },
      { label: 'Labour overview', to: ROUTES.inventoryLabourManage, icon: HardHat },
    ],
  },
  {
    header: 'Admin',
    items: [
      { label: 'Vendors', to: ROUTES.vendors, icon: Store },
      { label: 'Branches', to: ROUTES.branches, icon: MapPin },
      { label: 'Delete records', to: ROUTES.deleteAttendance, icon: Trash2 },
    ],
  },
];

const visible = (item, role) => !item.roles || item.roles.includes(role);

/** Groups with only the items `role` may see (empty groups are dropped). Pure. */
export function filterNavByRole(groups, role) {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => visible(i, role)) }))
    .filter((g) => g.items.length > 0);
}

/** Every route in the menu (leaves and sub-pages). */
export const allNavRoutes = (groups = NAV_GROUPS) =>
  groups.flatMap((g) => g.items.flatMap((i) => (i.children ? i.children.map((c) => c.to) : [i.to])));
