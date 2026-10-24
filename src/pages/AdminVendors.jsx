import React, { useEffect, useState, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  const fetchVendors = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

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
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100 gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Vendors</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{vendors.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <FaBuilding className="text-orange-600" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-100 gap-0 py-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editId ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
              {editId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Cancel"
                >
                  <FaTimes size={18} />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vendor-company-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    id="vendor-company-name"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter company name"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
              </div>

              <div>
                <Label htmlFor="vendor-contact" className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Person</Label>
                <div className="relative">
                  <FaUserTie className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    id="vendor-contact"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter contact person"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vendor-mobile" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Mobile No. <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    id="vendor-mobile"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter mobile number"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
                {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
              </div>

              <div>
                <Label htmlFor="vendor-office" className="block text-sm font-semibold text-gray-700 mb-1.5">Office No.</Label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    id="vendor-office"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter office number"
                    value={formData.office}
                    onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vendor-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    id="vendor-email"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="vendor-gst" className="block text-sm font-semibold text-gray-700 mb-1.5">GST No.</Label>
                <div className="relative">
                  <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    id="vendor-gst"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter GST number"
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="vendor-address" className="block text-sm font-semibold text-gray-700 mb-1.5">Address</Label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" size={14} />
                  <Textarea
                    id="vendor-address"
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
              <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600 text-white shadow-md">
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
              </Button>

              {editId && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vendors Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Vendors List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your existing vendors</p>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-full text-sm">
              <TableHeader className="bg-gray-50 text-gray-700">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="h-auto text-left px-6 py-3 font-semibold text-gray-700">Company Name</TableHead>
                  <TableHead className="h-auto text-left px-6 py-3 font-semibold text-gray-700">Contact</TableHead>
                  <TableHead className="h-auto text-left px-6 py-3 font-semibold text-gray-700">Mobile</TableHead>
                  <TableHead className="h-auto text-left px-6 py-3 font-semibold text-gray-700">Email</TableHead>
                  <TableHead className="h-auto text-left px-6 py-3 font-semibold text-gray-700">GST</TableHead>
                  <TableHead className="h-auto text-left px-6 py-3 font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={6} className="px-6 py-6 text-center text-gray-500">
                      Loading vendors...
                    </TableCell>
                  </TableRow>
                ) : vendors.length === 0 ? (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={6} className="px-6 py-6 text-center text-gray-500">
                      No vendors found. Add your first vendor above.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((v) => (
                    <TableRow key={v._id} className="border-t border-b-0 border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-gray-900">{v.companyName}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-600">{v.contact || '—'}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-600">{v.mobile}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-600">{v.email}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-600">{v.gst || '—'}</TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => handleEdit(v)}>
                            <FaEdit size={14} />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(v._id)}>
                            <FaTrash size={14} />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminVendors;