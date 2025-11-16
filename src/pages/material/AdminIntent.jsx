import { useState, useEffect } from "react";
import { purchaseOrderAPI, materialCatalogAPI as materialAPI } from "../../utils/materialAPI";
import { Eye, Trash2, X, Edit2, Save, Plus } from "lucide-react";
import MaterialLineItem from "./MaterialLineItem";

export default function AdminIntent() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchMaterialsAndSites();
  }, [currentPage, search]);

  // Fetch materials and sites for editing
  const fetchMaterialsAndSites = async () => {
    try {
      // Fetch materials
      const materials = await materialAPI.getAll();
      setAllMaterials(materials || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(materials.map(item => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setCategories(uniqueCategories);
      
      // Hardcoded sites list
      const sitesList = ['Site A', 'Site B', 'Site C', 'Site D', 'Site E'].sort();
      setSites(sitesList);
    } catch (err) {
      console.error('Error fetching materials and sites:', err);
    }
  };

  // Listen for intent creation events from client side
  useEffect(() => {
    const handleIntentCreated = () => {
      fetchPurchaseOrders();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'intentRefresh') {
        fetchPurchaseOrders();
        localStorage.removeItem('intentRefresh');
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
      fetchPurchaseOrders();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage, search]);

  // Periodic polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPurchaseOrders();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentPage, search]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await purchaseOrderAPI.getAll(currentPage, 20, search);
      if (response.success) {
        const sortedData = (response.data || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setPurchaseOrders(sortedData);
        setTotalPages(response.pagination?.totalPages || 1);
      } else {
        setError('Failed to fetch purchase orders');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const response = await purchaseOrderAPI.getById(id);
      if (response.success) {
        setSelectedPO(response.data);
        setShowDetailsModal(true);
      }
    } catch (err) {
      setError('Failed to fetch PO details');
    }
  };

  const handleDelete = async (id, poId) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Order ${poId}?`)) {
      return;
    }

    try {
      setDeleting(true);
      const response = await purchaseOrderAPI.delete(id);
      
      if (response.success) {
        // Update state immediately without full refresh
        setPurchaseOrders(prev => prev.filter(po => po._id !== id));
        
        // Close modal if it's open
        if (selectedPO?._id === id) {
          setShowDetailsModal(false);
          setSelectedPO(null);
        }
        
        // Notify client side
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        
        showToast('Purchase order deleted successfully', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete purchase order', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedPO(null);
    setEditing(false);
    setFormData({});
  };

  const handleEdit = () => {
    // Convert materials to editable format
    const editableMaterials = selectedPO.materials.map((m, idx) => {
      // Parse itemName to extract category parts if needed
      const parts = m.itemName?.split(' - ') || [];
      return {
        id: Date.now() + idx,
        category: m.category || parts[0] || '',
        subCategory: m.subCategory || parts[1] || '',
        subCategory1: m.subCategory1 || parts[2] || '',
        quantity: m.quantity || '',
        uom: m.uom || 'Nos',
        remarks: m.remarks || ''
      };
    });
    
    setFormData({
      status: selectedPO.status,
      remarks: selectedPO.remarks || '',
      requestedBy: selectedPO.requestedBy,
      deliverySite: selectedPO.deliverySite,
      materials: editableMaterials
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
      
      // Prepare materials data
      const materialsData = formData.materials.map(m => ({
        itemName: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}`,
        category: m.category,
        subCategory: m.subCategory || '',
        subCategory1: m.subCategory1 || '',
        quantity: parseInt(m.quantity),
        uom: m.uom || 'Nos',
        remarks: m.remarks || ''
      }));
      
      const updateData = {
        status: formData.status,
        remarks: formData.remarks,
        requestedBy: formData.requestedBy,
        deliverySite: formData.deliverySite,
        materials: materialsData
      };
      
      const response = await purchaseOrderAPI.update(selectedPO._id, updateData);
      
      if (response.success) {
        // Update the modal data immediately
        const updatedResponse = await purchaseOrderAPI.getById(selectedPO._id);
        if (updatedResponse.success) {
          setSelectedPO(updatedResponse.data);
          
          // Update the list state immediately
          setPurchaseOrders(prev => 
            prev.map(po => po._id === selectedPO._id ? updatedResponse.data : po)
          );
        }
        
        setEditing(false);
        
        // Notify client side
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        
        showToast('Purchase order updated successfully', 'success');
      }
    } catch (err) {
      console.error('Error updating purchase order:', err);
      showToast(err.response?.data?.message || 'Failed to update purchase order', 'error');
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

  // Helper functions for materials
  const getSubcategories = (category) => {
    return [...new Set(
      allMaterials
        .filter(item => item.category === category)
        .map(item => item.subCategory)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  };

  const getSubSubcategories = (category, subCategory) => {
    return [...new Set(
      allMaterials
        .filter(item => item.category === category && item.subCategory === subCategory)
        .map(item => item.subCategory1)
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

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Intent (PO)</h1>
          <p className="text-sm text-gray-500">View all purchase order requests</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-medium">Error:</span>
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={fetchPurchaseOrders}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-600 text-sm">Loading purchase orders...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Purchase Orders Table ({purchaseOrders.length} records)
            </h2>
            <input
              type="text"
              placeholder="Search by PO ID, site, or person..."
              className="border border-gray-300 rounded p-2 w-80 focus:ring-2 focus:ring-orange-400 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {purchaseOrders.length > 0 ? (
            <>
              <table className="min-w-full border text-sm">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">PO-ID</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Delivery Site</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Requested By</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Materials</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2 font-medium text-gray-900">
                        {po.purchaseOrderId}
                      </td>
                      <td className="border px-4 py-2">{po.deliverySite}</td>
                      <td className="border px-4 py-2">{po.requestedBy}</td>
                      <td className="border px-4 py-2">
                        <span className="text-gray-600">
                          {po.materials?.length || 0} items
                        </span>
                      </td>
                      <td className="border px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                          {po.status?.charAt(0).toUpperCase() + po.status?.slice(1)}
                        </span>
                      </td>
                      <td className="border px-4 py-2 text-gray-600">
                        {formatDate(po.requestDate)}
                      </td>
                      <td className="border px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(po._id)}
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(po._id, po.purchaseOrderId)}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
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
                {search ? 'No purchase orders found matching your search' : 'No purchase orders found'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPO && (
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
              <h2 className="text-xl font-semibold text-gray-800">
                Purchase Order Details
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">PO-ID</label>
                  <p className="text-gray-900 font-medium">{selectedPO.purchaseOrderId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  {editing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="transferred">Transferred</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedPO.status)}`}>
                        {selectedPO.status}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Delivery Site</label>
                  {editing ? (
                    <select
                      value={formData.deliverySite}
                      onChange={(e) => setFormData({ ...formData, deliverySite: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    >
                      <option value="">Select Site</option>
                      {sites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{selectedPO.deliverySite}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requested By</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.requestedBy}
                      onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    />
                  ) : (
                    <p className="text-gray-900">{selectedPO.requestedBy}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Request Date</label>
                  <p className="text-gray-900">{formatDate(selectedPO.requestDate)}</p>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-sm font-medium text-gray-600">Remarks</label>
                {editing ? (
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    rows="3"
                    placeholder="Add remarks..."
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{selectedPO.remarks || '-'}</p>
                )}
              </div>

              {/* Materials */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-600">Materials</label>
                  {editing && (
                    <button
                      onClick={addMaterialRow}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      <Plus size={16} />
                      Add Material
                    </button>
                  )}
                </div>
                
                {editing ? (
                  <div className="space-y-2">
                    {formData.materials && formData.materials.length > 0 ? (
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
                              updateMaterial(material.id, { category: value, subCategory: '', subCategory1: '' });
                            } else if (fieldName === 'subCategory') {
                              updateMaterial(material.id, { subCategory: value, subCategory1: '' });
                            } else {
                              updateMaterial(material.id, { [fieldName]: value });
                            }
                          }}
                          categories={categories}
                          getSubcategories={getSubcategories}
                          getSubSubcategories={getSubSubcategories}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No materials added</p>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UOM</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPO.materials.map((material, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{material.itemName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{material.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{material.uom || 'Nos'}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{material.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedPO.attachments && selectedPO.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Attachments</label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPO.attachments.map((attachment, index) => (
                      <img
                        key={index}
                        src={`http://localhost:5002${attachment}`}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}
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
                    onClick={handleSaveEdit}
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
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
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
  );
}