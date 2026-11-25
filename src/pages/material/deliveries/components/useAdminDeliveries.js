// src/pages/material/deliveries/components/useAdminDeliveries.js
// Data and state for the admin Upcoming deliveries page: list + client-side filters/paging, details/edit dialog state,
// save (status auto-calculated from received quantities), receipt upload, delete delivery / attachment.
// Moved unchanged from AdminUpcomingDeliveries.jsx; only the DOM toast became a sonner toast, the alert() a toast
// and the two window.confirm prompts a ConfirmDialog request.
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { EVENTS } from '@/lib/events';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { upcomingDeliveryAPI, indentAPI, purchaseOrderAPI } from "@/api/material";

const ITEMS_PER_PAGE = 20;

export default function useAdminDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [relatedIndent, setRelatedIndent] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState(null);
  const fileInputRef = useRef(null);
  
  // ✅ Filter states
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sites, setSites] = useState([]);
  const [openSummary, setOpenSummary] = useState({ open: 0, partial: 0, pending: 0 });

  useEffect(() => {
    fetchDeliveries();
    fetchSites();
  }, [currentPage, search, filterSite, filterStatus, filterDateFrom, filterDateTo]);
  
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

  // ❌ DISABLED: Auto-refresh removed per client request
  // No event listeners, no auto-polling, no auto-refresh
  // Data loads only on initial mount and manual page reload

  // ❌ DISABLED: Auto-refresh on focus removed per client request

  // ❌ DISABLED: Periodic polling removed per client request
  // No automatic refresh - data loads only on manual page reload

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await upcomingDeliveryAPI.getAll(1, 1000, search);
      if (response.success) {
        let sortedData = (response.data || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // ✅ CRITICAL: Filter out transferred deliveries (they should only appear in GRN)
        sortedData = sortedData.filter(item => item.status?.toLowerCase() !== 'transferred');

        // Totals for the summary cards (before the user's filters)
        const countStatus = (name) => sortedData.filter(item => item.status?.toLowerCase() === name).length;
        setOpenSummary({ open: sortedData.length, partial: countStatus('partial'), pending: countStatus('pending') });
        
        // ✅ Apply filters client-side
        if (filterSite) {
          sortedData = sortedData.filter(item => 
            item.from?.toLowerCase().includes(filterSite.toLowerCase()) ||
            item.to?.toLowerCase().includes(filterSite.toLowerCase())
          );
        }
        
        if (filterStatus) {
          sortedData = sortedData.filter(item => 
            item.status?.toLowerCase() === filterStatus.toLowerCase()
          );
        }
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          sortedData = sortedData.filter(item => {
            const itemDate = new Date(item.date || item.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= fromDate;
          });
        }
        
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          sortedData = sortedData.filter(item => {
            const itemDate = new Date(item.date || item.createdAt);
            return itemDate <= toDate;
          });
        }
        
        const nextTotalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE));
        const safePage = Math.min(currentPage, nextTotalPages);
        const startIndex = (safePage - 1) * ITEMS_PER_PAGE;

        if (safePage !== currentPage) {
          setCurrentPage(safePage);
        }

        setDeliveries(sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE));
        setTotalRecords(sortedData.length);
        setTotalPages(nextTotalPages);
      } else {
        setError('Failed to fetch upcoming deliveries');
      }
    } catch (err) {
      console.error("Error fetching upcoming deliveries:", err);
      setError(err.response?.data?.message || 'Failed to load upcoming deliveries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const response = await upcomingDeliveryAPI.getById(id);
      if (response.success) {
        setSelectedDelivery(response.data);
        setShowDetailsModal(true);
        
        // Try to fetch related Intent PO data (optional, don't fail if it errors)
        if (response.data.type === 'PO' && response.data.st_id) {
          try {
            const stId = response.data.st_id;
            // Try to fetch related PO/Indent, but silently fail if not found
            if (stId.startsWith('PO')) {
              const poList = await purchaseOrderAPI.getAll(1, 100, stId).catch(() => null);
              if (poList?.success && poList.data) {
                const matchedPO = poList.data.find(po => po.purchaseOrderId === stId);
                if (matchedPO) setRelatedIndent(matchedPO);
              }
            } else if (stId.match(/^[0-9a-fA-F]{24}$/)) {
              const indentResponse = await indentAPI.getById(stId).catch(() => null);
              if (indentResponse?.success) setRelatedIndent(indentResponse.data);
            }
          } catch {
            // Silently ignore - related data is optional
          }
        }
      }
    } catch {
      toast.error("Failed to load delivery details");
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      const response = await upcomingDeliveryAPI.delete(id);
      if (response.success) {
        // Update state immediately
        setDeliveries(prev => prev.filter((d) => d._id !== id));
        
        if (selectedDelivery?._id === id) {
          setShowDetailsModal(false);
          setSelectedDelivery(null);
        }
        
        // Trigger sync events
        window.dispatchEvent(new Event(EVENTS.intentCreated));
        window.dispatchEvent(new Event(EVENTS.upcomingDeliveryRefresh));
        localStorage.setItem(EVENTS.intentRefresh, Date.now().toString());
        localStorage.setItem(EVENTS.upcomingDeliveryRefresh, Date.now().toString());
        
        showToast("Upcoming delivery deleted successfully", 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete upcoming delivery", 'error');
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedDelivery(null);
    setRelatedIndent(null);
    setEditing(false);
    setFormData({});
  };

  const handleEdit = () => {
    setEditing(true);
    setFormData({
      status: selectedDelivery.status,
      items: selectedDelivery.items.map(item => ({ ...item }))
    });
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({});
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Auto-calculate status based on received quantities
      const allFullyReceived = formData.items.every(item => item.received_quantity >= item.st_quantity);
      const anyPartiallyReceived = formData.items.some(item => item.received_quantity > 0 && item.received_quantity < item.st_quantity);
      const nothingReceived = formData.items.every(item => item.received_quantity === 0);
      
      let calculatedStatus;
      if (allFullyReceived) {
        calculatedStatus = 'Transferred';
      } else if (anyPartiallyReceived || formData.items.some(item => item.received_quantity > 0)) {
        calculatedStatus = 'Partial';
      } else if (nothingReceived) {
        calculatedStatus = 'Pending';
      } else {
        calculatedStatus = 'Partial'; // Default to Partial if mixed
      }
      
      // Update status (use calculated status instead of manual selection)
      if (calculatedStatus !== selectedDelivery.status) {
        await upcomingDeliveryAPI.updateStatus(selectedDelivery._id, calculatedStatus);
      }
      
      // Update items
      const itemUpdates = formData.items.map(item => ({
        itemId: item._id,
        received_quantity: item.received_quantity,
        is_received: item.is_received
      }));
      
      const response = await upcomingDeliveryAPI.updateItems(selectedDelivery._id, itemUpdates);
      if (response.success) {
        // Refresh modal data
        const updatedResponse = await upcomingDeliveryAPI.getById(selectedDelivery._id);
        if (updatedResponse.success) {
          setSelectedDelivery(updatedResponse.data);
          
          // Update list state immediately
          setDeliveries(prev => 
            prev.map(d => d._id === selectedDelivery._id ? updatedResponse.data : d)
          );
        }
        
        setEditing(false);
        
        // ✅ SYNC BACK TO SOURCE - Trigger sync events for Intent PO AND Site Transfer
        window.dispatchEvent(new Event(EVENTS.intentCreated));
        window.dispatchEvent(new Event(EVENTS.siteTransferCreated));
        window.dispatchEvent(new Event(EVENTS.upcomingDeliveryRefresh));
        localStorage.setItem(EVENTS.intentRefresh, Date.now().toString());
        localStorage.setItem(EVENTS.siteTransferRefresh, Date.now().toString());
        localStorage.setItem(EVENTS.upcomingDeliveryRefresh, Date.now().toString());
        
        showToast(`Delivery updated! Status: ${calculatedStatus}`, 'success');
      }
    } catch (err) {
      console.error("Error updating delivery:", err);
      showToast(err.response?.data?.message || "Failed to update upcoming delivery", 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'received_quantity' ? parseInt(value) || 0 : value
    };
    setFormData({ ...formData, items: updatedItems });
  };

  const toQuantity = (value) => {
    const quantity = Number(value || 0);
    return Number.isFinite(quantity) ? quantity : 0;
  };

  const formatQuantity = (value) => {
    const quantity = toQuantity(value);
    return Number.isInteger(quantity) ? quantity : Number(quantity.toFixed(2));
  };

  const getRequestedQuantity = (item = {}) => toQuantity(item.quantity ?? item.st_quantity);
  const getReceivedQuantity = (item = {}, deliveryStatus = '') => {
    const requestedQty = getRequestedQuantity(item);
    const receivedQty = toQuantity(item.received_quantity);
    return deliveryStatus === 'Transferred' && receivedQty === 0 ? requestedQty : receivedQty;
  };

  const getPendingQuantity = (item = {}, deliveryStatus = '') => (
    Math.max(getRequestedQuantity(item) - getReceivedQuantity(item, deliveryStatus), 0)
  );

  const getDeliveryQuantitySummary = (delivery = {}) => {
    const items = delivery.items || [];
    const requested = items.reduce((sum, item) => sum + getRequestedQuantity(item), 0);
    const received = items.reduce((sum, item) => sum + getReceivedQuantity(item, delivery.status), 0);
    const pending = Math.max(requested - received, 0);

    return {
      requested: formatQuantity(requested),
      received: formatQuantity(received),
      pending: formatQuantity(pending)
    };
  };

  // Toast helper (sonner)
  const showToast = (message, type = 'success') => {
    if (type === 'error') toast.error(message);
    else toast.success(message);
  };

  // ✅ UPLOAD DELIVERY RECEIPT IMAGES
  const handleUploadReceipts = async (files) => {
    if (!files || files.length === 0) return;
    
    try {
      setUploadingReceipt(true);
      
      const response = await upcomingDeliveryAPI.uploadReceipts(selectedDelivery._id, Array.from(files));
      
      if (response.success) {
        // Update selected delivery with new data
        setSelectedDelivery(response.data);
        
        // Update deliveries list
        setDeliveries(prev => 
          prev.map(d => d._id === selectedDelivery._id ? response.data : d)
        );
        
        showToast(`${files.length} receipt(s) uploaded successfully!`, 'success');
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      console.error('❌ Upload receipt error:', err);
      showToast(err.response?.data?.message || 'Failed to upload receipts', 'error');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // ✅ DELETE ATTACHMENT
  const handleDeleteAttachment = async (attachmentIndex) => {
    try {
      setDeletingAttachment(attachmentIndex);
      
      const response = await upcomingDeliveryAPI.deleteAttachment(selectedDelivery._id, attachmentIndex);
      
      if (response.success) {
        // Update selected delivery with new data
        setSelectedDelivery(response.data);
        
        // Update deliveries list
        setDeliveries(prev => 
          prev.map(d => d._id === selectedDelivery._id ? response.data : d)
        );
        
        showToast('Attachment deleted successfully', 'success');
      }
    } catch (err) {
      console.error('❌ Delete attachment error:', err);
      showToast(err.response?.data?.message || 'Failed to delete attachment', 'error');
    } finally {
      setDeletingAttachment(null);
    }
  };

  // ==================== CONFIRMATIONS (replace the old window.confirm prompts) ====================
  // confirm: { kind: "delivery", id, label } | { kind: "attachment", index } | null
  const [confirm, setConfirm] = useState(null);
  const requestDelete = (delivery) => setConfirm({ kind: "delivery", id: delivery._id, label: delivery.st_id });
  const requestDeleteAttachment = (index) => setConfirm({ kind: "attachment", index });
  const runConfirm = async () => {
    const c = confirm;
    if (!c) return;
    if (c.kind === "delivery") await handleDelete(c.id);
    else await handleDeleteAttachment(c.index);
    setConfirm(null);
  };


  return {
    deliveries, openSummary, loading, error, search, setSearch, currentPage, setCurrentPage, totalPages, totalRecords,
    selectedDelivery, showDetailsModal, editing, formData, setFormData, saving, deleting, relatedIndent, uploadingReceipt, deletingAttachment, fileInputRef,
    filterSite, setFilterSite, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, sites,
    fetchDeliveries, handleViewDetails, closeModal, handleEdit, handleCancelEdit, handleSaveChanges, updateItem, handleUploadReceipts,
    formatQuantity, getRequestedQuantity, getReceivedQuantity, getPendingQuantity, getDeliveryQuantitySummary,
    confirm, setConfirm, requestDelete, requestDeleteAttachment, runConfirm,
  };
}
