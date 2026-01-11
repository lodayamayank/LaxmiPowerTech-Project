import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import fingerprint from '../assets/fingerprint.png';
import layer2 from '../assets/calendar.png';
import logo from '../assets/logo.png';
import avatar from '../assets/user.png';
import leaves from '../assets/leave.png';
import money from '../assets/salary.png';
import { FaSignOutAlt, FaChevronRight } from 'react-icons/fa';
import { MdInventory } from 'react-icons/md';

const LabourDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const { branchId } = useParams(); // Get branchId from route params if accessed from supervisor flow

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Logo" className="h-16 w-50 bg-white box-shadow rounded-2xl" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
              <FaSignOutAlt size={14} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>

          {/* User Welcome Section */}
          <div className="flex items-center gap-4 mt-6">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold text-white shadow-lg border-2 border-white/30">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Welcome back,</p>
              <h2 className="text-white text-xl font-bold">{user?.name || 'User'}</h2>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Quick Actions Title */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800">Quick Actions</h3>
            <p className="text-sm text-gray-500">Select an option below</p>
          </div>

          {/* Grid Cards */}
          <div className="grid grid-cols-2 gap-4">
            <DashboardCard
              label="Mark Attendance"
              icon={fingerprint}
              onClick={() => navigate('/punch')}
              gradient="from-green-400 to-green-500"
              bgColor="bg-green-50"
            />
            <DashboardCard
              label="My Attendance"
              icon={layer2}
              onClick={() => navigate('/my-attendance')}
              gradient="from-blue-400 to-blue-500"
              bgColor="bg-blue-50"
            />
            <DashboardCard
              label="Profile"
              icon={avatar}
              onClick={() => navigate('/profile')}
              gradient="from-purple-400 to-purple-500"
              bgColor="bg-purple-50"
            />
            <DashboardCard
              label="Leave"
              icon={leaves}
              onClick={() => navigate('/leaves')}
              gradient="from-orange-400 to-orange-500"
              bgColor="bg-orange-50"
            />
            <DashboardCard
              label="Reimbursement"
              icon={money}
              onClick={() => navigate('/reimbursements')}
              gradient="from-orange-400 to-orange-500"
              bgColor="bg-orange-50"
            />
            <DashboardCard
              label="Material"
              icon={null}
              iconComponent={<MdInventory className="w-full h-full text-white" />}
              onClick={() => navigate('/material/intent', { state: { branchId } })}
              gradient="from-teal-400 to-teal-500"
              bgColor="bg-teal-50"
            />
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                <span className="text-lg">ℹ️</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">Quick Tip</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Remember to mark your attendance daily. Check your attendance history anytime from My Attendance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardCard = ({ label, icon, iconComponent, onClick, gradient, bgColor }) => (
  <div
    onClick={onClick}
    className={`${bgColor} rounded-2xl p-5 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 border border-gray-100 group`}
  >
    <div className="flex flex-col items-center justify-center h-full">
      {/* Icon Container with Gradient */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} p-3 mb-3 shadow-lg transform transition-transform duration-300 group-hover:rotate-6`}>
        {iconComponent ? (
          iconComponent
        ) : (
          <img src={icon} alt={label} className="w-full h-full object-contain filter brightness-0 invert" />
        )}
      </div>
      
      {/* Label */}
      <p className="font-semibold text-gray-800 text-sm text-center leading-tight mb-0">
        {label}
      </p>

      {/* Arrow Icon */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <FaChevronRight className="text-gray-400" size={12} />
      </div>
    </div>
  </div>
);

export default LabourDashboard;