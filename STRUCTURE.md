# src/ structure

```
src/
  main.jsx, App.jsx, index.css   entry, routes, global styles + design tokens
  assets/                        images
  api/                           client.js (axios instance), material.js, materialTransfers.js
  components/ui/                 shadcn primitives only
  components/common/             shared design-system components (DataTable, PaginationBar, ...)
  hooks/                         shared hooks (use-mobile.js)
  layouts/desktop/               DashboardLayout, AppSidebar, Topbar, NotificationsPopover, AccountMenu, MaterialQuickNav, navConfig (menu data), usePendingCounts/useDarkMode/useSidebarMenus
  layouts/mobile/                MobileShell, MobileHeader, MobileBackButton
  lib/                           utils.js (cn) + pure helpers: format, status, date, dateRange,
                                 branchContext, attendanceCalculations, faceValidation, punchStatusCache
  pwa/                           service worker registration, InstallPWA, OfflineBanner, offline sync
                                 (offlineStorage, syncEngine, syncAttendance, offlineSubmit), network/notifier hooks
  routes/                        PrivateRoute
  services/                      faceLandmarker
  pages/<domain>/                route-level pages, one folder per domain
  pages/<domain>/components/     components (and their hooks) used only by that domain
```

Domains: account, admin, attendance, auth, dashboard, dev (styleguide), inventory, leaves,
material (intent, transfers, deliveries, grn, indent, components), payroll, projects,
reimbursements, reports, supervisor, team.

## Placement rule (components and hooks)
- Used by one page: next to it, or in `pages/<domain>/components/`.
- Used by several pages of one domain: `pages/<domain>/components/`.
- Used by pages of 2+ domains: `components/common/` if generic UI, otherwise decide case by case.
- Shared hooks go in `hooks/`. Never put domain code in `components/ui` or `components/common`.

## Naming
- Folders: kebab-case. Component files: PascalCase.jsx. Hooks and utils: camelCase.js.
- Hooks start with `use`.

## Imports
- Across folders: the `@/` alias (`@/components/ui/button`). Relative (`./x`) only for files in the same folder.
- No barrel (`index.js`) files.

## Design rules for new and migrated code
- Style only through design tokens (index.css, tailwind.config.js). No raw colors such as
  `orange-500`, `gray-*`, `bg-white` in pages.
- Use `components/ui` and `components/common` instead of raw `<button>`, `<input>`, `<select>`, `<table>`.
- Format dates, money and numbers with `lib/format.js`; map statuses to tones with `lib/status.js`.
- Paginate with `PaginationBar`; `currentPage` is 1-based.
- See `/styleguide` (dev only) for every component and token.

## Page recipe (migrating a page to the design system)
1. Skeleton: `<DashboardLayout>` (no `title`) > `<PageHeader eyebrow="Section / Page" title description actions />` > one or more `<SectionCard flush>`
   holding optional `Tabs`/`SegmentedControl`, a `<FilterBar>` (`FilterField` + `SearchInput`/`Select`), a `<DataTable>` (or cards) and a
   `<PaginationBar>` footer. Summary tiles use `<StatCard>`.
2. Replace: local formatDate/formatCurrency -> `lib/format`; local status badge or color map -> `<StatusBadge status/>` (add missing statuses to
   `STATUS_TONES` in `lib/status.js`); initials circle -> `<UserAvatar/>`; `window.confirm`/ConfirmModal -> `<ConfirmDialog/>`; hand-rolled pagination
   -> `<PaginationBar/>` (1-based); "No ... found" -> `<EmptyState/>`; raw button/input/select/textarea/table -> `components/ui`; Label+Input+error ->
   `<FormField/>`; react-icons -> lucide-react; role checks -> `lib/roles`; storage reads -> `lib/session`.
3. Colors: bg-white -> bg-surface; bg-gray-50 -> bg-surface-subtle (page background -> bg-page); bg-gray-100 -> bg-surface-muted; border-gray-100/200 ->
   border-line / border-line-card; border-gray-300 -> border-line-input; text-gray-900/800 -> text-ink-1; text-gray-700 -> text-ink-2; text-gray-600/500 ->
   text-ink-3; text-gray-400 -> text-ink-4; brand orange (buttons, links, active, focus) -> primary / primary-soft / ring via Button/Tabs, or text-primary;
   orange as accent (progress, dots) -> highlight / tone-highlight; green -> tone-ok; red -> tone-bad; yellow/amber -> tone-warn; blue -> tone-info;
   purple -> tone-purple; pink -> tone-pink. Delete every `dark:` color variant (tokens handle dark mode).
4. Performance: debounce text search with `hooks/useDebounce`; derive filtered/sorted lists with `useMemo`; extract table rows/cells into memoized components
   when a list can exceed ~50 rows; no `transition-all`, hover scale or heavy shadows on rows; `loading="lazy" decoding="async"` on row images; use the shared
   reference hooks (`useBranches`, `useProjects`, `useUsers`, `useVendors`, `useMaterialCatalog`), never raw axios for those lists; split a page file over
   ~600 lines into `pages/<domain>/components/`.
5. Never change behavior: same requests and params, same state names where possible, same handlers. Report any visible difference.
6. Check per page: grep its files for raw palette classes, `dark:` colors, react-icons, raw form elements and `window.confirm` (expect 0); build; lint (no new errors).
