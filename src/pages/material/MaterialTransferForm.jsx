import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, Upload, ChevronDown } from 'lucide-react';
import { siteTransferAPI, materialCatalogAPI as materialAPI, upcomingDeliveryAPI } from '../../utils/materialAPI';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';

// SearchableDropdown Component - Same as Intent PO
function SearchableDropdown({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    // ✅ Allow manual input - update value as user types
    onChange(newValue);
  };

  const handleKeyDown = (e) => {
    // ✅ Allow Enter key to confirm manual input
    if (e.key === 'Enter' && searchTerm.trim()) {
      onChange(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const displayValue = isOpen ? searchTerm : (value || '');

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={index}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 transition-colors ${
                    option === value ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-900'
                  }`}
                >
                  {option}
                </li>
              ))}
            </ul>
          ) : searchTerm.trim() ? (
            <div className="py-1">
              <div className="px-3 py-2 text-xs text-gray-500 text-center border-b border-gray-200">
                No matching options found
              </div>
              <div
                onClick={() => handleSelect(searchTerm.trim())}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 transition-colors text-green-700 font-medium"
              >
                ✓ Use "{searchTerm.trim()}" (custom value)
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              Type to search or enter custom value
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MaterialTransferForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Get logged-in user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user?.name || '';
  const userAssignedBranches = user?.assignedBranches || [];
  
  // Debug: Log user's assigned branches
  console.log('👤 MaterialTransferForm - User:', userName);
  console.log('🏢 MaterialTransferForm - Assigned Branches:', userAssignedBranches);
  
  const [formData, setFormData] = useState({
    fromSite: '',
    toSite: '',
    requestedBy: userName, // ✅ Auto-filled
    materials: [],
    remarks: ''
  });

  const [attachments, setAttachments] = useState([]);
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  // Material options from backend
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]); // ✅ Fallback: All materials from catalog
  const [grnMaterials, setGrnMaterials] = useState([]); // ✅ Materials from GRN of selected From Site
  
  // Sites list for dropdowns
  const [fromSites, setFromSites] = useState([]); // ✅ Restricted to assigned branches
  const [toSites, setToSites] = useState([]); // ✅ All sites (no restriction)
  
  // Search state for filtering materials in dropdowns
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // ✅ FETCH GRN MATERIALS WHEN FROM SITE CHANGES
  useEffect(() => {
    const fetchGRNMaterials = async () => {
      if (!formData.fromSite) {
        setGrnMaterials([]);
        setCategories([]);
        return;
      }

      try {
        console.log('🔍 Fetching GRN materials for site:', formData.fromSite);
        
        // Fetch all GRN records (transferred deliveries)
        const response = await upcomingDeliveryAPI.getAll(1, 1000, '');
        
        if (response.success) {
          const allDeliveries = response.data || [];
          
          // Filter GRN records for the selected "From Site" (status = transferred, to = fromSite)
          const grnRecords = allDeliveries.filter(delivery => 
            delivery.status?.toLowerCase() === 'transferred' && 
            delivery.to === formData.fromSite
          );
          
          console.log('✅ Found', grnRecords.length, 'GRN records for', formData.fromSite);
          
          // Extract unique materials from GRN records
          const materialsMap = new Map();
          
          grnRecords.forEach(grn => {
            grn.items?.forEach(item => {
              const key = `${item.category}|${item.subCategory || ''}|${item.subCategory1 || ''}|${item.subCategory2 || ''}`;
              
              if (!materialsMap.has(key)) {
                materialsMap.set(key, {
                  category: item.category,
                  subCategory: item.subCategory || '',
                  subCategory1: item.subCategory1 || '',
                  subCategory2: item.subCategory2 || '',
                  materialName: item.materialName,
                  unit: item.unit || 'units',
                  availableQuantity: 0
                });
              }
              
              // Sum up available quantity
              const material = materialsMap.get(key);
              material.availableQuantity += item.quantity || 0;
            });
          });
          
          const materials = Array.from(materialsMap.values());
          setGrnMaterials(materials);
          
          // Extract unique categories
          const uniqueCategories = [...new Set(materials.map(m => m.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
          setCategories(uniqueCategories);
          
          console.log('✅ Extracted', materials.length, 'unique materials from GRN');
          console.log('✅ Categories:', uniqueCategories);
        }
      } catch (err) {
        console.error('❌ Error fetching GRN materials:', err);
        setGrnMaterials([]);
        setCategories([]);
      }
    };

    fetchGRNMaterials();
  }, [formData.fromSite]);

  // ✅ FETCH SITES FROM BACKEND
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // ✅ FETCH SITES FROM BACKEND API AND APPLY RESTRICTIONS
        try {
          const branchesResponse = await axios.get('/branches');
          const branches = branchesResponse.data || [];
          
          // ✅ CRITICAL: Filter "From Site" based on user's assigned branches
          let filteredFromBranches = branches;
          if (userAssignedBranches && userAssignedBranches.length > 0) {
            const assignedBranchIds = userAssignedBranches.map(b => b._id || b);
            console.log('🔍 Assigned Branch IDs:', assignedBranchIds);
            console.log('🔍 All Branches:', branches.map(b => ({ id: b._id, name: b.name })));
            
            filteredFromBranches = branches.filter(branch => 
              assignedBranchIds.includes(branch._id)
            );
            console.log('✅ Filtered From Sites to assigned:', filteredFromBranches.length, 'of', branches.length);
            console.log('✅ Filtered From Site names:', filteredFromBranches.map(b => b.name));
          } else {
            console.log('⚠️ No assigned branches found for From Site, showing all');
          }
          
          // ✅ From Site: Only assigned branches
          const fromSitesList = filteredFromBranches.map(branch => branch.name).sort((a, b) => a.localeCompare(b));
          setFromSites(fromSitesList);
          
          // ✅ To Site: All sites (no restriction)
          const toSitesList = branches.map(branch => branch.name).sort((a, b) => a.localeCompare(b));
          setToSites(toSitesList);
          
          console.log('✅ From Site options:', fromSitesList);
          console.log('✅ To Site options (all):', toSitesList.length, 'sites');
        } catch (err) {
          console.error('❌ MaterialTransferForm: Error fetching sites:', err);
          // If user has assigned branches, use only those for From Site
          if (userAssignedBranches && userAssignedBranches.length > 0) {
            const assignedSites = userAssignedBranches.map(b => b.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
            setFromSites(assignedSites);
            console.log('⚠️ Using assigned sites from user object for From Site:', assignedSites);
          } else {
            const fallbackSites = ['Neelkanth Mongolia', 'Panorama', 'test'].sort((a, b) => a.localeCompare(b));
            setFromSites(fallbackSites);
            setToSites(fallbackSites);
          }
        }
        
        // ✅ FETCH MATERIAL CATALOG FOR FALLBACK SUBCATEGORIES
        try {
          const materials = await materialAPI.getMaterials();
          console.log('✅ MaterialTransferForm: Fetched', materials?.length || 0, 'materials from catalog (fallback)');
          setAllMaterials(materials || []);
        } catch (err) {
          console.error('❌ MaterialTransferForm: Error fetching material catalog:', err);
          setAllMaterials([]);
        }
        
      } catch (err) {
        console.error('❌ MaterialTransferForm: Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ HYBRID: GET SUBCATEGORIES FROM GRN, FALLBACK TO CATALOG
  const getSubcategories = (category) => {
    // Try GRN first
    const grnSubcategories = [...new Set(
      grnMaterials
        .filter(item => item.category === category)
        .map(item => item.subCategory)
        .filter(Boolean)
    )];
    
    // If GRN has data, use it
    if (grnSubcategories.length > 0) {
      console.log('✅ Using GRN subcategories for', category, ':', grnSubcategories.length);
      return grnSubcategories.sort((a, b) => a.localeCompare(b));
    }
    
    // Fallback to catalog
    const catalogSubcategories = [...new Set(
      allMaterials
        .filter(item => item.category === category)
        .map(item => item.subCategory)
        .filter(Boolean)
    )];
    
    console.log('⚠️ Fallback to catalog subcategories for', category, ':', catalogSubcategories.length);
    return catalogSubcategories.sort((a, b) => a.localeCompare(b));
  };

  // ✅ HYBRID: GET SUB-SUBCATEGORIES FROM GRN, FALLBACK TO CATALOG
  const getSubSubcategories = (category, subCategory) => {
    // Try GRN first
    const grnSubSubcategories = [...new Set(
      grnMaterials
        .filter(item => item.category === category && item.subCategory === subCategory)
        .map(item => item.subCategory1)
        .filter(Boolean)
    )];
    
    if (grnSubSubcategories.length > 0) {
      console.log('✅ Using GRN sub-subcategories');
      return grnSubSubcategories.sort((a, b) => a.localeCompare(b));
    }
    
    // Fallback to catalog
    const catalogSubSubcategories = [...new Set(
      allMaterials
        .filter(item => item.category === category && item.subCategory === subCategory)
        .map(item => item.subCategory1)
        .filter(Boolean)
    )];
    
    console.log('⚠️ Fallback to catalog sub-subcategories');
    return catalogSubSubcategories.sort((a, b) => a.localeCompare(b));
  };

  // ✅ HYBRID: GET SUB-SUB-SUBCATEGORIES FROM GRN, FALLBACK TO CATALOG
  const getSubSubSubcategories = (category, subCategory, subCategory1) => {
    // Try GRN first
    const grnSubSubSubcategories = [...new Set(
      grnMaterials
        .filter(item => 
          item.category === category && 
          item.subCategory === subCategory && 
          item.subCategory1 === subCategory1
        )
        .map(item => item.subCategory2)
        .filter(Boolean)
    )];
    
    if (grnSubSubSubcategories.length > 0) {
      console.log('✅ Using GRN sub-sub-subcategories');
      return grnSubSubSubcategories.sort((a, b) => a.localeCompare(b));
    }
    
    // Fallback to catalog
    const catalogSubSubSubcategories = [...new Set(
      allMaterials
        .filter(item => 
          item.category === category && 
          item.subCategory === subCategory && 
          item.subCategory1 === subCategory1
        )
        .map(item => item.subCategory2)
        .filter(Boolean)
    )];
    
    console.log('⚠️ Fallback to catalog sub-sub-subcategories');
    return catalogSubSubSubcategories.sort((a, b) => a.localeCompare(b));
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
          quantity: '',
          remarks: ''
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

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    // ✅ Cloudinary: Store actual File objects for upload
    setAttachments([...attachments, ...files]);
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
    
    // Validate all materials have required fields (subCategory1 and subCategory2 are optional)
    const incompleteMaterials = formData.materials.filter(
      m => !m.category || !m.subCategory || !m.quantity
    );
    if (incompleteMaterials.length > 0) {
      showToast('Please complete required material fields (Category, Sub Category, Quantity)', 'error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        itemName: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}${m.subCategory2 ? ' - ' + m.subCategory2 : ''}`,
        category: m.category || '',
        subCategory: m.subCategory || '',
        subCategory1: m.subCategory1 || '',
        subCategory2: m.subCategory2 || '',
        quantity: parseInt(m.quantity),
        remarks: formData.remarks
      }));
      formDataToSend.append('materials', JSON.stringify(materialsData));
      
      // Debug logging
      console.log('✅ Creating Site Transfer with data:', {
        fromSite: formData.fromSite,
        toSite: formData.toSite,
        requestedBy: formData.requestedBy,
        materials: materialsData,
        attachmentsCount: attachments.length
      });
      
      // ✅ Cloudinary: Add file attachments
      attachments.forEach((file) => {
        formDataToSend.append('attachments', file);
      });

      const response = await siteTransferAPI.create(formDataToSend);
      
      if (response.success) {
        const siteTransferId = response.data?.siteTransferId;
        showToast(
          `Site Transfer created successfully! ID: ${siteTransferId}`,
          'success'
        );
        
        // Emit custom event for auto-refresh
        window.dispatchEvent(new CustomEvent('siteTransferCreated', {
          detail: response.data
        }));
        window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
        
        // Trigger localStorage event for cross-tab communication
        localStorage.setItem('siteTransferRefresh', Date.now().toString());
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        
        console.log('✅ Site Transfer created - syncing to Upcoming Deliveries');
        
        // Navigate back after short delay
        setTimeout(() => {
          navigate('/material/transfer');
        }, 1500);
      }
    } catch (err) {
      console.error('Submit error:', err);
      console.error('Error response:', err.response);
      
      // Extract detailed error message
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to create site transfer';
      
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Orange Gradient - Same as Intent PO */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate('/material/transfer')}
            disabled={submitting}
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Create Site Transfer</h1>
            <p className="text-white/80 text-sm">Fill in the details below</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Transfer Information Section */}
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-orange-600 font-bold text-sm mb-4">Transfer Information</h3>

              <div className="mb-4">
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  From Site <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.fromSite}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromSite: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 appearance-none font-medium"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23f97316' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 1rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em'
                  }}
                  required
                  disabled={submitting}
                >
                  <option value="">Select from site (assigned only)</option>
                  {fromSites.map(site => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Transfers To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.toSite}
                  onChange={(e) => setFormData(prev => ({ ...prev, toSite: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 appearance-none font-medium"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23f97316' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 1rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em'
                  }}
                  required
                  disabled={submitting}
                >
                  <option value="">Select destination site (all sites)</option>
                  {toSites
                    .filter(site => site !== formData.fromSite)
                    .map(site => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Requested By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none cursor-not-allowed font-medium"
                  placeholder="Enter your name"
                  required
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Remarks (Optional)
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                  placeholder="Add any additional notes..."
                  rows={3}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Materials Section */}
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-orange-600 font-bold text-sm mb-4">Materials</h3>
              
              {/* Warning if From Site not selected */}
              {!formData.fromSite && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800 font-medium">
                    ⚠️ Please select "From Site" first to load available materials from GRN
                  </p>
                </div>
              )}
              
              {/* Show message if From Site selected but no materials in GRN */}
              {formData.fromSite && grnMaterials.length === 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">
                    ℹ️ No materials found in {formData.fromSite} GRN. Please ensure materials have been delivered to this site first.
                  </p>
                </div>
              )}
              
              <button
                type="button"
                onClick={addMaterialRow}
                className={`w-full mb-4 py-3 rounded-xl font-semibold text-sm transition-all shadow-md ${
                  !formData.fromSite || grnMaterials.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:shadow-lg transform hover:scale-[1.02]'
                }`}
                disabled={submitting || !formData.fromSite || grnMaterials.length === 0}
                title={!formData.fromSite ? 'Please select From Site first' : grnMaterials.length === 0 ? 'No materials available in GRN' : 'Add material'}
              >
                + Add Material
              </button>

              {formData.materials.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No materials added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.materials.map((material, index) => {
                    const isComplete = material.category && material.subCategory && material.quantity;
                    const isEditing = editingMaterialId === material.id;

                    // Collapsed view when complete and not editing
                    if (!isEditing && isComplete) {
                      return (
                        <div key={material.id} className="bg-white border border-gray-300 rounded-md p-3 relative">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-gray-700 font-medium mb-2">Material #{index + 1}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-500">Category:</span>
                                  <p className="text-gray-900 font-medium truncate">{material.category}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Sub Category:</span>
                                  <p className="text-gray-900 font-medium truncate">{material.subCategory}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Sub Category 1:</span>
                                  <p className="text-gray-900 font-medium truncate">{material.subCategory1}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Sub Category 2:</span>
                                  <p className="text-gray-900 font-medium truncate">{material.subCategory2}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Quantity:</span>
                                  <p className="text-gray-900 font-medium">{material.quantity}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingMaterialId(material.id)}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                disabled={submitting}
                              >
                                <X size={16} className="text-gray-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMaterialRow(material.id)}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                disabled={submitting}
                              >
                                <X size={16} className="text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Expanded edit view
                    return (
                      <div key={material.id} className="bg-gray-50 border border-gray-300 rounded-md p-4 relative">
                        <button
                          type="button"
                          onClick={() => removeMaterialRow(material.id)}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 z-10"
                          disabled={submitting}
                        >
                          <X size={16} />
                        </button>

                        <p className="text-xs text-gray-700 font-medium mb-3">Material #{index + 1}</p>

                        {/* Row 1: Category and Sub Category */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <SearchableDropdown
                              value={material.category}
                              onChange={(value) => updateMaterialRow(material.id, 'category', value)}
                              options={categories}
                              placeholder="Select or type"
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Sub Category <span className="text-red-500">*</span>
                            </label>
                            <SearchableDropdown
                              value={material.subCategory}
                              onChange={(value) => updateMaterialRow(material.id, 'subCategory', value)}
                              options={material.category ? getSubcategories(material.category) : []}
                              placeholder="Select or type"
                              disabled={!material.category || submitting}
                            />
                          </div>
                        </div>

                        {/* Row 2: Sub Category 1 and Sub Category 2 */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Sub Category 1
                            </label>
                            <SearchableDropdown
                              value={material.subCategory1}
                              onChange={(value) => updateMaterialRow(material.id, 'subCategory1', value)}
                              options={material.subCategory ? getSubSubcategories(material.category, material.subCategory) : []}
                              placeholder="Select or type"
                              disabled={!material.subCategory || submitting}
                            />
                          </div>

                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Sub Category 2
                            </label>
                            <SearchableDropdown
                              value={material.subCategory2}
                              onChange={(value) => updateMaterialRow(material.id, 'subCategory2', value)}
                              options={material.subCategory1 ? getSubSubSubcategories(material.category, material.subCategory, material.subCategory1) : []}
                              placeholder="Select or type"
                              disabled={!material.subCategory1 || submitting}
                            />
                          </div>
                        </div>

                        {/* Row 3: Quantity and Remarks */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterialRow(material.id, 'quantity', e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                              placeholder="Enter qty"
                              min="1"
                              required
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Remarks
                            </label>
                            <input
                              type="text"
                              value={material.remarks}
                              onChange={(e) => updateMaterialRow(material.id, 'remarks', e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                              placeholder="Optional notes"
                              disabled={submitting}
                            />
                          </div>
                        </div>

                        {/* Done editing button */}
                        {isComplete && (
                          <button
                            type="button"
                            onClick={() => setEditingMaterialId(null)}
                            className="mt-3 w-full text-xs text-orange-500 font-medium hover:text-orange-600 transition-colors"
                          >
                            ✓ Done editing
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-orange-600 font-bold text-sm mb-4">Attachments (Optional)</h3>
              
              <div className="mb-4">
                <label className="flex items-center justify-center w-full px-6 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-2">
                      <Upload size={20} className="text-orange-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Click to upload images</span>
                    <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={submitting}
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {attachments.map((file, index) => {
                    const preview = URL.createObjectURL(file);
                    return (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedAttachments = attachments.filter((_, i) => i !== index);
                            setAttachments(updatedAttachments);
                          }}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-all transform hover:scale-110"
                          disabled={submitting}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => navigate('/material/transfer')}
                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Transfer'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}