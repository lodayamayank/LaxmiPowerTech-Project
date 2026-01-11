import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { syncOfflineAttendance } from './utils/syncAttendance';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useNotifier from './hooks/useNotifier';

// Eager load only critical components
import PrivateRoute from './components/PrivateRoute';
import InstallPWA from './components/InstallPWA';

// Lazy load all pages for code-splitting
const Login = lazy(() => import('./pages/Login'));
const RoleBasedDashboard = lazy(() => import('./pages/RoleBasedDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MyAttendance = lazy(() => import('./pages/MyAttendance'));
const AdminMyTeam = lazy(() => import('./pages/AdminMyTeam'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const AdminAttendance = lazy(() => import('./pages/AdminAttendance'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const AdminVendors = lazy(() => import('./pages/AdminVendors'));
const PunchInScreen = lazy(() => import('./pages/PunchInScreen'));
const SelfieCaptureScreen = lazy(() => import('./pages/SelfieCaptureScreen'));
const AdminBranches = lazy(() => import('./pages/AdminBranches'));
const ProfileScreen = lazy(() => import('./pages/ProfileScreen'));
const AdminLiveAttendance = lazy(() => import('./pages/AdminLiveAttendance'));
const StaffAttendanceDashboard = lazy(() => import('./pages/StaffAttendanceDashboard'));
const SubcontractorAttendanceDashboard = lazy(() => import('./pages/SubcontractorAttendanceDashboard'));
const LabourAttendanceDashboard = lazy(() => import('./pages/LabourAttendanceDashboard'));
const NotesDashboard = lazy(() => import('./pages/NotesDashboard'));
const Leaves = lazy(() => import('./pages/Leaves'));
const AdminLeaves = lazy(() => import('./pages/AdminLeaves'));
const MyReimbursements = lazy(() => import('./pages/MyReimbursements'));
const CreateReimbursement = lazy(() => import('./pages/CreateReimbursement'));
const AdminReimbursements = lazy(() => import('./pages/AdminReimbursements'));
const SupervisorDashboard = lazy(() => import('./pages/SupervisorDashboard'));
const SupervisorProjectList = lazy(() => import('./pages/SupervisorProjectList'));

// Material Management Pages - Lazy loaded
const Material = lazy(() => import('./pages/material/Material'));
const MaterialTransferForm = lazy(() => import('./pages/material/MaterialTransferForm'));
const IntentForm = lazy(() => import('./pages/material/IntentForm'));
const MaterialCardDetails = lazy(() => import('./pages/material/MaterialCardDetails'));
const IntentCardDetails = lazy(() => import('./pages/material/IntentCardDetails'));
const GRNCardDetails = lazy(() => import('./pages/material/GRNCardDetails'));
const UpcomingDeliveries = lazy(() => import('./pages/material/UpcomingDeliveries'));
const DeliveryDetails = lazy(() => import('./pages/material/DeliveryDetails'));
const DeliveryChecklist = lazy(() => import('./pages/material/DeliveryChecklist'));
const UploadIndent = lazy(() => import('./components/material/UploadIndent'));
const AdminSiteTransfer = lazy(() => import('./pages/material/AdminSiteTransfer'));
const AdminUpcomingDeliveries = lazy(() => import('./pages/material/AdminUpcomingDeliveries'));
const AdminIntent = lazy(() => import('./pages/material/AdminIntent'));
const AdminGRN = lazy(() => import('./pages/material/AdminGRN'));
const UploadPhoto = lazy(() => import('./pages/material/UploadPhoto'));
const Intent = lazy(() => import('./pages/material/Intent'));

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
  const user = JSON.parse(localStorage.getItem('user'));
  const notifier = useNotifier();

  useEffect(() => {
    if (navigator.onLine) {
      syncOfflineAttendance();
    }

    const onOnline = () => syncOfflineAttendance();
    window.addEventListener('online', onOnline);

    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <>
      <ToastContainer newestOnTop theme="colored" autoClose={3000} />
      <InstallPWA />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-attendance" element={<MyAttendance />} />
        <Route path="/admin/my-team" element={<AdminMyTeam />} />
        <Route path="/admin/projects" element={<CreateProject />} />
        <Route path="/admin/attendance/staff" element={<AdminAttendance role="staff" />} />
        <Route path="/admin/attendance/labour" element={<AdminAttendance role="labour" />} />
        <Route path="/admin/attendance/subcontractor" element={<AdminAttendance role="subcontractor" />} />
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
        <Route path="/dashboard/live-attendance" element={<AdminLiveAttendance />} />
        <Route path="/attendance/staff" element={<StaffAttendanceDashboard />} />
        <Route path="/attendance/subcontractor" element={<SubcontractorAttendanceDashboard />} />
        <Route path="/attendance/labour" element={<LabourAttendanceDashboard />} />
        <Route path="/attendance/notes" element={<NotesDashboard />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/attendance/leaves" element={<AdminLeaves />} />
        <Route path="/reimbursements" element={<MyReimbursements />} />
        <Route path="/reimbursements/new" element={<CreateReimbursement />} />
        <Route path="/admin/reimbursements" element={<AdminReimbursements />} />

        {/* Supervisor/Subcontractor Routes */}
        <Route path="/supervisor/projects" element={<SupervisorProjectList />} />
        <Route path="/project/:projectId/labour-dashboard" element={<LabourDashboard />} />

        {/* Admin Dashboard Route */}
        <Route path="/admindashboard" element={<AdminDashboard />} />

        {/* Client-Side Material Routes */}
        <Route path="/material/intent" element={<Material activeTab="intent" />} />
        <Route path="/material/intent/new" element={<IntentForm />} />
        <Route path="/material/intent/:id" element={<IntentCardDetails />} />
        <Route path="/material/intent-details/:id" element={<IntentCardDetails />} />
        <Route path="/material/upload-photo" element={<UploadPhoto />} />
        <Route path="/material/transfer" element={<Material activeTab="transfer" />} />
        <Route path="/material/transfer/new" element={<MaterialTransferForm />} />
        <Route path="/material/transfer/:id" element={<MaterialCardDetails />} />
        <Route path="/material/deliveries" element={<Material activeTab="deliveries" />} />
        <Route path="/material/grn" element={<Material activeTab="grn" />} />
        <Route path="/material/grn/:id" element={<GRNCardDetails />} />

        {/* Material Management Routes - Following existing flat route pattern */}
        <Route path="/dashboard/material/uploadindent" element={<UploadIndent />} />
        <Route path="/dashboard/material/upload-indent" element={<UploadIndent />} />
        <Route path="/dashboard/material/site-transfers" element={<AdminSiteTransfer />} />
        <Route path="/dashboard/material/upcoming-deliveries" element={<AdminUpcomingDeliveries />} />
        <Route path="/dashboard/material/intent" element={<AdminIntent />} />
        <Route path="/dashboard/material/grn" element={<AdminGRN />} />
        <Route path="/dashboard/material/transfer/new" element={<MaterialTransferForm />} />
        <Route path="/dashboard/material/intent/new" element={<IntentForm />} />
        <Route path="/dashboard/material/transfer/:id" element={<MaterialCardDetails />} />
        <Route path="/dashboard/material/intent/:id" element={<IntentCardDetails />} />
        <Route path="/dashboard/material/deliveries/:id" element={<DeliveryDetails />} />
        <Route path="/dashboard/material/delivery-checklist/:id" element={<DeliveryChecklist />} />
        <Route path="/dashboard/material/upload-photo" element={<UploadPhoto />} />

        </Routes>
      </Suspense>
    </>
  );
}

export default App;