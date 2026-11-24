// src/pages/attendance/AttendancePage.jsx
// Attendance summary for the role in the ?role= query parameter.
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import AttendanceSummary from "./components/AttendanceSummary";

const AttendancePage = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="People / Attendance"
        title="Attendance"
        description="Monthly attendance summary by project."
      />
      <AttendanceSummary role={role} />
    </DashboardLayout>
  );
};

export default AttendancePage;
