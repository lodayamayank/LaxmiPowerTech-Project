import { useState, useEffect } from "react";
import { indentAPI, purchaseOrderAPI, materialCatalogAPI as materialAPI, branchesAPI, vendorsAPI } from "../../utils/materialAPI";
import { Eye, Trash2, X, Edit2, Save, Plus, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, ExternalLink, CheckCircle, RefreshCw } from "lucide-react";
import MaterialLineItem from "./MaterialLineItem";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../utils/axios";

const resolveFileUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = axios.defaults.baseURL || '';
  const backendBase = apiBase.replace(/\/api\/?$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${normalizedPath}`;
};

export default function AdminIntent() {
  const [indents, setIndents] = useState([]); // Changed from purchaseOrders
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  }, [currentPage, search, filterSite, filterStatus, filterDateFrom, filterDateTo]);

  // Fetch materials and sites for editing
  const fetchMaterialsAndSites = async () => {
    try {
      // Fetch materials - MATCHES DEMONSTRATED PROJECT
      const materials = await materialAPI.getMaterials();
      setAllMaterials(materials || []);
      
      // Extract unique categories - backend returns formatted data
      const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setCategories(uniqueCategories);
      
      // Fetch sites/branches from backend - NO HARDCODED VALUES
      const branches = await branchesAPI.getAll();
      const sitesList = branches.map(branch => branch.name).sort();
      setSites(sitesList);
      console.log('✅ Fetched sites from backend:', sitesList);
      
      // Fetch vendors from backend
      try {
        const vendorsList = await vendorsAPI.getAll();
        setVendors(vendorsList || []);
        console.log('✅ Fetched vendors from backend:', vendorsList?.length || 0, 'vendors');
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
        indentAPI.getAll(currentPage, 20, search).catch(() => ({ success: false, data: [] })),
        purchaseOrderAPI.getAll(currentPage, 20, search).catch(() => ({ success: false, data: [] }))
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
      
      console.log(`📊 Admin: Fetched ${indentsData.length} indents + ${posData.length} POs = ${combinedData.length} total`);
      
      // ✅ CRITICAL: Filter out TRANSFERRED Intent POs (Admin should see Approved + Partial only)
      let filteredData = combinedData.filter(item => 
        item.status?.toLowerCase() !== 'transferred'
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
      
      setIndents(filteredData);
      
      // Use max total pages from both sources
      const maxPages = Math.max(
        indentResponse.pagination?.totalPages || 1,
        poResponse.pagination?.totalPages || 1
      );
      setTotalPages(maxPages);
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
        const shouldOpenMaterialForm = !!options.openMaterialForm && normalizedData.type === 'indent' && !!normalizedData.imageUrl;
        setShowManualMaterialForm(shouldOpenMaterialForm);
        setImageZoom(100);
        setLastAddedMaterialId(null);
        setMaterialSuccessMessage('');
        setManualMaterialMode('add');
        setEditingManualMaterialId(null);
        setMaterialToDelete(null);
        resetManualMaterialForm();
        console.log('✅ Loaded fresh Intent PO data from backend', normalizedData);
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
    if (!window.confirm(`Are you sure you want to delete ${type === 'purchaseOrder' ? 'Purchase Order' : 'Intent'} ${indentId}?`)) {
      return;
    }

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
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        
        showToast(`${type === 'purchaseOrder' ? 'Purchase Order' : 'Intent'} deleted successfully`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentIndex) => {
    if (!window.confirm('Are you sure you want to delete this attachment? The file will be permanently removed from the server.')) {
      return;
    }

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
      
      console.log('📤 Sending update with data:', updateData);
      console.log('   Type:', isPurchaseOrder ? 'Purchase Order' : 'Indent');
      console.log('   Is Approving:', isApproving);
      console.log('   Materials/Items:', updateData.materials || updateData.items);
      
      let response;
      
      if (isApproving) {
        // ✅ FIX: First save vendor assignments, THEN approve
        console.log('✅ Status changed to approved - saving vendors first, then approving');
        
        // Step 1: Save vendor assignments (without changing status)
        const saveData = { ...updateData };
        delete saveData.status;  // Remove status from update to keep it 'pending'
        
        console.log('💾 Step 1: Saving vendor assignments:', saveData);
        const saveResponse = isPurchaseOrder
          ? await purchaseOrderAPI.update(selectedIndent._id, saveData)
          : await indentAPI.update(selectedIndent._id, saveData);
        
        if (!saveResponse.success) {
          throw new Error('Failed to save vendor assignments');
        }
        
        // Step 2: Call approval endpoint (which will create deliveries)
        console.log('✅ Step 2: Calling approval endpoint');
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
      
      console.log('📥 Received response:', response);
      
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
          
          console.log('✅ Normalized data after save:', normalizedData);
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
        window.dispatchEvent(new Event('intentCreated'));
        window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        console.log('✅ Intent PO updated - syncing to Upcoming Deliveries');
        
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

  const getStatusColor = (status) => {
    // Unified status colors matching Material Transfer
    const statusColors = {
      pending: 'bg-gray-100 text-gray-700',
      approved: 'bg-orange-100 text-orange-600',
      transferred: 'bg-green-100 text-green-600',
      cancelled: 'bg-red-100 text-red-600'
    };
    return statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const applyUpdatedIndent = (data) => {
    const normalizedData = normalizeIntentDetails(data, 'indent');
    setSelectedIndent(normalizedData);
    setIndents(prev => prev.map(item => (
      item._id === selectedIndent._id
        ? { ...item, ...normalizedData, deliverySite: normalizedData.deliverySite || normalizedData.branch?.name || normalizedData.project?.name || '' }
        : item
    )));
    return normalizedData;
  };

  const handleSaveManualMaterial = async (addAnother = false) => {
    if (!selectedIndent || selectedIndent.type !== 'indent') {
      showToast('Manual material entry is available for uploaded Intent PO images only', 'error');
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

      const response = manualMaterialMode === 'edit'
        ? await indentAPI.updateMaterial(selectedIndent._id, editingManualMaterialId, materialPayload)
        : await indentAPI.addMaterial(selectedIndent._id, materialPayload);

      if (response.success) {
        const normalizedData = applyUpdatedIndent(response.data);
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
      const response = await indentAPI.deleteMaterial(selectedIndent._id, materialToDelete._id);

      if (response.success) {
        applyUpdatedIndent(response.data);
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

  // Delete All handler
  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all records? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      
      // Delete all purchase orders and indents
      const [poResponse, indentResponse] = await Promise.all([
        purchaseOrderAPI.deleteAll().catch(() => ({ success: false })),
        indentAPI.deleteAll().catch(() => ({ success: false }))
      ]);
      
      const poCount = poResponse.deletedCount || 0;
      const indentCount = indentResponse.deletedCount || 0;
      const totalCount = poCount + indentCount;
      
      if (totalCount > 0) {
        // Clear local state
        setIndents([]);
        setTotalPages(1);
        setCurrentPage(1);
        
        // Notify other components
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        
        showToast(`Successfully deleted all ${totalCount} records`, 'success');
      } else {
        showToast('No records to delete', 'error');
      }
    } catch (err) {
      console.error('Delete all error:', err);
      showToast(err.response?.data?.message || 'Failed to delete all records', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const latestUploadedIndent = indents.find(indent => indent.type === 'indent' && indent.imageUrl);
  const activeFilterCount = [filterSite, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <DashboardLayout title="Intent (PO)">
    <div className="flex-1 p-6 bg-gray-50">
      <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Intent (PO)</h1>
          <p className="text-sm text-gray-500">View all purchase order requests</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchIndents}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => latestUploadedIndent && handleViewDetails(latestUploadedIndent._id)}
            disabled={!latestUploadedIndent}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 ring-1 ring-blue-100 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Eye size={16} />
            Open Latest
          </button>
          <button
            type="button"
            onClick={() => latestUploadedIndent && handleQuickAddMaterial(latestUploadedIndent._id)}
            disabled={!latestUploadedIndent}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Add to Latest
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={indents.length === 0 || deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Trash2 size={16} />
            {deleting ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-medium">Error:</span>
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={fetchIndents}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-600 text-sm">Loading indents...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
          <div className="mb-4">
            <div className="flex flex-col gap-3 mb-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-semibold text-gray-700">
                Purchase Orders Table ({indents.length} records)
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Search by PO ID..."
                    className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-2 focus:ring-orange-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {(search || activeFilterCount > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterSite('');
                      setFilterStatus('');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                    className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            
            {/* ✅ Filters Section */}
            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
              <div className="flex gap-4 items-end flex-wrap">
                {/* Site Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Site</label>
                  <select
                    value={filterSite}
                    onChange={(e) => setFilterSite(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <option value="" className="text-gray-500">All Sites</option>
                    {sites.map(site => (
                      <option key={site} value={site} className="text-gray-900">{site}</option>
                    ))}
                  </select>
                </div>
                
                {/* Status Filter */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <option value="" className="text-gray-500">All Status</option>
                    <option value="pending" className="text-gray-900">Pending</option>
                    <option value="approved" className="text-gray-900">Approved</option>
                    <option value="transferred" className="text-gray-900">Transferred</option>
                    <option value="cancelled" className="text-gray-900">Cancelled</option>
                  </select>
                </div>
                
                {/* Date From */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                
                {/* Date To */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                
                {/* Clear Filters Button */}
                <button
                  onClick={() => {
                    setFilterSite('');
                    setFilterStatus('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="px-5 py-2.5 bg-white border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 text-gray-700 text-sm font-semibold rounded-lg transition-all"
                >
                  Clear Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
              </div>
            </div>
          </div>
          {indents.length > 0 ? (
            <>
              <table className="min-w-full border text-sm">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">#</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">PO-ID</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Image</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Site</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Requested By</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {indents.map((indent, index) => (
                    <tr
                      key={indent._id}
                      className="cursor-pointer hover:bg-orange-50/40"
                      onDoubleClick={() => handleViewDetails(indent._id)}
                      title="Double-click to open details"
                    >
                      <td className="border px-4 py-2 text-gray-600">
                        {(currentPage - 1) * 20 + index + 1}
                      </td>
                      <td className="border px-4 py-2 font-medium text-gray-900">
                        {indent.indentId || 'N/A'}
                      </td>
                      <td className="border px-4 py-2">
                        {indent.imageUrl ? (
                          <div className="flex items-center gap-2">
                            <img 
                              src={resolveFileUrl(indent.imageUrl)}
                              alt="Intent"
                              className="w-12 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                              onClick={() => handleViewImage(indent.imageUrl)}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-12 h-12 bg-orange-100 rounded border border-orange-200 items-center justify-center hidden">
                              <ImageIcon size={20} className="text-orange-500" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No image</span>
                        )}
                      </td>
                      <td className="border px-4 py-2 text-gray-700">{indent.deliverySite || 'N/A'}</td>
                      <td className="border px-4 py-2">{indent.requestedBy?.name || indent.requestedBy || 'N/A'}</td>
                      <td className="border px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(indent.status)}`}>
                          {indent.status?.charAt(0).toUpperCase() + indent.status?.slice(1)}
                        </span>
                      </td>
                      <td className="border px-4 py-2 text-gray-600">
                        {formatDate(indent.createdAt)}
                      </td>
                      <td className="border px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(indent._id);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {indent.type === 'indent' && indent.imageUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAddMaterial(indent._id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
                              title="Add Material"
                            >
                              <Plus size={14} />
                              Add
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(indent._id, indent.indentId || indent.purchaseOrderId, indent.type);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                            disabled={deleting}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">
                {search ? 'No indents found matching your search' : 'No indents found'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedIndent && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50"
          onClick={closeModal}
        >
          <div 
            className={`bg-white rounded-lg shadow-xl w-full max-h-[92vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-out ${
              showManualMaterialForm ? 'max-w-7xl' : 'max-w-4xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-6 py-4 rounded-t-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">
                    Purchase Order Details
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-orange-50">
                    <span className="font-semibold">{selectedIndent.purchaseOrderId || selectedIndent.indentId}</span>
                    <span>{formatDate(selectedIndent.requestDate || selectedIndent.createdAt)}</span>
                    <span>{selectedIndent.requestedBy?.name || selectedIndent.requestedBy || 'N/A'}</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                      {selectedIndent.status?.charAt(0).toUpperCase() + selectedIndent.status?.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selectedIndent.imageUrl && (
                    <a
                      href={resolveFileUrl(selectedIndent.imageUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25"
                    >
                      <ExternalLink size={16} />
                      Open Image
                    </a>
                  )}
                  {selectedIndent.type === 'indent' && selectedIndent.imageUrl && !editing && (
                    <button
                      type="button"
                      onClick={handleOpenManualMaterialForm}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
                        showManualMaterialForm
                          ? 'bg-white text-orange-600'
                          : 'bg-white text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      <Plus size={16} />
                      Add Material
                    </button>
                  )}
                  <button
                    onClick={closeModal}
                    className="text-white hover:text-orange-100 transition-colors p-2 hover:bg-orange-600 rounded-lg"
                    title="Close"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {/* Intent PO Information */}
              {!showManualMaterialForm && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-200">
                  Intent PO Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">PO ID</p>
                    <p className="font-medium text-gray-900">{selectedIndent.purchaseOrderId || selectedIndent.indentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {editing ? (
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
                        style={{ color: '#111827' }}
                      >
                        <option value="pending" style={{ color: '#111827', backgroundColor: '#FFFFFF' }}>Pending</option>
                        <option value="approved" style={{ color: '#111827', backgroundColor: '#FFFFFF' }}>Approved</option>
                        <option value="transferred" style={{ color: '#111827', backgroundColor: '#FFFFFF' }}>Transferred</option>
                        <option value="cancelled" style={{ color: '#111827', backgroundColor: '#FFFFFF' }}>Cancelled</option>
                      </select>
                    ) : (
                      <div className="mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedIndent.status)}`}>
                          {selectedIndent.status?.charAt(0).toUpperCase() + selectedIndent.status?.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Delivery Site</p>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.deliverySite}
                        onChange={(e) => setFormData({ ...formData, deliverySite: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{selectedIndent.deliverySite || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Requested By</p>
                    {/* ❌ ALWAYS READ-ONLY - Cannot be edited in any mode */}
                    <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded text-gray-700 font-medium">
                      {selectedIndent.requestedBy?.name || selectedIndent.requestedBy || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Request Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedIndent.requestDate || selectedIndent.createdAt)}</p>
                  </div>
                </div>
              </div>
              )}

              {/* Uploaded image */}
              {selectedIndent.imageUrl && !showManualMaterialForm && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-200">
                    Uploaded Intent Image
                  </h3>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={resolveFileUrl(selectedIndent.imageUrl)}
                      alt="Uploaded intent"
                      className="w-full max-h-[60vh] object-contain bg-white"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="hidden min-h-48 items-center justify-center p-6 text-center text-gray-500">
                      Image could not be loaded. The file may be missing or unavailable.
                    </div>
                    <div className="flex flex-wrap justify-end gap-3 border-t bg-white px-4 py-3">
                      <a
                        href={resolveFileUrl(selectedIndent.imageUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        Open Image
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {showManualMaterialForm && selectedIndent.imageUrl && (
                <div className="mb-6 overflow-hidden rounded-lg border border-orange-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-orange-200 bg-orange-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {manualMaterialMode === 'edit' ? 'Edit Material' : 'Add Material From Uploaded Image'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {manualMaterialMode === 'edit'
                          ? `Update this material without creating a duplicate on ${selectedIndent.purchaseOrderId || selectedIndent.indentId}.`
                          : `Keep the image visible while saving materials to ${selectedIndent.purchaseOrderId || selectedIndent.indentId}.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {materialSuccessMessage && (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                          <CheckCircle size={16} />
                          {materialSuccessMessage}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={closeManualMaterialForm}
                        className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                        disabled={addingMaterial}
                      >
                        Close Form
                      </button>
                    </div>
                  </div>

                  <div className="grid max-h-none grid-cols-1 lg:max-h-[calc(92vh-210px)] lg:grid-cols-[minmax(0,48%)_minmax(0,52%)]">
                    <div className="border-b border-orange-100 bg-gray-50 lg:border-b-0 lg:border-r">
                      <div className="flex h-full flex-col p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">Uploaded image reference</p>
                            <p className="text-xs text-gray-500">Zoom: {imageZoom}%</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setImageZoom(prev => Math.max(60, prev - 20))}
                              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
                              title="Zoom out"
                            >
                              <ZoomOut size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageZoom(100)}
                              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
                              title="Reset zoom"
                            >
                              <RotateCcw size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageZoom(prev => Math.min(220, prev + 20))}
                              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
                              title="Zoom in"
                            >
                              <ZoomIn size={16} />
                            </button>
                            <a
                              href={resolveFileUrl(selectedIndent.imageUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                            >
                              <ExternalLink size={14} />
                              Full
                            </a>
                          </div>
                        </div>
                        <div className="flex-1 overflow-auto rounded-lg border bg-white">
                          <img
                            src={resolveFileUrl(selectedIndent.imageUrl)}
                            alt="Uploaded intent reference"
                            className="mx-auto max-w-none object-contain bg-white transition-all duration-150"
                            style={{ width: `${imageZoom}%` }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden min-h-64 items-center justify-center p-6 text-center text-gray-500">
                            Image could not be loaded. Open the full image from the button above.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex max-h-none flex-col overflow-hidden lg:max-h-[calc(92vh-210px)]">
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold text-gray-800">
                                {manualMaterialMode === 'edit' ? 'Update Material Details' : 'Material Details'}
                              </h4>
                              <p className="text-sm text-gray-500">Required fields are marked with *</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Material / Category <span className="text-red-500">*</span>
                              </label>
                              <input
                                value={manualMaterial.category}
                                onChange={(e) => updateManualMaterial('category', e.target.value)}
                                list="manual-material-categories"
                                placeholder="Select or type material"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                              />
                              <datalist id="manual-material-categories">
                                {categories.map(category => (
                                  <option key={category} value={category} />
                                ))}
                              </datalist>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sub Category</label>
                              <input
                                value={manualMaterial.subCategory}
                                onChange={(e) => updateManualMaterial('subCategory', e.target.value)}
                                list="manual-material-subcategories"
                                placeholder="Select or type sub category"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                              />
                              <datalist id="manual-material-subcategories">
                                {getSubcategories(manualMaterial.category).map(option => (
                                  <option key={option} value={option} />
                                ))}
                              </datalist>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sub Category 1</label>
                              <input
                                value={manualMaterial.subCategory1}
                                onChange={(e) => updateManualMaterial('subCategory1', e.target.value)}
                                list="manual-material-subcategory1"
                                placeholder="Select or type sub category 1"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                              />
                              <datalist id="manual-material-subcategory1">
                                {getSubSubcategories(manualMaterial.category, manualMaterial.subCategory).map(option => (
                                  <option key={option} value={option} />
                                ))}
                              </datalist>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sub Category 2</label>
                              <input
                                value={manualMaterial.subCategory2}
                                onChange={(e) => updateManualMaterial('subCategory2', e.target.value)}
                                list="manual-material-subcategory2"
                                placeholder="Select or type sub category 2"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                              />
                              <datalist id="manual-material-subcategory2">
                                {getSubCategory2(manualMaterial.category, manualMaterial.subCategory, manualMaterial.subCategory1).map(option => (
                                  <option key={option} value={option} />
                                ))}
                              </datalist>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Quantity <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={manualMaterial.quantity}
                                onChange={(e) => updateManualMaterial('quantity', e.target.value)}
                                placeholder="Enter quantity"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit</label>
                              <select
                                value={manualMaterial.uom}
                                onChange={(e) => updateManualMaterial('uom', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
                              >
                                <option value="Nos">Nos</option>
                                <option value="pcs">pcs</option>
                                <option value="bags">bags</option>
                                <option value="kg">kg</option>
                                <option value="mtr">mtr</option>
                                <option value="box">box</option>
                                <option value="set">set</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vendor</label>
                              <select
                                value={manualMaterial.vendor}
                                onChange={(e) => updateManualMaterial('vendor', e.target.value)}
                                disabled={!vendors || vendors.length === 0}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white disabled:bg-gray-100"
                              >
                                <option value="">Select Vendor</option>
                                {vendors && Array.isArray(vendors) && vendors.map(vendor => (
                                  <option key={vendor._id} value={vendor._id}>
                                    {vendor.companyName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks / Specification</label>
                              <textarea
                                value={manualMaterial.remarks}
                                onChange={(e) => updateManualMaterial('remarks', e.target.value)}
                                rows={3}
                                placeholder="Add size, brand, specification, or note"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-gray-200 bg-white">
                          <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                            <h4 className="text-base font-semibold text-gray-800">
                              Added Materials ({selectedIndent.materials?.length || 0})
                            </h4>
                          </div>
                          {selectedIndent.materials && selectedIndent.materials.length > 0 ? (
                            <div className="max-h-72 overflow-auto">
                              {selectedIndent.materials.map((material, index) => {
                                const rowKey = getMaterialRowKey(material, index);
                                return (
                                  <div
                                    key={rowKey}
                                    className={`border-b px-4 py-3 text-sm last:border-b-0 transition-colors ${
                                      rowKey === lastAddedMaterialId ? 'bg-green-50 ring-1 ring-inset ring-green-200' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="font-semibold text-gray-900">{material.itemName || '-'}</p>
                                        <p className="mt-1 text-xs text-gray-500">
                                          {[material.category, material.subCategory, material.subCategory1, material.subCategory2]
                                            .filter(Boolean)
                                            .join(' / ') || 'No category details'}
                                        </p>
                                      </div>
                                      <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">
                                        {material.quantity || '-'} {material.uom || 'Nos'}
                                      </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleEditManualMaterial(material)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                      >
                                        <Edit2 size={14} />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setMaterialToDelete(material)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                                      >
                                        <Trash2 size={14} />
                                        Delete
                                      </button>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
                                      <span>Vendor: {material.vendor?.companyName || 'N/A'}</span>
                                      <span>Added: {material.createdAt ? formatDate(material.createdAt) : formatDate(selectedIndent.updatedAt || selectedIndent.createdAt)}</span>
                                    </div>
                                    {material.remarks && (
                                      <p className="mt-2 text-xs text-gray-600">{material.remarks}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="px-4 py-6 text-center text-sm text-gray-500">
                              No materials added to this Intent PO yet.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-white px-4 py-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={closeManualMaterialForm}
                          className="rounded-lg bg-gray-200 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-300"
                          disabled={addingMaterial}
                        >
                          Cancel
                        </button>
                        {manualMaterialMode !== 'edit' && (
                          <button
                            type="button"
                            onClick={() => handleSaveManualMaterial(true)}
                            disabled={addingMaterial}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-50 px-4 py-2.5 font-semibold text-orange-600 ring-1 ring-orange-200 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {addingMaterial ? 'Saving...' : 'Save & Add Another'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveManualMaterial(false)}
                          disabled={addingMaterial}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {addingMaterial ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              {manualMaterialMode === 'edit' ? 'Update Material' : 'Save Material'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!showManualMaterialForm && (
              <>
              {/* Materials List */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-orange-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Added Materials ({editing ? formData.materials?.length : selectedIndent.materials?.length || 0} items)
                  </h3>
                </div>
                
                {editing ? (
                  <div className="space-y-2">
                    {Array.isArray(formData.materials) && formData.materials.length > 0 ? (
                      formData.materials.map((material, idx) => (
                        <MaterialLineItem
                          key={material.id}
                          material={material}
                          index={idx}
                          isEditing={editingMaterialId === material.id}
                          onEdit={() => setEditingMaterialId(material.id)}
                          onDoneEditing={() => setEditingMaterialId(null)}
                          onRemove={() => removeMaterialRow(material.id)}
                          onUpdate={(fieldName, value) => {
                            if (fieldName === 'category') {
                              updateMaterial(material.id, { category: value, subCategory: '', subCategory1: '', subCategory2: '' });
                            } else if (fieldName === 'subCategory') {
                              updateMaterial(material.id, { subCategory: value, subCategory1: '', subCategory2: '' });
                            } else if (fieldName === 'subCategory1') {
                              updateMaterial(material.id, { subCategory1: value, subCategory2: '' });
                            } else {
                              updateMaterial(material.id, { [fieldName]: value });
                            }
                          }}
                          categories={categories}
                          getSubcategories={getSubcategories}
                          getSubSubcategories={getSubSubcategories}
                          getSubSubSubcategories={getSubCategory2}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No materials added</p>
                    )}
                    
                    {/* Vendor Selection Table in Edit Mode */}
                    {Array.isArray(formData.materials) && formData.materials.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Assign Vendors to Materials</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="border px-3 py-2 text-left font-medium text-gray-700">#</th>
                                <th className="border px-3 py-2 text-left font-medium text-gray-700">Material</th>
                                <th className="border px-3 py-2 text-left font-medium text-gray-700">Quantity</th>
                                <th className="border px-3 py-2 text-left font-medium text-gray-700">Vendor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.materials.map((material, index) => (
                                <tr key={material.id} className="hover:bg-gray-50">
                                  <td className="border px-3 py-2 text-gray-600">{index + 1}</td>
                                  <td className="border px-3 py-2">
                                    {material.category}{material.subCategory ? ` - ${material.subCategory}` : ''}
                                    {material.subCategory1 ? ` - ${material.subCategory1}` : ''}
                                    {material.subCategory2 ? ` - ${material.subCategory2}` : ''}
                                  </td>
                                  <td className="border px-3 py-2">{material.quantity || '-'} {material.uom || 'Nos'}</td>
                                  <td className="border px-3 py-2">
                                    <select
                                      value={material.vendor || ''}
                                      onChange={(e) => updateMaterial(material.id, { vendor: e.target.value })}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 bg-white"
                                      disabled={!vendors || vendors.length === 0}
                                    >
                                      <option value="">Select Vendor</option>
                                      {vendors && Array.isArray(vendors) && vendors.map(vendor => (
                                        <option key={vendor._id} value={vendor._id}>
                                          {vendor.companyName}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  selectedIndent.materials && selectedIndent.materials.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border text-sm">
                        <thead className="bg-orange-50">
                          <tr>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">#</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Item Name</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Category/Type</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Quantity</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">UOM</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">VendorName</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Remarks</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Added Date</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedIndent.materials.map((material, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border px-3 py-2 text-gray-600">{index + 1}</td>
                              <td className="border px-3 py-2 font-medium">{material.itemName || '-'}</td>
                              <td className="border px-3 py-2 text-gray-600">
                                {[material.category, material.subCategory, material.subCategory1, material.subCategory2]
                                  .filter(Boolean)
                                  .join(' / ') || '-'}
                              </td>
                              <td className="border px-3 py-2">{material.quantity || '-'}</td>
                              <td className="border px-3 py-2">{material.uom || '-'}</td>
                              <td className="border px-3 py-2 text-gray-600">
                                {material.vendor?.companyName || 'N/A'}
                              </td>
                              <td className="border px-3 py-2 text-gray-600">{material.remarks || '-'}</td>
                              <td className="border px-3 py-2 text-gray-600">
                                {material.createdAt ? formatDate(material.createdAt) : formatDate(selectedIndent.updatedAt || selectedIndent.createdAt)}
                              </td>
                              <td className="border px-3 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditManualMaterial(material)}
                                    className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMaterialToDelete(material)}
                                    className="inline-flex items-center gap-1.5 rounded bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No materials listed</p>
                  )
                )}
              </div>

              {/* Attachments/Images */}
              {selectedIndent.attachments && selectedIndent.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-200">
                    Attachments ({selectedIndent.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedIndent.attachments.map((attachment, index) => {
                      // ✅ Handle both old string format and new Cloudinary object format
                      const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                      const fileURL = resolveFileUrl(attachmentUrl);
                      const fileName = attachmentUrl.split('/').pop();
                      const isImage = attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                      
                      return (
                        <div key={index} className="border rounded-lg overflow-hidden bg-white">
                          <div className="flex items-center gap-4 p-4">
                            {/* Image Thumbnail */}
                            <div className="flex-shrink-0">
                              {isImage ? (
                                <img 
                                  src={fileURL} 
                                  alt={fileName}
                                  className="w-20 h-20 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23f3f4f6" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="30"%3E🖼️%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              ) : (
                                <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded border">
                                  <span className="text-3xl">📎</span>
                                </div>
                              )}
                            </div>
                            
                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {isImage ? 'Image' : 'File'} • Attachment {index + 1}
                              </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-shrink-0">
                              <a
                                href={fileURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                              >
                                View
                              </a>
                              <a
                                href={fileURL}
                                download={fileName}
                                className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => handleDeleteAttachment(index)}
                                disabled={deletingAttachment === index}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                title="Delete this attachment"
                              >
                                <Trash2 size={12} />
                                {deletingAttachment === index ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-gray-50 rounded p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Created At</p>
                    <p className="font-medium text-gray-700">{formatDate(selectedIndent.createdAt)}</p>
                  </div>
                  {selectedIndent.updatedAt && (
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-700">{formatDate(selectedIndent.updatedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
              </>
              )}
            </div>

            {/* Modal Footer */}
            {!showManualMaterialForm && (
              <div className="bg-white border-t-2 border-orange-100 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              {editing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
              </div>
            )}
          </div>
        </div>
      )}

      {materialToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-red-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Material</h3>
              <p className="mt-1 text-sm text-gray-600">
                Are you sure you want to delete this material?
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="rounded-lg bg-red-50 px-4 py-3">
                <p className="font-semibold text-gray-900">
                  {materialToDelete.itemName || materialToDelete.category || 'Selected material'}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Only this material will be removed. The Intent PO and uploaded image will stay unchanged.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                disabled={deletingMaterial}
                className="rounded-lg bg-white px-4 py-2.5 font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteManualMaterial}
                disabled={deletingMaterial}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deletingMaterial ? 'Deleting...' : 'Delete Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
