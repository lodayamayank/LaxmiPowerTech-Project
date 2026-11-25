// src/pages/material/transfers/components/useSiteTransfers.js
// Data and state for the admin Site transfers page: list + filters, details/edit dialog state, save (with the
// approve-then-sync flow), delete transfer / attachment. Moved unchanged from AdminSiteTransfer.jsx; only the DOM
// toast became a sonner toast and the two window.confirm prompts became a ConfirmDialog request.
import { useState, useEffect } from "react";
import { showToast } from '@/lib/showToast';
import { toast } from "sonner";
import { EVENTS } from '@/lib/events';
import { fetchMaterialCatalogCached } from '@/hooks/useMaterialCatalog';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { siteTransferAPI } from "@/api/material";

export default function useSiteTransfers() {
  // ==================== STATE MANAGEMENT ====================
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState(null);
  // const [deleting, setDeleting] = useState(false); 
  
  // ✅ Filter states
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sites, setSites] = useState([]);
  
  // Material catalog states - Same as AdminIntent
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    fetchTransfers();
    fetchSites();
    fetchMaterialsAndCategories();
  }, [currentPage]);
  
  // ✅ Fetch sites for filter dropdown
  const fetchSites = async () => {
    try {
      const branches = await fetchBranchesCached();
      const sitesList = branches.map(branch => branch.name).sort();
      setSites(sitesList);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    }
  };
  
  // Fetch materials and categories - Same as AdminIntent
  const fetchMaterialsAndCategories = async () => {
    try {
      const materials = await fetchMaterialCatalogCached();
      setAllMaterials(materials || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setAllMaterials([]);
      setCategories([]);
    }
  };

  // Helper functions for materials - Same as AdminIntent
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

  // ❌ DISABLED: Auto-refresh removed per client request
  // No event listeners, no auto-polling, no auto-refresh
  // Data loads only on initial mount and manual page reload

  // ❌ DISABLED: Auto-refresh on focus removed per client request

  // ❌ DISABLED: Periodic polling removed per client request
  // No automatic refresh - data loads only on manual page reload

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await siteTransferAPI.getAll(currentPage, 20);
      if (response.success) {
        // Sort by newest first
        const sortedData = (response.data || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setTransfers(sortedData);
        setTotalPages(response.pagination?.totalPages || 1);
      } else {
        setError('Failed to fetch site transfers');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load site transfers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== MODAL ACTIONS ====================
  const handleViewDetails = async (id) => {
    try {
      const response = await siteTransferAPI.getById(id);
      if (response.success) {
        setSelectedTransfer(response.data);
        setShowDetailsModal(true);
      }
    } catch (err) {
      console.error("Error fetching transfer details:", err);
      showToast("Failed to load transfer details", 'error');
    }
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedTransfer(null);
    setEditing(false);
    setFormData({});
  };

  // ==================== EDIT FUNCTIONALITY ====================
  const handleEdit = () => {
    setEditing(true);
    
    // Convert materials to editable format with categories - Same as AdminIntent
    const editableMaterials = (selectedTransfer.materials || []).map((m, idx) => {
      // Parse itemName to extract categories
      const parts = m.itemName?.split(' - ') || [];
      
      return {
        id: m.id || `material-${Date.now()}-${idx}`,
        category: m.category || parts[0] || '',
        subCategory: m.subCategory || parts[1] || '',
        subCategory1: m.subCategory1 || parts[2] || '',
        subCategory2: m.subCategory2 || parts[3] || '',
        quantity: m.quantity || '',
        uom: m.uom || 'Nos',
        remarks: m.remarks || '',
        itemName: m.itemName
      };
    });
    
    setFormData({
      fromSite: selectedTransfer.fromSite,
      toSite: selectedTransfer.toSite,
      requestedBy: selectedTransfer.requestedBy,
      status: selectedTransfer.status,
      materials: editableMaterials
    });
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({});
  };

  const handleSaveChanges = async () => {
    // Validate form - Same as Intent PO and MaterialCardDetails
    if (!formData.fromSite || !formData.fromSite.trim()) {
      showToast('Please select From Site', 'error');
      return;
    }
    if (!formData.toSite || !formData.toSite.trim()) {
      showToast('Please select To Site', 'error');
      return;
    }
    // Validate materials exist
    if (!formData.materials || formData.materials.length === 0) {
      showToast('Please add at least one material', 'error');
      return;
    }

    try {
      setSaving(true);
      
      // Format materials for API - rebuild itemName from categories
      const formattedMaterials = formData.materials.map(m => ({
        itemName: m.itemName || `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}${m.subCategory2 ? ' - ' + m.subCategory2 : ''}`,
        category: m.category || '',
        subCategory: m.subCategory || '',
        subCategory1: m.subCategory1 || '',
        subCategory2: m.subCategory2 || '',
        quantity: parseInt(m.quantity) || 0,
        uom: m.uom || 'Nos',
        remarks: m.remarks || ''
      }));
      
      const updateData = {
        ...formData,
        materials: formattedMaterials
      };
      
      // ✅ Check if status is being changed to 'approved' (matching Intent PO workflow)
      const isApproving = formData.status === 'approved' && selectedTransfer.status !== 'approved';
      
      let response;
      
      if (isApproving) {
        // ✅ Step 1: Save changes first (without status change)
        const saveData = { ...updateData };
        delete saveData.status;  // Keep status as current
        
        const saveResponse = await siteTransferAPI.update(selectedTransfer._id, saveData);
        if (!saveResponse.success) {
          throw new Error('Failed to save changes');
        }
        
        // ✅ Step 2: Call approval endpoint (which will sync to Upcoming Deliveries)
        response = await siteTransferAPI.approve(selectedTransfer._id);
        
        showToast('Site transfer approved and synced to Upcoming Deliveries!', 'success');
      } else {
        // Regular update
        response = await siteTransferAPI.update(selectedTransfer._id, updateData);
      }
      
      if (response.success) {
        // Refresh modal data
        const updatedResponse = await siteTransferAPI.getById(selectedTransfer._id);
        if (updatedResponse.success) {
          setSelectedTransfer(updatedResponse.data);
          
          // Update list state immediately
          setTransfers(prev => 
            prev.map(t => t._id === selectedTransfer._id ? updatedResponse.data : t)
          );
        }
        
        setEditing(false);
        
        // ✅ SYNC TO UPCOMING DELIVERIES - Notify all components
        window.dispatchEvent(new Event(EVENTS.siteTransferCreated));
        window.dispatchEvent(new Event(EVENTS.upcomingDeliveryRefresh));
        localStorage.setItem(EVENTS.siteTransferRefresh, Date.now().toString());
        localStorage.setItem(EVENTS.upcomingDeliveryRefresh, Date.now().toString());
        
        if (!isApproving) {
          showToast("Site transfer updated successfully!", 'success');
        }
      }
    } catch (err) {
      console.error("Error updating transfer:", err);
      showToast(err.response?.data?.message || "Failed to update site transfer", 'error');
    } finally {
      setSaving(false);
    }
  };

  // ==================== MATERIAL MANAGEMENT - Same as AdminIntent ====================
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

  // ==================== DELETE FUNCTIONALITY ====================
  const handleDelete = async (id) => {
    try {
      setLoading(true);
      const response = await siteTransferAPI.delete(id);
      if (response.success) {
        // Remove from table without refresh
        setTransfers(transfers.filter((t) => t._id !== id));
        
        // Close modal if it's open
        if (selectedTransfer?._id === id) {
          setShowDetailsModal(false);
          setSelectedTransfer(null);
        }
        
        showToast("Site transfer and associated files deleted successfully", 'success');
      }
    } catch (err) {
      console.error("Error deleting transfer:", err);
      showToast(err.response?.data?.message || "Failed to delete site transfer", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentIndex) => {
    try {
      setDeletingAttachment(attachmentIndex);
      const response = await siteTransferAPI.deleteAttachment(selectedTransfer._id, attachmentIndex);
      
      if (response.success) {
        // Update the selected transfer with the new data
        setSelectedTransfer(response.data);
        
        // Also update the transfer in the main list
        setTransfers(prevTransfers => 
          prevTransfers.map(t => 
            t._id === selectedTransfer._id ? response.data : t
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

  // ==================== UTILITY FUNCTIONS ====================

  // ==================== CONFIRMATIONS (replace the old window.confirm prompts) ====================
  // confirm: { kind: "transfer", id, label } | { kind: "attachment", index } | null
  const [confirm, setConfirm] = useState(null);
  const requestDelete = (transfer) => setConfirm({ kind: "transfer", id: transfer._id, label: transfer.siteTransferId });
  const requestDeleteAttachment = (index) => setConfirm({ kind: "attachment", index });
  const runConfirm = async () => {
    const c = confirm;
    if (!c) return;
    if (c.kind === "transfer") await handleDelete(c.id);
    else await handleDeleteAttachment(c.index);
    setConfirm(null);
  };

  // ✅ Enhanced filter and sort transfers
  const filteredTransfers = transfers
    // ✅ CRITICAL: Only filter out TRANSFERRED Site Transfers (Admin should see Approved + Partial)
    .filter((transfer) => transfer.status?.toLowerCase() !== 'transferred')
    .filter((transfer) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = (
          transfer.siteTransferId?.toLowerCase().includes(searchLower) ||
          transfer.fromSite?.toLowerCase().includes(searchLower) ||
          transfer.toSite?.toLowerCase().includes(searchLower) ||
          transfer.requestedBy?.toLowerCase().includes(searchLower) ||
          transfer.status?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // Site filter (matches either fromSite or toSite)
      if (filterSite) {
        const matchesSite = (
          transfer.fromSite?.toLowerCase().includes(filterSite.toLowerCase()) ||
          transfer.toSite?.toLowerCase().includes(filterSite.toLowerCase())
        );
        if (!matchesSite) return false;
      }
      
      // Status filter
      if (filterStatus) {
        if (transfer.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }
      
      // Date from filter
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        const itemDate = new Date(transfer.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        if (itemDate < fromDate) return false;
      }
      
      // Date to filter
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        const itemDate = new Date(transfer.createdAt);
        if (itemDate > toDate) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const fromSiteCompare = (a.fromSite || '').localeCompare(b.fromSite || '');
      if (fromSiteCompare !== 0) return fromSiteCompare;
      return (a.toSite || '').localeCompare(b.toSite || '');
    });

  return {
    transfers, loading, error, search, setSearch, currentPage, setCurrentPage, totalPages,
    selectedTransfer, showDetailsModal, editing, formData, setFormData, saving, deletingAttachment,
    filterSite, setFilterSite, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, sites,
    categories, getSubcategories, getSubSubcategories, getSubCategory2, editingMaterialId, setEditingMaterialId,
    fetchTransfers, handleViewDetails, closeModal, handleEdit, handleCancelEdit, handleSaveChanges,
    addMaterialRow, removeMaterialRow, updateMaterial, filteredTransfers,
    confirm, setConfirm, requestDelete, requestDeleteAttachment, runConfirm,
  };
}
