import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import {
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaIdCard,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCheck,
  FaTimes,
  FaUserTie
} from 'react-icons/fa';

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    companyName: '',
    contact: '',
    mobile: '',
    office: '',
    email: '',
    gst: '',
    address: '',
  });
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/vendors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(res.data);
    } catch (err) {
      console.error('Failed to fetch vendors', err);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.companyName) {
      newErrors.companyName = "Company name is required";
    }

    if (!formData.mobile) {
      newErrors.mobile = "Mobile No. is required";
    } else if (!/^[0-9]{7,15}$/.test(formData.mobile)) {
      newErrors.mobile = "Enter a valid mobile number (digits only)";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (editId) {
        await axios.put(`/vendors/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/vendors', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setFormData({
        companyName: '', contact: '', mobile: '', office: '',
        email: '', gst: '', address: ''
      });
      setEditId(null);
      setErrors({});
      fetchVendors();
    } catch (err) {
      console.error('Failed to submit vendor', err);
      alert('Failed to save vendor');
    }
  };

  const handleEdit = (vendor) => {
    setFormData(vendor);
    setEditId(vendor._id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({
      companyName: '', contact: '', mobile: '', office: '',
      email: '', gst: '', address: ''
    });
    setEditId(null);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await axios.delete(`/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchVendors();
    } catch (err) {
      console.error('Failed to delete vendor', err);
      alert('Failed to delete vendor');
    }
  };

  return (
    <DashboardLayout title="Vendors">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vendor Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your vendors and suppliers</p>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{vendors.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FaBuilding className="text-orange-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editId ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            {editId && (
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cancel"
              >
                <FaTimes size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter company name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Person</label>
              <div className="relative">
                <FaUserTie className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter contact person"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mobile No. <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
              {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Office No.</label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter office number"
                  value={formData.office}
                  onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST No.</label>
              <div className="relative">
                <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter GST number"
                  value={formData.gst}
                  onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" size={14} />
                <textarea
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Enter complete address"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors shadow-md hover:shadow-lg"
            >
              {editId ? (
                <>
                  <FaCheck size={14} />
                  Update Vendor
                </>
              ) : (
                <>
                  <FaPlus size={14} />
                  Add Vendor
                </>
              )}
            </button>

            {editId && (
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Vendors List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your existing vendors</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Company Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Contact</th>
                  <th className="text-left px-6 py-3 font-semibold">Mobile</th>
                  <th className="text-left px-6 py-3 font-semibold">Email</th>
                  <th className="text-left px-6 py-3 font-semibold">GST</th>
                  <th className="text-left px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-6 text-center text-gray-500">
                      Loading vendors...
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-6 text-center text-gray-500">
                      No vendors found. Add your first vendor above.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{v.companyName}</td>
                      <td className="px-6 py-4 text-gray-600">{v.contact || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{v.mobile}</td>
                      <td className="px-6 py-4 text-gray-600">{v.email}</td>
                      <td className="px-6 py-4 text-gray-600">{v.gst || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            onClick={() => handleEdit(v)}
                          >
                            <FaEdit size={14} />
                            Edit
                          </button>
                          <button
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium transition-colors"
                            onClick={() => handleDelete(v._id)}
                          >
                            <FaTrash size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminVendors;