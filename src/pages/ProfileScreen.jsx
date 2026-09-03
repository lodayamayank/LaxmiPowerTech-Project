import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaUserTag,
  FaBuilding,
  FaSave,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
} from 'react-icons/fa';
import { Button } from '@/components/ui/button';

const ProfileScreen = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    jobTitle: '',
    project: '',
    role: '',
    assignedBranches: [],
  });

  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const canChangePassword = ['supervisor', 'labour'].includes(formData.role);

  useEffect(() => {
    fetchUser();
    fetchBranches();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/users/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const {
        name = '',
        email = '',
        mobileNumber = '',
        jobTitle = '',
        project = '',
        role = '',
        assignedBranches = [],
      } = res.data;

      setFormData({
        name,
        email,
        mobileNumber,
        jobTitle,
        project: project?._id || '',
        role,
        assignedBranches: assignedBranches.filter(Boolean),
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to load user', err);
      toast.error('Failed to load profile');
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setBranches(res.data);
    } catch (err) {
      console.error('Failed to fetch branches', err);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        jobTitle: formData.jobTitle,
      };

      await axios.put('/users/me', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Profile updated successfully');
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      toast.error('Failed to update profile');
      console.error(err);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await axios.patch('/users/me/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswords({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
      console.error(err);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <Button
            variant="ghost"
            className="absolute top-6 left-6 flex h-auto items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-1.5 text-orange-600 shadow-sm hover:bg-orange-50 hover:text-orange-700"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </Button>

          <div className="text-center pt-8">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-5xl font-bold text-white shadow-lg border-4 border-white/30 mx-auto mb-3">
              {formData.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h1 className="text-white text-2xl font-bold mb-1">My Profile</h1>
            <p className="text-white/80 text-sm">{formData.name}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Personal Information Section */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaUser className="text-orange-500" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <InputField
                icon={FaUser}
                label="Full Name"
                placeholder="Enter your name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <InputField
                icon={FaEnvelope}
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <InputField
                icon={FaPhone}
                label="Mobile Number"
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={formData.mobileNumber || ''}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Professional Information Section */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaBriefcase className="text-orange-500" />
              Professional Information
            </h3>
            <div className="space-y-4">
              <InputField
                icon={FaBriefcase}
                label="Job Title"
                placeholder="e.g., Electrician"
                value={formData.jobTitle || ''}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FaUserTag className="text-gray-400" size={14} />
                    <span>Role</span>
                  </div>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaUserTag size={14} />
                  </div>
                  <input
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm cursor-not-allowed"
                    value={formData.role || ''}
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Assigned Branches Section */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaBuilding className="text-orange-500" />
              Assigned Branches
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
              {(formData.assignedBranches || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.assignedBranches.map((b) => {
                    const branch = typeof b === 'string'
                      ? branches.find((br) => String(br._id) === b)
                      : b;

                    return branch ? (
                      <div
                        key={branch._id}
                        className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-blue-200"
                      >
                        <FaBuilding className="text-blue-600" size={12} />
                        <span className="text-sm font-medium text-gray-800">{branch.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FaBuilding className="text-gray-400 mx-auto mb-2" size={32} />
                  <p className="text-sm text-gray-500">No branches assigned</p>
                </div>
              )}
            </div>
          </div>

          {canChangePassword && (
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FaKey className="text-orange-500" />
                Password Settings
              </h3>
              <div className="bg-gradient-to-br from-orange-50 to-blue-50 rounded-2xl p-5 space-y-4 shadow-md border border-orange-100">
                <PasswordField
                  label="Current Password"
                  value={passwordData.currentPassword}
                  visible={showPasswords.currentPassword}
                  onToggle={() => setShowPasswords((prev) => ({
                    ...prev,
                    currentPassword: !prev.currentPassword,
                  }))}
                  onChange={(e) => setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))}
                />
                <PasswordField
                  label="New Password"
                  value={passwordData.newPassword}
                  visible={showPasswords.newPassword}
                  onToggle={() => setShowPasswords((prev) => ({
                    ...prev,
                    newPassword: !prev.newPassword,
                  }))}
                  onChange={(e) => setPasswordData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))}
                />
                <PasswordField
                  label="Confirm New Password"
                  value={passwordData.confirmPassword}
                  visible={showPasswords.confirmPassword}
                  onToggle={() => setShowPasswords((prev) => ({
                    ...prev,
                    confirmPassword: !prev.confirmPassword,
                  }))}
                  onChange={(e) => setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))}
                />
                <Button
                  onClick={handlePasswordSubmit}
                  disabled={passwordSaving}
                  className="w-full py-3 h-auto rounded-xl bg-gray-900 text-white font-bold shadow-md hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  <FaLock size={14} />
                  <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
                </Button>
                <p className="text-xs text-gray-500">
                  Your password is stored securely. Admin can reset or set a new password, but cannot view your current password.
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSubmit}
            className="w-full py-4 h-auto rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <FaSave size={18} />
            <span className="text-lg">Save Profile</span>
          </Button>

          {/* Success Indicator */}
          <div className="mt-4 bg-green-50 rounded-2xl p-4 border border-green-200 flex items-start gap-3">
            <FaCheckCircle className="text-green-600 mt-0.5" size={16} />
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Keep Your Profile Updated</p>
              <p className="text-xs text-gray-600">
                Your profile information helps us serve you better. Make sure all details are accurate.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-center" autoClose={2000} hideProgressBar />
    </div>
  );
};

// Input Field Component
const InputField = ({ icon, label, ...props }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        <div className="flex items-center gap-2">
          {React.createElement(icon, { className: 'text-gray-400', size: 14 })}
          <span>{label}</span>
        </div>
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {React.createElement(icon, { size: 14 })}
        </div>
        <input
          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          {...props}
        />
      </div>
    </div>
  );
};

const PasswordField = ({ label, value, visible, onToggle, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        <div className="flex items-center gap-2">
          <FaLock className="text-gray-400" size={14} />
          <span>{label}</span>
        </div>
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <FaLock size={14} />
        </div>
        <input
          type={visible ? 'text' : 'password'}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          value={value}
          onChange={onChange}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
