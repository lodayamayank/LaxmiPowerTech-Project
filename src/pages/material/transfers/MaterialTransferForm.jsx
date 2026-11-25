import React, { useState, useEffect, useRef } from 'react';
import { showToast } from '@/lib/showToast';
import MobilePage from '@/layouts/mobile/MobilePage';
import { ROUTES } from '@/lib/routes';
import { getUser } from '@/lib/session';
import { EVENTS } from '@/lib/events';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { fetchMaterialCatalogCached } from '@/hooks/useMaterialCatalog';
import { ArrowLeft, X, Upload, ChevronDown, LoaderCircle } from 'lucide-react';
import { siteTransferAPI, upcomingDeliveryAPI } from '@/api/material';
import { useNavigate } from 'react-router-dom';
import { getSelectedBranchName } from '@/lib/branchContext';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
          className="w-full bg-surface border border-line-input rounded-md px-3 py-2.5 pr-8 text-sm text-ink-1 placeholder-gray-400 focus:outline-none focus-visible:border-primary disabled:bg-surface-muted disabled:cursor-not-allowed"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown size={16} className={`text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-line-input rounded-md max-h-[300px] overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={index}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-tone-highlight-soft transition-colors ${
                    option === value ? 'bg-tone-highlight-soft text-tone-highlight-fg font-medium' : 'text-ink-1'
                  }`}
                >
                  {option}
                </li>
              ))}
            </ul>
          ) : searchTerm.trim() ? (
            <div className="py-1">
              <div className="px-3 py-2 text-xs text-ink-3 text-center border-b border-line-card">
                No matching options found
              </div>
              <div
                onClick={() => handleSelect(searchTerm.trim())}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-tone-ok-soft transition-colors text-tone-ok-fg font-medium"
              >
                Use "{searchTerm.trim()}" (custom value)
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-ink-3 text-center">
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
  const [, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Get logged-in user from localStorage
  const user = (getUser() || {});
  const userName = user?.name || '';
  
  // Auto-resolve From Site from selected project
  const selectedBranchName = getSelectedBranchName() || '';
  
  const [formData, setFormData] = useState({
    fromSite: selectedBranchName, // ✅ Auto-filled from selected project
    toSite: '',
    requestedBy: userName,
    materials: [],
    remarks: ''
  });

  const [attachments, setAttachments] = useState([]);
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  // Material options from backend
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]); // ✅ Fallback: All materials from catalog
  const [grnMaterials, setGrnMaterials] = useState([]); // ✅ Materials from GRN of selected From Site
  
  // To Site dropdown (all sites, user picks destination)
  const [toSites, setToSites] = useState([]);
  
  // Search state for filtering materials in dropdowns

  // ✅ FETCH GRN MATERIALS WHEN FROM SITE CHANGES
  useEffect(() => {
    const fetchGRNMaterials = async () => {
      if (!formData.fromSite) {
        setGrnMaterials([]);
        setCategories([]);
        return;
      }

      try {
        
        // Fetch all GRN records (transferred deliveries)
        const response = await upcomingDeliveryAPI.getAll(1, 1000, '');
        
        if (response.success) {
          const allDeliveries = response.data || [];
          
          // Filter GRN records for the selected "From Site" (status = transferred, to = fromSite)
          const grnRecords = allDeliveries.filter(delivery => 
            delivery.status?.toLowerCase() === 'transferred' && 
            delivery.to === formData.fromSite
          );
          
          
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
          
        }
      } catch (err) {
        console.error('❌ Error fetching GRN materials:', err);
        setGrnMaterials([]);
        setCategories([]);
      }
    };

    fetchGRNMaterials();
  }, [formData.fromSite]);

  // ✅ FETCH TO-SITES FROM BACKEND (From Site is auto-filled)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Independent requests: start both together, then handle each result in order.
        const branchesPromise = fetchBranchesCached();
        const materialsPromise = fetchMaterialCatalogCached();
        materialsPromise.catch(() => {}); // start now; the error is still raised where it is awaited below
        
        // Fetch all sites for "To Site" dropdown
        try {
          const branches = await branchesPromise;
          const toSitesList = branches.map(branch => branch.name).sort((a, b) => a.localeCompare(b));
          setToSites(toSitesList);
        } catch (err) {
          console.error('❌ MaterialTransferForm: Error fetching sites:', err);
          setToSites([]);
        }
        
        // ✅ FETCH MATERIAL CATALOG FOR FALLBACK SUBCATEGORIES
        try {
          const materials = await materialsPromise;
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
      return grnSubcategories.sort((a, b) => a.localeCompare(b));
    }
    
    // Fallback to catalog
    const catalogSubcategories = [...new Set(
      allMaterials
        .filter(item => item.category === category)
        .map(item => item.subCategory)
        .filter(Boolean)
    )];
    
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
      return grnSubSubcategories.sort((a, b) => a.localeCompare(b));
    }
    
    // Fallback to catalog
    const catalogSubSubcategories = [...new Set(
      allMaterials
        .filter(item => item.category === category && item.subCategory === subCategory)
        .map(item => item.subCategory1)
        .filter(Boolean)
    )];
    
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
        window.dispatchEvent(new CustomEvent(EVENTS.siteTransferCreated, {
          detail: response.data
        }));
        window.dispatchEvent(new Event(EVENTS.upcomingDeliveryRefresh));
        
        // Trigger localStorage event for cross-tab communication
        localStorage.setItem(EVENTS.siteTransferRefresh, Date.now().toString());
        localStorage.setItem(EVENTS.upcomingDeliveryRefresh, Date.now().toString());
        
        
        // Navigate back after short delay
        setTimeout(() => {
          navigate(ROUTES.material.transfer);
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
    <MobilePage title="Create Site Transfer" back onBack={() => navigate(ROUTES.material.transfer)}>

        {/* Main Content */}
        <div className="flex flex-col gap-3.5">
          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Transfer Information Section */}
            <div className="bg-surface rounded-[14px] p-3.5 border border-line-card">
              <h3 className="text-body font-semibold text-ink-1 mb-3">Transfer Information</h3>

              <div className="mb-4">
                <label className="text-ink-2 text-sm font-medium mb-2 block">
                  From Site <span className="text-tone-bad-fg">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fromSite}
                  className="w-full bg-surface-muted border border-line-card rounded-xl px-4 py-3 text-sm text-ink-2 focus:outline-none cursor-not-allowed font-medium"
                  readOnly
                  disabled
                />
                {!formData.fromSite && (
                  <p className="text-xs text-tone-bad-fg mt-1">No project selected. Please go back and select a project first.</p>
                )}
              </div>

              <div className="mb-4">
                <label className="text-ink-2 text-sm font-medium mb-2 block">
                  Transfers To <span className="text-tone-bad-fg">*</span>
                </label>
                <select
                  value={formData.toSite}
                  onChange={(e) => setFormData(prev => ({ ...prev, toSite: e.target.value }))}
                  className="w-full bg-surface border border-line-card rounded-xl px-4 py-3 text-sm text-ink-1 focus:outline-none focus-visible:border-primary focus:ring-2 focus-visible:ring-ring appearance-none font-medium"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
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
                <label className="text-ink-2 text-sm font-medium mb-2 block">
                  Requested By <span className="text-tone-bad-fg">*</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  className="w-full bg-surface-muted border border-line-card rounded-xl px-4 py-3 text-sm text-ink-2 focus:outline-none cursor-not-allowed font-medium"
                  placeholder="Enter your name"
                  required
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="text-ink-2 text-sm font-medium mb-2 block">
                  Remarks (Optional)
                </label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full bg-surface border border-line-card rounded-xl px-4 py-3 text-sm text-ink-1 focus:outline-none focus-visible:border-primary focus:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Add any additional notes..."
                  rows={3}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Materials Section */}
            <div className="bg-surface rounded-[14px] p-3.5 border border-line-card">
              <h3 className="text-body font-semibold text-ink-1 mb-3">Materials</h3>
              
              {/* Warning if From Site not selected */}
              {!formData.fromSite && (
                <div className="mb-4 p-3 bg-tone-warn-soft border border-line-card rounded-lg">
                  <p className="text-xs text-tone-warn-fg font-medium">
                    Please select "From Site" first to load available materials from GRN
                  </p>
                </div>
              )}
              
              {/* Show message if From Site selected but no materials in GRN */}
              {formData.fromSite && grnMaterials.length === 0 && (
                <div className="mb-4 p-3 bg-tone-info-soft border border-line-card rounded-lg">
                  <p className="text-xs text-tone-info-fg font-medium">
                    ℹ️ No materials found in {formData.fromSite} GRN. Please ensure materials have been delivered to this site first.
                  </p>
                </div>
              )}
              
              <button
                type="button"
                onClick={addMaterialRow}
                className={`w-full mb-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  !formData.fromSite || grnMaterials.length === 0
                    ? 'bg-surface-muted text-ink-3 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary-strong   transform hover:scale-[1.02]'
                }`}
                disabled={submitting || !formData.fromSite || grnMaterials.length === 0}
                title={!formData.fromSite ? 'Please select From Site first' : grnMaterials.length === 0 ? 'No materials available in GRN' : 'Add material'}
              >
                + Add Material
              </button>

              {formData.materials.length === 0 ? (
                <p className="text-sm text-ink-3 text-center py-4">
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
                        <Accordion
                          key={material.id}
                          type="single"
                          collapsible
                          value=""
                          onValueChange={(value) => setEditingMaterialId(value ? material.id : null)}
                        >
                          <AccordionItem value={String(material.id)} className="rounded-md border border-line-input bg-surface">
                            <div className="flex items-center justify-between">
                              <AccordionTrigger className="flex-1 p-3 text-left hover:no-underline">
                                <div>
                                  <p className="text-xs text-ink-2 font-medium mb-2">Material #{index + 1}</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-ink-3">Category:</span>
                                      <p className="text-ink-1 font-medium truncate">{material.category}</p>
                                    </div>
                                    <div>
                                      <span className="text-ink-3">Sub Category:</span>
                                      <p className="text-ink-1 font-medium truncate">{material.subCategory}</p>
                                    </div>
                                    <div>
                                      <span className="text-ink-3">Sub Category 1:</span>
                                      <p className="text-ink-1 font-medium truncate">{material.subCategory1}</p>
                                    </div>
                                    <div>
                                      <span className="text-ink-3">Sub Category 2:</span>
                                      <p className="text-ink-1 font-medium truncate">{material.subCategory2}</p>
                                    </div>
                                    <div>
                                      <span className="text-ink-3">Quantity:</span>
                                      <p className="text-ink-1 font-medium">{material.quantity}</p>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <div className="flex gap-1 flex-shrink-0 pr-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingMaterialId(material.id)}
                                  className="p-1.5 hover:bg-surface-muted rounded transition-colors"
                                  disabled={submitting}
                                >
                                  <X size={16} className="text-ink-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeMaterialRow(material.id)}
                                  className="p-1.5 hover:bg-surface-muted rounded transition-colors"
                                  disabled={submitting}
                                >
                                  <X size={16} className="text-tone-bad-fg" />
                                </button>
                              </div>
                            </div>
                            <AccordionContent className="p-0" />
                          </AccordionItem>
                        </Accordion>
                      );
                    }

                    // Expanded edit view
                    return (
                      <Accordion
                        key={material.id}
                        type="single"
                        collapsible
                        value={String(material.id)}
                        onValueChange={(value) => {
                          if (!value && isComplete) setEditingMaterialId(null);
                        }}
                      >
                        <AccordionItem value={String(material.id)} className="border-0">
                          <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                            Material #{index + 1}
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                      <div className="bg-surface-subtle border border-line-input rounded-md p-4 relative">
                        <button
                          type="button"
                          onClick={() => removeMaterialRow(material.id)}
                          className="absolute top-3 right-3 text-tone-bad-fg hover:text-primary-strong z-10"
                          disabled={submitting}
                        >
                          <X size={16} />
                        </button>

                        {/* Row 1: Category and Sub Category */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-ink-2 text-xs mb-1.5 block">
                              Category <span className="text-tone-bad-fg">*</span>
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
                            <label className="text-ink-2 text-xs mb-1.5 block">
                              Sub Category <span className="text-tone-bad-fg">*</span>
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
                            <label className="text-ink-2 text-xs mb-1.5 block">
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
                            <label className="text-ink-2 text-xs mb-1.5 block">
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
                            <label className="text-ink-2 text-xs mb-1.5 block">
                              Quantity <span className="text-tone-bad-fg">*</span>
                            </label>
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterialRow(material.id, 'quantity', e.target.value)}
                              className="w-full bg-surface border border-line-input rounded-md px-3 py-2.5 text-sm text-ink-2 focus:outline-none focus-visible:border-primary"
                              placeholder="Enter qty"
                              min="1"
                              required
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <label className="text-ink-2 text-xs mb-1.5 block">
                              Remarks
                            </label>
                            <input
                              type="text"
                              value={material.remarks}
                              onChange={(e) => updateMaterialRow(material.id, 'remarks', e.target.value)}
                              className="w-full bg-surface border border-line-input rounded-md px-3 py-2.5 text-sm text-ink-2 focus:outline-none focus-visible:border-primary"
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
                            className="mt-3 w-full text-xs text-tone-highlight-fg font-medium hover:text-primary-strong transition-colors"
                          >
                            Done editing
                          </button>
                        )}
                      </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="bg-surface rounded-[14px] p-3.5 border border-line-card">
              <h3 className="text-body font-semibold text-ink-1 mb-3">Attachments (Optional)</h3>
              
              <div className="mb-4">
                <label className="flex items-center justify-center w-full px-6 py-6 border-2 border-dashed border-line-input rounded-xl cursor-pointer hover:border-primary hover:bg-tone-highlight-soft transition-all">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-tone-highlight-soft flex items-center justify-center mb-2">
                      <Upload size={20} className="text-tone-highlight-fg" />
                    </div>
                    <span className="text-sm font-medium text-ink-2">Click to upload images</span>
                    <span className="text-xs text-ink-3 mt-1">PNG, JPG up to 10MB</span>
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
                        <img loading="lazy" decoding="async"
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-xl border-2 border-line-card"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedAttachments = attachments.filter((_, i) => i !== index);
                            setAttachments(updatedAttachments);
                          }}
                          className="absolute -top-2 -right-2 p-1.5 bg-tone-bad-solid text-primary-foreground rounded-full hover:bg-primary-strong transition-all transform hover:scale-110"
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
                onClick={() => navigate(ROUTES.material.transfer)}
                className="flex-1 bg-surface border-2 border-line-card text-ink-2 font-semibold py-3.5 rounded-xl hover:bg-surface-muted hover:border-line-input transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-strong font-semibold py-3.5 rounded-xl   transition-all disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                    Creating...
                  </span>
                ) : (
                  'Create Transfer'
                )}
              </button>
            </div>
          </form>
        </div>
</MobilePage>
  );
}