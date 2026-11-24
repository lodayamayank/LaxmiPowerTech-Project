// src/pages/attendance/AdminAttendance.jsx
// Monthly attendance register. The three admin routes share this page; `role` picks the data.
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import AttendanceSummary from "./components/AttendanceSummary";

// Role tabs are links to the existing routes (active tab = current role).
const ROLE_TABS = [
  { role: "labour", label: "Labour", to: ROUTES.adminAttendance.labour },
  { role: "supervisor", label: "Supervisor", to: ROUTES.adminAttendance.supervisor },
  { role: "subcontractor", label: "Subcontractor", to: ROUTES.adminAttendance.subcontractor },
];

const AdminAttendance = ({ role }) => (
  <DashboardLayout>
    <PageHeader
      eyebrow="People / Attendance register"
      title="Attendance register"
      description="Monthly attendance by role."
    />
    <AttendanceSummary
      role={role}
      tabs={
        <Tabs value={role} className="px-5">
          <TabsList>
            {ROLE_TABS.map((t) => (
              <TabsTrigger key={t.role} value={t.role} asChild>
                <Link to={t.to}>{t.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    />
  </DashboardLayout>
);

export default AdminAttendance;
