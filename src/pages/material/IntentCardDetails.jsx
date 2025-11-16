import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X, Trash2, Upload } from 'lucide-react';
import { purchaseOrderAPI, materialCatalogAPI as materialAPI } from '../../utils/materialAPI';
import MaterialLineItem from './MaterialLineItem';

export default function IntentCardDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [purchaseOrder, setPurchaseOrder] = useState(null);
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
    fetchPODetails();
    fetchMaterialsAndSites();
  }, [id]);

  const fetchMaterialsAndSites = async () => {
    try {
      // Hardcoded sites list (sorted alphabetically)
      const sitesList = [
        'Site A',
        'Site B',
        'Site C',
        'Site D',
        'Site E'
      ].sort((a, b) => a.localeCompare(b));
      setSites(sitesList);
      
      // Fetch materials
      const materials = await materialAPI.getAll();
      setAllMaterials(materials || []);
      
      // Extract unique categories and sort alphabetically
      const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setCategories(uniqueCategories);
    } catch (err) {
      // Error fetching materials and sites
    }
  };

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderAPI.getById(id);
      if (response.success) {
        setPurchaseOrder(response.data);
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
          deliverySite: response.data.deliverySite,
          requestedBy: response.data.requestedBy,
          status: response.data.status,
          remarks: response.data.remarks || '',
          materials: editableMaterials
        });
      }
    } catch (err) {
      // Error fetching PO details
      showToast('Failed to load purchase order details', 'error');
      navigate('/indent');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setNewAttachments([]);
    // Reset form data to original
    fetchPODetails();
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      return;
    }

    try {
      await purchaseOrderAPI.delete(id);
      showToast('Purchase order deleted successfully', 'success');
      
      // Trigger refresh events for Intent and Upcoming Deliveries
      window.dispatchEvent(new Event('intentCreated'));
      window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
      localStorage.setItem('intentRefresh', Date.now().toString());
      localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
      
      navigate('/indent');
    } catch (err) {
      // Error deleting purchase order
      showToast('Failed to delete purchase order', 'error');
    }
  };

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-[9999] transition-opacity ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const handleSaveChanges = async () => {
    try {
      setSubmitting(true);

      // Validate materials
      if (!formData.materials || formData.materials.length === 0) {
        showToast('Please add at least one material', 'error');
        return;
      }

      // Build materials data
      const materialsData = formData.materials.map(m => ({
        itemName: m.itemName || `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}`,
        category: m.category,
        subCategory: m.subCategory,
        subCategory1: m.subCategory1,
        quantity: m.quantity,
        uom: m.uom || 'Nos',
        remarks: m.remarks || ''
      }));

      let updateData;
      
      // If there are new attachments, use FormData
      if (newAttachments.length > 0) {
        updateData = new FormData();
        updateData.append('deliverySite', formData.deliverySite);
        updateData.append('requestedBy', formData.requestedBy);
        updateData.append('status', formData.status);
        updateData.append('remarks', formData.remarks || '');
        updateData.append('materials', JSON.stringify(materialsData));
        
        newAttachments.forEach((file) => {
          updateData.append('attachments', file);
        });
      } else {
        updateData = {
          deliverySite: formData.deliverySite,
          requestedBy: formData.requestedBy,
          status: formData.status,
          remarks: formData.remarks || '',
          materials: materialsData
        };
      }

      const response = await purchaseOrderAPI.update(id, updateData);
      
      if (response.success) {
        showToast('Purchase order updated successfully', 'success');
        setEditing(false);
        setNewAttachments([]);
        
        // Trigger refresh events for Intent and Upcoming Deliveries
        window.dispatchEvent(new Event('intentCreated'));
        window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        
        fetchPODetails();
      }
    } catch (err) {
      console.error('Error updating purchase order:', err);
      showToast(err.response?.data?.message || 'Failed to update purchase order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentIndex) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      setDeletingAttachment(attachmentIndex);
      const response = await purchaseOrderAPI.deleteAttachment(id, attachmentIndex);
      if (response.success) {
        showToast('Attachment deleted successfully', 'success');
        fetchPODetails();
      }
    } catch (err) {
      console.error('Error deleting attachment:', err);
      showToast('Failed to delete attachment', 'error');
    } finally {
      setDeletingAttachment(null);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewAttachments(prev => [...prev, ...files]);
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Material management functions
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
          quantity: '',
          uom: 'Nos',
          remarks: ''
        }
      ]
    }));
    setEditingMaterialId(newMaterialId);
  };

  const removeMaterialRow = (materialId) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== materialId)
    }));
    if (editingMaterialId === materialId) {
      setEditingMaterialId(null);
    }
  };

  const updateMaterial = (materialId, updates) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map(m =>
        m.id === materialId ? { ...m, ...updates } : m
      )
    }));
  };

  const getSubcategories = (category) => {
    return [...new Set(
      allMaterials
        .filter(item => item.category === category)
        .map(item => item.subCategory)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  const getSubSubcategories = (category, subCategory) => {
    return [...new Set(
      allMaterials
        .filter(item => item.category === category && item.subCategory === subCategory)
        .map(item => item.subCategory1)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="p-4">
        <p className="text-red-600">Purchase order not found</p>
        <button onClick={() => navigate('/indent')} className="mt-4 text-orange-600">
          Go Back
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-600';
      case 'approved':
        return 'bg-orange-100 text-orange-600';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/indent')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Intent Details</h1>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Basic Info Card */}
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">PO-ID</label>
              <p className="font-medium">{purchaseOrder.purchaseOrderId}</p>
            </div>
            
            <div>
              <label className="text-xs text-gray-600">Status</label>
              <p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(purchaseOrder.status)}`}>
                  {purchaseOrder.status}
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-600">Delivery Site</label>
              {editing ? (
                <select
                  value={formData.deliverySite}
                  onChange={(e) => setFormData({ ...formData, deliverySite: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select Site</option>
                  {sites.map(site => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{purchaseOrder.deliverySite}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-600">Requested By</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.requestedBy}
                  onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              ) : (
                <p className="font-medium">{purchaseOrder.requestedBy}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-600">Request Date</label>
              <p className="font-medium">
                {new Date(purchaseOrder.requestDate).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-xs text-gray-600">Remarks</label>
            {editing ? (
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows="2"
                placeholder="Add remarks..."
              />
            ) : (
              <p className="text-sm text-gray-700">{purchaseOrder.remarks || '-'}</p>
            )}
          </div>
        </div>

        {/* Materials Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Materials</h2>
            {editing && (
              <button
                onClick={addMaterialRow}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                + Add Material
              </button>
            )}
          </div>

          <div className="space-y-2">
            {formData.materials && formData.materials.length > 0 ? (
              formData.materials.map((material, idx) => (
                <MaterialLineItem
                  key={material.id}
                  material={material}
                  index={idx}
                  isEditing={editing && editingMaterialId === material.id}
                  onEdit={() => setEditingMaterialId(material.id)}
                  onDoneEditing={() => setEditingMaterialId(null)}
                  onRemove={() => removeMaterialRow(material.id)}
                  onUpdate={(fieldName, value) => {
                    // Handle cascading resets for dependent fields
                    if (fieldName === 'category') {
                      updateMaterial(material.id, { category: value, subCategory: '', subCategory1: '' });
                    } else if (fieldName === 'subCategory') {
                      updateMaterial(material.id, { subCategory: value, subCategory1: '' });
                    } else {
                      updateMaterial(material.id, { [fieldName]: value });
                    }
                  }}
                  categories={categories}
                  getSubcategories={getSubcategories}
                  getSubSubcategories={getSubSubcategories}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No materials added</p>
            )}
          </div>
        </div>

        {/* Attachments Card */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Attachments</h2>
          
          {/* Existing Attachments */}
          {purchaseOrder.attachments && purchaseOrder.attachments.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {purchaseOrder.attachments.map((attachment, index) => (
                <div key={index} className="relative group">
                  <img
                    src={`http://localhost:5002${attachment}`}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                  {editing && (
                    <button
                      onClick={() => handleDeleteAttachment(index)}
                      disabled={deletingAttachment === index}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">No attachments</p>
          )}

          {/* New Attachments (during edit) */}
          {editing && newAttachments.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-2">New Attachments:</p>
              <div className="space-y-1">
                {newAttachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                    <span className="truncate">{file.name}</span>
                    <button
                      onClick={() => removeNewAttachment(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          {editing && (
            <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload size={18} />
              <span className="text-sm">Upload Images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Fixed Action Buttons at Bottom - Mobile Snapshot Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-[390px] mx-auto px-4 py-3">
          {editing ? (
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
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/indent')}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors shadow-md"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}