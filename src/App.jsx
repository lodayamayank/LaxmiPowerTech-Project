import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { getUser } from '@/lib/session';
import { useEffect, Suspense } from 'react';
import { migrateLegacyOfflinePunches } from '@/pwa/syncAttendance';
import { toast } from 'sonner';
import useNotifier from '@/pwa/useNotifier';
import syncEngine from '@/pwa/syncEngine';
import OfflineBanner from '@/pwa/OfflineBanner';
import { Toaster } from "@/components/ui/sonner";


// Eager load only critical components
import PrivateRoute from '@/routes/PrivateRoute';
import { PageLoader } from '@/components/common/PageLoader';
import InstallPWA from '@/pwa/InstallPWA';

// Lazy load all pages for code-splitting
const Login = lazyWithRetry(() => import('@/pages/auth/Login'));
const RoleBasedDashboard = lazyWithRetry(() => import('@/pages/dashboard/RoleBasedDashboard'));
const AdminDashboard = lazyWithRetry(() => import('@/pages/dashboard/AdminDashboard'));
const MyAttendance = lazyWithRetry(() => import('@/pages/attendance/MyAttendance'));
const AdminMyTeam = lazyWithRetry(() => import('@/pages/team/AdminMyTeam'));
const CreateProject = lazyWithRetry(() => import('@/pages/projects/CreateProject'));
const AdminAttendance = lazyWithRetry(() => import('@/pages/attendance/AdminAttendance'));
const AttendancePage = lazyWithRetry(() => import('@/pages/attendance/AttendancePage'));
const AdminVendors = lazyWithRetry(() => import('@/pages/admin/AdminVendors'));
const PunchInScreen = lazyWithRetry(() => import('@/pages/attendance/PunchInScreen'));
const SelfieCaptureScreen = lazyWithRetry(() => import('@/pages/attendance/SelfieCaptureScreen'));
const AdminBranches = lazyWithRetry(() => import('@/pages/admin/AdminBranches'));
const ProfileScreen = lazyWithRetry(() => import('@/pages/account/ProfileScreen'));
const AdminLiveAttendance = lazyWithRetry(() => import('@/pages/attendance/AdminLiveAttendance'));
const SupervisorAttendanceDashboard = lazyWithRetry(() => import('@/pages/attendance/SupervisorAttendanceDashboard'));
const SubcontractorAttendanceDashboard = lazyWithRetry(() => import('@/pages/attendance/SubcontractorAttendanceDashboard'));
const LabourAttendanceDashboard = lazyWithRetry(() => import('@/pages/attendance/LabourAttendanceDashboard'));
const NotesDashboard = lazyWithRetry(() => import('@/pages/attendance/NotesDashboard'));
const Leaves = lazyWithRetry(() => import('@/pages/leaves/Leaves'));
const AdminLeaves = lazyWithRetry(() => import('@/pages/leaves/AdminLeaves'));
const MyReimbursements = lazyWithRetry(() => import('@/pages/reimbursements/MyReimbursements'));
const CreateReimbursement = lazyWithRetry(() => import('@/pages/reimbursements/CreateReimbursement'));
const AdminReimbursements = lazyWithRetry(() => import('@/pages/reimbursements/AdminReimbursements'));
const SupervisorDashboard = lazyWithRetry(() => import('@/pages/dashboard/SupervisorDashboard'));
const SupervisorProjectList = lazyWithRetry(() => import('@/pages/supervisor/SupervisorProjectList'));
const SupervisorLabourList = lazyWithRetry(() => import('@/pages/supervisor/SupervisorLabourList'));
const SupervisorAddLabour = lazyWithRetry(() => import('@/pages/supervisor/SupervisorAddLabour'));
const SupervisorLabourDetails = lazyWithRetry(() => import('@/pages/supervisor/SupervisorLabourDetails'));
const LabourDashboard = lazyWithRetry(() => import('@/pages/dashboard/LabourDashboard'));
const TaskSubmission = lazyWithRetry(() => import('@/pages/projects/TaskSubmission'));
const TeamAttendance = lazyWithRetry(() => import('@/pages/attendance/TeamAttendance'));
const AdminDeleteAttendance = lazyWithRetry(() => import('@/pages/attendance/AdminDeleteAttendance'));
const AddEmployee = lazyWithRetry(() => import('@/pages/team/AddEmployee'));
const MemberProfile = lazyWithRetry(() => import('@/pages/team/MemberProfile'));
const MemberEdit = lazyWithRetry(() => import('@/pages/team/MemberEdit'));   

// Material Management Pages - Lazy loaded  
const Material = lazyWithRetry(() => import('@/pages/material/Material'));
const MaterialTransferForm = lazyWithRetry(() => import('@/pages/material/transfers/MaterialTransferForm'));
const IntentForm = lazyWithRetry(() => import('@/pages/material/intent/IntentForm'));
const MaterialCardDetails = lazyWithRetry(() => import('@/pages/material/transfers/MaterialCardDetails'));
const IntentCardDetails = lazyWithRetry(() => import('@/pages/material/intent/IntentCardDetails'));
const GRNCardDetails = lazyWithRetry(() => import('@/pages/material/grn/GRNCardDetails'));
const UpcomingDeliveries = lazyWithRetry(() => import('@/pages/material/deliveries/UpcomingDeliveries'));
const DeliveryDetails = lazyWithRetry(() => import('@/pages/material/deliveries/DeliveryDetails'));
const DeliveryChecklist = lazyWithRetry(() => import('@/pages/material/deliveries/DeliveryChecklist'));
const UploadIndent = lazyWithRetry(() => import('@/pages/material/indent/UploadIndent'));
const AdminSiteTransfer = lazyWithRetry(() => import('@/pages/material/transfers/AdminSiteTransfer'));
const AdminUpcomingDeliveries = lazyWithRetry(() => import('@/pages/material/deliveries/AdminUpcomingDeliveries'));
const AdminIntent = lazyWithRetry(() => import('@/pages/material/intent/AdminIntent'));
const AdminGRN = lazyWithRetry(() => import('@/pages/material/grn/AdminGRN'));
const UploadPhoto = lazyWithRetry(() => import('@/pages/material/intent/UploadPhoto'));
const Intent = lazyWithRetry(() => import('@/pages/material/intent/Intent'));
const ProjectDocuments = lazyWithRetry(() => import('@/pages/documents/ProjectDocuments'));
const DocumentsRedirect = lazyWithRetry(() => import('@/pages/documents/DocumentsRedirect'));
const SupervisorProjectDocuments = lazyWithRetry(() => import('@/pages/documents/SupervisorProjectDocuments'));

// Salary Management Pages - Lazy loaded
const SalaryDashboard = lazyWithRetry(() => import('@/pages/payroll/SalaryDashboard'));
const SalaryHistory = lazyWithRetry(() => import('@/pages/payroll/SalaryHistory'));
const HolidayCalendar = lazyWithRetry(() => import('@/pages/payroll/HolidayCalendar'));
const SalaryPolicyPage = lazyWithRetry(() => import('@/pages/payroll/SalaryPolicyPage'));

// Task Management Pages - Lazy loaded
const AdminTasks = lazyWithRetry(() => import('@/pages/projects/AdminTasks'));

// Work Order Management Pages - Lazy loaded
const ManageWorkOrder = lazyWithRetry(() => import('@/pages/projects/ManageWorkOrder'));
const ManageInventoryLabour = lazyWithRetry(() => import('@/pages/inventory/ManageInventoryLabour'));

// Reports Page
const AdminReports = lazyWithRetry(() => import('@/pages/reports/AdminReports'));
const AdminTransfers = lazyWithRetry(() => import('@/pages/material/transfers/AdminTransfers'));
const MobileMyIndents = lazyWithRetry(() => import('@/pages/material/indent/MobileMyIndents'));
const MaterialTransferMobile = lazyWithRetry(() => import('@/pages/material/transfers/MaterialTransferMobile'));
const ConnectServer = lazyWithRetry(() => import('@/pages/auth/ConnectServer'));

// Dev-only design system page (not part of the production bundle)
const Styleguide = import.meta.env.DEV ? lazyWithRetry(() => import('@/pages/dev/Styleguide')) : null;
const ShellPreview = import.meta.env.DEV ? lazyWithRetry(() => import('@/pages/dev/ShellPreview')) : null;
const ErrorTest = import.meta.env.DEV ? lazyWithRetry(() => import('@/pages/dev/ErrorTest')) : null;

// Route-chunk loading state (shared PageLoader, token based)
const LoadingFallback = () => <PageLoader />;

// Page-level boundary: a crash or failed download of one screen shows the recovery screen, while the toaster, the
// offline banner and the app itself keep running. Navigating to another route clears the error.
function RouteBoundary({ children }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary variant="page" scope="route" resetKeys={[pathname]} autoReloadChunks>
      {children}
    </ErrorBoundary>
  );
}

function App() {
  const user = getUser();
  useNotifier();

  useEffect(() => {
    // The sync engine owns the 'online' listener for the whole app – screens
    // must not register their own, or reconnecting fires concurrent syncs of
    // the same queue.
    syncEngine.init();

    // Clear out the two localStorage queues written by the previous offline
    // implementation. They cannot be replayed (their selfies did not survive
    // JSON serialisation), so tell the user rather than failing silently.
    migrateLegacyOfflinePunches()
      .then(({ unrecoverable }) => {
        if (unrecoverable > 0) {
          toast.warning(
            `${unrecoverable} attendance punch(es) saved by an older version of the app could not be recovered. Please re-punch if needed.`,
            { duration: 10000 }
          );
        }
      })
      .catch((err) => console.error('Legacy offline punch migration failed:', err));
  }, []);

  return (
    <>
      <Toaster />
      <InstallPWA />
      <OfflineBanner />
      <RouteBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          {/* Dev-only */}
          {import.meta.env.DEV && Styleguide && (
            <Route path="/styleguide" element={<Styleguide />} />
          )}
          {import.meta.env.DEV && ErrorTest && (
            <Route path="/styleguide/errors" element={<ErrorTest />} />
          )}
          {import.meta.env.DEV && ShellPreview && (
            <Route path="/styleguide/shell" element={<ShellPreview />} />
          )}
          {/* Every route below needs a signed-in session (PrivateRoute redirects to /login at once). No role checks yet. */}
          <Route element={<PrivateRoute />}>
            <Route path="/my-attendance" element={<MyAttendance />} />
            <Route path="/admin/my-team" element={<AdminMyTeam />} />
            <Route path="/admin/my-team/:userId" element={<MemberProfile />} />
            <Route path="/admin/my-team/:userId/edit" element={<MemberEdit />} />
            <Route path="/admin/my-team/new" element={<AddEmployee />} />
            <Route path="/admin/projects" element={<CreateProject />} />
            <Route
              path="/admin/attendance/Supervisor"
              element={<AdminAttendance role="supervisor" />}
            />
            <Route
              path="/admin/attendance/labour"
              element={<AdminAttendance role="labour" />}
            />
            <Route
              path="/admin/attendance/subcontractor"
              element={<AdminAttendance role="subcontractor" />}
            />
            <Route
              path="/admin/attendance/delete"
              element={<AdminDeleteAttendance />}
            />
            <Route path="/dashboard/vendors" element={<AdminVendors />} />
            <Route path="/dashboard/attendance" element={<AttendancePage />} />
            <Route
              path="/dashboard"
              element={
                <RoleBasedDashboard />
              }
            />
            <Route
              path="/projects/:projectId/documents"
              element={
                <ProjectDocuments />
              }
            />
            <Route
              path="/documents"
              element={
                <DocumentsRedirect />
              }
            />

            <Route
              path="/punch"
              element={
                <PunchInScreen user={user} />
              }
            />
            <Route
              path="/selfie"
              element={
                <SelfieCaptureScreen user={user} />
              }
            />
            <Route
              path="/dashboard/branches"
              element={
                <AdminBranches />
              }
            />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route
              path="/dashboard/live-attendance"
              element={<AdminLiveAttendance />}
            />
            <Route
              path="/attendance/supervisor"
              element={<SupervisorAttendanceDashboard />}
            />
            <Route
              path="/attendance/subcontractor"
              element={<SubcontractorAttendanceDashboard />}
            />
            <Route
              path="/attendance/labour"
              element={<LabourAttendanceDashboard />}
            />
            <Route path="/attendance/notes" element={<NotesDashboard />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/attendance/leaves" element={<AdminLeaves />} />
            <Route path="/reimbursements" element={<MyReimbursements />} />
            <Route path="/reimbursements/new" element={<CreateReimbursement />} />
            <Route
              path="/admin/reimbursements"
              element={<AdminReimbursements />}
            />
            {/* Supervisor/Subcontractor Routes */}
            <Route
              path="/supervisor/projects"
              element={<SupervisorProjectList />}
            />
            <Route
              path="/supervisor/project/:projectId/documents"
              element={
                <SupervisorProjectDocuments />
              }
            />

            <Route
              path="/branch/:branchId/labour-dashboard"
              element={<LabourDashboard />}
            />
            <Route path="/branch/:branchId/tasks" element={<TaskSubmission />} />
            <Route
              path="/branch/:branchId/labours"
              element={<SupervisorLabourList />}
            />
            <Route
              path="/branch/:branchId/labours/add"
              element={<SupervisorAddLabour />}
            />
            <Route
              path="/branch/:branchId/labours/:labourId"
              element={<SupervisorLabourDetails />}
            />
            <Route
              path="/branch/:branchId/team-attendance"
              element={<TeamAttendance />}
            />
            {/* Admin Dashboard Route */}
            <Route path="/admindashboard" element={<AdminDashboard />} />
            {/* Client-Side Material Routes */}
            <Route
              path="/material/intent"
              element={<Material activeTab="intent" />}
            />
            <Route path="/material/intent/new" element={<IntentForm />} />
            <Route path="/material/intent/:id" element={<IntentCardDetails />} />
            <Route
              path="/material/intent-details/:id"
              element={<IntentCardDetails />}
            />
            <Route path="/material/upload-photo" element={<UploadPhoto />} />
            <Route
              path="/material/transfer"
              element={<Material activeTab="transfer" />}
            />
            <Route
              path="/material/transfer/new"
              element={<MaterialTransferForm />}
            />
            <Route
              path="/material/transfer/:id"
              element={<MaterialCardDetails />}
            />
            <Route
              path="/material/deliveries"
              element={<Material activeTab="deliveries" />}
            />
            <Route path="/material/grn" element={<Material activeTab="grn" />} />
            <Route path="/material/grn/:id" element={<GRNCardDetails />} />
            {/* Material Management Routes - Following existing flat route pattern */}
            <Route
              path="/dashboard/material/uploadindent"
              element={<UploadIndent />}
            />
            <Route
              path="/dashboard/material/upload-indent"
              element={<UploadIndent />}
            />
            <Route
              path="/dashboard/material/site-transfers"
              element={<AdminSiteTransfer />}
            />
            <Route
              path="/dashboard/material/upcoming-deliveries"
              element={<AdminUpcomingDeliveries />}
            />
            <Route path="/dashboard/material/intent" element={<AdminIntent />} />
            <Route path="/dashboard/material/grn" element={<AdminGRN />} />
            <Route
              path="/dashboard/material/transfer/new"
              element={<MaterialTransferForm />}
            />
            <Route
              path="/dashboard/material/intent/new"
              element={<IntentForm />}
            />
            <Route
              path="/dashboard/material/transfer/:id"
              element={<MaterialCardDetails />}
            />
            <Route
              path="/dashboard/material/intent/:id"
              element={<IntentCardDetails />}
            />
            <Route
              path="/dashboard/material/deliveries/:id"
              element={<DeliveryDetails />}
            />
            <Route
              path="/dashboard/material/delivery-checklist/:id"
              element={<DeliveryChecklist />}
            />
            <Route
              path="/dashboard/material/upload-photo"
              element={<UploadPhoto />}
            />
            {/* Salary Management Routes */}
            <Route path="/admin/salary" element={<SalaryDashboard />} />
            <Route path="/admin/salary-history" element={<SalaryHistory />} />
            <Route path="/admin/holidays" element={<HolidayCalendar />} />
            <Route path="/admin/salary-policy" element={<SalaryPolicyPage />} />
            {/* Task Management Routes */}
            <Route path="/admin/tasks" element={<AdminTasks />} />
            {/* Work Order Management Routes */}
            <Route path="/dashboard/work-orders" element={<ManageWorkOrder />} />
            {/* Reports */}
            <Route path="/dashboard/report" element={<AdminReports />} />
            {/* Inventory */}
            <Route
              path="/dashboard/inventory/labour/manage"
              element={<ManageInventoryLabour />}
            />
            {/* Transfers */}
            <Route path="/admin/transfers" element={<AdminTransfers />} />
            <Route path="/material/my-indents" element={<MobileMyIndents />} />
            <Route
              path="/material/transfer-mobile"
              element={<MaterialTransferMobile />}
            />
            {/* Offline Sync */}
            <Route path="/connect-server" element={<ConnectServer />} />
          </Route>
        </Routes>
      </Suspense>
      </RouteBoundary>
    </>
  );
}

export default App;