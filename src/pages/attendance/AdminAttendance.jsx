// src/pages/attendance/AdminAttendance.jsx
// Monthly attendance register by project. The three /admin/attendance/* routes share this page; `role` picks the data.
// Its role tabs link to the /attendance/* routes the sidebar uses.
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import AttendanceSummary from "./components/AttendanceSummary";
import RoleTabs from "./components/RoleTabs";

const AdminAttendance = ({ role }) => (
  <DashboardLayout>
    <PageHeader
      eyebrow="People / Attendance register"
      title="Attendance register"
      description="Monthly attendance by role."
    />
    <AttendanceSummary role={role} tabs={<RoleTabs role={role} />} />
  </DashboardLayout>
);

export default AdminAttendance;
