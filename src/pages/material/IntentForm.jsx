import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, Upload, ChevronDown } from 'lucide-react';
import { purchaseOrderAPI, materialCatalogAPI as materialAPI } from '../../utils/materialAPI';
import { useNavigate } from 'react-router-dom';

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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
  const [formData, setFormData] = useState({
    requestedBy: '',
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
        
        // Extract unique categories
        const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b));
        setCategories(uniqueCategories);
        
      } catch (err) {
        // Error fetching materials and sites
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
    if (!formData.requestedBy || !formData.deliverySite) {
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
      submitData.append('requestedBy', formData.requestedBy);
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
        
        alert('Intent (PO) created successfully!');
        
        // Redirect to Indent tab
        navigate('/indent');
      }
    } catch (error) {
      // Error creating purchase order
      alert(error.message || 'Failed to create intent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-50 to-gray-200 z-50 flex justify-center">
      <div className="w-full max-w-[390px] h-full bg-white shadow-2xl overflow-y-auto relative pb-24">
        {/* Form Content */}
        <div className="bg-white">
          {/* Header with Back Button */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
            <button
              onClick={() => navigate('/indent')}
              className="p-0 hover:opacity-70 transition-opacity"
              disabled={submitting}
            >
              <ArrowLeft size={20} className="text-gray-800" />
            </button>
            <h2 className="text-base font-medium text-gray-900">Create Intent (PO)</h2>
          </div>

          {/* Form Content Inside Card */}
          <form onSubmit={handleSubmit} className="px-4 py-4">
            {/* Basic Info Section */}
            <h3 className="text-blue-600 font-semibold text-xs mb-3">Intent Information</h3>

            <div className="mb-3">
              <label className="text-gray-700 text-xs mb-1.5 block">
                Requested By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.requestedBy}
                onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                placeholder="Enter your name"
                required
                disabled={submitting}
              />
            </div>

            <div className="mb-3">
              <label className="text-gray-700 text-xs mb-1.5 block">
                Delivery Site <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.deliverySite}
                onChange={(e) => setFormData(prev => ({ ...prev, deliverySite: e.target.value }))}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em'
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

            <div className="mb-3">
              <label className="text-gray-700 text-xs mb-1.5 block">
                Remarks (Optional)
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                placeholder="Add any additional notes..."
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Materials Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-blue-600 font-semibold text-xs mb-3">Materials</h3>
              
              <button
                type="button"
                onClick={addMaterialRow}
                className="w-full mb-3 py-2.5 border border-gray-300 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
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
        <div className="border-t pt-4 mt-4">
          <h3 className="text-blue-600 font-semibold text-xs mb-3">Attachments (Optional)</h3>
            
            <div className="mb-3">
              <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                <div className="flex flex-col items-center">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-600">Click to upload images</span>
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
            <div className="grid grid-cols-3 gap-2 mb-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-20 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                    disabled={submitting}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spacer for fixed buttons */}
        <div className="h-4"></div>
      </form>

          {/* Fixed Action Buttons at Bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="max-w-[390px] mx-auto px-4 py-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/indent')}
                  className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}