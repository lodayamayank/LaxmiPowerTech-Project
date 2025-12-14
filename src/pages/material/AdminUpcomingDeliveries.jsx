import { useState, useEffect, useRef } from "react";
import { upcomingDeliveryAPI, indentAPI, purchaseOrderAPI, branchesAPI } from "../../utils/materialAPI";
import { Eye, Trash2, X, Edit2, Save, Upload, Image as ImageIcon } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../utils/axios";

export default function AdminUpcomingDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  useEffect(() => {
    fetchDeliveries();
    fetchSites();
  }, [currentPage, search, filterSite, filterStatus, filterDateFrom, filterDateTo]);
  
  // ✅ Fetch sites for filter dropdown
  const fetchSites = async () => {
    try {
      const branches = await branchesAPI.getAll();
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
      const response = await upcomingDeliveryAPI.getAll(currentPage, 20, search);
      if (response.success) {
        let sortedData = (response.data || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        
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
        
        setDeliveries(sortedData);
        setTotalPages(response.pagination?.pages || 1);
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
          } catch (err) {
            // Silently ignore - related data is optional
          }
        }
      }
    } catch (err) {
      alert("Failed to load delivery details");
    }
  };

  const handleDelete = async (id, stId) => {
    if (!window.confirm(`Are you sure you want to delete Upcoming Delivery ${stId}?`)) {
      return;
    }

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
        window.dispatchEvent(new Event('intentCreated'));
        window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        
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
      
      console.log('📤 Sending item updates:', itemUpdates);
      console.log('📊 Calculated Status:', calculatedStatus);
      
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
        window.dispatchEvent(new Event('intentCreated'));
        window.dispatchEvent(new Event('siteTransferCreated'));
        window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        localStorage.setItem('siteTransferRefresh', Date.now().toString());
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        console.log(`✅ Upcoming Delivery updated - Status: ${calculatedStatus} - syncing back to Intent PO and Site Transfer`);
        
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

  const getStatusBadge = (status) => {
    const statusColors = {
      'Pending': 'bg-gray-100 text-gray-600',
      'Partial': 'bg-orange-100 text-orange-600',
      'Transferred': 'bg-green-100 text-green-600'
    };
    
    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-600';
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {status}
      </span>
    );
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

  // ✅ UPLOAD DELIVERY RECEIPT IMAGES
  const handleUploadReceipts = async (files) => {
    if (!files || files.length === 0) return;
    
    try {
      setUploadingReceipt(true);
      console.log(`📤 Uploading ${files.length} receipt(s)...`);
      
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
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }
    
    try {
      setDeletingAttachment(attachmentIndex);
      console.log(`🗑️ Deleting attachment ${attachmentIndex}...`);
      
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

  // Delete All handler
  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all records? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await upcomingDeliveryAPI.deleteAll();
      
      if (response.success) {
        // Clear local state
        setDeliveries([]);
        setTotalPages(1);
        setCurrentPage(1);
        
        // Notify other components
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        
        showToast(`Successfully deleted all ${response.deletedCount} upcoming deliveries`, 'success');
      }
    } catch (err) {
      console.error('Delete all error:', err);
      showToast(err.response?.data?.message || 'Failed to delete all upcoming deliveries', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Upcoming Deliveries">
    <div className="flex-1 p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Upcoming Deliveries</h1>
          <p className="text-sm text-gray-500">View and manage upcoming deliveries</p>
        </div>
        <button
          onClick={handleDeleteAll}
          disabled={deliveries.length === 0 || deleting}
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
            onClick={fetchDeliveries}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-600 text-sm">Loading upcoming deliveries...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-700">
                Upcoming Deliveries ({deliveries.length} records)
              </h2>
              <input
                type="text"
                placeholder="Search by Transfer Number..."
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
                    <option value="Pending" className="text-gray-900">Pending</option>
                    <option value="Partial" className="text-gray-900">Partial</option>
                    <option value="Transferred" className="text-gray-900">Transferred</option>
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

          {deliveries.length > 0 ? (
            <>
              <table className="min-w-full border text-sm">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Transfer No</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">From</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">To</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Items</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <tr key={delivery._id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2 font-medium text-gray-900">{delivery.transfer_number}</td>
                      <td className="border px-4 py-2 text-gray-600">
                        {formatDate(delivery.date)}
                      </td>
                      <td className="border px-4 py-2">{delivery.from}</td>
                      <td className="border px-4 py-2">{delivery.to}</td>
                      <td className="border px-4 py-2">
                        <span className="text-gray-600">
                          {delivery.items?.length || 0} items
                        </span>
                      </td>
                      <td className="border px-4 py-2">
                        {getStatusBadge(delivery.status)}
                      </td>
                      <td className="border px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(delivery._id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(delivery._id, delivery.st_id)}
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
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No upcoming deliveries found</p>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedDelivery && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Delivery Details - {selectedDelivery.st_id}
                </h2>
                <p className="text-sm text-orange-100">Transfer Number: {selectedDelivery.transfer_number}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-white hover:text-orange-100 transition-colors p-1 hover:bg-orange-600 rounded"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">From</label>
                  <p className="text-gray-900">{selectedDelivery.from}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">To</label>
                  <p className="text-gray-900">{selectedDelivery.to}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Date</label>
                  <p className="text-gray-900">{formatDate(selectedDelivery.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <div>{getStatusBadge(selectedDelivery.status)}</div>
                      <span className="text-xs text-orange-600 italic">→ Auto-updates on save</span>
                    </div>
                  ) : (
                    <div>{getStatusBadge(selectedDelivery.status)}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created By</label>
                  <p className="text-gray-900">{selectedDelivery.createdBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-gray-900">{selectedDelivery.type || 'ST'}</p>
                </div>
              </div>

              {/* Image Display (for PO type with related Indent) */}
              {selectedDelivery.type === 'PO' && relatedIndent && relatedIndent.imageUrl && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Image</h3>
                  <div className="border rounded-lg overflow-hidden inline-block">
                    <img
                      src={`${axios.defaults.baseURL.replace('/api', '')}${relatedIndent.imageUrl}`}
                      alt="Intent"
                      className="max-w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(`${axios.defaults.baseURL.replace('/api', '')}${relatedIndent.imageUrl}`, '_blank')}
                      onError={(e) => {
                        console.error('Image load error:', relatedIndent.imageUrl);
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Items Table - Modern Design */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Materials</h3>
                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gradient-to-r from-orange-500 to-orange-600">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Sub Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Sub Category 1</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Requested</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Received</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(editing ? formData.items : selectedDelivery.items).map((item, index) => {
                          // If status is Transferred but received_quantity is 0, use st_quantity
                          const displayReceivedQty = (selectedDelivery.status === 'Transferred' && (!item.received_quantity || item.received_quantity === 0)) 
                            ? item.st_quantity 
                            : item.received_quantity;
                          
                          const isFullyReceived = displayReceivedQty >= item.st_quantity;
                          const isPartiallyReceived = displayReceivedQty > 0 && displayReceivedQty < item.st_quantity;
                          
                          return (
                            <tr key={item._id || index} className="hover:bg-orange-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {/* ✅ For PO items, show full name; for ST items, show category */}
                                {item.name || item.category || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{item.sub_category || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{item.sub_category1 || '—'}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  {item.st_quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {editing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.st_quantity}
                                    value={item.received_quantity}
                                    onChange={(e) => updateItem(index, 'received_quantity', e.target.value)}
                                    className="w-24 border-2 border-orange-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-semibold bg-white shadow-sm"
                                  />
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    isFullyReceived ? 'bg-green-100 text-green-800' : 
                                    isPartiallyReceived ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {displayReceivedQty}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {editing ? (
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={item.is_received}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        // Update both fields at once
                                        const updatedItems = [...formData.items];
                                        const currentItem = updatedItems[index];
                                        updatedItems[index] = {
                                          ...currentItem,
                                          is_received: isChecked,
                                          received_quantity: isChecked ? currentItem.st_quantity : currentItem.received_quantity
                                        };
                                        setFormData({ ...formData, items: updatedItems });
                                      }}
                                      className="w-5 h-5 accent-orange-500 cursor-pointer rounded border-2 border-gray-300 focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    {isFullyReceived ? (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                        ✓ Complete
                                      </span>
                                    ) : isPartiallyReceived ? (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                        ⚠ Partial
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                        ○ Pending
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ✅ ATTACHMENTS SECTION - Intent PO Images & Delivery Receipts */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-orange-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Attachments ({selectedDelivery.attachments?.length || 0})
                  </h3>
                  <label className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer flex items-center gap-2 text-sm font-medium">
                    <Upload size={16} />
                    {uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingReceipt}
                      onChange={(e) => handleUploadReceipts(e.target.files)}
                    />
                  </label>
                </div>
                
                {selectedDelivery.attachments && selectedDelivery.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDelivery.attachments.map((attachment, index) => {
                      // ✅ Handle both old string format and new Cloudinary object format
                      const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                      const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                      const fileURL = attachmentUrl.startsWith('http') ? attachmentUrl : `${baseURL}${attachmentUrl}`;
                      const fileName = attachmentUrl.split('/').pop();
                      const isImage = attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                      
                      return (
                        <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="relative">
                            {/* Image Thumbnail */}
                            {isImage ? (
                              <img 
                                src={fileURL} 
                                alt={fileName}
                                className="w-full h-48 object-cover cursor-pointer"
                                onClick={() => window.open(fileURL, '_blank')}
                                onError={(e) => {
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="40"%3E🖼️%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                                <span className="text-6xl">📎</span>
                              </div>
                            )}
                            
                            {/* Delete Button Overlay */}
                            <button
                              onClick={() => handleDeleteAttachment(index)}
                              disabled={deletingAttachment === index}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                              title="Delete attachment"
                            >
                              {deletingAttachment === index ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                          
                          {/* File Info */}
                          <div className="p-3 bg-white border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                            <div className="flex justify-between items-center mt-2">
                              <p className="text-xs text-gray-500">
                                {isImage ? 'Image' : 'File'} • Attachment {index + 1}
                              </p>
                              <a
                                href={fileURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View Full
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <ImageIcon size={48} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">No attachments</p>
                    <p className="text-gray-400 text-xs mt-1">Upload delivery receipt images here</p>
                  </div>
                )}
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
                    onClick={handleSaveChanges}
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
                    onClick={closeModal}
                    className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    <Edit2 size={16} />
                    Edit
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