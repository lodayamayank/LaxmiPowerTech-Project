import { useState, useEffect } from "react";
import { upcomingDeliveryAPI } from "../../utils/materialAPI";
import { Eye, Trash2, X, Edit2, Save } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";

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

  useEffect(() => {
    fetchDeliveries();
  }, [currentPage, search]);

  // Listen for Intent creation events
  useEffect(() => {
    const handleIntentCreated = () => {
      console.log('🔔 Intent created - refreshing Admin Upcoming Deliveries');
      fetchDeliveries();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'intentRefresh' || e.key === 'upcomingDeliveryRefresh') {
        fetchDeliveries();
        localStorage.removeItem(e.key);
      }
    };

    window.addEventListener('intentCreated', handleIntentCreated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('intentCreated', handleIntentCreated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing Admin Upcoming Deliveries data');
      fetchDeliveries();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage, search]);

  // Periodic polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh - fetching latest Admin Upcoming Deliveries data');
      fetchDeliveries();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [currentPage, search]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await upcomingDeliveryAPI.getAll(currentPage, 20, search);
      if (response.success) {
        const sortedData = (response.data || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
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
      
      // Update status if changed
      if (formData.status !== selectedDelivery.status) {
        await upcomingDeliveryAPI.updateStatus(selectedDelivery._id, formData.status);
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
        
        // Trigger sync events for Intent PO (if this delivery is linked to a PO)
        window.dispatchEvent(new Event('intentCreated'));
        window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        
        showToast("Upcoming delivery updated successfully!", 'success');
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

  return (
    <DashboardLayout title="Upcoming Deliveries">
    <div className="flex-1 p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Upcoming Deliveries</h1>
          <p className="text-sm text-gray-500">View and manage upcoming deliveries</p>
        </div>
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Deliveries Table ({deliveries.length} records)
            </h2>
            <input
              type="text"
              placeholder="Search by ST-ID or Transfer Number..."
              className="border border-gray-300 rounded p-2 w-80 focus:ring-2 focus:ring-orange-400 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {deliveries.length > 0 ? (
            <>
              <table className="min-w-full border text-sm">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">ST-ID</th>
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
                      <td className="border px-4 py-2 font-medium text-gray-900">
                        {delivery.st_id}
                      </td>
                      <td className="border px-4 py-2">{delivery.transfer_number}</td>
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
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Delivery Details - {selectedDelivery.st_id}
                </h2>
                <p className="text-sm text-gray-500">Transfer Number: {selectedDelivery.transfer_number}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
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
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Transferred">Transferred</option>
                    </select>
                  ) : (
                    <div>{getStatusBadge(selectedDelivery.status)}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created By</label>
                  <p className="text-gray-900">{selectedDelivery.createdBy}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-3 py-2 text-left">Category</th>
                        <th className="border px-3 py-2 text-left">Sub Category</th>
                        <th className="border px-3 py-2 text-left">Sub Category 1</th>
                        <th className="border px-3 py-2 text-right">ST Qty</th>
                        <th className="border px-3 py-2 text-right">Received Qty</th>
                        <th className="border px-3 py-2 text-center">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? formData.items : selectedDelivery.items).map((item, index) => (
                        <tr key={item._id || index} className="hover:bg-gray-50">
                          <td className="border px-3 py-2">{item.category}</td>
                          <td className="border px-3 py-2">{item.sub_category}</td>
                          <td className="border px-3 py-2">{item.sub_category1}</td>
                          <td className="border px-3 py-2 text-right font-medium">{item.st_quantity}</td>
                          <td className="border px-3 py-2 text-right">
                            {editing ? (
                              <input
                                type="number"
                                min="0"
                                max={item.st_quantity}
                                value={item.received_quantity}
                                onChange={(e) => updateItem(index, 'received_quantity', e.target.value)}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-right"
                              />
                            ) : (
                              item.received_quantity
                            )}
                          </td>
                          <td className="border px-3 py-2 text-center">
                            {editing ? (
                              <input
                                type="checkbox"
                                checked={item.is_received}
                                onChange={(e) => updateItem(index, 'is_received', e.target.checked)}
                                className="w-4 h-4 accent-orange-500"
                              />
                            ) : (
                              <span className={`inline-block w-4 h-4 rounded ${item.is_received ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              {editing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors flex items-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
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