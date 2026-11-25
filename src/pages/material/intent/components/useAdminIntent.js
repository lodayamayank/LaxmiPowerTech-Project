// src/pages/material/intent/components/useAdminIntent.js
// Data and state for the admin Purchase orders (Intent) page: merged indent + PO list with filters and client-side
// paging, details / edit dialog state, save (with the save-vendors-then-approve flow), quick approve, delete,
// attachment delete and the add / edit / delete single material flow. Moved unchanged from AdminIntent.jsx;
// the only changes are the hook wrapper and the delete confirmations, which go through one ConfirmDialog request.
import { useState, useEffect } from "react";
import { showToast } from '@/lib/showToast';
import { EVENTS } from '@/lib/events';
import { fetchMaterialCatalogCached } from '@/hooks/useMaterialCatalog';
import { fetchVendorsCached } from '@/hooks/useVendors';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { indentAPI, purchaseOrderAPI } from "@/api/material";
import axios from "@/api/client";

export const ITEMS_PER_PAGE = 20;

export const resolveFileUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = axios.defaults.baseURL || '';
  const backendBase = apiBase.replace(/\/api\/?$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${normalizedPath}`;
};

export default function useAdminIntent() {
  const [indents, setIndents] = useState([]); // Changed from purchaseOrders
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedIndent, setSelectedIndent] = useState(null); // Changed from selectedPO
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [vendors, setVendors] = useState([]); // Vendor list for dropdown
  const [showManualMaterialForm, setShowManualMaterialForm] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState(false);
  const [manualMaterialMode, setManualMaterialMode] = useState('add');
  const [editingManualMaterialId, setEditingManualMaterialId] = useState(null);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [imageZoom, setImageZoom] = useState(100);
  const [lastAddedMaterialId, setLastAddedMaterialId] = useState(null);
  const [materialSuccessMessage, setMaterialSuccessMessage] = useState('');
  const [manualMaterial, setManualMaterial] = useState({
    category: '',
    subCategory: '',
    subCategory1: '',
    subCategory2: '',
    quantity: '',
    uom: 'Nos',
    vendor: '',
    remarks: ''
  });
  
  // ✅ Filter states
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    fetchIndents(); // Changed from fetchPurchaseOrders
    fetchMaterialsAndSites();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  }, [currentPage, search, filterSite, filterStatus, filterDateFrom, filterDateTo]);

  // Fetch materials and sites for editing
  const fetchMaterialsAndSites = async () => {
    // The three requests are independent: start them together, then handle each result in order.
    const materialsPromise = fetchMaterialCatalogCached();
    const branchesPromise = fetchBranchesCached();
    const vendorsPromise = fetchVendorsCached();
    branchesPromise.catch(() => {}); // start now; the error is still raised where it is awaited below
    vendorsPromise.catch(() => {}); // start now; the error is still raised where it is awaited below
    try {
      // Fetch materials - MATCHES DEMONSTRATED PROJECT
      const materials = await materialsPromise;
      setAllMaterials(materials || []);
      
      // Extract unique categories - backend returns formatted data
      const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setCategories(uniqueCategories);
      
      // Fetch sites/branches from backend - NO HARDCODED VALUES
      const branches = await branchesPromise;
      const sitesList = branches.map(branch => branch.name).sort();
      setSites(sitesList);
      
      // Fetch vendors from backend
      try {
        const vendorsList = await vendorsPromise;
        setVendors(vendorsList || []);
      } catch (vendorError) {
        console.error('❌ Failed to fetch vendors:', vendorError.response?.status, vendorError.message);
        setVendors([]); // Set empty array to prevent undefined errors
      }
    } catch (err) {
      console.error('Error fetching materials and sites:', err);
      // Fallback to empty array if fetch fails
      setSites([]);
      setVendors([]);
    }
  };

  // ❌ DISABLED: Auto-refresh removed per client request
  // No event listeners, no auto-polling, no auto-refresh
  // Data loads only on initial mount and manual page reload

  // ❌ DISABLED: Auto-refresh on focus removed per client request

  // ❌ DISABLED: Periodic polling removed per client request
  // No automatic refresh - data loads only on manual page reload

  const fetchIndents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both Indents (photo-based) and PurchaseOrders (manual form)
      const [indentResponse, poResponse] = await Promise.all([
        indentAPI.getAll(1, 1000, search).catch(() => ({ success: false, data: [] })),
        purchaseOrderAPI.getAll(1, 1000, search).catch(() => ({ success: false, data: [] }))
      ]);
      
      // Merge both data sources
      const indentsData = indentResponse.success ? (indentResponse.data || []).map(item => ({
        ...item,
        type: 'indent', // Mark as indent type
        purchaseOrderId: item.indentId, // Use indentId as PO-ID
        deliverySite: item.deliverySite || item.branch?.name || item.project?.name || ''
      })) : [];
      
      const posData = poResponse.success ? (poResponse.data || []).map(item => ({
        ...item,
        type: 'purchaseOrder', // Mark as PO type
        purchaseOrderId: item.purchaseOrderId,
        indentId: item.purchaseOrderId // Alias for consistency
      })) : [];
      
      // Combine and sort by date
      const combinedData = [...indentsData, ...posData].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      
      // ✅ CRITICAL: Filter out completed Intent POs (they move into GRN flow)
      let filteredData = combinedData.filter(item => 
        !['transferred', 'delivered'].includes(item.status?.toLowerCase())
      );
      
      // Filter by site
      if (filterSite) {
        filteredData = filteredData.filter(item => 
          item.deliverySite?.toLowerCase().includes(filterSite.toLowerCase())
        );
      }
      
      // Filter by status
      if (filterStatus) {
        filteredData = filteredData.filter(item => 
          item.status?.toLowerCase() === filterStatus.toLowerCase()
        );
      }
      
      // Filter by date range
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.createdAt);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate >= fromDate;
        });
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.createdAt);
          return itemDate <= toDate;
        });
      }
      
      const nextTotalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
      const safePage = Math.min(currentPage, nextTotalPages);
      const startIndex = (safePage - 1) * ITEMS_PER_PAGE;

      if (safePage !== currentPage) {
        setCurrentPage(safePage);
      }

      setIndents(filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE));
      setTotalRecords(filteredData.length);
      setTotalPages(nextTotalPages);
    } catch (err) {
      console.error('❌ Admin: Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const normalizeIntentDetails = (data, type) => {
    const isPurchaseOrder = type === 'purchaseOrder';

    return {
      ...data,
      type,
      materials: isPurchaseOrder ? data.materials : (data.items || []).map(item => {
        const nameParts = item.name ? item.name.split(' - ').map(s => s.trim()) : [];
        return {
          itemName: item.name,
          category: item.category || nameParts[0] || '',
          subCategory: item.subCategory || nameParts[1] || '',
          subCategory1: item.subCategory1 || nameParts[2] || '',
          subCategory2: item.subCategory2 || nameParts[3] || '',
          quantity: item.quantity,
          uom: item.unit || 'Nos',
          remarks: item.remarks,
          vendor: item.vendor,
          createdAt: item.createdAt,
          _id: item._id
        };
      })
    };
  };

  const handleViewDetails = async (id, options = {}) => {
    try {
      // ✅ CRITICAL FIX: Fetch fresh data from backend instead of using stale state
      const indent = indents.find(i => i._id === id);
      
      if (!indent) {
        setError('Indent not found');
        return;
      }
      
      // Determine if this is a PurchaseOrder or Indent based on type field
      const isPurchaseOrder = indent.type === 'purchaseOrder';
      
      // Fetch fresh data from backend
      const response = isPurchaseOrder 
        ? await purchaseOrderAPI.getById(id)
        : await indentAPI.getById(id);
      
      if (response.success) {
        // Use fresh data from backend
        const data = response.data;
        const normalizedData = normalizeIntentDetails(data, isPurchaseOrder ? 'purchaseOrder' : 'indent');
        
        setSelectedIndent(normalizedData);
        setShowDetailsModal(true);
        const shouldOpenMaterialForm = !!options.openMaterialForm;
        setShowManualMaterialForm(shouldOpenMaterialForm);
        setImageZoom(100);
        setLastAddedMaterialId(null);
        setMaterialSuccessMessage('');
        setManualMaterialMode('add');
        setEditingManualMaterialId(null);
        setMaterialToDelete(null);
        resetManualMaterialForm();
      } else {
        setError('Failed to fetch latest indent details');
      }
    } catch (err) {
      console.error('Error fetching indent details:', err);
      setError('Failed to fetch indent details');
      showToast('Failed to load latest indent details', 'error');
    }
  };

  const handleQuickAddMaterial = (id) => {
    handleViewDetails(id, { openMaterialForm: true });
  };

  const handleViewImage = (imageUrl) => {
    if (imageUrl) {
      window.open(resolveFileUrl(imageUrl), '_blank');
    }
  };

  const handleDelete = async (id, indentId, type) => {
    try {
      setDeleting(true);
      
      // Use appropriate API based on type
      const response = type === 'purchaseOrder' 
        ? await purchaseOrderAPI.delete(id)
        : await indentAPI.delete(id);
      
      if (response.success) {
        // Update state immediately without full refresh
        setIndents(prev => prev.filter(item => item._id !== id));
        
        // Close modal if it's open
        if (selectedIndent?._id === id) {
          setShowDetailsModal(false);
          setSelectedIndent(null);
        }
        
        // Notify client side
        window.dispatchEvent(new Event(EVENTS.intentCreated));
        localStorage.setItem(EVENTS.intentRefresh, Date.now().toString());
        
        showToast(`${type === 'purchaseOrder' ? 'Purchase Order' : 'Intent'} deleted successfully`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentIndex) => {
    try {
      setDeletingAttachment(attachmentIndex);
      const isPurchaseOrder = selectedIndent.type === 'purchaseOrder';
      
      const response = isPurchaseOrder
        ? await purchaseOrderAPI.deleteAttachment(selectedIndent._id, attachmentIndex)
        : await indentAPI.deleteAttachment(selectedIndent._id, attachmentIndex);
      
      if (response.success) {
        // Update the selected indent with the new data
        setSelectedIndent(response.data);
        
        // Also update the indent in the main list
        setIndents(prevIndents => 
          prevIndents.map(i => 
            i._id === selectedIndent._id ? response.data : i
          )
        );
        
        showToast('Attachment deleted successfully', 'success');
      }
    } catch (err) {
      console.error('Error deleting attachment:', err);
      showToast(err.response?.data?.message || 'Failed to delete attachment', 'error');
    } finally {
      setDeletingAttachment(null);
    }
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedIndent(null);
    setEditing(false);
    setFormData({});
    setShowManualMaterialForm(false);
    setImageZoom(100);
    setLastAddedMaterialId(null);
    setMaterialSuccessMessage('');
    setManualMaterialMode('add');
    setEditingManualMaterialId(null);
    setMaterialToDelete(null);
    setManualMaterial({
      category: '',
      subCategory: '',
      subCategory1: '',
      subCategory2: '',
      quantity: '',
      uom: 'Nos',
      vendor: '',
      remarks: ''
    });
  };

  const handleEdit = () => {
    setShowManualMaterialForm(false);
    // Defensive: Ensure materials is always an array
    const materialsArray = Array.isArray(selectedIndent?.materials) 
      ? selectedIndent.materials 
      : [];
    
    // Allow full editing for all intent types
    setFormData({
      status: selectedIndent?.status || 'pending',
      remarks: selectedIndent?.remarks || '',
      requestedBy: selectedIndent?.requestedBy || '',
      deliverySite: selectedIndent?.deliverySite || '',
      materials: materialsArray.map((m, idx) => ({
        id: m._id || `material-${Date.now()}-${idx}`,
        category: m.category || '',
        subCategory: m.subCategory || '',
        subCategory1: m.subCategory1 || '',
        subCategory2: m.subCategory2 || '',
        quantity: m.quantity || '',
        uom: m.uom || 'Nos',
        remarks: m.remarks || '',
        vendor: m.vendor?._id || m.vendor || '' // Preserve vendor selection
      }))
    });
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      
      // Prepare materials data with all subcategories - defensive check
      const materialsArray = Array.isArray(formData.materials) ? formData.materials : [];
      
      // ✅ CRITICAL: Determine type FIRST - used throughout function
      const isPurchaseOrder = selectedIndent.type === 'purchaseOrder';
      
      // ✅ Create correct payload based on type
      let updateData;
      
      if (isPurchaseOrder) {
        // For Purchase Orders: use 'materials' with full structure
        const materialsData = materialsArray.map(m => ({
          itemName: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}${m.subCategory2 ? ' - ' + m.subCategory2 : ''}`,
          category: m.category,
          subCategory: m.subCategory || '',
          subCategory1: m.subCategory1 || '',
          subCategory2: m.subCategory2 || '',
          quantity: parseInt(m.quantity),
          uom: m.uom || 'Nos',
          remarks: m.remarks || '',
          vendor: m.vendor || null
        }));
        
        updateData = {
          status: formData.status,
          remarks: formData.remarks,
          requestedBy: formData.requestedBy,
          deliverySite: formData.deliverySite,
          materials: materialsData
        };
      } else {
        // For Indents: use 'items' with simpler structure
        const itemsData = materialsArray.map(m => ({
          name: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}${m.subCategory2 ? ' - ' + m.subCategory2 : ''}`,
          category: m.category || '',
          subCategory: m.subCategory || '',
          subCategory1: m.subCategory1 || '',
          subCategory2: m.subCategory2 || '',
          quantity: parseInt(m.quantity),
          unit: m.uom || 'Nos',
          remarks: m.remarks || '',
          vendor: m.vendor || null
        }));
        
        updateData = {
          status: formData.status,
          adminRemarks: formData.remarks,
          items: itemsData
        };
      }
      
      // Check if status is being changed to 'approved'
      const isApproving = formData.status === 'approved' && selectedIndent.status !== 'approved';
      
      
      let response;
      
      if (isApproving) {
        // ✅ FIX: First save vendor assignments, THEN approve
        
        // Step 1: Save vendor assignments (without changing status)
        const saveData = { ...updateData };
        delete saveData.status;  // Remove status from update to keep it 'pending'
        
        const saveResponse = isPurchaseOrder
          ? await purchaseOrderAPI.update(selectedIndent._id, saveData)
          : await indentAPI.update(selectedIndent._id, saveData);
        
        if (!saveResponse.success) {
          throw new Error('Failed to save vendor assignments');
        }
        
        // Step 2: Call approval endpoint (which will create deliveries)
        response = isPurchaseOrder
          ? await purchaseOrderAPI.approve(selectedIndent._id)
          : await indentAPI.approve(selectedIndent._id);
        
        showToast(`${isPurchaseOrder ? 'Purchase Order' : 'Indent'} approved! Deliveries grouped by vendor.`, 'success');
      } else {
        // Regular update
        response = isPurchaseOrder
          ? await purchaseOrderAPI.update(selectedIndent._id, updateData)
          : await indentAPI.update(selectedIndent._id, updateData);
      }
      
      
      if (response.success) {
        // Fetch fresh data from server (like demonstrated project)
        const updatedResponse = isPurchaseOrder
          ? await purchaseOrderAPI.getById(selectedIndent._id)
          : await indentAPI.getById(selectedIndent._id);
        
        if (updatedResponse.success) {
          // ✅ NORMALIZE: Convert items to materials for consistent UI
          const data = updatedResponse.data;
          const normalizedData = {
            ...data,
            type: selectedIndent.type,
            materials: isPurchaseOrder ? data.materials : (data.items || []).map(item => {
              // Parse itemName to extract category/subcategory
              const nameParts = item.name ? item.name.split(' - ').map(s => s.trim()) : [];
              return {
                itemName: item.name,
                category: nameParts[0] || '',
                subCategory: nameParts[1] || '',
                subCategory1: nameParts[2] || '',
                subCategory2: nameParts[3] || '',
                quantity: item.quantity,
                uom: item.unit || 'Nos',
                remarks: item.remarks,
                vendor: item.vendor,
                _id: item._id
              };
            })
          };
          
          console.log('   Materials with vendors:', normalizedData.materials?.map(m => ({
            itemName: m.itemName,
            vendor: m.vendor?.companyName || m.vendor || 'NO VENDOR'
          })));
          
          setSelectedIndent(normalizedData);
          
          // Update the list state immediately
          setIndents(prev => 
            prev.map(item => item._id === selectedIndent._id ? normalizedData : item)
          );
        }
        
        setEditing(false);
        
        // ✅ SYNC TO UPCOMING DELIVERIES - Notify all components
        window.dispatchEvent(new Event(EVENTS.intentCreated));
        window.dispatchEvent(new Event(EVENTS.upcomingDeliveryRefresh));
        localStorage.setItem(EVENTS.intentRefresh, Date.now().toString());
        localStorage.setItem(EVENTS.upcomingDeliveryRefresh, Date.now().toString());
        
        showToast('Intent updated successfully and synced to Upcoming Deliveries', 'success');
      }
    } catch (err) {
      console.error('❌ Error updating:', err);
      console.error('❌ Error response:', err.response?.data);
      
      // Show specific error message from backend
      const errorMessage = err.response?.data?.message || 'Failed to update';
      const errorDetails = err.response?.data?.materialsWithoutVendor || err.response?.data?.itemsWithoutVendor;
      
      if (errorDetails && errorDetails.length > 0) {
        showToast(`${errorMessage}\n\nMaterials: ${errorDetails.join(', ')}`, 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApproveIntent = async (indent) => {
    try {
      setSaving(true);
      const isPurchaseOrder = indent.type === 'purchaseOrder';
      const response = isPurchaseOrder
        ? await purchaseOrderAPI.approve(indent._id)
        : await indentAPI.approve(indent._id);

      if (response.success) {
        const updatedResponse = isPurchaseOrder
          ? await purchaseOrderAPI.getById(indent._id)
          : await indentAPI.getById(indent._id);

        const updatedIntent = updatedResponse.success
          ? { ...updatedResponse.data, type: indent.type }
          : { ...indent, status: 'approved' };

        setIndents(prev => prev.map(item => (
          item._id === indent._id ? updatedIntent : item
        )));

        if (selectedIndent?._id === indent._id) {
          setSelectedIndent(updatedIntent);
        }

        window.dispatchEvent(new Event(EVENTS.intentCreated));
        window.dispatchEvent(new Event(EVENTS.upcomingDeliveryRefresh));
        localStorage.setItem(EVENTS.intentRefresh, Date.now().toString());
        localStorage.setItem(EVENTS.upcomingDeliveryRefresh, Date.now().toString());

        showToast(response.message || `${isPurchaseOrder ? 'Purchase Order' : 'Intent'} approved successfully`, 'success');
      }
    } catch (err) {
      console.error('❌ Error approving intent:', err);
      showToast(err.response?.data?.message || 'Failed to approve intent', 'error');
    } finally {
      setSaving(false);
    }
  };


  // Helper functions for materials - with defensive checks
  const getSubcategories = (category) => {
    if (!category || !Array.isArray(allMaterials) || allMaterials.length === 0) {
      return [];
    }
    return [...new Set(
      allMaterials
        .filter(item => item?.category === category)
        .map(item => item.subCategory)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  const getSubSubcategories = (category, subCategory) => {
    if (!category || !subCategory || !Array.isArray(allMaterials) || allMaterials.length === 0) {
      return [];
    }
    return [...new Set(
      allMaterials
        .filter(item => item?.category === category && item?.subCategory === subCategory)
        .map(item => item.subCategory1)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  const getSubCategory2 = (category, subCategory, subCategory1) => {
    if (!category || !subCategory || !subCategory1 || !Array.isArray(allMaterials) || allMaterials.length === 0) {
      return [];
    }
    return [...new Set(
      allMaterials
        .filter(item => 
          item?.category === category && 
          item?.subCategory === subCategory && 
          item?.subCategory1 === subCategory1
        )
        .map(item => item.subCategory2)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  const removeMaterialRow = (id) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== id)
    }));
  };

  const updateMaterial = (id, updates) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map(m => 
        m.id === id ? { ...m, ...updates } : m
      )
    }));
  };

  const resetManualMaterialForm = () => {
    setManualMaterial({
      category: '',
      subCategory: '',
      subCategory1: '',
      subCategory2: '',
      quantity: '',
      uom: 'Nos',
      vendor: '',
      remarks: ''
    });
  };

  const updateManualMaterial = (field, value) => {
    setManualMaterial(prev => {
      if (field === 'category') {
        return { ...prev, category: value, subCategory: '', subCategory1: '', subCategory2: '' };
      }
      if (field === 'subCategory') {
        return { ...prev, subCategory: value, subCategory1: '', subCategory2: '' };
      }
      if (field === 'subCategory1') {
        return { ...prev, subCategory1: value, subCategory2: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleOpenManualMaterialForm = () => {
    setEditing(false);
    setShowManualMaterialForm(true);
    setManualMaterialMode('add');
    setEditingManualMaterialId(null);
    setImageZoom(100);
    setMaterialSuccessMessage('');
    resetManualMaterialForm();
  };

  const getMaterialRowKey = (material, index) => (
    material?._id || material?.createdAt || `${material?.itemName || 'material'}-${index}`
  );

  const getVendorId = (vendor) => {
    if (!vendor) return '';
    return typeof vendor === 'string' ? vendor : vendor._id || '';
  };

  const handleEditManualMaterial = (material) => {
    if (!material?._id) {
      showToast('This material cannot be edited because its ID is missing', 'error');
      return;
    }

    setEditing(false);
    setManualMaterialMode('edit');
    setEditingManualMaterialId(material._id);
    setManualMaterial({
      category: material.category || '',
      subCategory: material.subCategory || '',
      subCategory1: material.subCategory1 || '',
      subCategory2: material.subCategory2 || '',
      quantity: material.quantity || '',
      uom: material.uom || 'Nos',
      vendor: getVendorId(material.vendor),
      remarks: material.remarks || ''
    });
    setShowManualMaterialForm(true);
    setImageZoom(100);
    setLastAddedMaterialId(getMaterialRowKey(material, 0));
    setMaterialSuccessMessage('');
  };

  const closeManualMaterialForm = () => {
    setShowManualMaterialForm(false);
    setManualMaterialMode('add');
    setEditingManualMaterialId(null);
    setMaterialSuccessMessage('');
    resetManualMaterialForm();
  };

  const applyUpdatedIntent = (data, type = selectedIndent?.type || 'indent') => {
    const normalizedData = normalizeIntentDetails(data, type);
    setSelectedIndent(normalizedData);
    setIndents(prev => prev.map(item => (
      item._id === selectedIndent._id
        ? { ...item, ...normalizedData, deliverySite: normalizedData.deliverySite || normalizedData.branch?.name || normalizedData.project?.name || '' }
        : item
    )));
    return normalizedData;
  };

  const applyUpdatedIndent = (data) => applyUpdatedIntent(data, 'indent');

  const buildPurchaseOrderMaterialsPayload = (materials) => (
    (materials || []).map(material => ({
      ...(material._id ? { _id: material._id } : {}),
      itemName: material.itemName,
      category: material.category || '',
      subCategory: material.subCategory || '',
      subCategory1: material.subCategory1 || '',
      subCategory2: material.subCategory2 || '',
      quantity: Number(material.quantity) || 0,
      uom: material.uom || 'Nos',
      vendor: getVendorId(material.vendor) || undefined,
      remarks: material.remarks || '',
      received_quantity: material.received_quantity || 0,
      is_received: material.is_received || false
    }))
  );

  const handleSaveManualMaterial = async (addAnother = false) => {
    if (!selectedIndent) {
      showToast('Intent PO details are not loaded yet', 'error');
      return;
    }

    const materialName = [
      manualMaterial.category,
      manualMaterial.subCategory,
      manualMaterial.subCategory1,
      manualMaterial.subCategory2
    ].filter(Boolean).join(' - ');

    if (!materialName.trim()) {
      showToast('Please enter/select material details', 'error');
      return;
    }

    const quantity = Number(manualMaterial.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    try {
      setAddingMaterial(true);
      const materialPayload = {
        itemName: materialName,
        category: manualMaterial.category,
        subCategory: manualMaterial.subCategory,
        subCategory1: manualMaterial.subCategory1,
        subCategory2: manualMaterial.subCategory2,
        quantity,
        uom: manualMaterial.uom || 'Nos',
        vendor: manualMaterial.vendor || undefined,
        remarks: manualMaterial.remarks
      };

      let response;
      let normalizedData;

      if (selectedIndent.type === 'purchaseOrder') {
        const existingMaterials = selectedIndent.materials || [];
        const nextMaterials = manualMaterialMode === 'edit'
          ? existingMaterials.map(material => (
              material._id === editingManualMaterialId
                ? { ...material, ...materialPayload, _id: material._id }
                : material
            ))
          : [...existingMaterials, materialPayload];

        response = await purchaseOrderAPI.update(selectedIndent._id, {
          requestedBy: selectedIndent.requestedBy?.name || selectedIndent.requestedBy || '',
          deliverySite: selectedIndent.deliverySite || '',
          status: selectedIndent.status || 'pending',
          remarks: selectedIndent.remarks || '',
          materials: buildPurchaseOrderMaterialsPayload(nextMaterials)
        });

        if (response.success) {
          normalizedData = applyUpdatedIntent(response.data, 'purchaseOrder');
        }
      } else {
        response = manualMaterialMode === 'edit'
          ? await indentAPI.updateMaterial(selectedIndent._id, editingManualMaterialId, materialPayload)
          : await indentAPI.addMaterial(selectedIndent._id, materialPayload);

        if (response.success) {
          normalizedData = applyUpdatedIndent(response.data);
        }
      }

      if (response.success) {
        const savedMaterials = normalizedData.materials || [];
        const updatedMaterial = manualMaterialMode === 'edit'
          ? savedMaterials.find(material => material._id === editingManualMaterialId)
          : savedMaterials[savedMaterials.length - 1];
        const updatedIndex = updatedMaterial ? savedMaterials.indexOf(updatedMaterial) : savedMaterials.length - 1;
        const updatedKey = updatedMaterial
          ? getMaterialRowKey(updatedMaterial, updatedIndex)
          : null;

        resetManualMaterialForm();
        setLastAddedMaterialId(updatedKey);
        setMaterialSuccessMessage(
          manualMaterialMode === 'edit'
            ? 'Material updated successfully.'
            : 'Material added successfully to this Intent PO.'
        );
        setTimeout(() => setMaterialSuccessMessage(''), 4500);
        showToast(
          manualMaterialMode === 'edit'
            ? 'Material updated successfully.'
            : addAnother ? 'Material added. Ready for another item.' : 'Material added successfully to this Intent PO.',
          'success'
        );

        if (manualMaterialMode === 'edit') {
          setManualMaterialMode('add');
          setEditingManualMaterialId(null);
          setShowManualMaterialForm(false);
        }
      }
    } catch (err) {
      console.error('❌ Error adding manual material:', err);
      showToast(err.response?.data?.message || `Failed to ${manualMaterialMode === 'edit' ? 'update' : 'add'} material`, 'error');
    } finally {
      setAddingMaterial(false);
    }
  };

  const handleDeleteManualMaterial = async () => {
    if (!selectedIndent || !materialToDelete?._id) return;

    try {
      setDeletingMaterial(true);
      let response;

      if (selectedIndent.type === 'purchaseOrder') {
        const nextMaterials = (selectedIndent.materials || []).filter(
          material => material._id !== materialToDelete._id
        );
        response = await purchaseOrderAPI.update(selectedIndent._id, {
          requestedBy: selectedIndent.requestedBy?.name || selectedIndent.requestedBy || '',
          deliverySite: selectedIndent.deliverySite || '',
          status: selectedIndent.status || 'pending',
          remarks: selectedIndent.remarks || '',
          materials: buildPurchaseOrderMaterialsPayload(nextMaterials)
        });

        if (response.success) {
          applyUpdatedIntent(response.data, 'purchaseOrder');
        }
      } else {
        response = await indentAPI.deleteMaterial(selectedIndent._id, materialToDelete._id);

        if (response.success) {
          applyUpdatedIndent(response.data);
        }
      }

      if (response.success) {
        setMaterialToDelete(null);
        setLastAddedMaterialId(null);
        showToast('Material deleted successfully.', 'success');
      }
    } catch (err) {
      console.error('❌ Error deleting manual material:', err);
      showToast(err.response?.data?.message || 'Failed to delete material', 'error');
    } finally {
      setDeletingMaterial(false);
    }
  };

  // Toast notification helper


  const latestUploadedIndent = indents.find(indent => indent.type === 'indent' && indent.imageUrl);
  const activeFilterCount = [filterSite, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  // Delete confirmations: { title, description, onConfirm } | null
  const requestDelete = (indent) => {
    const label = indent.type === 'purchaseOrder' ? 'Purchase Order' : 'Intent';
    const indentId = indent.indentId || indent.purchaseOrderId;
    setConfirmation({
      title: `Delete ${label} ${indentId}?`,
      description: `Are you sure you want to delete ${label} ${indentId}?`,
      onConfirm: () => handleDelete(indent._id, indentId, indent.type)
    });
  };
  const requestDeleteAttachment = (index) => setConfirmation({
    title: 'Delete attachment?',
    description: 'Are you sure you want to delete this attachment? The file will be permanently removed from the server.',
    onConfirm: () => handleDeleteAttachment(index)
  });
  const runConfirm = () => {
    const onConfirm = confirmation?.onConfirm;
    setConfirmation(null);
    if (onConfirm) onConfirm();
  };

  return {
    indents, loading, error, search, setSearch, currentPage, setCurrentPage, totalPages, totalRecords,
    selectedIndent, showDetailsModal, editing, formData, setFormData, saving, deleting, deletingAttachment,
    categories, sites, vendors, editingMaterialId, setEditingMaterialId,
    showManualMaterialForm, addingMaterial, deletingMaterial, manualMaterialMode, materialToDelete, setMaterialToDelete,
    confirmation, setConfirmation, runConfirm, requestDelete, requestDeleteAttachment, imageZoom, setImageZoom, lastAddedMaterialId, materialSuccessMessage, manualMaterial,
    filterSite, setFilterSite, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
    latestUploadedIndent, activeFilterCount,
    fetchIndents, handleViewDetails, handleQuickAddMaterial, handleViewImage, handleDelete, handleDeleteAttachment,
    closeModal, handleEdit, handleCancelEdit, handleSaveEdit, handleApproveIntent,
    getSubcategories, getSubSubcategories, getSubCategory2, removeMaterialRow, updateMaterial,
    updateManualMaterial, handleOpenManualMaterialForm, getMaterialRowKey, handleEditManualMaterial,
    closeManualMaterialForm, handleSaveManualMaterial, handleDeleteManualMaterial,
  };
}
