import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RoleBasedDashboard from './pages/RoleBasedDashboard';
import PrivateRoute from './components/PrivateRoute';
import { useEffect } from 'react';
import { syncOfflineAttendance } from './utils/syncAttendance';
import MyAttendance from './pages/MyAttendance';
import AdminMyTeam from './pages/AdminMyTeam';
import CreateProject from './pages/CreateProject';
import AdminAttendance from './pages/AdminAttendance';
import AttendancePage from './pages/AttendancePage';
import AdminVendors from './pages/AdminVendors';
import PunchInScreen from './pages/PunchInScreen';
import SelfieCaptureScreen from './pages/SelfieCaptureScreen';
import AdminBranches from './pages/AdminBranches';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProfileScreen from './pages/ProfileScreen';
import AdminLiveAttendance from './pages/AdminLiveAttendance';
import useNotifier from './hooks/useNotifier';
import StaffAttendanceDashboard from './pages/StaffAttendanceDashboard';
import SubcontractorAttendanceDashboard from './pages/SubcontractorAttendanceDashboard';
import LabourAttendanceDashboard from './pages/LabourAttendanceDashboard';
import NotesDashboard from './pages/NotesDashboard';
import Leaves from './pages/Leaves';
import AdminLeaves from './pages/AdminLeaves';
import InstallPWA from './components/InstallPWA';
import MyReimbursements from './pages/MyReimbursements';
import CreateReimbursement from './pages/CreateReimbursement';
import AdminReimbursements from './pages/AdminReimbursements';

// Material Management Pages
import Material from './pages/material/Material';
import MaterialTransferForm from './pages/material/MaterialTransferForm';
import IntentForm from './pages/material/IntentForm';
import MaterialCardDetails from './pages/material/MaterialCardDetails';
import IntentCardDetails from './pages/material/IntentCardDetails';
import UpcomingDeliveries from './pages/material/UpcomingDeliveries';
import DeliveryDetails from './pages/material/DeliveryDetails';
import DeliveryChecklist from './pages/material/DeliveryChecklist';
import MaterialAdminDashboard from './pages/material/AdminDashboard';
import UploadPhoto from './pages/material/UploadPhoto';

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

        {/* Material Management Routes */}
        <Route path="/material/indent" element={<Material activeTab="indent" />} />
        <Route path="/material/transfer" element={<Material activeTab="transfer" />} />
        <Route path="/material/deliveries" element={<Material activeTab="deliveries" />} />
        <Route path="/material/grn" element={<Material activeTab="grn" />} />
        <Route path="/material/transfer/new" element={<MaterialTransferForm />} />
        <Route path="/material/intent/new" element={<IntentForm />} />
        <Route path="/material/transfer/:id" element={<MaterialCardDetails />} />
        <Route path="/material/intent/:id" element={<IntentCardDetails />} />
        <Route path="/material/upcoming-deliveries" element={<UpcomingDeliveries />} />
        <Route path="/material/deliveries/:id" element={<DeliveryDetails />} />
        <Route path="/material/delivery-checklist/:id" element={<DeliveryChecklist />} />
        <Route path="/material/admin" element={<MaterialAdminDashboard />} />
        <Route path="/material/upload-photo" element={<UploadPhoto />} />

      </Routes>
    </>
  );
}

export default App;