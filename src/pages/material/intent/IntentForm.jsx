import React, { useState, useEffect, useRef } from 'react';
import { ROUTES } from '@/lib/routes';
import { getUser } from '@/lib/session';
import { EVENTS } from '@/lib/events';
import { fetchMaterialCatalogCached } from '@/hooks/useMaterialCatalog';
import { X, Upload, ChevronDown } from 'lucide-react';
import { purchaseOrderAPI } from '@/api/material';
import { toast } from 'sonner';
import MobilePage from '@/layouts/mobile/MobilePage';
import { useNavigate } from 'react-router-dom';
import { getSelectedBranchName } from '@/lib/branchContext';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Class overrides so shadcn primitives keep the page's existing look
const sectionLabelClass = 'text-ink-2 text-sm font-medium mb-2 block leading-normal';
const fieldLabelClass = 'text-ink-2 text-xs mb-1.5 block font-normal leading-normal';

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
          ) : (
            <div className="px-3 py-2 text-sm text-ink-3 text-center">
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
  const [, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Get logged-in user from localStorage
  const user = (getUser() || {});
  const userName = user?.name || '';
  
  // Auto-resolve delivery site from already-selected project/branch
  const selectedBranchName = getSelectedBranchName() || '';
  
  const [formData, setFormData] = useState({
    requestedBy: userName,
    deliverySite: selectedBranchName, // ✅ Auto-filled from selected project
    materials: [],
    remarks: '',
    attachments: []
  });

  // Material options from backend
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  
  // Image preview
  const [imagePreviews, setImagePreviews] = useState([]);
  
  // Track which material is currently being edited
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  // Fetch materials from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch materials from database - MATCHES DEMONSTRATED PROJECT
        // Demonstrated project calls /materials/materials, we call /material/catalog/materials
        const materials = await fetchMaterialCatalogCached();
        
        // Debug: Log first material to verify data structure
        if (materials && materials.length > 0) {
          console.log('📊 Sample material data:', {
            category: materials[0].category,
            subCategory: materials[0].subCategory,
            subCategory1: materials[0].subCategory1
          });
        }
        
        setAllMaterials(materials || []);
        
        // Extract unique categories - backend returns formatted data
        const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b));
        setCategories(uniqueCategories);
        
      } catch (err) {
        console.error('❌ Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get subcategories based on selected category - MATCHES DEMONSTRATED PROJECT
  const getSubcategories = (category) => {
    const filtered = allMaterials.filter(item => item.category === category);
    const subcategories = [...new Set(
      filtered
        .map(item => item.subCategory)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
    
    console.log(`🔍 getSubcategories for "${category}":`, {
      totalMaterials: allMaterials.length,
      matchingCategory: filtered.length,
      uniqueSubcategories: subcategories.length,
      subcategories: subcategories.slice(0, 3)
    });
    
    return subcategories;
  };

  // Get sub-subcategories - MATCHES DEMONSTRATED PROJECT
  const getSubSubcategories = (category, subCategory) => {
    return [...new Set(
      allMaterials
        .filter(item => item.category === category && item.subCategory === subCategory)
        .map(item => item.subCategory1)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  // Get sub-sub-subcategories (SubCategory2) - NEW
  const getSubSubSubcategories = (category, subCategory, subCategory1) => {
    return [...new Set(
      allMaterials
        .filter(item => 
          item.category === category && 
          item.subCategory === subCategory && 
          item.subCategory1 === subCategory1
        )
        .map(item => item.subCategory2)
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
    if (!userName || !formData.deliverySite) {
      toast.error('1 field needs fixing', { description: 'Fill in all the required fields.' });
      return;
    }
    
    if (formData.materials.length === 0) {
      toast.error('Add a material', { description: 'Add at least one material to the intent.' });
      return;
    }
    
    // Validate materials
    for (const material of formData.materials) {
      if (!material.category || !material.quantity) {
        toast.error('1 field needs fixing', { description: 'Add the category and quantity for every material.' });
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      // Prepare form data for multipart upload
      const submitData = new FormData();
      submitData.append('requestedBy', userName); // ✅ Send user NAME (not ID) - matches Site Transfer
      submitData.append('deliverySite', formData.deliverySite);
      submitData.append('remarks', formData.remarks || '');
      
      // Prepare materials data
      const materialsData = formData.materials.map(m => ({
        itemName: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}${m.subCategory2 ? ' - ' + m.subCategory2 : ''}`,
        category: m.category || '',
        subCategory: m.subCategory || '',
        subCategory1: m.subCategory1 || '',
        subCategory2: m.subCategory2 || '',
        quantity: parseInt(m.quantity),
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
        window.dispatchEvent(new Event(EVENTS.intentCreated));
        localStorage.setItem(EVENTS.intentRefresh, Date.now().toString());
        
        // Trigger refresh for Upcoming Deliveries
        localStorage.setItem(EVENTS.upcomingDeliveryRefresh, Date.now().toString());
        
        toast.success('Intent created', { description: `${formData.materials.length} material${formData.materials.length === 1 ? '' : 's'} · ${formData.deliverySite}` });
        
        // Redirect to Indent tab
        navigate(ROUTES.material.intent);
      }
    } catch (error) {
      // Error creating purchase order
      toast.error('Couldn’t create the intent', { description: error.message || 'Check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <MobilePage
        title="New intent"
        back
        onBack={() => navigate(ROUTES.material.intent)}
        tabs="manager"
        footer={
          <Button type="submit" size="xl" className="w-full" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create intent'}
          </Button>
        }
      >
          <div className="flex flex-col gap-3.5">
            {/* Basic Info Section */}
            <div className="rounded-[14px] border border-line-card bg-surface p-3.5">
              <h3 className="mb-3 text-body font-semibold text-ink-1">Intent Information</h3>

              <div className="mb-4">
                <Label className={sectionLabelClass}>
                  Requested By <span className="text-tone-bad-fg">*</span>
                </Label>
                <Input
                  type="text"
                  value={userName}
                  className="h-auto w-full bg-surface-muted border border-line-card rounded-xl px-4 py-3 text-sm text-ink-2 shadow-none focus-visible:ring-0 cursor-not-allowed font-medium disabled:opacity-100"
                  placeholder="Enter your name"
                  required
                  readOnly
                  disabled
                />
              </div>

              <div className="mb-4">
                <Label className={sectionLabelClass}>
                  Delivery Site <span className="text-tone-bad-fg">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.deliverySite}
                  className="h-auto w-full bg-surface-muted border border-line-card rounded-xl px-4 py-3 text-sm text-ink-2 shadow-none focus-visible:ring-0 cursor-not-allowed font-medium disabled:opacity-100"
                  readOnly
                  disabled
                />
                {!formData.deliverySite && (
                  <p className="text-xs text-tone-bad-fg mt-1">No project selected. Please go back and select a project first.</p>
                )}
              </div>

              <div>
                <Label className={sectionLabelClass}>
                  Remarks (Optional)
                </Label>
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
            <div className="rounded-[14px] border border-line-card bg-surface p-3.5">
              <h3 className="mb-3 text-body font-semibold text-ink-1">Materials</h3>
              
              <Button
                type="button"
                onClick={addMaterialRow}
                className="w-full h-auto mb-4 py-3 bg-primary text-primary-foreground hover:bg-primary-strong rounded-xl font-semibold text-sm   transition-all transform hover:scale-[1.02]"
                disabled={submitting}
              >
                + Add Material
              </Button>

              {formData.materials.length === 0 ? (
                <p className="text-sm text-ink-3 text-center py-4">
                  No materials added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.materials.map((material, index) => {
                    const isComplete = material.category && material.subCategory && material.subCategory1 && material.subCategory2 && material.quantity;
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
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setEditingMaterialId(material.id)}
                                  className="h-auto w-auto p-1.5 hover:bg-surface-muted rounded transition-colors"
                                  disabled={submitting}
                                >
                                  <X size={16} className="text-ink-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => removeMaterialRow(material.id)}
                                  className="h-auto w-auto p-1.5 hover:bg-surface-muted rounded transition-colors"
                                  disabled={submitting}
                                >
                                  <X size={16} className="text-tone-bad-fg" />
                                </Button>
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
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeMaterialRow(material.id)}
                          className="absolute top-3 right-3 h-auto w-auto p-0 text-tone-bad-fg hover:text-primary-strong hover:bg-transparent z-10"
                          disabled={submitting}
                        >
                          <X size={16} />
                        </Button>

                        {/* Row 1: Category and Sub Category */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className={fieldLabelClass}>
                              Category <span className="text-tone-bad-fg">*</span>
                            </Label>
                            <SearchableDropdown
                              value={material.category}
                              onChange={(value) => updateMaterial(material.id, 'category', value)}
                              options={categories}
                              placeholder="Select or type"
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <Label className={fieldLabelClass}>
                              Sub Category <span className="text-tone-bad-fg">*</span>
                            </Label>
                            <SearchableDropdown
                              value={material.subCategory}
                              onChange={(value) => updateMaterial(material.id, 'subCategory', value)}
                              options={material.category ? getSubcategories(material.category) : []}
                              placeholder="Select or type"
                              disabled={!material.category || submitting}
                            />
                          </div>
                        </div>

                        {/* Row 2: Sub Category 1 and Sub Category 2 */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className={fieldLabelClass}>
                              Sub Category 1
                            </Label>
                            <SearchableDropdown
                              value={material.subCategory1}
                              onChange={(value) => updateMaterial(material.id, 'subCategory1', value)}
                              options={material.subCategory ? getSubSubcategories(material.category, material.subCategory) : []}
                              placeholder="Select or type"
                              disabled={!material.subCategory || submitting}
                            />
                          </div>

                          <div>
                            <Label className={fieldLabelClass}>
                              Sub Category 2
                            </Label>
                            <SearchableDropdown
                              value={material.subCategory2}
                              onChange={(value) => updateMaterial(material.id, 'subCategory2', value)}
                              options={material.subCategory1 ? getSubSubSubcategories(material.category, material.subCategory, material.subCategory1) : []}
                              placeholder="Select or type"
                              disabled={!material.subCategory1 || submitting}
                            />
                          </div>
                        </div>

                        {/* Row 3: Quantity and Remarks */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className={fieldLabelClass}>
                              Quantity <span className="text-tone-bad-fg">*</span>
                            </Label>
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(material.id, 'quantity', e.target.value)}
                              className="h-auto w-full bg-surface border border-line-input rounded-md px-3 py-2.5 text-sm text-ink-2 shadow-none focus-visible:ring-0 focus-visible:border-primary"
                              placeholder="Enter qty"
                              min="1"
                              required
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <Label className={fieldLabelClass}>
                              Remarks
                            </Label>
                            <Input
                              type="text"
                              value={material.remarks}
                              onChange={(e) => updateMaterial(material.id, 'remarks', e.target.value)}
                              className="h-auto w-full bg-surface border border-line-input rounded-md px-3 py-2.5 text-sm text-ink-2 shadow-none focus-visible:ring-0 focus-visible:border-primary"
                              placeholder="Optional notes"
                              disabled={submitting}
                            />
                          </div>
                        </div>

                        {/* Done editing button */}
                        {isComplete && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEditingMaterialId(null)}
                            className="mt-3 w-full h-auto p-0 hover:bg-transparent text-xs text-tone-highlight-fg font-medium hover:text-primary-strong transition-colors"
                          >
                            ✓ Done editing
                          </Button>
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
            <div className="rounded-[14px] border border-line-card bg-surface p-3.5">
              <h3 className="mb-3 text-body font-semibold text-ink-1">Attachments (Optional)</h3>
              
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
                      <img loading="lazy" decoding="async"
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border-2 border-line-card"
                      />
                      <Button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 h-auto w-auto p-1.5 bg-tone-bad-solid text-primary-foreground rounded-full hover:bg-primary-strong transition-all transform hover:scale-110"
                        disabled={submitting}
                      >
                        <X size={14} className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
      </MobilePage>
    </form>
  );
}
