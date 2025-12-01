import { useState, useEffect } from "react";
import { siteTransferAPI, branchesAPI } from "../../utils/materialAPI";
import { Eye, Trash2, X, Edit2, Save } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function AdminSiteTransfer() {
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
  const [deleting, setDeleting] = useState(false);
  
  // ✅ Filter states
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sites, setSites] = useState([]);

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    fetchTransfers();
    fetchSites();
  }, [currentPage]);
  
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
    setFormData({
      fromSite: selectedTransfer.fromSite,
      toSite: selectedTransfer.toSite,
      requestedBy: selectedTransfer.requestedBy,
      status: selectedTransfer.status,
      materials: selectedTransfer.materials.map(m => ({ ...m }))
    });
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({});
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const response = await siteTransferAPI.update(selectedTransfer._id, formData);
      
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
        window.dispatchEvent(new Event('siteTransferCreated'));
        window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
        localStorage.setItem('siteTransferRefresh', Date.now().toString());
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        console.log('✅ Site Transfer updated - syncing to Upcoming Deliveries');
        
        showToast("Site transfer updated successfully and synced to Upcoming Deliveries!", 'success');
      }
    } catch (err) {
      console.error("Error updating transfer:", err);
      showToast(err.response?.data?.message || "Failed to update site transfer", 'error');
    } finally {
      setSaving(false);
    }
  };

  // ==================== MATERIAL MANAGEMENT ====================
  const updateMaterial = (index, field, value) => {
    const updatedMaterials = [...formData.materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: value
    };
    setFormData({ ...formData, materials: updatedMaterials });
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { itemName: '', quantity: '', uom: '', remarks: '' }]
    });
  };

  const removeMaterial = (index) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, i) => i !== index)
    });
  };

  // ==================== DELETE FUNCTIONALITY ====================
  const handleDelete = async (id, siteTransferId) => {
    if (!window.confirm(`Are you sure you want to delete Site Transfer ${siteTransferId}? All associated images will also be deleted from the server.`)) {
      return;
    }

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
    if (!window.confirm('Are you sure you want to delete this attachment? The file will be permanently removed from the server.')) {
      return;
    }

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
      const response = await siteTransferAPI.deleteAll();
      
      if (response.success) {
        // Clear local state
        setTransfers([]);
        setTotalPages(1);
        setCurrentPage(1);
        
        // Notify other components
        window.dispatchEvent(new Event('siteTransferCreated'));
        localStorage.setItem('siteTransferRefresh', Date.now().toString());
        
        showToast(`Successfully deleted all ${response.deletedCount} site transfers`, 'success');
      }
    } catch (err) {
      console.error('Delete all error:', err);
      showToast(err.response?.data?.message || 'Failed to delete all site transfers', 'error');
    } finally {
      setDeleting(false);
    }
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
      pending: 'bg-gray-100 text-gray-700',
      approved: 'bg-orange-100 text-orange-600',
      transferred: 'bg-green-100 text-green-600',
      cancelled: 'bg-red-100 text-red-600'
    };
    
    const colorClass = statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  // ✅ Enhanced filter and sort transfers
  const filteredTransfers = transfers
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

  // ==================== RENDER ====================
  return (
    <DashboardLayout title="Site Transfers">
      <div className="flex-1 p-6 bg-gray-50">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Site Transfers</h1>
            <p className="text-sm text-gray-500">View all site transfer requests</p>
          </div>
          <button
            onClick={handleDeleteAll}
            disabled={transfers.length === 0 || deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 size={18} />
            {deleting ? 'Deleting...' : 'Delete All'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">Error:</span>
              <span className="text-red-700">{error}</span>
            </div>
            <button
              onClick={fetchTransfers}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600 text-sm">Loading site transfers...</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-700">
                  Site Transfers ({filteredTransfers.length} records)
                </h2>
                <input
                  type="text"
                  placeholder="Search by ST ID, site, or person..."
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
                      <option value="in-transit" className="text-gray-900">In Transit</option>
                      <option value="delivered" className="text-gray-900">Delivered</option>
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

            {/* Table */}
            {filteredTransfers.length > 0 ? (
              <>
                <table className="min-w-full border text-sm">
                  <thead className="bg-orange-100">
                    <tr>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">Site Transfer ID</th>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">From Site</th>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">To Site</th>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">Requested By</th>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">Materials</th>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">Status</th>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">Date</th>
                      <th className="border px-4 py-2 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map((transfer) => (
                      <tr key={transfer._id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2 font-medium text-gray-900">
                          {transfer.siteTransferId}
                        </td>
                        <td className="border px-4 py-2">{transfer.fromSite}</td>
                        <td className="border px-4 py-2">{transfer.toSite}</td>
                        <td className="border px-4 py-2">{transfer.requestedBy}</td>
                        <td className="border px-4 py-2">
                          <span className="text-gray-600">
                            {transfer.materials?.length || 0} items
                          </span>
                        </td>
                        <td className="border px-4 py-2">
                          {getStatusBadge(transfer.status)}
                        </td>
                        <td className="border px-4 py-2 text-gray-600">
                          {formatDate(transfer.createdAt)}
                        </td>
                        <td className="border px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(transfer._id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(transfer._id, transfer.siteTransferId)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
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
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center mt-10">
                {search ? "No matching transfers found." : "No site transfers found."}
              </p>
            )}
          </div>
        )}

        {/* ==================== DETAILS MODAL ==================== */}
        {showDetailsModal && selectedTransfer && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50"
            onClick={closeModal}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
                <h2 className="text-xl font-bold text-white">
                  Site Transfer Details
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
                {/* Transfer Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-200">
                    Transfer Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Site Transfer ID</p>
                      <p className="font-medium text-gray-900">{selectedTransfer.siteTransferId}</p>
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
                        <div className="mt-1">{getStatusBadge(selectedTransfer.status)}</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">From Site</p>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.fromSite}
                          onChange={(e) => setFormData({ ...formData, fromSite: e.target.value })}
                          className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
                        />
                      ) : (
                        <p className="font-medium text-gray-900">{selectedTransfer.fromSite}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">To Site</p>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.toSite}
                          onChange={(e) => setFormData({ ...formData, toSite: e.target.value })}
                          className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
                        />
                      ) : (
                        <p className="font-medium text-gray-900">{selectedTransfer.toSite}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Requested By</p>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.requestedBy}
                          onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                          className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
                        />
                      ) : (
                        <p className="font-medium text-gray-900">{selectedTransfer.requestedBy}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Request Date</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedTransfer.requestDate || selectedTransfer.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Materials List */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <h3 className="text-lg font-semibold text-gray-700">
                      Materials ({editing ? formData.materials?.length : selectedTransfer.materials?.length || 0} items)
                    </h3>
                    {editing && (
                      <button
                        onClick={addMaterial}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        + Add Material
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border text-sm">
                        <thead className="bg-orange-50">
                          <tr>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">#</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Item Name</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Quantity</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">UOM</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Remarks</th>
                            <th className="border px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.materials.map((material, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border px-3 py-2 text-gray-600">{index + 1}</td>
                              <td className="border px-3 py-2">
                                <input
                                  type="text"
                                  value={material.itemName || ''}
                                  onChange={(e) => updateMaterial(index, 'itemName', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400"
                                  placeholder="Item name"
                                />
                              </td>
                              <td className="border px-3 py-2">
                                <input
                                  type="number"
                                  value={material.quantity || ''}
                                  onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400"
                                  placeholder="Qty"
                                />
                              </td>
                              <td className="border px-3 py-2">
                                <input
                                  type="text"
                                  value={material.uom || ''}
                                  onChange={(e) => updateMaterial(index, 'uom', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400"
                                  placeholder="UOM"
                                />
                              </td>
                              <td className="border px-3 py-2">
                                <input
                                  type="text"
                                  value={material.remarks || ''}
                                  onChange={(e) => updateMaterial(index, 'remarks', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400"
                                  placeholder="Remarks"
                                />
                              </td>
                              <td className="border px-3 py-2">
                                <button
                                  onClick={() => removeMaterial(index)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Remove"
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    selectedTransfer.materials && selectedTransfer.materials.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="border px-3 py-2 text-left font-medium text-gray-700">#</th>
                              <th className="border px-3 py-2 text-left font-medium text-gray-700">Item Name</th>
                              <th className="border px-3 py-2 text-left font-medium text-gray-700">Quantity</th>
                              <th className="border px-3 py-2 text-left font-medium text-gray-700">UOM</th>
                              <th className="border px-3 py-2 text-left font-medium text-gray-700">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTransfer.materials.map((material, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border px-3 py-2 text-gray-600">{index + 1}</td>
                                <td className="border px-3 py-2 font-medium">{material.itemName || '-'}</td>
                                <td className="border px-3 py-2">{material.quantity || '-'}</td>
                                <td className="border px-3 py-2">{material.uom || '-'}</td>
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
                {selectedTransfer.attachments && selectedTransfer.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-200">
                      Attachments ({selectedTransfer.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {selectedTransfer.attachments.map((attachment, index) => {
                        // Handle both Cloudinary object format { url, publicId } and legacy string format
                        const attachmentURL = typeof attachment === 'object' ? attachment.url : attachment;
                        const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                        const fileURL = attachmentURL.startsWith('http') ? attachmentURL : `${baseURL}/${attachmentURL}`;
                        const fileName = attachmentURL.split('/').pop();
                        const isImage = attachmentURL.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                        
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
                      <p className="font-medium text-gray-700">{formatDate(selectedTransfer.createdAt)}</p>
                    </div>
                    {selectedTransfer.updatedAt && (
                      <div>
                        <p className="text-gray-500">Last Updated</p>
                        <p className="font-medium text-gray-700">{formatDate(selectedTransfer.updatedAt)}</p>
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
