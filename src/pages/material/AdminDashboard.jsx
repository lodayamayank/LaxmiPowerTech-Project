import { useState } from "react";
import Sidebar from "../../components/material/Sidebar";
import UploadIndent from "../../components/material/UploadIndent";
import SiteTransfers from "./SiteTransfers";
import AdminUpcomingDeliveries from "./AdminUpcomingDeliveries";
import AdminIntent from "./AdminIntent";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("uploadIndent");

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar setActiveSection={setActiveSection} />
      <div className="flex-1 overflow-auto">
        {activeSection === "uploadIndent" && <UploadIndent />}
        {activeSection === "siteTransfers" && <SiteTransfers />}
        {activeSection === "upcomingDeliveries" && <AdminUpcomingDeliveries />}
        {activeSection === "intent" && <AdminIntent />}
      </div>
    </div>
  );
}
