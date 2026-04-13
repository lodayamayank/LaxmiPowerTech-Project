import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import { FaArrowLeft, FaSave, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import logo from '../assets/logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SupervisorLabourDetails = () => {
  const navigate = useNavigate();
  const { branchId, labourId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const token = localStorage.getItem('token');

  const [formData, setFormData] = useState({
    name: '',
    labourType: '',
    wageType: 'daily',
    workingHours: '8',
    dailyWage: '',
    overtimeWage: '',
    username: '',
    mobileNumber: '',
    emergencyContact: ''
  });

  useEffect(() => {
    const storedBranchName = localStorage.getItem('selectedBranchName');
    if (storedBranchName) {
      setProjectName(storedBranchName);
    }
    fetchLabourDetails();
  }, [labourId]);

  const fetchLabourDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/users/${labourId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const labour = res.data;
      setFormData({
        name: labour.name || '',
        labourType: labour.jobTitle || '',
        wageType: labour.salaryType || 'daily',
        workingHours: labour.standardDailyHours?.toString() || '8',
        dailyWage: labour.ctcAmount?.toString() || '',
        overtimeWage: labour.overtimeRateMultiplier?.toString() || '',
        username: labour.username || '',
        mobileNumber: labour.mobileNumber || '',
        emergencyContact: labour.emergencyContact || ''
      });
    } catch (err) {
      console.error('Failed to fetch labour details:', err);
      toast.error('Failed to load labour details');
      navigate(`/branch/${branchId}/labours`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.labourType) {
      toast.error('Please fill in name and labour type');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        name: formData.name,
        username: formData.username,
        jobTitle: formData.labourType,
        mobileNumber: formData.mobileNumber,
        emergencyContact: formData.emergencyContact,
        ctcAmount: formData.dailyWage ? parseFloat(formData.dailyWage) : 0,
        salaryType: formData.wageType,
        standardDailyHours: formData.workingHours ? parseFloat(formData.workingHours) : 8,
        overtimeRateMultiplier: formData.overtimeWage ? parseFloat(formData.overtimeWage) : 0
      };

      await axios.put(`/users/${labourId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Labour updated successfully!');
      navigate(`/branch/${branchId}/labours`);
    } catch (err) {
      console.error('Failed to update labour:', err);
      toast.error(err.response?.data?.message || 'Failed to update labour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${formData.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/users/${labourId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Labour deleted successfully');
      navigate(`/branch/${branchId}/labours`);
    } catch (err) {
      console.error('Failed to delete labour:', err);
      toast.error('Failed to delete labour');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading labour details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Logo" className="h-16 w-50 bg-white box-shadow rounded-2xl" />
            <Button
              variant="ghost"
              onClick={() => navigate(`/branch/${branchId}/labours`)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 h-auto"
            >
              <FaArrowLeft size={14} />
              <span className="text-sm font-medium">Back</span>
            </Button>
          </div>

          <div className="mt-6">
            <h2 className="text-white text-2xl font-bold">Labour Details</h2>
            <p className="text-white/80 text-sm mt-1">Project: {projectName || 'Loading...'}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Personal Details Section */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-orange-600 font-bold text-sm mb-4">Personal Details</h3>
            
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  required
                  disabled={saving}
                />
              </div>

              {/* Labour Type */}
              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Labour Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="labourType"
                  value={formData.labourType}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em'
                  }}
                  required
                  disabled={saving}
                >
                  <option value="">Select labour type</option>
                  <option value="Mason">Mason</option>
                  <option value="M/F helper">M/F helper</option>
                  <option value="Carpenter">Carpenter</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Plumber">Plumber</option>
                  <option value="Painter">Painter</option>
                  <option value="Helper">Helper</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Username */}
              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  disabled={saving}
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Emergency Contact (Optional)
                </label>
                <input
                  type="tel"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  placeholder="Enter emergency contact"
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Wage Details Section */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-orange-600 font-bold text-sm mb-4">Wage Details (Optional)</h3>

            <div className="space-y-4">
              {/* Wage Type and Working Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">
                    Wage Type
                  </label>
                  <select
                    name="wageType"
                    value={formData.wageType}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em'
                    }}
                    disabled={saving}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">
                    Working Hours
                  </label>
                  <select
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em'
                    }}
                    disabled={saving}
                  >
                    <option value="4">4 Hrs</option>
                    <option value="6">6 Hrs</option>
                    <option value="8">8 Hrs</option>
                    <option value="10">10 Hrs</option>
                    <option value="12">12 Hrs</option>
                  </select>
                </div>
              </div>

              {/* Wage Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">
                    Daily Wage (₹)
                  </label>
                  <input
                    type="number"
                    name="dailyWage"
                    value={formData.dailyWage}
                    onChange={handleChange}
                    placeholder="Enter amount"
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">
                    Overtime Rate (₹/hr)
                  </label>
                  <input
                    type="number"
                    name="overtimeWage"
                    value={formData.overtimeWage}
                    onChange={handleChange}
                    placeholder="Enter rate"
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 h-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-orange-700 shadow-md"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FaSave size={14} />
                  Save Changes
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-6 py-3 h-auto bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 shadow-md"
            >
              <FaTrash size={14} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupervisorLabourDetails;
