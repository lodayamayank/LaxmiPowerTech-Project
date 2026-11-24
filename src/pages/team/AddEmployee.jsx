// src/pages/team/AddEmployee.jsx  (route: /admin/my-team/new)
// The old standalone page was commented out (blank screen). Adding a member is now a side panel on My team,
// so this route sends people there with the panel open.
import { Navigate } from "react-router-dom";
import { ROUTES } from "@/lib/routes";

const AddEmployee = () => <Navigate to={ROUTES.myTeam} replace state={{ addMember: true }} />;

export default AddEmployee;
