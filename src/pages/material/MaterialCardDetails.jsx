import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X, Trash2, Upload } from 'lucide-react';
import { siteTransferAPI, materialCatalogAPI as materialAPI, branchesAPI } from '../../utils/materialAPI';
import MaterialLineItem from './MaterialLineItem';

export default function MaterialCardDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Material editing state
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [newAttachments, setNewAttachments] = useState([]);

  useEffect(() => {
    fetchTransferDetails();
    fetchMaterialsAndSites();
  }, [id]);

  const fetchMaterialsAndSites = async () => {
    try {
      // ✅ FETCH SITES FROM BACKEND - NO HARDCODED VALUES
      const branches = await branchesAPI.getAll();
      const sitesList = branches.map(branch => branch.name).sort((a, b) => a.localeCompare(b));
      setSites(sitesList);
      console.log('✅ MaterialCardDetails: Fetched', sitesList.length, 'sites from backend');
      
      // Fetch materials - MATCHES DEMONSTRATED PROJECT
      const materials = await materialAPI.getMaterials();
      setAllMaterials(materials || []);
      
      // Extract unique categories and sort alphabetically - READ FROM RAW OBJECT
      const uniqueCategories = [...new Set(materials.map(item => {
        // Try raw object first, then fallback to main fields
        if (item.raw && item.raw['Category']) {
          return item.raw['Category'];
        }
        return item.Category || item.category;
      }).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setCategories(uniqueCategories);
    } catch (err) {
      // Error fetching materials and sites
    }
  };

  const fetchTransferDetails = async () => {
    try {
      setLoading(true);
      const response = await siteTransferAPI.getById(id);
      if (response.success) {
        setTransfer(response.data);
        // Convert materials to editable format
        const editableMaterials = response.data.materials.map((m, idx) => {
          // Parse itemName to extract category, subCategory, subCategory1
          const parts = m.itemName?.split(' - ') || [];
          return {
            id: Date.now() + idx,
            category: parts[0] || '',
            subCategory: parts[1] || '',
            subCategory1: parts[2] || '',
            quantity: m.quantity || '',
            itemName: m.itemName,
            uom: m.uom,
            remarks: m.remarks
          };
        });
        
        setFormData({
          fromSite: response.data.fromSite,
          toSite: response.data.toSite,
          requestedBy: response.data.requestedBy,
          status: response.data.status,
          materials: editableMaterials,
          remarks: response.data.materials[0]?.remarks || ''
        });
      }
    } catch (err) {
      // Error fetching site transfer details
      alert('Failed to load transfer details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-700';
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setNewAttachments([]);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setNewAttachments([]);
    setEditingMaterialId(null);
    // Reset form data
    const editableMaterials = transfer.materials.map((m, idx) => {
      const parts = m.itemName?.split(' - ') || [];
      return {
        id: Date.now() + idx,
        category: parts[0] || '',
        subCategory: parts[1] || '',
        subCategory1: parts[2] || '',
        quantity: m.quantity || '',
        itemName: m.itemName,
        uom: m.uom,
        remarks: m.remarks
      };
    });
    
    setFormData({
      fromSite: transfer.fromSite,
      toSite: transfer.toSite,
      requestedBy: transfer.requestedBy,
      status: transfer.status,
      materials: editableMaterials,
      remarks: transfer.materials[0]?.remarks || ''
    });
  };

  const handleSaveChanges = async () => {
    // Validate form
    if (!formData.fromSite.trim()) {
      alert('Please select From Site');
      return;
    }
    if (!formData.toSite.trim()) {
      alert('Please select To Site');
      return;
    }
    if (!formData.requestedBy.trim()) {
      alert('Please select Requested By');
      return;
    }
    if (formData.materials.length === 0) {
      alert('Please add at least one material');
      return;
    }
    
    // Validate all materials are complete
    const incompleteMaterials = formData.materials.filter(
      m => !m.category || !m.subCategory || !m.subCategory1 || !m.quantity
    );
    if (incompleteMaterials.length > 0) {
      alert('Please complete all material details');
      return;
    }

    try {
      setSubmitting(true);
      
      // Convert materials to API format
      const materialsData = formData.materials.map(m => ({
        itemName: `${m.category} - ${m.subCategory} - ${m.subCategory1}`,
        quantity: parseInt(m.quantity),
        uom: m.uom || 'Units',
        remarks: formData.remarks
      }));
      
      const updateData = {
        fromSite: formData.fromSite,
        toSite: formData.toSite,
        requestedBy: formData.requestedBy,
        status: formData.status,
        materials: materialsData
      };
      
      const response = await siteTransferAPI.update(id, updateData);
      if (response.success) {
        setTransfer(response.data);
        setEditing(false);
        setNewAttachments([]);
        alert('Site transfer updated successfully!');
        // Refresh data
        fetchTransferDetails();
      }
    } catch (err) {
      // Error updating site transfer
      alert('Failed to update site transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete Site Transfer ${transfer.siteTransferId}? All associated images will also be deleted from the server.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await siteTransferAPI.delete(id);
      if (response.success) {
        alert('Site transfer and associated files deleted successfully');
        navigate('/dashboard/material/site-transfers');
      }
    } catch (err) {
      // Error deleting site transfer
      alert('Failed to delete site transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentIndex) => {
    if (!window.confirm('Are you sure you want to delete this attachment? The file will be permanently removed from the server.')) {
      return;
    }

    try {
      setDeletingAttachment(attachmentIndex);
      const response = await siteTransferAPI.deleteAttachment(id, attachmentIndex);
      
      if (response.success) {
        setTransfer(response.data);
        alert('Attachment deleted successfully');
      }
    } catch (err) {
      // Error deleting attachment
      alert('Failed to delete attachment');
    } finally {
      setDeletingAttachment(null);
    }
  };

  const updateMaterial = (index, field, value) => {
    const updatedMaterials = [...formData.materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: value
    };
    setFormData({ ...formData, materials: updatedMaterials });
  };
  
  const addMaterialRow = () => {
    const newMaterialId = Date.now();
    setFormData(prev => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          id: newMaterialId,
          category: '',
          subCategory: '',
          subCategory1: '',
          quantity: ''
        }
      ]
    }));
    setEditingMaterialId(newMaterialId);
  };

  const removeMaterialRow = (id) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== id)
    }));
  };

  const updateMaterialRow = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map(m => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };
          // Reset dependent fields when parent changes
          if (field === 'category') {
            updated.subCategory = '';
            updated.subCategory1 = '';
          } else if (field === 'subCategory') {
            updated.subCategory1 = '';
          }
          return updated;
        }
        return m;
      })
    }));
  };
  
  const getSubcategories = (category) => {
    return [...new Set(
      allMaterials
        .filter(item => {
          // Try raw object first, then fallback to main fields
          if (item.raw && item.raw['Category']) {
            return item.raw['Category'] === category;
          }
          return (item.Category || item.category) === category;
        })
        .map(item => {
          // Try raw object first, then fallback to main fields
          if (item.raw && item.raw['Sub category']) {
            return item.raw['Sub category'];
          }
          return item['Sub category'] || item.subCategory;
        })
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  const getSubSubcategories = (category, subCategory) => {
    return [...new Set(
      allMaterials
        .filter(item => {
          // Try raw object first, then fallback to main fields
          const itemCategory = item.raw && item.raw['Category'] ? item.raw['Category'] : (item.Category || item.category);
          const itemSubCategory = item.raw && item.raw['Sub category'] ? item.raw['Sub category'] : (item['Sub category'] || item.subCategory);
          return itemCategory === category && itemSubCategory === subCategory;
        })
        .map(item => {
          // Try raw object first, then fallback to main fields
          if (item.raw && item.raw['Sub category 1']) {
            return item.raw['Sub category 1'];
          }
          return item['Sub category 1'] || item.subCategory1;
        })
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  // Get sub-sub-subcategories (SubCategory2) - FIX for "n is not a function" error
  const getSubSubSubcategories = (category, subCategory, subCategory1) => {
    return [...new Set(
      allMaterials
        .filter(item => {
          // Try raw object first, then fallback to main fields
          const itemCategory = item.raw && item.raw['Category'] ? item.raw['Category'] : (item.Category || item.category);
          const itemSubCategory = item.raw && item.raw['Sub category'] ? item.raw['Sub category'] : (item['Sub category'] || item.subCategory);
          const itemSubCategory1 = item.raw && item.raw['Sub category 1'] ? item.raw['Sub category 1'] : (item['Sub category 1'] || item.subCategory1);
          return itemCategory === category && itemSubCategory === subCategory && itemSubCategory1 === subCategory1;
        })
        .map(item => {
          // Try raw object first, then fallback to main fields
          if (item.raw && item.raw['Sub category 2']) {
            return item.raw['Sub category 2'];
          }
          return item['Sub category 2'] || item.subCategory2;
        })
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };
  
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setNewAttachments([...newAttachments, ...files]);
  };
  
  const removeNewAttachment = (index) => {
    const updatedAttachments = newAttachments.filter((_, idx) => idx !== index);
    setNewAttachments(updatedAttachments);
  };

  // ✅ LOADING SCREEN - MATCHING INTENT PO STYLE (WHITE/LIGHT BACKGROUND)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium text-sm">Loading Transfer Details...</p>
        </div>
      </div>
    );
  }

  // ✅ ERROR SCREEN - MATCHING INTENT PO STYLE
  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <X size={32} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Transfer Not Found</h2>
          <p className="text-gray-600 mb-6 text-sm">The material transfer you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate('/dashboard/material/site-transfers')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Back to Transfers
          </button>
        </div>
      </div>
    );
  }

  // Edit Form View (Full Screen)
  if (editing) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-gray-50 to-gray-200 z-50 flex justify-center">
        <div className="w-full max-w-[390px] h-full bg-white shadow-2xl overflow-y-auto relative pb-24">
          {/* Form Content */}
          <div className="bg-white">
            {/* Header with Back Button */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
              <button
                onClick={handleCancelEdit}
                className="p-0 hover:opacity-70 transition-opacity"
                disabled={submitting}
              >
                <ArrowLeft size={20} className="text-gray-800" />
              </button>
              <h2 className="text-base font-medium text-gray-900">Edit Site Transfer</h2>
            </div>

            {/* Form Content */}
            <div className="px-4 py-4">
              {/* Site Transfers Section */}
              <h3 className="text-blue-600 font-semibold text-xs mb-3">Site Transfers</h3>

              {/* Site Transfer ID - Read Only */}
              <div className="mb-3">
                <label className="text-gray-700 text-xs mb-1.5 block">
                  Site Transfer ID
                </label>
                <input
                  type="text"
                  value={transfer.siteTransferId}
                  disabled
                  className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* From Site */}
              <div className="mb-3">
                <label className="text-gray-700 text-xs mb-1.5 block">
                  From Site <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.fromSite}
                  onChange={(e) => setFormData({ ...formData, fromSite: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                  }}
                  disabled={submitting}
                >
                  <option value="">Select Site</option>
                  {sites.map((site, index) => (
                    <option key={index} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfers To */}
              <div className="mb-3">
                <label className="text-gray-700 text-xs mb-1.5 block">
                  Transfers To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.toSite}
                  onChange={(e) => setFormData({ ...formData, toSite: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                  }}
                  disabled={submitting}
                >
                  <option value="">Select Site</option>
                  {sites.map((site, index) => (
                    <option key={index} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requested By */}
              <div className="mb-3">
                <label className="text-gray-700 text-xs mb-1.5 block">
                  Requested By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.requestedBy}
                  onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                  placeholder="Enter name"
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                  disabled={submitting}
                />
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="text-gray-700 text-xs mb-1.5 block">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                  }}
                  disabled={submitting}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="transferred">Transferred</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Material Details Section */}
              <h3 className="text-blue-600 font-semibold text-xs mb-3 mt-6">Material Details</h3>

              {/* Add Materials Button */}
              <button
                onClick={addMaterialRow}
                className="w-full bg-white border-2 border-orange-500 text-orange-500 font-medium text-sm py-3 rounded-md mb-4 hover:bg-orange-50 transition"
                disabled={submitting}
              >
                Add Materials +
              </button>

              {/* Dynamic Material Rows */}
              {formData.materials.map((material, index) => (
                <div key={material.id} className="mb-3">
                  <MaterialLineItem
                    material={material}
                    index={index}
                    isEditing={editingMaterialId === material.id}
                    categories={categories}
                    getSubcategories={getSubcategories}
                    getSubSubcategories={getSubSubcategories}
                    getSubSubSubcategories={getSubSubSubcategories}
                    onUpdate={(field, value) => updateMaterialRow(material.id, field, value)}
                    onRemove={() => removeMaterialRow(material.id)}
                    onEdit={() => setEditingMaterialId(material.id)}
                    onDoneEditing={() => setEditingMaterialId(null)}
                    loading={loading || submitting}
                  />
                </div>
              ))}

              {/* Additional Details Section */}
              <h3 className="text-blue-600 font-semibold text-xs mb-3 mt-4">Additional Details</h3>

              {/* Remarks */}
              <div className="mb-4">
                <label className="text-gray-700 text-xs mb-1.5 block">Remarks</label>
                <textarea
                  placeholder="Enter remarks..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 h-24 resize-none"
                  disabled={submitting}
                />
              </div>

              {/* Existing Attachments */}
              {transfer.attachments && transfer.attachments.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-blue-600 font-semibold text-xs mb-3">Existing Attachments</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {transfer.attachments.map((attachment, index) => {
                      const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                      const fileURL = attachment.startsWith('http') ? attachment : `${baseURL}/${attachment}`;
                      const fileName = attachment.split('/').pop();
                      const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                      
                      return (
                        <div key={index} className="relative border border-gray-300 rounded-md overflow-hidden bg-white">
                          {isImage ? (
                            <img 
                              src={fileURL} 
                              alt={fileName}
                              className="w-full h-24 object-cover"
                            />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center bg-gray-100">
                              <span className="text-2xl">📎</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteAttachment(index)}
                            disabled={deletingAttachment === index}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deletingAttachment === index ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <X size={12} />
                            )}
                          </button>
                          <div className="p-1 bg-white border-t border-gray-200">
                            <p className="text-xs text-gray-600 truncate">{fileName}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Attachments Section */}
              <h3 className="text-blue-600 font-semibold text-xs mb-3">Add New Attachments</h3>
              <label className="block w-full bg-gray-100 text-orange-500 font-medium text-sm py-3 rounded-md mb-4 text-center cursor-pointer hover:bg-gray-200 transition">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={submitting}
                />
                Upload New Images
              </label>

              {/* Preview New Uploaded Images */}
              {newAttachments.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-gray-600 mb-2 font-medium">{newAttachments.length} new file(s) selected</p>
                  <div className="grid grid-cols-2 gap-3">
                    {newAttachments.map((file, idx) => {
                      const previewURL = URL.createObjectURL(file);
                      return (
                        <div key={idx} className="relative border border-gray-300 rounded-md overflow-hidden bg-white">
                          <img 
                            src={previewURL} 
                            alt={file.name}
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-full h-24 hidden items-center justify-center bg-gray-100">
                            <span className="text-2xl">📎</span>
                          </div>
                          <button
                            onClick={() => removeNewAttachment(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            type="button"
                          >
                            <X size={12} />
                          </button>
                          <div className="p-1 bg-white border-t border-gray-200">
                            <p className="text-xs text-gray-600 truncate">{file.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spacer for fixed buttons */}
              <div className="h-4"></div>
            </div>
            
            {/* Fixed Action Buttons at Bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
              <div className="max-w-[390px] mx-auto px-4 py-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Read-Only View - Matching Intent PO Mobile Layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width - EXACTLY like Intent Details */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient - EXACTLY matching Intent PO */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate('/dashboard/material/site-transfers')}
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Transfer Details</h1>
            <p className="text-white/80 text-sm">{transfer.siteTransferId}</p>
          </div>
        </div>

        {/* Main Content - EXACTLY matching Intent PO layout */}
        <div className="px-6 py-6 -mt-4 pb-24">
          {/* Basic Information Card - Matching Intent Details */}
          <div className="bg-white rounded-lg border p-4 space-y-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">ST-ID</label>
                <p className="font-medium text-gray-900">{transfer.siteTransferId}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600">Status</label>
                <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(transfer.status)}`}>
                  {transfer.status?.charAt(0).toUpperCase() + transfer.status?.slice(1)}
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-600">From Site</label>
                <p className="font-medium text-gray-900">{transfer.fromSite}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600">To Site</label>
                <p className="font-medium text-gray-900">{transfer.toSite}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600">Requested By</label>
                <p className="font-medium text-gray-900">{transfer.requestedBy}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600">Request Date</label>
                <p className="font-medium text-gray-900">{formatDate(transfer.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Materials Section - Matching Intent Details */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Materials</h3>
            <div className="space-y-3">
              {transfer.materials?.map((material, index) => (
                <div key={index} className="bg-white rounded-lg border p-3">
                  <div className="space-y-2">
                    {/* Material Info */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Material #{index + 1}</div>
                        <div className="text-sm font-medium text-gray-900">{material.itemName}</div>
                      </div>
                    </div>

                    {/* Quantity and UOM */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Quantity</label>
                        <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium text-gray-700">
                          {material.quantity}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">UOM</label>
                        <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium text-gray-700">
                          {material.uom}
                        </div>
                      </div>
                    </div>

                    {/* Remarks */}
                    {material.remarks && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Remarks</label>
                        <p className="text-sm text-gray-700">{material.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments Section - Matching Intent Details */}
          {transfer.attachments && transfer.attachments.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Attachments ({transfer.attachments.length})
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {transfer.attachments.map((attachment, index) => {
                  const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                  const fileURL = attachment.startsWith('http') ? attachment : `${baseURL}/${attachment}`;
                  const fileName = attachment.split('/').pop();
                  const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                  
                  return (
                    <div key={index} className="relative border border-gray-300 rounded-lg overflow-hidden bg-white">
                      {isImage ? (
                        <img 
                          src={fileURL} 
                          alt={fileName}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="40"%3E🖼️%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-gray-100">
                          <span className="text-4xl">📎</span>
                        </div>
                      )}
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteAttachment(index)}
                        disabled={deletingAttachment === index}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        title="Delete attachment"
                      >
                        {deletingAttachment === index ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                      
                      {/* File Name */}
                      <div className="p-2 bg-white border-t border-gray-200">
                        <p className="text-xs text-gray-600 truncate">{fileName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Buttons - EXACTLY matching Intent Details */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-md mx-auto flex gap-3">
            <button
              onClick={() => navigate('/dashboard/material/site-transfers')}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Back
            </button>
            <button
              onClick={handleEdit}
              className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}