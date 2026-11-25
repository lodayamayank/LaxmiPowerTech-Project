# Laxmi Powertech Frontend: Technical Handover

Prepared 2026-11-24 and updated 2026-11-25 from the repository at `C:\Users\mayur\Desktop\New folder\LaxmiPowerTech-Project`, branch `ui-centralization`, HEAD `de73cbd`. Working tree: only this file is untracked.

**How to read this document.** Everything below was checked against the repository (file contents, `git`, greps, builds, and browser runs against a mock API during earlier sessions). Where something could not be verified it says so. The backend source is not in this repository, so nothing here claims to know backend behavior beyond what the frontend calls. Counts (files, routes, violations) come from scripts run on 2026-11-25 and will drift as work continues.

Terminology: **migrated** = a page rebuilt on the design system (tokens + `components/common` + `components/ui`) with no behavior change. **Grep-clean** = zero raw palette classes, hex colors, `dark:` color variants, react-icons, raw form elements and `window.confirm/alert` in that file; grep-clean does not mean design-reviewed.

---

## Mobile + toasts status (2026-11-25, branch ui-centralization, not pushed)

- Shared mobile foundation: `src/layouts/mobile/` (`MobilePage`, `MobileTabBar`, `MobileCard`, `MobileTile`), `ChoiceChips`, Button `size="xl"`.
- Toasts: `components/ui/sonner.jsx` (desktop bottom-right cards, phone dark pill, per-type durations). Copy is title + description (+ Retry on errors); offline = "Saved on your phone".
- On the mobile shell: labour screens (home, punch, selfie, attendance, leave, claim, sync, profile), supervisor/subcontractor home, projects, team attendance, labour list/details/add, Tasks, Materials hub (chips Intent/Transfer/Deliveries/GRN).
- Token + icon converted only (layout of the old design kept): TaskSubmission dialogs, Intent/Transfer/Delivery/GRN lists and detail/form pages, IntentForm, UploadPhoto, MaterialTransferForm.
- Audit 2026-11-25 (grep): no raw palette classes, gradients, react-icons imports, `window.confirm/alert` calls or colour hex literals remain in `src` outside `components/ui`, `lib/theme.js` (meta theme-color) and `Logo.jsx` (image toggle). Chart colours are `--chart-*` tokens in `index.css`. Unused `MobileShell/MobileHeader/MobileBackButton` were deleted. Remaining: 84 lint warnings (hook deps), multi-line `console.log` in a few material files and the service worker.
- Dark mode: real palette in `index.css` (brand-navy hue, page < surface < muted elevation, tinted tone chips), legacy compat layer deleted. Lint: 0 errors, 0 warnings (hook-dependency cases carry an explicit `eslint-disable` with reason; fast-refresh rule is off for column/variant files).
- Admin dashboard no longer needs a backend summary route: numbers are derived in `useAdminDashboard.js` from `/attendance/live`, `/attendance` (last 7 days), `/users` and `/leaves/pending-count`. The old "Late arrivals" card became "On leave today" because the backend has no late rule.
- Parked: Hindi home (no i18n), Contact office, profile photo upload, S-Task photo-first layout, S-Intent form layout, camera/face-detection untested in the browser pane.
- `.mobile-back-button` is now always visible (important utilities in index.css).
- Material detail and form pages are on the mobile shell; `window.confirm` replaced by `hooks/useConfirm` (ConfirmDialog); legacy DOM toasts use `lib/showToast`.
- Fixed on the way: Intent / MaterialTransfer / UpcomingDeliveries crashed on render (poll set up before the fetch function existed).

## 1. Project overview

### 1.1 What the application does
"Laxmi Powertech" is an internal workforce and operations app for an electrical/construction contractor. It covers:
- **Attendance**: punch in/out with selfie and face validation (MediaPipe), GPS/branch context, offline punching with later sync, supervisor/labour/subcontractor registers, live attendance, notes, admin bulk delete.
- **People**: employees ("my team"), roles, leaves, reimbursements, salary policy, salary runs and history, holidays.
- **Projects**: projects with a Tower > Floor > Flat > Room hierarchy, tasks assigned to supervisors/subcontractors, work orders with bills and retention, project reports (Excel/PDF), project documents (folders, upload, delete-request approval).
- **Materials**: indents/"intents" (purchase orders), site transfers, upcoming deliveries and delivery checklists, GRN, vendors, material catalog.
- **Admin**: branches, vendors, labour overview.

Users have roles `admin`, `staff`, `supervisor`, `subcontractor`, `labour` (`src/lib/constants.js`). Admins use a desktop dashboard; supervisors/labour/staff mostly use mobile-first screens (it is also an installable PWA).

### 1.2 Stack
React 19, Vite 6, React Router 7, Tailwind CSS 3.4 (+ `tailwindcss-animate`), shadcn/ui on Radix primitives, `class-variance-authority`, `tailwind-merge` (extended for custom tokens), TanStack Query v5, axios, sonner (toasts), lucide-react (icons), recharts, jspdf + jspdf-autotable and xlsx (dynamically imported), `@mediapipe/tasks-vision` + `react-webcam` (face), `@react-google-maps/api` (Places autocomplete in the project form), dayjs, `@fontsource-variable/inter`. JavaScript only (no TypeScript). Alias `@` -> `src` (`jsconfig.json`, `vite.config.js`). Deployed to Vercel (`vercel.json`).

### 1.3 Architecture
- Single SPA, route-level code splitting (`lazy()` for pages in `src/App.jsx`), manual vendor chunks in `vite.config.js`.
- `src/` layout (documented in `STRUCTURE.md`, which is accurate and must be read first): `api/`, `components/ui` (shadcn primitives), `components/common` (design-system composites), `hooks/`, `layouts/desktop` + `layouts/mobile`, `lib/` (pure helpers), `pwa/`, `routes/PrivateRoute.jsx`, `services/faceLandmarker.js`, `pages/<domain>/` (+ `components/` per domain). Domains: account, admin, attendance, auth, dashboard, dev, documents, inventory, leaves, material, payroll, projects, reimbursements, reports, supervisor, team.
- 167 `.jsx` files outside `components/ui` and the dev pages; the desktop pages render inside `DashboardLayout` (desktop shell), 4 files use the mobile layout pieces; the remaining mobile-style pages draw their own header (see 3.5).

### 1.4 Routing
`src/App.jsx`: 78 `<Route>` entries, flat list, no nested routes. Desktop admin pages live under `/admin/*` and `/dashboard/*`; mobile/role pages under `/branch/:branchId/*`, `/supervisor/*`, `/material/*`, `/attendance/*`; `/styleguide` and `/styleguide/shell` are dev-only pages (registered only when `import.meta.env.DEV`, see `App.jsx` lines 93-94 and 376-381). `/` redirects to `/login`. `/dashboard` renders `RoleBasedDashboard`, which picks Admin/Supervisor/Labour dashboards by role. Route constants are in `src/lib/routes.js` (`ROUTES`), and the sidebar menu is data in `src/layouts/desktop/navConfig.js` filtered by role (`filterNavByRole`).

### 1.5 State management
No global store. Server data: TanStack Query for shared reference lists (`useBranches`, `useProjects`, `useUsers`, `useVendors`, `useMaterialCatalog`, `useCurrentUser` in `src/hooks/`) with a 5 min `staleTime`; only 5 files use `useQuery` in total. Everything else is local `useState` plus axios calls inside pages or page-local hooks (`useAdminTasks.js`, `useWorkOrders.jsx`, `useProjectsPage.jsx`, `useSalaryRun.js`, ...). `usePolling` (6 users) handles periodic refresh. Session and UI preferences live in `localStorage` (keys in `constants.js`, helpers in `lib/session.js`).

### 1.6 API integration
One axios instance, `src/api/client.js`: base URL `VITE_API_BASE_URL` or fallback `https://laxmipowertech-backend-1.onrender.com/api`, 30 s timeout, `withCredentials: true`. Request interceptor adds `Authorization: Bearer <token>` from localStorage and removes Content-Type for `FormData`. Response interceptor: on **401** it clears the whole session and hard-navigates to `/login`. 51 files import this client directly. `src/api/` also has `material.js`, `materialTransfers.js`, `projectDocuments.js`, `reference.js` (thin wrappers). Full endpoint list in section 5.

### 1.7 Authentication and authorization (as implemented in the frontend)
- Login: `POST /auth/login`, then `setSession({token, user, loginTime})` writes `token`, `user`, `loginTime` to localStorage. Session lifetime is enforced client-side at 8 hours (`SESSION_MAX_AGE_MS`).
- `PrivateRoute` (`routes/PrivateRoute.jsx`) checks token + loginTime + 8 h expiry and redirects to `/login` at once. Since `edad7f8` it is used as **one layout route in `App.jsx`**: every route except `/`, `/login` and the DEV-only `/styleguide*` pages sits inside `<Route element={<PrivateRoute />}>`, so an unauthenticated visitor never sees a page shell. This is a UI convenience, not a security boundary: the backend must authenticate and authorize every request itself (not verifiable from this repo).
- `api/client.js` handles failures centrally: **401** clears the session and hard-navigates to `/login`; **403** keeps the session and shows one shared toast ("You don't have permission to do this.", de-duplicated by id); the rejection always reaches the caller, so pages keep their own error handling.
- There is still **no role-based route gating** in the frontend (deliberately postponed until the role-permission matrix is defined). Role is used to choose which dashboard/menu to show (`filterNavByRole`, `RoleBasedDashboard`, `lib/roles.js`) and inside some pages (7 files). Authorization is assumed to be enforced by the backend, which cannot be verified here.

### 1.8 Styling and UI system
Tailwind with **HSL CSS-variable design tokens** (section 3). shadcn/ui primitives in `components/ui` restyled to tokens; shared composites in `components/common`. Fonts: Inter Variable (UI) and JetBrains Mono (data). Icons: lucide-react (react-icons is still imported by 28 files, all mobile/role pages). Dark mode: **on, one owner.** `src/lib/theme.js` owns the `dark` class on `<html>` and the saved choice (localStorage `darkMode`, "true"/"false"); `hooks/useDarkTheme.js` is the React view of it (used by the desktop toggle via `useDarkMode`, the attendance chart and the toaster). An inline script in `index.html` applies the saved theme before first paint (keep it in sync with `lib/theme.js`); `applyInitialTheme()` in `main.jsx` follows other tabs. Light is the default. `next-themes` was removed.

---

## 2. Current development status

The active work is a **step-per-prompt UI centralization and redesign** on branch `ui-centralization` (82 commits ahead of `main`; 19 commits are not pushed to `origin/ui-centralization`). Steps 0-10 built the token system, primitives, composites, performance hooks, folder reorganisation and the new desktop shell. Batches 2-8 migrated pages. Since then the pages were matched to the **reference design artifact** (https://claude.ai/artifact/Lkg9Ekqo69UEVExgWnpBE7, files `project/*.dc.html`): My team, Add member panel, Member profile, Member edit page, the admin dashboard, the four Material desktop pages and the Sign in page. **Every desktop page that has a design in the artifact is now done.** What remains are the mobile/role pages, which have no design yet (the owner will provide mobile designs later).

### 2.1 Status table

Status key: **Done** = migrated and verified against a mock API (not the real backend); **Parked** = functional, legacy styling, waiting for a mobile design; **Dev** = developer tool.

| Module | Implementation Status | Completed Work | Pending Work | Priority |
|---|---|---|---|---|
| Design tokens + Tailwind config | Done | HSL token set (surface/ink/line/tone/primary/highlight), type scale, radius, control heights, `logo-plate` | Dark-mode values are "provisional" (see 3.5 for what is wrong) | P1 |
| `components/ui` primitives | Done | 27 shadcn primitives restyled; `ui/sheet.jsx` has a right-side `SheetPanel` family | Bottom-sheet `SheetContent` still used raw by `AddIntentPopup` | P3 |
| `components/common` composites | Done | DataTable (incl. `density="list"`, `selectable`), FilterBar, PageHeader, SectionCard, StatCard, PaginationBar (incl. `variant="compact"`), StatusBadge, ConfirmDialog, EmptyState, FormField, SearchInput, SegmentedControl, UnderlineTabs, RadioCards, SelectionBar, UserAvatar, IconTile, ProgressRow, Notice, Logo | `EmptyTableRow` and StatCard's legacy `title`/`color` props are kept only for `ProjectDocuments.jsx` | P3 |
| Desktop shell | Done | `DashboardLayout`, `AppSidebar`, `Topbar`, notifications, account menu, role-filtered nav, `MaterialQuickNav` (labels match the design) | - | - |
| Sign in (`Login.jsx`) | Done | Matches the Sign in design; no hex colors; sign-in logic unchanged. "Keep me signed in" and "Forgot password?" are not shown (no backend support) | - | - |
| Admin dashboard | Done | KPI cards, "Needs your attention" (leaves, reimbursements, retention, deliveries, absences, incomplete punch-outs), branch bars, weekly chart, records table. Logic in `pages/dashboard/components/useAdminDashboard.js`; extra read-only requests in `useDashboardAttention.js` | Quick Actions panel was removed (not in the design) | - |
| Leaves (admin `AdminLeaves`) | Done | Pilot page + page recipe | - | - |
| Reimbursements (admin) | Done | `AdminReimbursements` | `MyReimbursements`, `CreateReimbursement` are mobile-style: Parked | P2 |
| Attendance register / notes / live / role dashboards / delete attendance / labour overview | Done | Batches 2-3 and 8 | `AttendanceGraphModal` tokenized; `AttendanceVisuals` keeps chart hex colors on purpose | - |
| Payroll (salary run/history/holidays/policy) | Done | Batch 4 | - | - |
| Tasks, Work orders, Reports | Done | Batch 5 | - | - |
| Projects + tower builders | Done | Batch 6 | Tree rows not memoized (state is mutated in place, see 4.2) | P3 |
| Team / employees | Done | My team (tabs by role, filters, row actions), Add member side panel, Member profile, **Member edit full page** (`/admin/my-team/:userId/edit`, replaces `EditUserModal`) | Profile photo upload and "ask to change password at next sign-in" have no backend (UI only / omitted) | - |
| Admin: branches, vendors | Done | Batch 8 | - | - |
| Documents | Done | Batch 7 (`ProjectDocuments`, dialogs, `SupervisorProjectDocuments`) | - | - |
| Material desktop: Site transfers, Upcoming deliveries, GRN, Purchase orders (`AdminIntent`) | Done | Each split into a hook + dialog components + page; toasts/`confirm` replaced | - | - |
| Material: mobile/detail/form pages (Intent*, GRN*, MaterialTransfer*, Delivery*) | Parked | Functional | ~20 files, 55-120 raw-class hits each; need a mobile design | P2 |
| Supervisor / labour dashboards and mobile pages | Parked | Functional; headers use `Logo` | `SupervisorDashboard`, `LabourDashboard`, `SupervisorLabour*`, `SupervisorProjectList`, `TaskSubmission` (1433 lines) | P2 |
| Employee self-service: `Leaves`, `MyReimbursements`, `CreateReimbursement`, `TeamAttendance`, `MyAttendance`, `PunchInScreen`, `SelfieCaptureScreen`, `ProfileScreen`, `ConnectServer` | Parked | Functional | Mobile-style pages, no design | P2 |
| Inventory (`ManageInventoryLabour`) | Done | Grep-clean | - | - |
| PWA / offline | Implemented, not re-verified | Service worker, offline punch queue, sync engine, install prompt, offline banner | `InstallPWA`, `OfflineBanner` still use raw palette; not tested end to end | P2 |
| `/styleguide`, `/styleguide/shell` | Dev | Every component + token + Sheet/Logo demos; excluded from production builds | - | - |

Un-migrated surface, measured 2026-11-25: **46 of 167 `.jsx` files** still contain a raw palette class, hex color, react-icons import, raw form element, `dark:` color variant or `window.confirm/alert`. All of them are mobile/role pages except `AttendanceVisuals.jsx` (chart hex colors, intentional), `AdminTransfers.jsx`, `Material.jsx`, a few small PWA/helper files and `UploadIndent.jsx`/`IndentTable.jsx`. Largest: `AttendanceVisuals` 555 lines, `TeamAttendance` 580, `UpcomingDeliveries` 571, `MaterialTransferForm` 999, `IntentCardDetails` 1118, `DeliveryChecklist` 614, `TaskSubmission` 1434, `DeliveryDetails` 723, `IntentForm` 766, `GRN` 418, `MaterialCardDetails` 959. 28 files import react-icons.

### 2.2 What was verified and how
Each migration batch was checked with a Vite dev server pointed at a **mock API** (scripts kept outside the repo), against a scratch worktree of the previous commit where payload parity mattered: request-for-request comparison, payload hash equality for write paths, number/format parity for displayed figures, browser checks at 1440/1024/390, lint and build baselines. The later design-matching work (My team, Member edit, dashboard, Material, Sign in) was checked in the browser against a mock API at desktop and 390 px widths and by measuring computed styles against the design pages. **Nothing was tested against the real backend**, and no automated tests exist in the repo (no `*.test.*`/`*.spec.*` files).

---

## 3. UI/UX and design system

### 3.1 Design language (preserve this)
Calm, dense, "admin console" look: light grey page (`bg-page`), white cards (`bg-surface`) with 1px hairline borders (`border-line-card`), small type (13px body), 12px card radius / 8px control radius, almost no shadows, **navy primary** (`--primary`, flipped from orange in commit `6042b45`), **orange only as accent** (`highlight` tokens: progress, dots, accents), status via soft tinted badges (`tone-*`). Page anatomy: `PageHeader` (eyebrow "Section / Page", title, description, actions) -> optional `StatCard` row -> `SectionCard flush` containing `FilterBar` + `DataTable` + `PaginationBar`. Create/edit forms go in dialogs or the right-side `SheetPanel` (max 560 px, full width on phones), destructive actions use `ConfirmDialog`.

### 3.2 Tokens (source of truth: `src/index.css` + `tailwind.config.js`)
- Surfaces: `page`, `surface`, `surface-subtle`, `surface-muted`; lines: `line`, `line-card`, `line-input`; text: `ink-1..5`.
- Brand: `primary` (+`strong`, `soft`, `soft-foreground`), `highlight` (+`foreground`, `soft`), `ring`.
- Status tones: `tone-ok|warn|bad|info|neutral|highlight|purple|pink` each with `soft`/`fg` (some with `border`), `tone-bad-solid`; also shadcn legacy tokens (`success/warning/danger/info`, `background`, `card`, `muted`...).
- `scrim` (overlay), `logo-plate` (white tile behind the dark logo in dark mode).
- Type scale (`tailwind.config.js` `fontSize`): `caption` 12, `caption-lg` 12.5, `small` 13, body, `card-title`, `kpi`, etc. Radius: `control` 8px, `card` 12px. Control heights: `h-control`, `h-control-sm`, `w-control`.
- Dark mode: `.dark` redefines the token values, but they are all commented "provisional dark" (copied from the stock shadcn slate palette, never designed; see 3.5 item 2). A **compatibility layer** at the end of `index.css` (12 `.dark .bg-white / .bg-gray-* / .text-gray-*` rules, `!important`) keeps un-migrated pages readable in dark mode. These must stay until the last legacy page is migrated, and they are the reason raw `bg-white` renders dark.

### 3.3 Who follows the system
- **Follow it:** `components/ui`, `components/common`, desktop shell, all pages listed as Done in 2.1.
- **Do not follow it:** the 46 files described in 2.1 (raw `orange-500`, `gray-*`, `bg-white`, gradients, react-icons, raw `<button>/<input>/<select>`, `window.confirm`), almost all mobile/role pages.
- **Hardcoded values still in the app:** hex colors in `AttendanceVisuals.jsx` (chart colors), `MyAttendance`, `PunchInScreen` (`Login.jsx` is now clean); `.mobile-back-button` in `index.css` uses `bg-white`/`border-white/70` utilities; mobile page headers use `from-orange-500 to-orange-600` gradients.

### 3.4 Responsiveness
Migrated pages: `DataTable` shows a table at md+ and stacked cards (`mobileCard`) below; grids use `auto-fit` where a container (not the viewport) decides columns. Un-migrated mobile pages are fixed-width mobile layouts (`max-w-md mx-auto`) and are not responsive for desktop. Known pattern to avoid: viewport breakpoints (`lg:grid-cols-7`) inside a fixed-width panel overflow, so use `grid-cols-[repeat(auto-fit,minmax(Npx,1fr))]` in panels/dialogs (this caused a bug fixed in `7dfd226`).

### 3.5 Known UI problems
1. (Fixed) Login now follows the design and uses tokens.
2. **Dark mode: mechanism fixed, palette still undesigned.** Done in `6aaecc6`, `b8ccf76`, `8733915`: one theme source (`lib/theme.js`); no first-paint flash on login, desktop or mobile (inline script in `index.html`); the toaster follows the app theme instead of the OS; `color-scheme` and the browser `theme-color` follow the theme; dark primary buttons use dark navy text (5.04:1, was white at 3.55:1); the legacy compat rules point at design tokens; `.mobile-back-button` and `ui/alert.jsx` are tokenized. Still open: (a) the dark palette itself was never designed (stock shadcn slate values, tagged "provisional"); `--page` equals `--surface`, so cards separate from the page only by a 1.4:1 border; dark hover steps for secondary/outline buttons are barely visible; (b) `ink-5` fails AA in both themes (unused in app code) and input/checkbox borders are 1.47:1 in light (reference design value, a design decision); (c) the compat block in `index.css` (12 selectors, about 1,270 uses in 41 files) must stay until the mobile/role pages are migrated, and it does not cover colored raw palette classes (about 620 uses), gradients (about 470), hover/focus gray variants (about 110) or `bg-white/NN` (about 30), so those legacy pages show pastel cards with light text in dark mode (for example `Leaves`); (d) `AttendanceVisuals` still has hard-coded hex chart colors and 54 `dark:` variants.
3. Mobile headers across 8 pages are copy-pasted (`from-orange-500 to-orange-600` + logo tile + back button) rather than using `layouts/mobile/MobileHeader`.
4. Mobile headers contain no-op classes (`w-50`, `box-shadow`) that Tailwind does not define.
5. Mixed icon sets (react-icons + lucide) in un-migrated files; the bundle still ships react-icons (`ui-vendor` manual chunk).
6. `Button` base sets a fixed height (`h-control`); tailwind-merge does not treat `h-auto` and `h-control` as one group, so overriding height requires `!h-auto` (see `builder/OptionTile.jsx`). A custom tile built on `Button` without that will clip its content.

### 3.6 Centralization opportunities
`MobileHeader` for all mobile pages; one `Logo` (done); remove the compat layer after migration; shared `StatusBadge` maps (extend `lib/status.js`); shared list-page hook pattern (`useDebounce` + `useMemo` filter + `PaginationBar`); a `GradientHeader`-free mobile shell; consolidate the three duplicated material flows' form fields into `FormField`.

---

## 4. Architecture and code quality

### 4.1 Component structure
Good: shared composites, per-domain `components/`, page-logic hooks. Bad: the remaining un-migrated mobile pages are monoliths (see sizes in 2.1), e.g. `TaskSubmission` 1434 lines, `IntentCardDetails` 1118, `MaterialTransferForm` 999. The former admin monoliths (`AdminIntent`, `AdminGRN`, `AdminSiteTransfer`, `AdminUpcomingDeliveries`, `AdminDashboard`) were split into a `use*.js` hook, dialog components and a page.

### 4.2 Known code-level facts
- Tower builders (`SmartTowerBuilder`, `TowerHierarchyBuilder`) mutate nested state in place (`newBuildings[...] = ...` after a shallow copy). This is why rows cannot be memoized by object identity; changing it would alter generation logic and the save payload, so it was left alone. They also have two different `ROOM_TYPES`/`FLAT_TYPES` lists (kept separate on purpose).
- `projects/components/useProjectsPage.jsx` holds the moved project-page logic (358 lines); `TowerHierarchyBuilder.jsx` is 563 lines (mostly moved handlers).
- Two path aliases exist for the same screens (`/dashboard/material/uploadindent` vs `/upload-indent`). `/admin/my-team/new` is now only a redirect to My team with the Add member panel open (`AddEmployee.jsx`).
- `326` `console.log/error` calls in `src` (e.g. emoji debug logs in `RoleBasedDashboard`).
- `package.json` has a `"proxy"` field (Create-React-App leftover, ignored by Vite); the Vite dev proxy (`/api` -> Render) is unused because the client uses an absolute base URL.
- Dependency use: `next-themes` was removed; `react-icons` 46 files; `jspdf`, `jspdf-autotable`, `xlsx` are dynamic imports (good); `recharts` 2 files; `@mediapipe/tasks-vision` is not statically imported (loaded through `services/faceLandmarker.js`).
- ESLint baseline (2026-11-25): **82 problems, 0 errors, 82 warnings.** All former errors (unused variables/catch bindings, the `process` global in `SelfieCaptureScreen`) were fixed in `de73cbd` without behavior changes. The warnings are 41 `react-refresh/only-export-components` (e.g. `*Columns.jsx` export helpers next to components, accepted precedent) and about 40 `react-hooks/exhaustive-deps`; the latter were left alone on purpose because adding dependencies can change when effects run. New work must keep errors at 0.
- `dist/` and `.env` are git-ignored. Docs `PHASE5_PROGRESS.md`, `PRE_DEPLOYMENT_AUDIT_REPORT.md`, `SHADCN_MIGRATION_GUIDE.md` and `README.md` date from earlier phases and describe an older state; treat `STRUCTURE.md` as the current convention source.

### 4.3 Data fetching, errors, loading, empty states, validation
- Fetching: mix of TanStack Query (reference lists) and ad-hoc axios in effects; no shared pagination/query abstraction; polling via `usePolling`.
- Errors: mostly `try/catch` + `toast.error(err.response?.data?.message || "...")`; 401 handled globally. No error boundary was found in `App.jsx`.
- Loading/empty: migrated pages use `DataTable loading` skeletons and `EmptyState`; legacy pages use ad-hoc spinners/text.
- Forms: hand-rolled validation inside handlers (toasts); no schema library.

### 4.4 Performance
Done: route-level lazy loading, lazy side panel for the project form, memoized columns/handlers in migrated pages, debounced search, shared cached reference data. Remaining: the 2000+ line material pages; list pages on the legacy path render without memoized rows; `transition-all` and heavy shadows exist in legacy files; entry chunk is about 299 KB (acceptable, kept flat across batches); CSS about 131.8 kB.

### 4.5 Tech debt (recommend, not implemented)
Route protection coverage and role gating (see 1.7 and section 10); error boundary; remove console logs; unify date/currency formatting (`lib/format.js` exists, legacy pages keep local formatters); split monoliths; consider replacing in-place state mutation in builders only with a payload-parity test harness.

### 4.6 Naming and organization
Follows `STRUCTURE.md`: kebab-case folders, PascalCase components, camelCase hooks/utils, `@/` imports, no barrel files. Legacy exceptions: `src/api/client.js` header comment says `src/utils/axios.js`; some page folders mix "indent"/"intent" naming for the same concept (`material/indent`, `material/intent`).

### 4.7 Dev-only pages
`/styleguide` and `/styleguide/shell` are only registered and imported when `import.meta.env.DEV` is true (`App.jsx`), so they are not part of production builds (checked).

---

## 5. Backend and API integration

Base URL: `VITE_API_BASE_URL` (committed `.env` is git-ignored; `.env.example` shows `http://localhost:5002/api`), else the Render URL in `client.js`. `FILE_BASE_URL` (uploaded files) falls back to `http://localhost:5002`, which differs from the API fallback (existing inconsistency, deliberately preserved). Token: `Authorization: Bearer` from localStorage `token`. 401 -> clear session and redirect to `/login`. No refresh-token flow exists.

Endpoints referenced by literal axios calls (method + path; some use helpers such as `base(projectId)` for documents, so this list is not exhaustive):
- **Auth/users:** POST `/auth/login`; GET `/auth/me`, `/users`, `/users/me`, `/users/:id`, `/roles`; POST `/users/register`, `/users/reset-password/:username`; PUT `/users/:id`, `/users/me`; PATCH `/users/me/password`; DELETE `/users/:id`.
- **Branches/projects:** GET/POST `/branches`, PUT/DELETE `/branches/:id`; GET `/projects` (also `?lite=true`), `/projects/:id`, `/projects/:id/hierarchy`; POST `/projects`; PUT/DELETE `/projects/:id`.
- **Attendance:** GET `/attendance`, `/attendance/by-date`, `/attendance/live`, `/attendance/my`, `/attendance/summary`, `/attendance/today`, `/attendance/user/:id`, `/attendance/supervisor-codes`, `/attendance/admin/delete-preview`, `/attendanceNotes`, `/attendance/notes/:userId/:date`; POST `/attendance/bulk`; DELETE `/attendance/admin/bulk-delete`.
- **Leaves/reimbursements/holidays:** GET `/leaves`, `/leaves/my`; PATCH `/leaves/:id/status`; GET `/reimbursements`, `/reimbursements/my`, `/reimbursements/:id`; GET/POST `/holidays`, PATCH `/holidays/:id/restore`, DELETE `/holidays/:id`.
- **Payroll:** GET `/salary-policy`, PUT `/salary-policy`; GET `/salary-slips`, DELETE `/salary-slips/:id`; GET `/salary/calculate`; POST `/salary/recalculate`.
- **Tasks/work orders/reports:** GET `/tasks`; POST `/tasks/admin`; PUT `/tasks/:id`; PATCH `/tasks/:id/status`; DELETE `/tasks/:id`; GET/POST `/work-orders`, `/work-orders/:id`, `/work-orders/:id/bills`, `/work-orders/retention-notifications`; PATCH `/work-orders/:id/trigger`; reports via `/reports/project/:id` (used in the reports hook).
- **Documents:** `/projects/:id/documents`, `/folders` and related (create, move, rename, delete-request approve/reject, `confirm`, summary), `/documents/config`, `/documents/delete-requests`, `/documents/:id/download-url`, `/documents/project-for-branch/:branchId`.
- **Materials:** `/indents` (+ `/mine`, `/:id`, `/:id/materials`, `/:id/approve`, `/:id/status`, `/upload-photo`, `/all`), `/material/purchase-orders`, `/material/site-transfers`, `/material/upcoming-deliveries` (+ `/billing`, `/items`, `/status`, `/migrate-sync`), `/material/catalog` (+ `/last`, `/materials`, `/upload`), `/material-transfers` (+ `/complete`, `/decide`), `/vendors`, `/labour/overview`.

Response shapes are inferred only from how pages read them (e.g. tasks return `{ data, pagination }`, projects return an array with `branches[]` and `buildings[].wings[].floors[].flats[].rooms[]`); there is no shared type or schema file, so the shapes are undocumented in the repo. Integration gaps / risks: no central API layer for most domains (51 files call axios directly); duplicated calls for the same lists in legacy pages; no request cancellation; mutations on legacy pages do not invalidate query caches consistently (migrated project pages invalidate `PROJECTS_KEY`). Nothing about backend validation, permissions or data models can be verified from here.

---

## 6. Git and development status (checked 2026-11-25)

- Branch: `ui-centralization`, HEAD `8733915`; only `FRONTEND_PROJECT_HANDOVER.md` is untracked. `main` has 0 commits that this branch lacks; the branch is **82 commits ahead of `main`**. **21 commits are not pushed** to `origin/ui-centralization` (everything after `ff3e225`, batch 6): push or back them up before moving machines or accounts.
- Recent history (newest first): `8733915` dark compat rules -> tokens, `b8ccf76` theme single source/no flash/toasts, `6aaecc6` contrast fix (its hide-the-toggle part was reverted), `edad7f8` route guard + 403 handling, `de73cbd` lint errors fixed, `a129565` Sign in + attendance graph modal, `3c0506d` merge of the GRN and Intent session branches, `f11a429` Purchase orders (AdminIntent), `eb86072` GRN, `8ebe128` Deliveries, `a1d668c` Site transfers, `f104957` dashboard attention rows, `39c83d3` admin dashboard, `9e9ff6b` Add member panel + Member edit page, `b181082` My team + Member profile design match, `4ec8fcb` My team/Add member/profile, `aea231e` batch 8 (vendors, branches, delete attendance, labour overview), `8e4f991` batch 7 documents, `82729ad` logo dark mode, `7dfd226`, `b096669`, `ff3e225` batch 6, `c9c42e4` batch 5, `83ba095` batch 4, `650b8ca` batch 3, `3fe8e68` merge origin/main, `1398a74` batch 2, `e0ada62` AdminLeaves pilot, `6042b45` navy brand, `ce6bfcc` desktop shell, then constants/session, shared data hooks, folder reorganisation and the token/primitive/composite commits.
- Leftover local branches from the two parallel sessions (already merged, safe to delete): `claude/sleepy-bell-5bf10a`, `claude/inspiring-goldberg-24aaa0`.
- Other local/remote branches (do not delete): `main`, `BugFix-M`, `NAS-Frontend`, `NewUI`, `shad-cn`, `backup/pre-merge`, and remotes `new-feature-m`, `new-features`. **`stash@{0}` ("Local changes for NAS Docker", on `BugFix-M`) exists and is not part of this branch**; preserve it.
- Git warns about LF->CRLF line endings on Windows for several files; it is harmless but may create noisy diffs if another account uses a different `core.autocrlf`.
- Must preserve: the whole `ui-centralization` history (not merged into `main`), the stash, `STRUCTURE.md`, and the out-of-repo verification scripts if the previous machine is lost (they lived in a session scratchpad and are not in git; they are described in 8.4 so they can be rebuilt).

---

## 7. Roadmap

### Phase 1 - Critical
1. **Role gating** (guard-all is done; needs the role-permission matrix, see section 10). Backend authorization is unverified.
2. **Push/back up the 21 local commits; decide the merge plan into `main`** (78 commits). Why: nothing of the redesign is on `main`.
3. **Real-backend QA** of every migrated page (all checks so far used a mock API).

### Phase 2 - UI/UX
4. **Mobile/role pages** (waiting for the owner's mobile designs): `SupervisorDashboard`, `LabourDashboard`, supervisor/labour pages, `TaskSubmission`, attendance self-service, `PunchInScreen`, `SelfieCaptureScreen`, `Leaves`, `MyReimbursements`, `CreateReimbursement`, `ProfileScreen`, `ConnectServer`, material mobile/detail/form pages. Use one shared `layouts/mobile/MobileHeader` + `MobileShell` (replaces 8 copy-pasted gradient headers).
5. **Design the real dark mode** (palette first, see 3.5 item 2), then delete the `.dark .bg-white/...` compat layer and apply the `dark` class at startup.
6. Responsive audit of every migrated page at 390 px with real data.

### Phase 3 - Architecture
7. Central API modules per domain (extend `src/api/`), response-shape JSDoc/typedefs, move remaining ad-hoc list fetches to TanStack Query with invalidation.
8. Error boundary, remove `console.log` noise, drop unused deps (`react-icons` after the mobile pages are migrated; reconcile `next-themes`), delete `EmptyTableRow` and StatCard legacy aliases after `ProjectDocuments` is migrated, clean `package.json` `proxy`, fix alias routes.
9. Introduce automated checks: at minimum a payload-parity harness for the tower builders and a smoke test per route.

### Phase 4 - Future
10. Tests and CI (lint + build), bundle budgets; PWA end-to-end verification (offline punch + sync); accessibility pass; i18n if required.

---

## 8. Migration strategy for another Claude account

### 8.1 Rules that must not be broken
1. **Never change behavior during UI work**: same endpoints, params, payloads, state names, handlers. Report any visible difference.
2. Style only through tokens; no hex, no raw palette classes (`gray-*`, `orange-*`, `bg-white`), no `dark:` color variants in migrated code. Use `components/ui` + `components/common`, never raw `<button>/<input>/<select>/<table>`. lucide-react only (no new react-icons). No `window.confirm/prompt/alert` (use `ConfirmDialog`, `toast`). Dates/money via `lib/format.js`, tones via `lib/status.js`.
3. Do not edit `src/assets/logo.png`; render it only through `components/common/Logo.jsx`.
4. Never change values in `lib/constants.js` (they match data already stored by earlier versions).
5. Tower builder state shapes, naming (Tower A / Floor 1 / Flat 101 / room names), generation algorithms and save payload must stay identical.
6. `git add src` (never `git add -A`; `dist` and `.env` are ignored anyway); never `git stash` (an unrelated stash exists); do not push without being asked.

### 8.2 Working method that has worked (one step per prompt)
1. `git fetch`; merge `origin/main` if it has new commits, keeping this branch's structure.
2. Read `STRUCTURE.md` and apply its "Page recipe".
3. Pre-flight: line counts, requests, state, handlers, raw-class counts; print them before editing.
4. Move page logic **verbatim** into hooks (`use*.js/.jsx`, use `.jsx` if the file contains JSX); build columns/mobile cards files; keep local formatters when `lib/format` would change displayed rounding.
5. Verify: `npm run build` (no new warnings; record CSS and entry chunk), `npm run lint` (no new errors; baseline 0 errors / 82 warnings), greps (expect 0), dev server against a **mock API** + a scratch git worktree of the previous commit for request/payload/number parity, browser checks at 1440/1024/390.
6. One commit per step with the agreed message; write a report (per-file line counts, visible differences, API needs, manual test script).

### 8.3 Technical limitations to know
- Windows + Git Bash/PowerShell; heredocs with quotes/backticks break scripts, so write script files with the file tool. Edit files while preserving CRLF.
- Radix dropdowns/tabs/selects need real pointer events (`pointerdown`) in browser automation; `el.click()` is not enough.
- The browser pane may auto-resize; re-set the viewport before measuring.
- Google Places suggestions cannot be tested without a Maps key.
- `.pac-container` has a global rule in `index.css` to stay clickable above dialogs.

### 8.4 Verification tooling (not in the repo, rebuild if needed)
A small Node HTTP mock of the API (list/detail/create/update/delete for projects, tasks, users, branches, with `/__log` and `/__reset` endpoints) run on port 5993; `VITE_API_BASE_URL=http://localhost:5993/api npx vite --port 5194 --strictPort` for the new build; a `git worktree add` of the previous commit (outside the repo, with a `node_modules` junction) on port 5195; a browser script that drives both apps and prints method + URL + body hash per scenario; a lint-diff script comparing baseline vs current.

### 8.5 Known issues (consolidated)
No role gating (all authenticated routes are guarded, roles are not checked); 46 un-migrated files (mobile pages, waiting for designs); dark palette undesigned (mechanism fixed) + legacy compat layer; stale docs; no tests; 326 console logs; in-place state mutation in tower builders; `Button` height override quirk; nothing validated against the real backend.

---

## 9. Immediate next steps (ordered)

| # | Task | Why | Files | Depends on | Expected outcome |
|---|---|---|---|---|---|
| 1 | Push the 21 unpushed commits; decide how/when to merge into `main` | Redesign exists only on this branch | git only | - | Remote matches local; merge plan agreed |
| 2 | Define the role-permission matrix, then add role gating (route guard is done) | Guard-all shipped; roles are not checked yet | `src/App.jsx`, `routes/PrivateRoute.jsx`, `lib/roles.js`, `navConfig.js` | owner decision | Unauthenticated users never see a page shell; wrong-role URLs redirect |
| 3 | Receive the mobile designs and migrate the mobile/role pages (start with the shared mobile header/shell) | Last un-migrated surface; 8 duplicated headers | `pages/supervisor/*`, `pages/dashboard/{Supervisor,Labour}Dashboard.jsx`, `pages/projects/TaskSubmission.jsx`, material mobile pages, `layouts/mobile/*`, `index.css` | designs | One shared mobile shell; grep audit shows 0 violations |
| 4 | Design the dark palette (F5/F6), ideally before step 3; after step 3 delete the legacy compat block and remove react-icons | Mechanism is fixed; palette is provisional | `index.css`, `tailwind.config.js`, `package.json` | designs | Dark mode reviewed on every page; smaller bundle |
| 5 | Real-backend QA of every migrated page; add an error boundary and remove `console.log` noise | All verification so far used a mock API | `src/App.jsx`, pages with `console.*` | - | Confirmed behavior against the real backend |
| 6 | Introduce tests and CI (build + lint + payload-parity harness for tower builders + smoke test per route) | No automated safety net | new `tests/`, CI config | 2, 3 | Regressions detectable without manual runs |

---

## 10. Decisions and open items (owner)

**Route protection (decided 2026-11-25: guard all, no roles).** Implemented in `edad7f8`. Open: (1) the role-permission matrix (which roles may open which URL, and where a wrong-role user is sent) is still to be defined before role gating; today a labour user who types `/admin/my-team` still gets the admin page UI, so the backend must enforce authorization (unverified from this repo; `AdminReimbursements` is the only page known to handle a 403). (2) The 401 interceptor also fires on a failed sign-in request (wrong password returns 401), so the page reloads and the "Invalid username or password" message is lost; fixing it means skipping the redirect for `/auth/login` (not changed, behavior preserved). (3) The 8 h client-side expiry now applies to every page, including offline PWA use: an expired session while offline redirects to a login page that cannot sign in. (4) The 403 toast can appear next to a page's own error toast. (5) The 403 handler is not browser-verified (no 403 case in the mock).

**Dark mode (decided 2026-11-25: keep it and fix it through the existing token/shared-component architecture; do not hide it).** F1-F4 implemented (`b8ccf76`, `8733915`, plus the contrast fix in `6aaecc6`). Remaining: F5 design the dark palette (surface vs page, borders, hover steps; make the shadcn legacy vars `--card`/`--background` reference the design tokens) and F6 `ink-5` / input-border contrast. F5 should come before the mobile-page migration so migrated pages can be checked in dark; each migrated page should also be checked in dark mode. Not browser-tested: other-tab sync, a real device with OS dark mode, keyboard/screen-reader passes.

---

## START HERE – INSTRUCTIONS FOR THE NEXT CLAUDE SESSION

Copy this section to the new session.

1. **Do not change any code yet.** Open the repo at `C:\Users\mayur\Desktop\New folder\LaxmiPowerTech-Project`, branch `ui-centralization`.
2. **Read, in this order:** `FRONTEND_PROJECT_HANDOVER.md` (this file), `STRUCTURE.md` (conventions and the Page recipe), `src/index.css` and `tailwind.config.js` (tokens), `src/components/common/*` and `src/pages/dev/Styleguide.jsx` (the design system), `src/App.jsx` and `src/lib/routes.js`, `src/api/client.js`, `src/lib/session.js`, `src/lib/constants.js`.
3. **Verify the handover against the repository.** Run `git status`, `git log --oneline -20`, `git fetch` and `git rev-list --left-right --count origin/main...HEAD`; confirm HEAD is `8733915` (or later), the tree is clean, and note whether the 21 local-only commits are pushed. Run `npm run build` and `npm run lint` and compare with the baselines (lint 82 problems / 0 errors; the build has no warnings). Re-run the violation audit (raw palette/hex/react-icons/raw form elements/`dark:` colors/`window.confirm` per file) and compare with section 2.1 (46 files). List every place where this document is wrong or out of date.
4. **Open `/styleguide` and a few migrated pages** (`/admin/my-team`, `/admindashboard`, `/admin/projects`, `/admin/tasks`, `/dashboard/material/grn`) in the dev server to see the intended look; use a mock API or ask the owner for a safe test backend. Do not point experiments at the production backend.
5. **Propose a plan before coding:** the order of the next tasks (use section 9 as the starting point), the verification method per task (mock API + previous-commit worktree for parity), the commit message per step, and any decision you need from the owner (merge strategy into `main`, route gating policy, dark-mode design: see section 10). Wait for approval.
6. **Then work one step at a time**, following 8.1-8.3: no behavior change, tokens only, shared components, verbatim logic moves, build/lint/grep/browser verification, one commit per step, report what you did and what you could not verify. Never push, stash, reset or delete branches unless the owner explicitly asks.
7. Ask the owner whenever a requirement is ambiguous instead of guessing; flag anything you cannot verify (backend behavior, Google Maps, PWA/offline) rather than assuming it works.
