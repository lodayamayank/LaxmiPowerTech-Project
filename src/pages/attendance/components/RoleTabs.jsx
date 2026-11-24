// src/pages/attendance/components/RoleTabs.jsx
// Labour / Supervisor / Subcontractor underline tabs. They are links to the /attendance/* routes the sidebar uses.
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLE_TABS = [
  { role: "labour", label: "Labour", to: ROUTES.attendance.labour },
  { role: "supervisor", label: "Supervisor", to: ROUTES.attendance.supervisor },
  { role: "subcontractor", label: "Subcontractor", to: ROUTES.attendance.subcontractor },
];

export default function RoleTabs({ role }) {
  return (
    <Tabs value={role} className="px-5">
      <TabsList>
        {ROLE_TABS.map((t) => (
          <TabsTrigger key={t.role} value={t.role} asChild>
            <Link to={t.to}>{t.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
