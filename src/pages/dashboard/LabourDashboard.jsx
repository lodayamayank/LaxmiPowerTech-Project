// src/pages/dashboard/LabourDashboard.jsx
// One route component, two mobile screens: a supervisor opening a project (`:branchId` in the route) gets the project
// hub; labour and staff get their home.
import { useParams } from "react-router-dom";
import { isFieldRole } from "@/lib/roles";
import { getUser } from "@/lib/session";
import LabourHome from "./LabourHome";
import ProjectHub from "./ProjectHub";

const LabourDashboard = () => {
  const { branchId } = useParams();
  const user = getUser();
  return branchId && isFieldRole(user?.role) ? <ProjectHub /> : <LabourHome />;
};

export default LabourDashboard;
