# src/ structure

```
src/
  main.jsx, App.jsx, index.css   entry, routes, global styles + design tokens
  assets/                        images
  api/                           client.js (axios instance), material.js, materialTransfers.js
  components/ui/                 shadcn primitives only
  components/common/             shared design-system components (DataTable, PaginationBar, ...)
  hooks/                         shared hooks (use-mobile.js)
  layouts/desktop/               DashboardLayout, AppSidebar
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
