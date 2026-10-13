import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X, Trash2, Upload, ChevronDown } from 'lucide-react';
import { FaArrowLeft } from 'react-icons/fa';
import { purchaseOrderAPI, indentAPI, materialCatalogAPI as materialAPI, branchesAPI } from '../../utils/materialAPI';
import axios from '../../utils/axios';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MaterialLineItem from './MaterialLineItem';

// Class overrides so shadcn primitives keep the page's existing look
const cardClass = 'bg-white rounded-lg border py-0 gap-0 shadow-none';
const labelClass = 'text-xs text-gray-600 font-normal leading-normal';
const fieldLabelClass = 'text-xs text-gray-700 block mb-1.5 font-normal leading-normal';
const readLabelClass = 'text-xs text-gray-500 block mb-1 font-normal leading-normal';

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

export default function IntentCardDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [indent, setIndent] = useState(null);
  const [itemType, setItemType] = useState(null); // 'indent' or 'purchaseOrder'
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
      // ✅ Fetch sites/branches from backend - NO HARDCODED VALUES
      const branches = await branchesAPI.getAll();
      const sitesList = branches.map(branch => branch.name).sort();
      setSites(sitesList);
      console.log('✅ Fetched sites from backend:', sitesList);
      
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
      setSites([]); // Fallback to empty array
    }
  };

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      
      // Try fetching as PurchaseOrder first
      try {
        const poResponse = await purchaseOrderAPI.getById(id);
        if (poResponse.success && poResponse.data) {
          console.log('✅ Fetched as PurchaseOrder:', poResponse.data);
          setPurchaseOrder(poResponse.data);
          setItemType('purchaseOrder');
          
          // Convert materials to editable format
          const editableMaterials = (poResponse.data.materials || []).map((m, idx) => {
            // Parse itemName to extract category, subCategory, subCategory1, subCategory2
            const parts = m.itemName?.split(' - ') || [];
            return {
              id: Date.now() + idx,
              category: m.category || parts[0] || '',
              subCategory: m.subCategory || parts[1] || '',
              subCategory1: m.subCategory1 || parts[2] || '',
              subCategory2: m.subCategory2 || parts[3] || '',
              quantity: m.quantity || '',
              itemName: m.itemName,
              uom: m.uom || 'Nos',
              remarks: m.remarks || ''
            };
          });
          
          setFormData({
            deliverySite: poResponse.data.deliverySite,
            requestedBy: poResponse.data.requestedBy,
            status: poResponse.data.status,
            remarks: poResponse.data.remarks || '',
            materials: editableMaterials
          });
          setLoading(false);
          return;
        }
      } catch (poErr) {
        console.log('Not a PurchaseOrder, trying Indent...');
      }
      
      // If not PurchaseOrder, try fetching as Indent
      try {
        const indentResponse = await indentAPI.getById(id);
        if (indentResponse.success && indentResponse.data) {
          console.log('✅ Fetched as Indent:', indentResponse.data);
          setIndent(indentResponse.data);
          setItemType('indent');
          setFormData({
            status: indentResponse.data.status,
            adminRemarks: indentResponse.data.adminRemarks || ''
          });
          setLoading(false);
          return;
        }
      } catch (indentErr) {
        console.error('Not an Indent either:', indentErr);
      }
      
      // If neither worked, show error
      console.error('❌ Failed to load Intent PO with id:', id);
      showToast('Failed to load intent details', 'error');
      navigate('/material/intent');
    } catch (err) {
      console.error('Error fetching details:', err);
      showToast('Failed to load intent details', 'error');
      navigate('/material/intent');
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
      
      navigate('/material/intent');
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
        itemName: m.itemName || `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}${m.subCategory2 ? ' - ' + m.subCategory2 : ''}`,
        category: m.category,
        subCategory: m.subCategory,
        subCategory1: m.subCategory1,
        subCategory2: m.subCategory2,
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
        ...(prev.materials || []),
        {
          id: newMaterialId,
          category: '',
          subCategory: '',
          subCategory1: '',
          subCategory2: '',
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

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
          {/* Header skeleton */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
            <div className="flex flex-col items-center pt-8 space-y-2">
              <Skeleton className="h-7 w-40 bg-white/30" />
              <Skeleton className="h-4 w-28 bg-white/30" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="px-6 py-6 -mt-4 space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseOrder && !indent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
            <X size={32} className="text-red-500" />
          </div>
          <p className="text-gray-900 font-semibold text-lg mb-2">Intent Not Found</p>
          <p className="text-gray-600 text-sm mb-6">The requested intent could not be found</p>
          <Button
            onClick={() => navigate(-1)} 
            className="h-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentItem = itemType === 'indent' ? indent : purchaseOrder;

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <Button
            variant="ghost"
            className="mobile-back-button absolute top-6 left-6 h-auto px-2 py-1 text-white hover:bg-white/20 hover:text-white"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </Button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Intent Details</h1>
            <p className="text-white/80 text-sm">{itemType === 'indent' ? indent.indentId : purchaseOrder.purchaseOrderId}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4 pb-24">
          <div className="space-y-4">
        {/* Basic Info Card */}
        <Card className={cardClass}>
          <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>PO-ID</Label>
              <p className="font-medium text-gray-900">{itemType === 'indent' ? indent.indentId : purchaseOrder.purchaseOrderId}</p>
            </div>
            
            <div>
              <Label className={labelClass}>Status</Label>
              <div>
                <Badge
                  variant="outline"
                  className={`inline-block px-2 py-1 text-xs rounded-full font-normal border-transparent ${getStatusColor(currentItem.status)}`}
                >
                  {currentItem.status}
                </Badge>
              </div>
            </div>

            {itemType === 'purchaseOrder' && (
              <>
                <div>
                  <Label className={labelClass}>Delivery Site</Label>
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
                    <p className="font-medium text-gray-900">{purchaseOrder.deliverySite}</p>
                  )}
                </div>

                <div>
                  <Label className={labelClass}>Requested By</Label>
                  {editing ? (
                    <Input
                      type="text"
                      value={formData.requestedBy}
                      disabled
                      className="h-auto w-full px-3 py-2 bg-gray-800 dark:bg-gray-800 text-white border-0 rounded-lg text-sm cursor-not-allowed disabled:opacity-75"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{purchaseOrder.requestedBy}</p>
                  )}
                </div>
              </>
            )}

            {itemType === 'indent' && (
              <>
                <div>
                  <Label className={labelClass}>Project</Label>
                  <p className="font-medium text-gray-900">{indent.project || 'N/A'}</p>
                </div>
                <div>
                  <Label className={labelClass}>Branch</Label>
                  <p className="font-medium text-gray-900">{indent.branch || 'N/A'}</p>
                </div>
              </>
            )}

            <div className="col-span-2">
              <Label className={labelClass}>Request Date</Label>
              <p className="font-medium text-gray-900">
                {new Date(currentItem.createdAt || currentItem.requestDate).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Remarks / Admin Remarks */}
          <div>
            <Label className={labelClass}>{itemType === 'indent' ? 'Admin Remarks' : 'Remarks'}</Label>
            {editing ? (
              <Textarea
                value={itemType === 'indent' ? formData.adminRemarks : formData.remarks}
                onChange={(e) => setFormData({ ...formData, [itemType === 'indent' ? 'adminRemarks' : 'remarks']: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows="2"
                placeholder="Add remarks..."
              />
            ) : (
              <p className="text-sm text-gray-700">{itemType === 'indent' ? (indent.adminRemarks || '-') : (purchaseOrder.remarks || '-')}</p>
            )}
          </div>
          </CardContent>
        </Card>

        {/* Image Card (for Indent type) */}
        {itemType === 'indent' && indent.imageUrl && (
          <Card className={cardClass}>
            <CardContent className="p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Uploaded Image</h2>
            <div className="border rounded-lg overflow-hidden">
              <img
                src={indent.imageUrl}
                alt="Intent"
                className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(indent.imageUrl, '_blank')}
                onError={(e) => {
                  console.error('Image load error:', indent.imageUrl);
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            </CardContent>
          </Card>
        )}

        {/* Materials Card (only for PurchaseOrder type) */}
        {itemType === 'purchaseOrder' && (
        <Card className={cardClass}>
          <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Materials</h2>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={addMaterialRow}
                className="h-auto p-0 text-sm text-orange-600 hover:text-orange-700 hover:bg-transparent font-medium"
              >
                + Add Material
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {formData.materials && formData.materials.length > 0 ? (
              editing ? (
                // Edit mode - show collapsed cards with edit/delete icons (Snapshot 3 & 4)
                formData.materials.map((material, idx) => {
                  const isExpanded = editingMaterialId === material.id;
                  
                  if (isExpanded) {
                    // Expanded edit view for this specific material (Snapshot 4)
                    return (
                      <Accordion
                        key={material.id}
                        type="single"
                        collapsible
                        value={String(material.id)}
                        onValueChange={(value) => {
                          if (!value) setEditingMaterialId(null);
                        }}
                      >
                        <AccordionItem value={String(material.id)} className="rounded-lg border border-gray-200 bg-white">
                          <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                            Material #{idx + 1}
                          </AccordionTrigger>
                          <AccordionContent className="p-4 pt-0">
                        <div className="flex justify-end mb-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeMaterialRow(material.id)}
                            className="h-auto w-auto p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={18} className="size-[18px] text-red-600" />
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Row 1: Category and Sub Category */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className={fieldLabelClass}>Category</Label>
                              <SearchableDropdown
                                value={material.category}
                                onChange={(value) => updateMaterial(material.id, { category: value, subCategory: '', subCategory1: '', subCategory2: '' })}
                                options={categories}
                                placeholder="Select category"
                              />
                            </div>
                            <div>
                              <Label className={fieldLabelClass}>Sub Category</Label>
                              <SearchableDropdown
                                value={material.subCategory}
                                onChange={(value) => updateMaterial(material.id, { subCategory: value, subCategory1: '', subCategory2: '' })}
                                options={getSubcategories(material.category)}
                                placeholder="Select sub category"
                                disabled={!material.category}
                              />
                            </div>
                          </div>
                          
                          {/* Row 2: Sub Category 1 and Sub Category 2 */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className={fieldLabelClass}>Sub Category 1</Label>
                              <SearchableDropdown
                                value={material.subCategory1}
                                onChange={(value) => updateMaterial(material.id, { subCategory1: value, subCategory2: '' })}
                                options={getSubSubcategories(material.category, material.subCategory)}
                                placeholder="—"
                                disabled={!material.subCategory}
                              />
                            </div>
                            <div>
                              <Label className={fieldLabelClass}>Sub Category 2</Label>
                              <SearchableDropdown
                                value={material.subCategory2}
                                onChange={(value) => updateMaterial(material.id, { subCategory2: value })}
                                options={getSubSubSubcategories(material.category, material.subCategory, material.subCategory1)}
                                placeholder="—"
                                disabled={!material.subCategory1}
                              />
                            </div>
                          </div>
                          
                          {/* Row 3: Quantity */}
                          <div>
                            <Label className={fieldLabelClass}>Quantity</Label>
                            <Input
                              type="number"
                              value={material.quantity || ''}
                              onChange={(e) => updateMaterial(material.id, { quantity: e.target.value })}
                              placeholder="Enter qty"
                              className="h-auto w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-none focus-visible:ring-0 focus-visible:border-gray-400"
                            />
                          </div>
                          
                          {/* Done Editing Button */}
                          <div className="flex justify-center pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setEditingMaterialId(null)}
                              className="h-auto p-0 hover:bg-transparent text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center gap-1 transition-colors"
                            >
                              <span>✓</span>
                              <span>Done editing</span>
                            </Button>
                          </div>
                        </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    );
                  }
                  
                  // Collapsed card view with edit/delete icons (Snapshot 3)
                  return (
                    <Accordion
                      key={material.id}
                      type="single"
                      collapsible
                      value=""
                      onValueChange={(value) => setEditingMaterialId(value ? material.id : null)}
                    >
                    <AccordionItem value={String(material.id)} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <AccordionTrigger className="flex-1 p-0 text-left text-sm font-semibold text-gray-900 hover:no-underline">
                          Material #{idx + 1}
                        </AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEditingMaterialId(material.id)}
                            className="h-auto w-auto p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} className="text-gray-700" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeMaterialRow(material.id)}
                            className="h-auto w-auto p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={16} className="text-red-600" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <p className="text-gray-900 font-medium">{material.category || '—'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Sub Category:</span>
                            <p className="text-gray-900 font-medium">{material.subCategory || '—'}</p>
                          </div>
                        </div>
                        {(material.subCategory1 || material.subCategory2) && (
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500">Sub Category 1:</span>
                              <p className="text-gray-900 font-medium">{material.subCategory1 || '—'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Sub Category 2:</span>
                              <p className="text-gray-900 font-medium">{material.subCategory2 || '—'}</p>
                            </div>
                          </div>
                        )}
                        <div className="text-xs">
                          <span className="text-gray-500">Quantity:</span>
                          <p className="text-gray-900 font-medium">{material.quantity || '—'}</p>
                        </div>
                      </div>
                      <AccordionContent className="p-0" />
                    </AccordionItem>
                    </Accordion>
                  );
                })
              ) : (
                // Read-only mode - detailed display matching snapshot
                formData.materials.map((material, idx) => (
                  <div key={material.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Material #{idx + 1}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Row 1: Category and Sub Category */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className={readLabelClass}>Category</Label>
                          <p className="text-sm font-medium text-gray-900">{material.category || '-'}</p>
                        </div>
                        <div>
                          <Label className={readLabelClass}>Sub Category</Label>
                          <p className="text-sm font-medium text-gray-900">{material.subCategory || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Row 2: Sub Category 1 and Sub Category 2 */}
                      {(material.subCategory1 || material.subCategory2) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className={readLabelClass}>Sub Category 1</Label>
                            <p className="text-sm font-medium text-gray-900">{material.subCategory1 || '-'}</p>
                          </div>
                          <div>
                            <Label className={readLabelClass}>Sub Category 2</Label>
                            <p className="text-sm font-medium text-gray-900">{material.subCategory2 || '-'}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Row 3: Quantity and Remarks */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className={readLabelClass}>Quantity</Label>
                          <p className="text-sm font-medium text-gray-900">{material.quantity || '-'}</p>
                        </div>
                        <div>
                          <Label className={readLabelClass}>Remarks</Label>
                          <p className="text-sm text-gray-700">{material.remarks || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No materials added</p>
            )}
          </div>
          </CardContent>
        </Card>
        )}

        {/* Attachments Card (only for PurchaseOrder type) */}
        {itemType === 'purchaseOrder' && (
        <Card className={cardClass}>
          <CardContent className="p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Attachments</h2>
          
          {/* Existing Attachments */}
          {purchaseOrder.attachments && purchaseOrder.attachments.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {purchaseOrder.attachments.map((attachment, index) => {
                // Handle both old string format and new Cloudinary object format
                const imageUrl = typeof attachment === 'string' ? attachment : attachment.url;
                
                return (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-24 object-cover rounded border cursor-pointer"
                    onClick={() => window.open(imageUrl, '_blank')}
                    onError={(e) => {
                      console.error('Image load error:', imageUrl);
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {editing && (
                    <Button
                      type="button"
                      onClick={() => handleDeleteAttachment(index)}
                      disabled={deletingAttachment === index}
                      className="absolute top-1 right-1 h-auto w-auto p-1 bg-red-500 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} className="size-3.5" />
                    </Button>
                  )}
                </div>
                );
              })}
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
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeNewAttachment(index)}
                      className="h-auto w-auto p-0 hover:bg-transparent text-red-600 hover:text-red-700"
                    >
                      <X size={16} />
                    </Button>
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
          </CardContent>
        </Card>
        )}
          </div>
        </div>

      {/* Fixed Action Buttons at Bottom - Mobile Snapshot Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-[390px] mx-auto px-4 py-3">
          {editing ? (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                className="flex-1 h-auto bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveChanges}
                className="flex-1 h-auto bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md disabled:opacity-100 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="size-5 animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleEdit}
                className="flex-1 h-auto bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md"
              >
                Edit
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                className="flex-1 h-auto bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors shadow-md"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}