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
  FaTasks,
  FaHardHat,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { MdOutlineTaskAlt, MdSettings } from "react-icons/md";
import { MdNotificationsActive } from "react-icons/md";
import { IoDocumentTextOutline } from "react-icons/io5";
import { FiPackage } from "react-icons/fi";
import { BiUserCheck } from "react-icons/bi";
import { FaFileUpload, FaTruck, FaClipboardCheck, FaShoppingCart } from "react-icons/fa";
import { MdInventory } from "react-icons/md";
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { useState, useEffect } from 'react';

const DashboardLayout = ({ children, title }) => {
  const today = new Date().toLocaleDateString("en-GB");
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);

  // Load dark mode preference and user data
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Failed to parse user data', err);
      }
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    const path = location.pathname;

    const isAttendance = path.includes('/attendance/') || path.includes('/live-attendance');
    const isMaterial = path.includes('/dashboard/material/') || path.includes('/material/');
    const isInventoryRoot = path.includes('/dashboard/inventory/');
    const isLabourInventory = path.includes('/dashboard/inventory/labour');

    setOpenMenus((prev) => ({
      ...prev,
      Attendance: isAttendance,
      Inventory: isMaterial || isInventoryRoot,
      'Inventory>Material': isMaterial,
      'Inventory>Labour': isLabourInventory,
    }));
  }, [location.pathname]);

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const renderMenuItem = (item, depth = 0, parentKey = "") => {
    const key = parentKey ? `${parentKey}>${item.label}` : item.label;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isOpen = !!openMenus[key];
    const paddingLeft = depth === 0 ? "" : depth === 1 ? "ml-4" : "ml-8";

    const ButtonIcon = isOpen ? FaChevronUp : FaChevronDown;

    if (hasChildren) {
      return (
        <div key={key} className={`${paddingLeft} mb-1`}>
          <button
            className={`flex items-center justify-between w-full px-4 py-3 text-sm text-left transition-all rounded-lg ${
              depth === 0
                ? "my-1 text-white bg-white/20 hover:bg-white/20"
                : "text-white/90 bg-white/10 hover:bg-white/20"
            } ${isOpen ? "font-semibold" : ""}`}
            onClick={() => toggleMenu(key)}
          >
            <span className="flex items-center gap-3">
              {item.icon}
              <span>{item.label}</span>
            </span>
            <ButtonIcon className="text-xs" />
          </button>
          {isOpen && (
            <div className={`mt-1 ${depth === 0 ? "ml-3" : "ml-4"}`}>
              {item.children.map((child) => renderMenuItem(child, depth + 1, key))}
            </div>
          )}
        </div>
      );
    }

    if (item.disabled) {
      return (
        <div
          key={key}
          className={`${paddingLeft} flex items-center gap-3 px-4 py-3 text-sm text-white/40 cursor-not-allowed rounded-lg my-1`}
          title="Coming Soon"
        >
          {item.icon}
          <span>{item.label}</span>
        </div>
      );
    }

    const linkClasses = ({ isActive }) => {
      const base = `${paddingLeft} flex items-center gap-3 transition-all rounded-lg my-1`;
      if (depth === 0) {
        return `${base} px-4 py-3 text-sm ${
          isActive
            ? "bg-white text-orange-500 font-semibold shadow-md hover:text-orange-500"
            : "text-white hover:text-white hover:bg-white/20"
        }`;
      }

      return `${base} px-3 py-2 text-sm ${
        isActive ? "bg-white/40 text-white font-semibold" : "text-white/80 hover:bg-white/20 hover:text-white"
      }`;
    };

    return (
      <NavLink key={key} to={item.path} className={linkClasses} onClick={() => setSidebarOpen(false)}>
        {item.icon && <span className="text-sm">{item.icon}</span>}
        <span>{item.label}</span>
      </NavLink>
    );
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
      label: "Tasks",
      icon: <FaTasks />,
      path: "/admin/tasks",
    },
    {
      label: "Reimbursements",
      icon: <FaMoneyBillWave />,
      path: "/admin/reimbursements",
    },
    {
      label: "Salary",
      icon: <FaMoneyBillWave />,
      path: "/admin/salary",
    },
    {
      label: "Inventory",
      icon: <FaBoxes />,
      children: [
        {
          label: "Material",
          icon: <MdInventory />,
          children: [
            { label: "Upload Indent List", path: "/dashboard/material/uploadindent", icon: <FaFileUpload /> },
            { label: "Intent (PO)", path: "/dashboard/material/intent", icon: <FaShoppingCart /> },
            { label: "Site Transfers", path: "/dashboard/material/site-transfers", icon: <FaTruck /> },
            { label: "Upcoming Deliveries", path: "/dashboard/material/upcoming-deliveries", icon: <FaClipboardCheck /> },
            { label: "GRN", path: "/dashboard/material/grn", icon: <FaClipboardList /> },
          ],
        },
        {
          label: "Labour",
          icon: <FaHardHat />,
          children: [
            { label: "Manage Labour", path: "/dashboard/inventory/labour/manage" },
          ],
        },
      ],
    },
    {
      label: "Work Orders",
      icon: <IoDocumentTextOutline />,
      path: "/dashboard/work-orders",
      disabled: false,
    },
    { label: "Reports", icon: <FaClipboardList />, path: "/dashboard/report", disabled: false },
    { label: "Vendors", icon: <FaUserCog />, path: "/dashboard/vendors", disabled: false },
    {
      label: "Branches",
      icon: <FaSitemap />,
      path: "/dashboard/branches",
    },
    { label: "Settings", icon: <MdSettings />, path: "/dashboard/settings", disabled: true },
  ];

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed lg:static inset-y-0 left-0 flex-shrink-0 p-1 bg-orange-500 dark:bg-gray-800 text-white flex flex-col py-6 transform transition-all duration-300 z-50 rounded-r-2xl shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarCollapsed ? 'w-[80px]' : 'w-[250px]'
        }`}
      >
        <div className="flex items-center justify-between px-4 mb-6">
          {!sidebarCollapsed && (
            <div className="rounded-lg bg-white/80 p-2 flex-1">
              <img src={logo} alt="Logo" className="w-full" />
            </div>
          )}
          <button
            className="lg:hidden ml-2 text-orange-500 bg-white/20 hover:bg-white/30 rounded-full p-2"
            onClick={() => setSidebarOpen(false)}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {user && (
          <div className={`pb-4 mb-4 border-b border-white/20 transition-all ${
            sidebarCollapsed ? 'px-2' : 'px-6'
          }`}>
            <div className={`flex items-center ${
              sidebarCollapsed ? 'justify-center' : 'gap-3'
            }`}>
              <FaUserCircle className="text-3xl text-white/90" />
              {!sidebarCollapsed && (
                <div>
                  <div className="text-sm font-semibold">{user.name || 'User'}</div>
                  <div className="text-xs text-white/70 capitalize">{user.role || 'Staff'}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="flex flex-col flex-1 overflow-y-auto px-2">
          {menuItems.map((item) => renderMenuItem(item))}

          <button
            onClick={handleLogout}
            className={`flex items-center px-4 py-3 text-sm text-white bg-orange-500 hover:bg-white/10 transition-all rounded-lg mt-auto my-1 mx-2 ${
              sidebarCollapsed ? 'justify-center px-2' : 'gap-3'
            }`}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <FaPowerOff />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </nav>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="flex justify-between items-center px-4 lg:px-6 py-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl z-10">
          {/* Mobile Hamburger + Title */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-orange-500 text-xl"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars />
            </button>
            <button
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
            </button>
            {title && (
              <h1 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
            )}
          </div>

          {/* Right Side */}
          <div className="flex gap-3 lg:gap-4 items-center">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="text-orange-500 dark:text-orange-400 text-lg lg:text-xl hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button className="text-orange-500 dark:text-orange-400 text-lg lg:text-xl hover:text-orange-600 dark:hover:text-orange-300 transition-colors">
              <FaBell />
            </button>
            <button className="text-orange-500 dark:text-orange-400 text-lg lg:text-xl hover:text-orange-600 dark:hover:text-orange-300 transition-colors">
              <FaCalendarAlt />
            </button>
            <span className="hidden sm:block text-xs lg:text-sm text-gray-600 dark:text-gray-300 font-medium bg-orange-50 dark:bg-gray-700 px-3 py-1 rounded-full">
              {today}
            </span>
          </div>
        </div>

        {/* Children (Main page content) */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;