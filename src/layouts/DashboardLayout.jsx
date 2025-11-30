import {
  FaBell,
  FaCalendarAlt,
  FaUsers,
  FaClipboardList,
  FaBoxes,
  FaUserCog,
  FaPowerOff,
  FaSitemap,
  FaBars,
  FaTimes,
  FaUserCircle,
  FaMoneyBillWave,
} from "react-icons/fa";
import { MdOutlineTaskAlt, MdSettings } from "react-icons/md";
import { MdNotificationsActive } from "react-icons/md";
import { IoDocumentTextOutline } from "react-icons/io5";
import { FiPackage } from "react-icons/fi";
import { BiUserCheck } from "react-icons/bi";
import { FaFileUpload, FaTruck, FaClipboardCheck, FaShoppingCart } from "react-icons/fa";
import { MdInventory } from "react-icons/md";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import logo from "../assets/logo.png";
import avatar from "../assets/avatar.png";
import { useState, useEffect } from 'react';

const DashboardLayout = ({ children, title }) => {
  const today = new Date().toLocaleDateString("en-GB");
  const navigate = useNavigate();
  const [attendanceOpen, setAttendanceOpen] = useState(true);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Failed to parse user data', err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { label: "Dashboard", icon: <FaClipboardList />, path: "/dashboard" },
    { label: "My Team", icon: <FaUsers />, path: "/admin/my-team" },
    {
      label: "Attendance",
      icon: <BiUserCheck />,
      children: [
        { label: "Live Dashboard", path: "/dashboard/live-attendance" },
        { label: "Staff", path: "/attendance/staff" },
        { label: "Subcontractor", path: "/attendance/subcontractor" },
        { label: "Labour", path: "/attendance/labour" },
        { label: "Notes", path: "/attendance/notes" },
        { label: "Leaves", path: "/attendance/leaves" },
      ],
    },
    {
      label: "Projects",
      icon: <FaClipboardList />,
      path: "/admin/projects",
    },
    {
      label: "Reimbursements",
      icon: <FaMoneyBillWave />,
      path: "/admin/reimbursements",
    },
    {
      label: "Material",
      icon: <MdInventory />,
      children: [
        { label: "Upload Indent List", path: "/dashboard/material/uploadindent", icon: <FaFileUpload /> },
        { label: "Intent (PO)", path: "/dashboard/material/intent", icon: <FaShoppingCart /> },
        { label: "Site Transfers", path: "/dashboard/material/site-transfers", icon: <FaTruck /> },
        { label: "Upcoming Deliveries", path: "/dashboard/material/upcoming-deliveries", icon: <FaClipboardCheck /> },
        { label: "GRN", path: "/dashboard/material/grn", icon: <FaClipboardList />, disabled: true },
      ],
    },
    {
      label: "Work Orders",
      icon: <IoDocumentTextOutline />,
      path: "/dashboard/work-orders",
      disabled: true,
    },
    { label: "Report", icon: <FaClipboardList />, path: "/dashboard/report", disabled: true },
    { label: "Inventory", icon: <FaBoxes />, path: "/dashboard/inventory", disabled: true },
    { label: "Vendors", icon: <FaUserCog />, path: "/dashboard/vendors", disabled: false },
    {
      label: "Branches",
      icon: <FaSitemap />,
      path: "/dashboard/branches",
    },
    { label: "Settings", icon: <MdSettings />, path: "/dashboard/settings", disabled: true },
  ];

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 w-[250px] flex-shrink-0 p-1 bg-orange-500 text-white flex flex-col py-6 transform transition-transform duration-300 z-50 rounded-r-2xl shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="flex items-center justify-between px-4 mb-6">
          <div className="rounded-lg bg-white/80 p-2 flex-1">
            <img src={logo} alt="Logo" className="w-full" />
          </div>
          <button
            className="lg:hidden ml-2 text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-6 pb-4 mb-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <FaUserCircle className="text-3xl text-white/90" />
              <div>
                <div className="text-sm font-semibold">{user.name || 'User'}</div>
                <div className="text-xs text-white/70 capitalize">{user.role || 'Staff'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Menu */}
        {/* Menu */}
        <nav className="flex flex-col flex-1 overflow-y-auto px-2">
          {menuItems.map((item) => {
            const isAttendance = item.label === "Attendance";
            const isMaterial = item.label === "Material";

            return (
              <div key={item.label}>
                {item.children ? (
                  <button
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm text-left transition-all rounded-lg my-1 ${
                      (isAttendance && attendanceOpen) || (isMaterial && materialOpen)
                        ? "bg-transparent text-white font-semibold shadow-md"
                        : "text-white bg-white/20 hover:bg-white/20"
                      }`}
                    onClick={() => {
                      if (isAttendance) setAttendanceOpen((prev) => !prev);
                      if (isMaterial) setMaterialOpen((prev) => !prev);
                    }}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    <span className="transform transition-transform duration-200">
                      {isAttendance ? (attendanceOpen ? "▲" : "▼") : isMaterial ? (materialOpen ? "▲" : "▼") : null}
                    </span>
                  </button>
                ) : (
                  item.disabled ? (
                    <div
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white/40 cursor-not-allowed rounded-lg my-1"
                      title="Coming Soon"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-lg my-1 ho ${isActive
                          ? "bg-white text-orange-500 font-semibold shadow-md hover:text-orange-500"
                          : "text-white hover:text-white hover:bg-white/20"
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  )
                )}

                {/* Render submenu if open */}
                {item.children && ((isAttendance && attendanceOpen) || (isMaterial && materialOpen)) && (
                  <div className="ml-8 text-white text-sm space-y-1 mb-2">
                    {item.children.map((sub) =>
                      sub.disabled ? (
                        <div
                          key={sub.label}
                          className="block py-2 px-3 text-white/40 cursor-not-allowed rounded-lg"
                          title="Coming Soon"
                        >
                          {sub.label}
                        </div>
                      ) : (
                        <NavLink
                          key={sub.label}
                          to={sub.path}
                          className={({ isActive }) =>
                            `block py-2 px-3 transition-all rounded-lg ${isActive
                              ? "bg-white/30 text-white font-medium"
                              : "text-white/80 hover:bg-white/20 hover:text-white"
                            }`
                          }
                          onClick={() => setSidebarOpen(false)}
                        >
                          {sub.label}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm text-white bg-orange-500 hover:bg-white/10 transition-all rounded-lg mt-auto my-1 mx-2"
          >
            <FaPowerOff />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="flex justify-between items-center px-4 lg:px-6 py-4 bg-white shadow-sm rounded-xl z-10">
          {/* Mobile Hamburger + Title */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-orange-500 text-xl"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars />
            </button>
            {title && (
              <h1 className="text-lg lg:text-xl font-bold text-gray-800">{title}</h1>
            )}
          </div>

          {/* Right Side */}
          <div className="flex gap-3 lg:gap-4 items-center">
            <button className="text-orange-500 text-lg lg:text-xl hover:text-orange-600 transition-colors">
              <FaBell />
            </button>
            <button className="text-orange-500 text-lg lg:text-xl hover:text-orange-600 transition-colors">
              <FaCalendarAlt />
            </button>
            <span className="hidden sm:block text-xs lg:text-sm text-gray-600 font-medium bg-orange-50 px-3 py-1 rounded-full">
              {today}
            </span>
          </div>
        </div>

        {/* Children (Main page content) */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;