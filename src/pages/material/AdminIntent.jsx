import { useState, useEffect } from "react";
import { indentAPI, purchaseOrderAPI, materialCatalogAPI as materialAPI } from "../../utils/materialAPI";
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
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [editingMaterialId, setEditingMaterialId] = useState(null);

  useEffect(() => {
    fetchIndents(); // Changed from fetchPurchaseOrders
    fetchMaterialsAndSites();
  }, [currentPage, search]);

  // Fetch materials and sites for editing
  const fetchMaterialsAndSites = async () => {
    try {
      // Fetch materials
      const materials = await materialAPI.getAll();
      setAllMaterials(materials || []);
      
      // Extract unique categories - READ FROM RAW OBJECT
      const uniqueCategories = [...new Set(materials.map(item => {
        // Try raw object first, then fallback to main fields
        if (item.raw && item.raw['Category']) {
          return item.raw['Category'];
        }
        return item.Category || item.category;
      }).filter(Boolean))]
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
      fetchIndents();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'intentRefresh') {
        fetchIndents();
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
      fetchIndents();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage, search]);

  // Periodic polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIndents();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [currentPage, search]);

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
      setIndents(combinedData);
      
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
      const indent = indents.find(i => i._id === id);
      if (indent) {
        setSelectedIndent(indent);
        setShowDetailsModal(true);
      }
    } catch (err) {
      setError('Failed to fetch indent details');
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

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedIndent(null);
    setEditing(false);
    setFormData({});
  };

  const handleEdit = () => {
    if (selectedIndent.type === 'purchaseOrder') {
      // For PurchaseOrders, allow full editing
      setFormData({
        status: selectedIndent.status,
        remarks: selectedIndent.remarks || '',
        requestedBy: selectedIndent.requestedBy,
        deliverySite: selectedIndent.deliverySite,
        materials: (selectedIndent.materials || []).map((m, idx) => ({
          id: m._id || Date.now() + idx,
          category: m.category || '',
          subCategory: m.subCategory || '',
          subCategory1: m.subCategory1 || '',
          quantity: m.quantity || '',
          uom: m.uom || 'Nos',
          remarks: m.remarks || ''
        }))
      });
    } else {
      // For Indents, only allow status and admin remarks editing
      setFormData({
        status: selectedIndent.status,
        adminRemarks: selectedIndent.adminRemarks || ''
      });
    }
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      
      let response;
      
      // Handle based on type
      if (selectedIndent.type === 'purchaseOrder') {
        // For PurchaseOrder: update full data including materials
        const materialsData = formData.materials?.map(m => ({
          itemName: `${m.category}${m.subCategory ? ' - ' + m.subCategory : ''}${m.subCategory1 ? ' - ' + m.subCategory1 : ''}`,
          category: m.category,
          subCategory: m.subCategory || '',
          subCategory1: m.subCategory1 || '',
          quantity: parseInt(m.quantity),
          uom: m.uom || 'Nos',
          remarks: m.remarks || ''
        })) || selectedIndent.materials;
        
        const updateData = {
          status: formData.status,
          remarks: formData.remarks || formData.adminRemarks,
          requestedBy: formData.requestedBy || selectedIndent.requestedBy,
          deliverySite: formData.deliverySite || selectedIndent.deliverySite,
          materials: materialsData
        };
        
        response = await purchaseOrderAPI.update(selectedIndent._id, updateData);
      } else {
        // For Indent: only update status and admin remarks
        response = await indentAPI.updateStatus(selectedIndent._id, formData.status, formData.adminRemarks);
      }
      
      if (response.success) {
        // Update the modal data immediately
        const updatedIndent = { 
          ...selectedIndent, 
          status: formData.status, 
          adminRemarks: formData.adminRemarks || formData.remarks,
          remarks: formData.remarks
        };
        setSelectedIndent(updatedIndent);
        
        // Update the list state immediately
        setIndents(prev => 
          prev.map(item => item._id === selectedIndent._id ? updatedIndent : item)
        );
        
        setEditing(false);
        
        // Notify client side
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        
        showToast(`${selectedIndent.type === 'purchaseOrder' ? 'Purchase Order' : 'Intent'} updated successfully`, 'success');
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

  // Helper functions for materials
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
    <DashboardLayout title="Intent (PO)">
    <div className="flex-1 p-6 bg-gray-50">
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
          <div className="flex justify-between items-center mb-4">
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
                      <td className="border px-4 py-2">{indent.requestedBy?.name || 'N/A'}</td>
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
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleViewDetails(indent._id)}
                            className="p-1 hover:bg-green-50 rounded text-green-600"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(indent._id, indent.indentId || indent.purchaseOrderId, indent.type)}
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
                {search ? 'No indents found matching your search' : 'No indents found'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedIndent && (
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
                  <p className="text-gray-900 font-medium">{selectedIndent.indentId}</p>
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedIndent.status)}`}>
                        {selectedIndent.status?.charAt(0).toUpperCase() + selectedIndent.status?.slice(1)}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Project</label>
                  <p className="text-gray-900">{selectedIndent.project || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Branch</label>
                  <p className="text-gray-900">{selectedIndent.branch || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requested By</label>
                  <p className="text-gray-900">{selectedIndent.requestedBy?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Request Date</label>
                  <p className="text-gray-900">{formatDate(selectedIndent.createdAt)}</p>
                </div>
              </div>

              {/* Admin Remarks */}
              <div>
                <label className="text-sm font-medium text-gray-600">Admin Remarks</label>
                {editing ? (
                  <textarea
                    value={formData.adminRemarks}
                    onChange={(e) => setFormData({ ...formData, adminRemarks: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    rows="3"
                    placeholder="Add admin remarks..."
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{selectedIndent.adminRemarks || '-'}</p>
                )}
              </div>

              {/* Image */}
              {selectedIndent.imageUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Uploaded Image</label>
                  <div className="border rounded-lg overflow-hidden inline-block">
                    <img
                      src={`${axios.defaults.baseURL.replace('/api', '')}${selectedIndent.imageUrl}`}
                      alt="Intent"
                      className="max-w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(`${axios.defaults.baseURL.replace('/api', '')}${selectedIndent.imageUrl}`, '_blank')}
                      onError={(e) => {
                        console.error('Image load error:', selectedIndent.imageUrl);
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Items (if any) */}
              {selectedIndent.items && selectedIndent.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Items</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UOM</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedIndent.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.itemName || 'N/A'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.uom || 'Nos'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
    </DashboardLayout>
  );
}