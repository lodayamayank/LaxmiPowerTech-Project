import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import { FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import logo from '../assets/logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SupervisorAddLabour = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('');

  React.useEffect(() => {
    const storedBranchName = localStorage.getItem('selectedBranchName');
    if (storedBranchName) {
      setProjectName(storedBranchName);
    }
  }, []);

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

  // Auto-calculate overtime rate when dailyWage or workingHours changes
  React.useEffect(() => {
    const dailyWage = parseFloat(formData.dailyWage);
    const workingHours = parseFloat(formData.workingHours);
    
    // Only auto-calculate if both values are valid and workingHours is not zero
    if (dailyWage && workingHours && workingHours > 0) {
      const calculatedOvertimeRate = (dailyWage / workingHours).toFixed(2);
      
      // Only update if different from current value to avoid infinite loops
      if (formData.overtimeWage !== calculatedOvertimeRate) {
        setFormData(prev => ({
          ...prev,
          overtimeWage: calculatedOvertimeRate
        }));
      }
    }
  }, [formData.dailyWage, formData.workingHours]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.labourType) {
      toast.error('Please fill in name and labour type');
      return;
    }

    try {
      setLoading(true);
      
      // Generate username from name if not provided
      const username = formData.username || 
        formData.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);

      const payload = {
        name: formData.name,
        username: username,
        password: 'default123', // Default password
        role: 'labour',
        jobTitle: formData.labourType,
        mobileNumber: formData.mobileNumber,
        emergencyContact: formData.emergencyContact,
        assignedBranches: [branchId],
        // Store wage details in appropriate fields
        ctcAmount: formData.dailyWage ? parseFloat(formData.dailyWage) : 0,
        salaryType: formData.wageType,
        standardDailyHours: formData.workingHours ? parseFloat(formData.workingHours) : 8,
        overtimeRateMultiplier: formData.overtimeWage ? parseFloat(formData.overtimeWage) : 0
      };

      await axios.post('/users/register', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Labour added successfully!');
      navigate(`/branch/${branchId}/labours`);
    } catch (err) {
      console.error('Failed to add labour:', err);
      toast.error(err.response?.data?.message || 'Failed to add labour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient - Matching Material Form */}
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
            <h2 className="text-white text-2xl font-bold">Add New Labour</h2>
            <p className="text-white/80 text-sm mt-1">Project: {projectName || 'Loading...'}</p>
          </div>
        </div>

        {/* Form - Matching Material Form Style */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Personal Details Section - Matching Material Form */}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Wage Details Section - Matching Material Form */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-orange-600 font-bold text-sm mb-4">Wage Details (Optional)</h3>

            <div className="space-y-4">
              {/* Wage Type and Working Hours in Grid */}
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
                    disabled={loading}
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
                    disabled={loading}
                  >
                    <option value="4">4 Hrs</option>
                    <option value="6">6 Hrs</option>
                    <option value="8">8 Hrs</option>
                    <option value="10">10 Hrs</option>
                    <option value="12">12 Hrs</option>
                  </select>
                </div>
              </div>

              {/* Wage Amounts in Grid */}
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button - Matching Material Form */}
          <div className="sticky bottom-0 bg-white pt-4 pb-6 -mx-6 px-6 border-t border-gray-100">
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 h-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Labour...
                </span>
              ) : (
                'Create Labour'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupervisorAddLabour;
