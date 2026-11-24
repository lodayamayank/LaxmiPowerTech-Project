import { Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from '@/lib/session';
import { useEffect, lazy, Suspense } from 'react';
import { migrateLegacyOfflinePunches } from '@/pwa/syncAttendance';
import { toast } from 'sonner';
import useNotifier from '@/pwa/useNotifier';
import syncEngine from '@/pwa/syncEngine';
import OfflineBanner from '@/pwa/OfflineBanner';
import { Toaster } from "@/components/ui/sonner";


// Eager load only critical components
import PrivateRoute from '@/routes/PrivateRoute';
import InstallPWA from '@/pwa/InstallPWA';

// Lazy load all pages for code-splitting
const Login = lazy(() => import('@/pages/auth/Login'));
const RoleBasedDashboard = lazy(() => import('@/pages/dashboard/RoleBasedDashboard'));
const AdminDashboard = lazy(() => import('@/pages/dashboard/AdminDashboard'));
const MyAttendance = lazy(() => import('@/pages/attendance/MyAttendance'));
const AdminMyTeam = lazy(() => import('@/pages/team/AdminMyTeam'));
const CreateProject = lazy(() => import('@/pages/projects/CreateProject'));
const AdminAttendance = lazy(() => import('@/pages/attendance/AdminAttendance'));
const AttendancePage = lazy(() => import('@/pages/attendance/AttendancePage'));
const AdminVendors = lazy(() => import('@/pages/admin/AdminVendors'));
const PunchInScreen = lazy(() => import('@/pages/attendance/PunchInScreen'));
const SelfieCaptureScreen = lazy(() => import('@/pages/attendance/SelfieCaptureScreen'));
const AdminBranches = lazy(() => import('@/pages/admin/AdminBranches'));
const ProfileScreen = lazy(() => import('@/pages/account/ProfileScreen'));
const AdminLiveAttendance = lazy(() => import('@/pages/attendance/AdminLiveAttendance'));
const SupervisorAttendanceDashboard = lazy(() => import('@/pages/attendance/SupervisorAttendanceDashboard'));
const SubcontractorAttendanceDashboard = lazy(() => import('@/pages/attendance/SubcontractorAttendanceDashboard'));
const LabourAttendanceDashboard = lazy(() => import('@/pages/attendance/LabourAttendanceDashboard'));
const NotesDashboard = lazy(() => import('@/pages/attendance/NotesDashboard'));
const Leaves = lazy(() => import('@/pages/leaves/Leaves'));
const AdminLeaves = lazy(() => import('@/pages/leaves/AdminLeaves'));
const MyReimbursements = lazy(() => import('@/pages/reimbursements/MyReimbursements'));
const CreateReimbursement = lazy(() => import('@/pages/reimbursements/CreateReimbursement'));
const AdminReimbursements = lazy(() => import('@/pages/reimbursements/AdminReimbursements'));
const SupervisorDashboard = lazy(() => import('@/pages/dashboard/SupervisorDashboard'));
const SupervisorProjectList = lazy(() => import('@/pages/supervisor/SupervisorProjectList'));
const SupervisorLabourList = lazy(() => import('@/pages/supervisor/SupervisorLabourList'));
const SupervisorAddLabour = lazy(() => import('@/pages/supervisor/SupervisorAddLabour'));
const SupervisorLabourDetails = lazy(() => import('@/pages/supervisor/SupervisorLabourDetails'));
const LabourDashboard = lazy(() => import('@/pages/dashboard/LabourDashboard'));
const TaskSubmission = lazy(() => import('@/pages/projects/TaskSubmission'));
const TeamAttendance = lazy(() => import('@/pages/attendance/TeamAttendance'));
const AdminDeleteAttendance = lazy(() => import('@/pages/attendance/AdminDeleteAttendance'));
const AddEmployee = lazy(() => import('@/pages/team/AddEmployee'));   

// Material Management Pages - Lazy loaded  
const Material = lazy(() => import('@/pages/material/Material'));
const MaterialTransferForm = lazy(() => import('@/pages/material/transfers/MaterialTransferForm'));
const IntentForm = lazy(() => import('@/pages/material/intent/IntentForm'));
const MaterialCardDetails = lazy(() => import('@/pages/material/transfers/MaterialCardDetails'));
const IntentCardDetails = lazy(() => import('@/pages/material/intent/IntentCardDetails'));
const GRNCardDetails = lazy(() => import('@/pages/material/grn/GRNCardDetails'));
const UpcomingDeliveries = lazy(() => import('@/pages/material/deliveries/UpcomingDeliveries'));
const DeliveryDetails = lazy(() => import('@/pages/material/deliveries/DeliveryDetails'));
const DeliveryChecklist = lazy(() => import('@/pages/material/deliveries/DeliveryChecklist'));
const UploadIndent = lazy(() => import('@/pages/material/indent/UploadIndent'));
const AdminSiteTransfer = lazy(() => import('@/pages/material/transfers/AdminSiteTransfer'));
const AdminUpcomingDeliveries = lazy(() => import('@/pages/material/deliveries/AdminUpcomingDeliveries'));
const AdminIntent = lazy(() => import('@/pages/material/intent/AdminIntent'));
const AdminGRN = lazy(() => import('@/pages/material/grn/AdminGRN'));
const UploadPhoto = lazy(() => import('@/pages/material/intent/UploadPhoto'));
const Intent = lazy(() => import('@/pages/material/intent/Intent'));
const ProjectDocuments = lazy(() => import('@/pages/documents/ProjectDocuments'));
const DocumentsRedirect = lazy(() => import('@/pages/documents/DocumentsRedirect'));
const SupervisorProjectDocuments = lazy(() => import('@/pages/documents/SupervisorProjectDocuments'));

// Salary Management Pages - Lazy loaded
const SalaryDashboard = lazy(() => import('@/pages/payroll/SalaryDashboard'));
const SalaryHistory = lazy(() => import('@/pages/payroll/SalaryHistory'));
const HolidayCalendar = lazy(() => import('@/pages/payroll/HolidayCalendar'));
const SalaryPolicyPage = lazy(() => import('@/pages/payroll/SalaryPolicyPage'));

// Task Management Pages - Lazy loaded
const AdminTasks = lazy(() => import('@/pages/projects/AdminTasks'));

// Work Order Management Pages - Lazy loaded
const ManageWorkOrder = lazy(() => import('@/pages/projects/ManageWorkOrder'));
const ManageInventoryLabour = lazy(() => import('@/pages/inventory/ManageInventoryLabour'));

// Reports Page
const AdminReports = lazy(() => import('@/pages/reports/AdminReports'));
const AdminTransfers = lazy(() => import('@/pages/material/transfers/AdminTransfers'));
const MobileMyIndents = lazy(() => import('@/pages/material/indent/MobileMyIndents'));
const MaterialTransferMobile = lazy(() => import('@/pages/material/transfers/MaterialTransferMobile'));
const ConnectServer = lazy(() => import('@/pages/auth/ConnectServer'));

// Dev-only design system page (not part of the production bundle)
const Styleguide = import.meta.env.DEV ? lazy(() => import('@/pages/dev/Styleguide')) : null;
const ShellPreview = import.meta.env.DEV ? lazy(() => import('@/pages/dev/ShellPreview')) : null;

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  const user = getUser();
  const notifier = useNotifier();

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
      <Toaster position="top-center" richColors closeButton />
      <InstallPWA />
      <OfflineBanner />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/my-attendance" element={<MyAttendance />} />
          <Route path="/admin/my-team" element={<AdminMyTeam />} />
          <Route path="/admin/my-team" element={<AdminMyTeam />} />
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
              <PrivateRoute>
                <RoleBasedDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/documents"
            element={
              <PrivateRoute>
                <ProjectDocuments />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <DocumentsRedirect />
              </PrivateRoute>
            }
          />

          <Route
            path="/punch"
            element={
              <PrivateRoute>
                <PunchInScreen user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/selfie"
            element={
              <PrivateRoute>
                <SelfieCaptureScreen user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/branches"
            element={
              <PrivateRoute>
                <AdminBranches />
              </PrivateRoute>
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
              <PrivateRoute>
                <SupervisorProjectDocuments />
              </PrivateRoute>
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
          {/* Dev-only */}
          {import.meta.env.DEV && Styleguide && (
            <Route path="/styleguide" element={<Styleguide />} />
          )}
          {import.meta.env.DEV && ShellPreview && (
            <Route path="/styleguide/shell" element={<ShellPreview />} />
          )}
          {/* Offline Sync */}
          <Route path="/connect-server" element={<ConnectServer />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;