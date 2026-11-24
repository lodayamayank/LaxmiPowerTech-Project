// src/pages/admin/components/useVendorsPage.js
// Data, validation and save/delete handlers of the Vendors page (moved unchanged from AdminVendors.jsx).
// Replaced: alert() -> toast.error (same text), window.confirm -> a ConfirmDialog (deleteId state).
// UI-only additions: sheetOpen/openCreate (side panel).
import { useState } from 'react';
import { toast } from 'sonner';
import { getToken } from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import { useVendors, VENDORS_KEY } from '@/hooks/useVendors';
import axios from '@/api/client';

const EMPTY = { companyName: '', contact: '', mobile: '', office: '', email: '', gst: '', address: '' };

export default function useVendorsPage() {
  const { data: vendors, isLoading: loading } = useVendors();
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
  const [sheetOpen, setSheetOpen] = useState(false); // UI only
  const [deleteId, setDeleteId] = useState(null); // replaces window.confirm

  const token = getToken();

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
      setSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: VENDORS_KEY });
    } catch (err) {
      console.error('Failed to submit vendor', err);
      toast.error('Failed to save vendor');
    }
  };

  const handleEdit = (vendor) => {
    setFormData(vendor);
    setEditId(vendor._id);
    setErrors({});
    setSheetOpen(true);
  };

  const handleCancel = () => {
    setFormData({
      companyName: '', contact: '', mobile: '', office: '',
      email: '', gst: '', address: ''
    });
    setEditId(null);
    setErrors({});
    setSheetOpen(false);
  };

  // UI only: open the side panel for a new vendor
  const openCreate = () => {
    setFormData({ ...EMPTY });
    setEditId(null);
    setErrors({});
    setSheetOpen(true);
  };

  const handleDelete = (id) => setDeleteId(id);

  const confirmDelete = async () => {
    const id = deleteId;
    try {
      await axios.delete(`/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: VENDORS_KEY });
    } catch (err) {
      console.error('Failed to delete vendor', err);
      toast.error('Failed to delete vendor');
    }
    setDeleteId(null);
  };

  return {
    vendors, loading, formData, setFormData, editId, errors, sheetOpen, setSheetOpen, deleteId, setDeleteId,
    handleSubmit, handleEdit, handleCancel, openCreate, handleDelete, confirmDelete,
  };
}
