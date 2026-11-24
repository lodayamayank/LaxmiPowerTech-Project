// src/lib/routes.js
// Path strings used for navigate(), <Link to>, menu items and redirects.
// NOTE: the <Route> table in src/App.jsx keeps its own literals. Keep the two in sync:
// when a route is added, renamed or removed in App.jsx, update this file in the same change.

export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  punch: '/punch',
  selfie: '/selfie',
  profile: '/profile',
  reimbursements: '/reimbursements',
  connectServer: '/connect-server',

  // Admin menu
  myTeam: '/admin/my-team',
  projects: '/admin/projects',
  tasks: '/admin/tasks',
  deleteAttendance: '/admin/attendance/delete',
  adminReimbursements: '/admin/reimbursements',
  workOrders: '/dashboard/work-orders',
  reports: '/dashboard/report',
  vendors: '/dashboard/vendors',
  branches: '/dashboard/branches',
  settings: '/dashboard/settings',
  inventoryLabourManage: '/dashboard/inventory/labour/manage',

  attendance: {
    live: '/dashboard/live-attendance',
    supervisor: '/attendance/supervisor',
    subcontractor: '/attendance/subcontractor',
    labour: '/attendance/labour',
    notes: '/attendance/notes',
    leaves: '/attendance/leaves',
  },

  salary: {
    dashboard: '/admin/salary',
    history: '/admin/salary-history',
    holidays: '/admin/holidays',
    policy: '/admin/salary-policy',
  },

  // Mobile material flow (/material/*)
  material: {
    intent: '/material/intent',
    intentNew: '/material/intent/new',
    intentDetail: (id) => `/material/intent-details/${id}`,
    transfer: '/material/transfer',
    transferNew: '/material/transfer/new',
    transferDetail: (id) => `/material/transfer/${id}`,
    deliveries: '/material/deliveries',
    grn: '/material/grn',
    grnDetail: (id) => `/material/grn/${id}`,
    uploadPhoto: '/material/upload-photo',
  },

  // Desktop material admin (/dashboard/material/*)
  adminMaterial: {
    uploadIndent: '/dashboard/material/uploadindent',
    intent: '/dashboard/material/intent',
    siteTransfers: '/dashboard/material/site-transfers',
    upcomingDeliveries: '/dashboard/material/upcoming-deliveries',
    grn: '/dashboard/material/grn',
    deliveryDetail: (id) => `/dashboard/material/deliveries/${id}`,
  },

  // Supervisor / labour screens for one branch
  branch: {
    labourDashboard: (branchId) => `/branch/${branchId}/labour-dashboard`,
    tasks: (branchId) => `/branch/${branchId}/tasks`,
    labours: (branchId) => `/branch/${branchId}/labours`,
    laboursAdd: (branchId) => `/branch/${branchId}/labours/add`,
    labourDetail: (branchId, labourId) => `/branch/${branchId}/labours/${labourId}`,
    teamAttendance: (branchId) => `/branch/${branchId}/team-attendance`,
  },
};
