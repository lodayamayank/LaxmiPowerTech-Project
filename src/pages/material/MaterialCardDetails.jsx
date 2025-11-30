import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Upload } from 'lucide-react';
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
      console.error('Error fetching materials and sites:', err);
      // Continue with empty arrays - non-blocking error
      setSites([]);
      setAllMaterials([]);
      setCategories([]);
    }
  };

  const fetchTransferDetails = async () => {
    try {
      setLoading(true);
      const response = await siteTransferAPI.getById(id);
      if (response.success && response.data) {
        setTransfer(response.data);
        // Convert materials to editable format
        const editableMaterials = (response.data.materials || []).map((m, idx) => {
          // Parse itemName to extract category, subCategory, subCategory1, subCategory2
          const parts = m.itemName?.split(' - ') || [];
          return {
            id: Date.now() + idx,
            category: parts[0] || '',
            subCategory: parts[1] || '',
            subCategory1: parts[2] || '',
            subCategory2: parts[3] || '',
            quantity: m.quantity || '',
            itemName: m.itemName,
            uom: m.uom,
            remarks: m.remarks
          };
        });
        
        setFormData({
          fromSite: response.data.fromSite || '',
          toSite: response.data.toSite || '',
          requestedBy: response.data.requestedBy || '',
          status: response.data.status || 'pending',
          materials: editableMaterials,
          remarks: response.data.materials?.[0]?.remarks || ''
        });
      } else {
        console.error('Invalid response from API:', response);
        alert('Failed to load transfer details');
      }
    } catch (err) {
      console.error('Error fetching site transfer details:', err);
      alert('Failed to load transfer details. Please try again.');
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
    // Reset form data - with null safety
    if (!transfer || !transfer.materials) {
      console.warn('Cannot reset form data: transfer is null');
      return;
    }
    const editableMaterials = transfer.materials.map((m, idx) => {
      const parts = m.itemName?.split(' - ') || [];
      return {
        id: Date.now() + idx,
        category: parts[0] || '',
        subCategory: parts[1] || '',
        subCategory1: parts[2] || '',
        subCategory2: parts[3] || '',
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
    // Requested By validation removed - field is read-only
    if (formData.materials.length === 0) {
      alert('Please add at least one material');
      return;
    }
    
    // Validate all materials are complete
    const incompleteMaterials = formData.materials.filter(
      m => !m.category || !m.subCategory || !m.subCategory1 || !m.subCategory2 || !m.quantity
    );
    if (incompleteMaterials.length > 0) {
      alert('Please complete all material details');
      return;
    }

    try {
      setSubmitting(true);
      
      // Convert materials to API format
      const materialsData = formData.materials.map(m => ({
        itemName: `${m.category} - ${m.subCategory} - ${m.subCategory1} - ${m.subCategory2}`,
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
      console.error('Error updating site transfer:', err);
      alert('Failed to update site transfer. Please try again.');
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
      console.error('Error deleting site transfer:', err);
      alert('Failed to delete site transfer. Please try again.');
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
      console.error('Error deleting attachment:', err);
      alert('Failed to delete attachment. Please try again.');
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
          subCategory2: '',
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
            updated.subCategory2 = '';
          } else if (field === 'subCategory') {
            updated.subCategory1 = '';
            updated.subCategory2 = '';
          } else if (field === 'subCategory1') {
            updated.subCategory2 = '';
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
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Edit Mode View
  if (editing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto bg-white shadow-xl">
        {/* Header - Matching Intent PO */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Transfer Details</h1>
            <p className="text-white/80 text-sm">{transfer.siteTransferId}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4 pb-24">
          <div className="space-y-4">

          {/* Basic Information Section - Matching Intent PO Layout */}
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Basic Information</h2>

            <div className="grid grid-cols-2 gap-3">
              {/* ST-ID - Read Only */}
              <div>
                <label className="text-xs text-gray-600">ST-ID</label>
                <p className="font-medium text-gray-900">{transfer.siteTransferId}</p>
              </div>

              {/* Status - Read Only */}
              <div>
                <label className="text-xs text-gray-600">Status</label>
                <p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(transfer.status)}`}>
                    {transfer.status?.charAt(0).toUpperCase() + transfer.status?.slice(1)}
                  </span>
                </p>
              </div>

              {/* Delivery Site (From Site) */}
              <div>
                <label className="text-xs text-gray-600">Delivery Site</label>
                <select
                  value={formData.fromSite}
                  onChange={(e) => setFormData({ ...formData, fromSite: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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

              {/* Requested By - READ ONLY */}
              <div>
                <label className="text-xs text-gray-600">Requested By</label>
                <input
                  type="text"
                  value={formData.requestedBy}
                  disabled
                  className="w-full px-3 py-2 bg-gray-800 text-white border-0 rounded-lg text-sm cursor-not-allowed opacity-75"
                />
              </div>

              {/* Request Date - Read Only - Full Width */}
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Request Date</label>
                <p className="font-medium text-gray-900">{formatDate(transfer.createdAt)}</p>
              </div>
            </div>

            {/* Remarks - Full Width */}
            <div>
              <label className="text-xs text-gray-600">Remarks</label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Add remarks..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 text-white border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                disabled={submitting}
              />
            </div>
          </div>

            {/* Materials Section */}
            <div className="bg-white rounded-lg border p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Materials</h3>
                <button
                  onClick={addMaterialRow}
                  className="text-orange-600 text-sm font-medium hover:text-orange-700 flex items-center gap-1"
                  disabled={submitting}
                >
                  <Plus size={16} />
                  Add Material
                </button>
              </div>
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
            </div>

            {/* Attachments Section */}
            <div className="bg-white rounded-lg border p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Attachments</h3>
              
              {/* Existing Attachments */}
              {transfer.attachments && transfer.attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {transfer.attachments.map((attachment, index) => {
                    // Handle both old string format and new Cloudinary object format
                    const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                    const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                    const fileURL = attachmentUrl.startsWith('http') ? attachmentUrl : `${baseURL}/${attachmentUrl}`;
                    const fileName = attachmentUrl.split('/').pop();
                    const isImage = attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                    
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
                        
                        <div className="p-2 bg-white border-t border-gray-200">
                          <p className="text-xs text-gray-600 truncate">{fileName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New Attachments Upload */}
              <div>
                <label className="block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={submitting}
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 transition-colors">
                    <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload files</p>
                  </div>
                </label>

                {newAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <button
                          onClick={() => removeNewAttachment(index)}
                          className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                          disabled={submitting}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
          
          {/* Fixed Bottom Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
            <div className="max-w-md mx-auto flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
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
    );
  }

  // Read-Only View - Matching Intent PO Mobile Layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width - EXACTLY like Intent Details */}
      <div className="max-w-md mx-auto bg-white shadow-xl">
        {/* Header with Gradient - EXACTLY matching Intent PO */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
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

          {/* Materials Section - Detailed Display Matching Snapshot */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Materials</h3>
            <div className="space-y-3">
              {transfer.materials?.map((material, index) => {
                // Parse itemName to extract subcategories
                const parts = material.itemName?.split(' - ') || [];
                const category = parts[0] || '';
                const subCategory = parts[1] || '';
                const subCategory1 = parts[2] || '';
                const subCategory2 = parts[3] || '';
                
                return (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Material #{index + 1}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Row 1: Category and Sub Category */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Category</label>
                          <p className="text-sm font-medium text-gray-900">{category || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Sub Category</label>
                          <p className="text-sm font-medium text-gray-900">{subCategory || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Row 2: Sub Category 1 and Sub Category 2 */}
                      {(subCategory1 || subCategory2) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Sub Category 1</label>
                            <p className="text-sm font-medium text-gray-900">{subCategory1 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Sub Category 2</label>
                            <p className="text-sm font-medium text-gray-900">{subCategory2 || '-'}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Row 3: Quantity and Remarks */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Quantity</label>
                          <p className="text-sm font-medium text-gray-900">{material.quantity || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Remarks</label>
                          <p className="text-sm text-gray-700">{material.remarks || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  // Handle both old string format and new Cloudinary object format
                  const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                  const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                  const fileURL = attachmentUrl.startsWith('http') ? attachmentUrl : `${baseURL}/${attachmentUrl}`;
                  const fileName = attachmentUrl.split('/').pop();
                  const isImage = attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                  
                  return (
                    <div 
                      key={index} 
                      className="relative border border-gray-300 rounded-lg overflow-hidden bg-white cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => window.open(fileURL, '_blank')}
                    >
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

        {/* Fixed Bottom Buttons - Only Edit and Delete (No Back Button) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-md mx-auto flex gap-3">
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