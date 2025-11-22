import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, Upload, ChevronDown } from 'lucide-react';
import { purchaseOrderAPI, materialCatalogAPI as materialAPI } from '../../utils/materialAPI';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import axios from '../../utils/axios';

// Searchable Dropdown Component
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
    setSearchTerm(e.target.value);
    setIsOpen(true);
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
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntentForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Get logged-in user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user?.name || '';
  const userId = user?._id || user?.id || '';
  
  const [formData, setFormData] = useState({
    requestedBy: userId, // Use user ID for backend filtering
    requestedByName: userName, // Keep name for display
    deliverySite: '',
    materials: [],
    remarks: '',
    attachments: []
  });

  // Material options from backend
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  
  // Sites list for dropdowns
  const [sites, setSites] = useState([]);
  
  // Image preview
  const [imagePreviews, setImagePreviews] = useState([]);
  
  // Track which material is currently being edited
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  // Fetch materials and sites from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch sites from backend
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
        
        // Fetch materials from database using getAll() - ORIGINAL WORKING METHOD
        const materials = await materialAPI.getAll();
        console.log('✅ Fetched materials:', materials?.length || 0);
        setAllMaterials(materials || []);
        
        // Extract unique categories - backend now returns formatted data
        const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
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

  // Get subcategories based on selected category
  const getSubcategories = (category) => {
    return [...new Set(
      allMaterials
        .filter(item => item.category === category)
        .map(item => item.subCategory)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  // Get sub-subcategories
  const getSubSubcategories = (category, subCategory) => {
    return [...new Set(
      allMaterials
        .filter(item => item.category === category && item.subCategory === subCategory)
        .map(item => item.subCategory1)
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
          quantity: '',
          uom: 'Nos',
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

  const updateMaterial = (id, field, value) => {
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
    
    // Add to form data
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!userId || !formData.deliverySite) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (formData.materials.length === 0) {
      alert('Please add at least one material');
      return;
    }
    
    // Validate materials
    for (const material of formData.materials) {
      if (!material.category || !material.quantity) {
        alert('Please fill in category and quantity for all materials');
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      // Prepare form data for multipart upload
      const submitData = new FormData();
      submitData.append('requestedBy', userId); // Send user ID
      submitData.append('deliverySite', formData.deliverySite);
      submitData.append('remarks', formData.remarks || '');
      
      // Prepare materials data
      const materialsData = formData.materials.map(m => ({
        itemName: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}`,
        category: m.category,
        subCategory: m.subCategory || '',
        subCategory1: m.subCategory1 || '',
        quantity: parseInt(m.quantity),
        uom: m.uom || 'Nos',
        remarks: m.remarks || ''
      }));
      
      submitData.append('materials', JSON.stringify(materialsData));
      
      // Add attachments
      formData.attachments.forEach(file => {
        submitData.append('attachments', file);
      });
      
      const response = await purchaseOrderAPI.create(submitData);
      
      if (response.success) {
        // Trigger refresh event
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        
        // Trigger refresh for Upcoming Deliveries
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        
        alert('Intent (PO) created successfully!');
        
        // Redirect to Indent tab
        navigate('/material/intent');
      }
    } catch (error) {
      // Error creating purchase order
      alert(error.message || 'Failed to create intent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate('/material/intent')}
            disabled={submitting}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Create Intent (PO)</h1>
            <p className="text-white/80 text-sm">Fill in the details below</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Form Content Inside Card */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info Section */}
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-orange-600 font-bold text-sm mb-4">Intent Information</h3>

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

              <div className="mb-4">
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Delivery Site <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.deliverySite}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliverySite: e.target.value }))}
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
                  <option value="">Select delivery site</option>
                  {sites.map(site => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
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
              
              <button
                type="button"
                onClick={addMaterialRow}
                className="w-full mb-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                disabled={submitting}
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
                    const isComplete = material.category && material.subCategory && material.subCategory1 && material.quantity;
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
                                  <span className="text-gray-500">Quantity:</span>
                                  <p className="text-gray-900 font-medium">{material.quantity} {material.uom}</p>
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
                              onChange={(value) => updateMaterial(material.id, 'category', value)}
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
                              onChange={(value) => updateMaterial(material.id, 'subCategory', value)}
                              options={material.category ? getSubcategories(material.category) : []}
                              placeholder="Select or type"
                              disabled={!material.category || submitting}
                            />
                          </div>
                        </div>

                        {/* Row 2: Sub Category 1 and Quantity */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Sub Category 1 <span className="text-red-500">*</span>
                            </label>
                            <SearchableDropdown
                              value={material.subCategory1}
                              onChange={(value) => updateMaterial(material.id, 'subCategory1', value)}
                              options={material.subCategory ? getSubSubcategories(material.category, material.subCategory) : []}
                              placeholder="Select or type"
                              disabled={!material.subCategory || submitting}
                            />
                          </div>

                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(material.id, 'quantity', e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                              placeholder="Enter qty"
                              min="1"
                              required
                              disabled={submitting}
                            />
                          </div>
                        </div>

                        {/* Row 3: UOM and Remarks */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              UOM
                            </label>
                            <select
                              value={material.uom}
                              onChange={(e) => updateMaterial(material.id, 'uom', e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 appearance-none"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em'
                              }}
                              disabled={submitting}
                            >
                              <option value="Nos">Nos</option>
                              <option value="Kg">Kg</option>
                              <option value="Ltr">Ltr</option>
                              <option value="Mtr">Mtr</option>
                              <option value="Sqft">Sqft</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-gray-700 text-xs mb-1.5 block">
                              Remarks
                            </label>
                            <input
                              type="text"
                              value={material.remarks}
                              onChange={(e) => updateMaterial(material.id, 'remarks', e.target.value)}
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
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={submitting}
                  />
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-all transform hover:scale-110"
                        disabled={submitting}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => navigate('/material/intent')}
                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
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
                  'Create Intent'
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