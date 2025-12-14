import { useState, useEffect } from "react";
import { indentAPI, purchaseOrderAPI, materialCatalogAPI as materialAPI, branchesAPI, vendorsAPI } from "../../utils/materialAPI";
import { Eye, Trash2, X, Edit2, Save, Plus, Image as ImageIcon } from "lucide-react";
import MaterialLineItem from "./MaterialLineItem";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../utils/axios";

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
        purchaseOrderId: item.indentId // Use indentId as PO-ID
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
      
      // ✅ Apply filters client-side
      let filteredData = combinedData;
      
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

  const handleViewDetails = async (id) => {
    try {
      // ✅ CRITICAL FIX: Fetch fresh data from backend instead of using stale state
      const indent = indents.find(i => i._id === id);
      
      if (!indent) {
        setError('Indent not found');
        return;
      }
      
      // Determine if this is a PurchaseOrder or Indent based on type field
      const isPurchaseOrder = indent.type === 'purchaseOrder' || indent.purchaseOrderId;
      
      // Fetch fresh data from backend
      const response = isPurchaseOrder 
        ? await purchaseOrderAPI.getById(id)
        : await indentAPI.getById(id);
      
      if (response.success) {
        // Use fresh data from backend
        setSelectedIndent({
          ...response.data,
          type: isPurchaseOrder ? 'purchaseOrder' : 'indent'
        });
        setShowDetailsModal(true);
        console.log('✅ Loaded fresh Intent PO data from backend');
      } else {
        setError('Failed to fetch latest indent details');
      }
    } catch (err) {
      console.error('Error fetching indent details:', err);
      setError('Failed to fetch indent details');
      showToast('Failed to load latest indent details', 'error');
    }
  };

  const handleViewImage = (imageUrl) => {
    if (imageUrl) {
      window.open(`${axios.defaults.baseURL}${imageUrl}`, '_blank');
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
      const isPurchaseOrder = selectedIndent.type === 'purchaseOrder' || selectedIndent.purchaseOrderId;
      
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
  };

  const handleEdit = () => {
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
      const materialsData = materialsArray.map(m => ({
        itemName: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}${m.subCategory2 ? ' - ' + m.subCategory2 : ''}`,
        category: m.category,
        subCategory: m.subCategory || '',
        subCategory1: m.subCategory1 || '',
        subCategory2: m.subCategory2 || '',
        quantity: parseInt(m.quantity),
        uom: m.uom || 'Nos',
        remarks: m.remarks || '',
        vendor: m.vendor || null // Include vendor selection
      })) || selectedIndent.materials;
      
      const updateData = {
        status: formData.status,
        remarks: formData.remarks,
        requestedBy: formData.requestedBy,
        deliverySite: formData.deliverySite,
        materials: materialsData
      };
      
      // Use appropriate API based on type
      const response = selectedIndent.type === 'purchaseOrder'
        ? await purchaseOrderAPI.update(selectedIndent._id, updateData)
        : await indentAPI.update(selectedIndent._id, updateData);
      
      if (response.success) {
        // Fetch fresh data from server (like demonstrated project)
        const updatedResponse = selectedIndent.type === 'purchaseOrder'
          ? await purchaseOrderAPI.getById(selectedIndent._id)
          : await indentAPI.getById(selectedIndent._id);
        
        if (updatedResponse.success) {
          setSelectedIndent(updatedResponse.data);
          
          // Update the list state immediately
          setIndents(prev => 
            prev.map(item => item._id === selectedIndent._id ? updatedResponse.data : item)
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
      console.error('Error updating:', err);
      showToast(err.response?.data?.message || 'Failed to update', 'error');
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

  const addMaterialRow = () => {
    const newMaterialId = `material-${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      materials: [
        ...(Array.isArray(prev.materials) ? prev.materials : []),
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

  return (
    <DashboardLayout title="Intent (PO)">
    <div className="flex-1 p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Intent (PO)</h1>
          <p className="text-sm text-gray-500">View all purchase order requests</p>
        </div>
        <button
          onClick={handleDeleteAll}
          disabled={indents.length === 0 || deleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Trash2 size={18} />
          {deleting ? 'Deleting...' : 'Delete All'}
        </button>
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
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-700">
                Purchase Orders Table ({indents.length} records)
              </h2>
              <input
                type="text"
                placeholder="Search by PO ID..."
                className="border border-gray-300 rounded p-2 w-80 focus:ring-2 focus:ring-orange-400 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
          {indents.length > 0 ? (
            <>
              <table className="min-w-full border text-sm">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">PO-ID</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Image</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Requested By</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {indents.map((indent) => (
                    <tr key={indent._id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2 font-medium text-gray-900">
                        {indent.indentId || 'N/A'}
                      </td>
                      <td className="border px-4 py-2">
                        {indent.imageUrl ? (
                          <div className="flex items-center gap-2">
                            <img 
                              src={`${axios.defaults.baseURL}${indent.imageUrl}`}
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
                      <td className="border px-4 py-2">{indent.requestedBy || 'N/A'}</td>
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
                            onClick={() => handleViewDetails(indent._id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(indent._id, indent.indentId || indent.purchaseOrderId, indent.type)}
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
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold text-white">
                Purchase Order Details
              </h2>
              <button
                onClick={closeModal}
                className="text-white hover:text-orange-100 transition-colors p-1 hover:bg-orange-600 rounded"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              {/* Intent PO Information */}
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
                      {selectedIndent.requestedBy || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Request Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedIndent.requestDate || selectedIndent.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Materials List */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-orange-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Materials ({editing ? formData.materials?.length : selectedIndent.materials?.length || 0} items)
                  </h3>
                  {editing && (
                    <button
                      onClick={addMaterialRow}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      + Add Material
                    </button>
                  )}
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
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Quantity</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">UOM</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">VendorName</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedIndent.materials.map((material, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border px-3 py-2 text-gray-600">{index + 1}</td>
                              <td className="border px-3 py-2 font-medium">{material.itemName || '-'}</td>
                              <td className="border px-3 py-2">{material.quantity || '-'}</td>
                              <td className="border px-3 py-2">{material.uom || '-'}</td>
                              <td className="border px-3 py-2 text-gray-600">
                                {material.vendor?.companyName || 'N/A'}
                              </td>
                              <td className="border px-3 py-2 text-gray-600">{material.remarks || '-'}</td>
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
                      const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                      const fileURL = attachmentUrl.startsWith('http') ? attachmentUrl : `${baseURL}${attachmentUrl}`;
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
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t-2 border-orange-100 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
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
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}