import React, { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import MaterialLineItem from './MaterialLineItem';
import { siteTransferAPI, materialCatalogAPI as materialAPI } from '../../utils/materialAPI';
import axios from '../../utils/axios';

export default function MaterialTransferForm({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Get logged-in user from localStorage - AUTO-FILL
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user?.name || '';
  
  const [formData, setFormData] = useState({
    fromSite: '',
    toSite: '',
    requestedBy: userName, // Auto-filled with logged-in user
    materials: [],
    remarks: '',
    attachments: []
  });

  // Track which material is currently being edited
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  // Material options from backend
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  
  // Sites list for dropdowns
  const [sites, setSites] = useState([]);
  
  // Search state for filtering materials in dropdowns
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Fetch materials and sites from backend - EXACTLY LIKE INTENT FORM
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch sites from backend API - SAME AS INTENT FORM
        try {
          const branchesResponse = await axios.get('/branches');
          const branches = branchesResponse.data || [];
          const sitesList = branches.map(branch => branch.name).sort((a, b) => a.localeCompare(b));
          setSites(sitesList);
          console.log('✅ Fetched', sitesList.length, 'sites from backend');
        } catch (err) {
          console.error('❌ Error fetching sites:', err);
          // Fallback to hardcoded list if API fails
          const fallbackSites = ['Neelkanth Mongolia', 'Panorama', 'test'].sort((a, b) => a.localeCompare(b));
          setSites(fallbackSites);
        }
        
        // Fetch materials from database using getAll() - DUAL FORMAT SUPPORT
        const materials = await materialAPI.getAll();
        console.log('✅ Fetched materials:', materials?.length || 0);
        setAllMaterials(materials || []);
        
        // Extract unique categories - DUAL FORMAT SUPPORT (Category/category)
        const uniqueCategories = [...new Set(materials.map(item => 
          item.Category || item.category
        ).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b));
        setCategories(uniqueCategories);
        console.log('✅ Unique categories:', uniqueCategories.length);
        
      } catch (err) {
        console.error('❌ Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get subcategories based on selected category - DUAL FORMAT SUPPORT
  const getSubcategories = (category) => {
    return [...new Set(
      allMaterials
        .filter(item => (item.Category || item.category) === category)
        .map(item => item['Sub category'] || item.subCategory)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  // Get sub-subcategories - DUAL FORMAT SUPPORT
  const getSubSubcategories = (category, subCategory) => {
    return [...new Set(
      allMaterials
        .filter(item => 
          (item.Category || item.category) === category && 
          (item['Sub category'] || item.subCategory) === subCategory
        )
        .map(item => item['Sub category 1'] || item.subCategory1)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
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

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    // Store actual File objects for upload
    setFormData({ ...formData, attachments: [...formData.attachments, ...files] });
  };

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    // Simple toast implementation - you can replace with a library like react-toastify
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-[9999] ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // Validate form
  const validateForm = () => {
    if (!formData.fromSite.trim()) {
      showToast('Please enter From Site', 'error');
      return false;
    }
    if (!formData.toSite.trim()) {
      showToast('Please select Transfer To site', 'error');
      return false;
    }
    if (!formData.requestedBy.trim()) {
      showToast('Please select Checked By', 'error');
      return false;
    }
    if (formData.materials.length === 0) {
      showToast('Please add at least one material', 'error');
      return false;
    }
    
    // Validate all materials are complete
    const incompleteMaterials = formData.materials.filter(
      m => !m.category || !m.subCategory || !m.subCategory1 || !m.quantity
    );
    if (incompleteMaterials.length > 0) {
      showToast('Please complete all material details', 'error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      // Create FormData for multipart/form-data submission
      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('fromSite', formData.fromSite);
      formDataToSend.append('toSite', formData.toSite);
      formDataToSend.append('requestedBy', formData.requestedBy);
      
      // Add materials as JSON string
      const materialsData = formData.materials.map(m => ({
        itemName: `${m.category} - ${m.subCategory} - ${m.subCategory1}`,
        quantity: parseInt(m.quantity),
        uom: 'Units',
        remarks: formData.remarks
      }));
      formDataToSend.append('materials', JSON.stringify(materialsData));
      
      // Add file attachments
      formData.attachments.forEach((file) => {
        formDataToSend.append('attachments', file);
      });

      const response = await siteTransferAPI.create(formDataToSend);
      
      if (response.success) {
        const siteTransferId = response.data?.siteTransferId;
        showToast(
          `Site Transfer created successfully! ID: ${siteTransferId}`,
          'success'
        );
        
        // Emit custom event for auto-refresh in admin panel (same tab)
        const event = new CustomEvent('siteTransferCreated', {
          detail: response.data
        });
        window.dispatchEvent(event);
        
        // Trigger localStorage event for cross-tab communication
        localStorage.setItem('siteTransferRefresh', Date.now().toString());
        
        // Call success callback
        if (onSuccess) {
          onSuccess(response.data);
        }
        
        // Close form after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.message || 'Failed to create site transfer';
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const removeAttachment = (index) => {
    const updatedAttachments = formData.attachments.filter((_, idx) => idx !== index);
    setFormData({ ...formData, attachments: updatedAttachments });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-50 to-gray-200 z-50 flex justify-center">
      <div className="w-full max-w-[390px] h-full bg-white shadow-2xl overflow-y-auto relative pb-24">
        {/* Form Content */}
        <div className="bg-white">
          {/* Header with Back Button */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-0 hover:opacity-70 transition-opacity"
              disabled={submitting}
            >
              <ArrowLeft size={20} className="text-gray-800" />
            </button>
            <h2 className="text-base font-medium text-gray-900">New Site Transfer</h2>
          </div>

          {/* Form Content Inside Card */}
          <div className="px-4 py-4">
            {/* Site Transfers Section */}
            <h3 className="text-blue-600 font-semibold text-xs mb-3">Site Transfers</h3>

            {/* Site Transfer ID - Auto-generated by backend */}
            <div className="mb-3">
              <label className="text-gray-700 text-xs mb-1.5 block">
                Site Transfer ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ST:"
                  value="Auto-generated"
                  disabled
                  className="flex-1 bg-gray-100 border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
                <input
                  type="text"
                  placeholder="ST:"
                  disabled
                  className="flex-1 bg-gray-100 border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
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

            {/* Transfers To - FILTERED TO EXCLUDE FROM SITE */}
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
                {sites
                  .filter(site => site !== formData.fromSite) // Filter out selected From Site
                  .map((site, index) => (
                    <option key={index} value={site}>
                      {site}
                    </option>
                  ))}
              </select>
            </div>

            {/* Checked By - AUTO-FILLED WITH LOGGED-IN USER (UNEDITABLE) */}
            <div className="mb-4">
              <label className="text-gray-700 text-xs mb-1.5 block">
                Checked By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.requestedBy}
                disabled
                className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 cursor-not-allowed"
                placeholder="Auto-filled from login"
              />
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

            {/* Attachments Section */}
            <h3 className="text-blue-600 font-semibold text-xs mb-3">Attachments</h3>
            <label className="block w-full bg-gray-100 text-orange-500 font-medium text-sm py-3 rounded-md mb-4 text-center cursor-pointer hover:bg-gray-200 transition">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={submitting}
              />
              Upload Images
            </label>

            {/* Image Preview Gallery */}
            {formData.attachments.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-gray-600 mb-2 font-medium">{formData.attachments.length} file(s) selected</p>
                <div className="grid grid-cols-2 gap-3">
                  {formData.attachments.map((file, idx) => {
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
                          onClick={() => removeAttachment(idx)}
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
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
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
                    'Done'
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