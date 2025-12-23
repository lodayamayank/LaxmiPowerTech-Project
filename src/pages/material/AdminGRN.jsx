import React, { useState, useEffect } from 'react';
import { upcomingDeliveryAPI, branchesAPI } from '../../utils/materialAPI';
import { Eye, Trash2, X, Package, Calendar, MapPin, User, FileText, Edit2, Save, XCircle, DollarSign, Receipt } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminGRN() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [billingData, setBillingData] = useState({
    invoiceNumber: '',
    price: 0,
    billDate: '',
    discount: 0,
    discountType: 'flat',  // 'flat' or 'percentage'
    amount: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter states
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sites, setSites] = useState([]);

  useEffect(() => {
    fetchGRNRecords();
    fetchSites();
  }, [currentPage, search, filterSite, filterDateFrom, filterDateTo]);

  // ❌ DISABLED: Auto-refresh removed per client request
  // No event listeners, no auto-polling, no auto-refresh
  // Data loads only on initial mount and manual filter changes

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

  const fetchGRNRecords = async () => {
    try {
      setLoading(true);
      const response = await upcomingDeliveryAPI.getAll(1, 100, '');
      
      if (response.success) {
        // Filter only transferred deliveries (GRN = Goods Receipt Note = completed deliveries)
        let filteredData = response.data.filter(d => 
          d.status?.toLowerCase() === 'transferred'
        );

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.transfer_number?.toLowerCase().includes(searchLower) ||
            item.st_id?.toLowerCase().includes(searchLower) ||
            item.from?.toLowerCase().includes(searchLower) ||
            item.to?.toLowerCase().includes(searchLower) ||
            item.createdBy?.toLowerCase().includes(searchLower)
          );
        }

        // Apply site filter
        if (filterSite) {
          filteredData = filteredData.filter(item => 
            item.from?.toLowerCase().includes(filterSite.toLowerCase()) ||
            item.to?.toLowerCase().includes(filterSite.toLowerCase())
          );
        }

        // Apply date from filter (Intent Request Date)
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= fromDate;
          });
        }

        // Apply date to filter (Intent Request Date)
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.createdAt);
            return itemDate <= toDate;
          });
        }

        setDeliveries(filteredData);
        console.log(`📦 Admin GRN: Found ${filteredData.length} transferred deliveries`);
      }
    } catch (err) {
      console.error('Error fetching GRN records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract base PO ID (remove -01, -02 suffix)
  const extractBasePOId = (poId) => {
    if (!poId) return '';
    // Remove trailing -01, -02, etc. from PO ID
    // Example: PO20251223-LNBNE-01 -> PO20251223-LNBNE
    return poId.replace(/-\d+$/, '');
  };

  const handleViewDetails = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetailsModal(true);
    setIsEditMode(false);
    
    // Auto-generate invoice number from base PO ID
    const autoInvoiceNumber = extractBasePOId(delivery.transfer_number || delivery.st_id);
    
    // Initialize billing data
    setBillingData({
      invoiceNumber: delivery.billing?.invoiceNumber || autoInvoiceNumber,
      price: delivery.billing?.price || 0,
      billDate: delivery.billing?.billDate ? new Date(delivery.billing.billDate).toISOString().split('T')[0] : '',
      discount: delivery.billing?.discount || 0,
      discountType: delivery.billing?.discountType || 'flat',
      amount: delivery.billing?.amount || 0
    });
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset billing data to original values
    const autoInvoiceNumber = extractBasePOId(selectedDelivery.transfer_number || selectedDelivery.st_id);
    setBillingData({
      invoiceNumber: selectedDelivery.billing?.invoiceNumber || autoInvoiceNumber,
      price: selectedDelivery.billing?.price || 0,
      billDate: selectedDelivery.billing?.billDate ? new Date(selectedDelivery.billing.billDate).toISOString().split('T')[0] : '',
      discount: selectedDelivery.billing?.discount || 0,
      discountType: selectedDelivery.billing?.discountType || 'flat',
      amount: selectedDelivery.billing?.amount || 0
    });
  };

  const handleBillingChange = (field, value) => {
    const updatedData = { ...billingData, [field]: value };
    
    // Auto-calculate amount when price, discount, or discountType changes
    if (field === 'price' || field === 'discount' || field === 'discountType') {
      const price = parseFloat(updatedData.price) || 0;
      const discount = parseFloat(updatedData.discount) || 0;
      const type = updatedData.discountType;
      
      if (type === 'percentage') {
        // Percentage discount: amount = price - (price * discount / 100)
        updatedData.amount = price - (price * discount / 100);
      } else {
        // Flat discount: amount = price - discount
        updatedData.amount = price - discount;
      }
      
      // Ensure amount is not negative
      updatedData.amount = Math.max(0, updatedData.amount);
    }
    
    setBillingData(updatedData);
  };

  const handleSaveBilling = async () => {
    try {
      setIsSaving(true);
      
      const response = await upcomingDeliveryAPI.updateBilling(selectedDelivery._id, billingData);
      
      if (response.success) {
        // Update local state
        setSelectedDelivery(response.data);
        
        // Update deliveries list
        setDeliveries(prev => prev.map(d => 
          d._id === response.data._id ? response.data : d
        ));
        
        setIsEditMode(false);
        alert('Billing details updated successfully!');
      }
    } catch (err) {
      console.error('Error updating billing:', err);
      alert('Failed to update billing details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-600';
      case 'partial':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <DashboardLayout title="GRN (Goods Receipt Note)">
      <div className="flex-1 p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">GRN (Goods Receipt Note)</h1>
            <p className="text-sm text-gray-500">View all completed deliveries</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600 text-sm">Loading GRN records...</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-700">
                  GRN Records ({deliveries.length} records)
                </h2>
                <input
                  type="text"
                  placeholder="Search by ID, site..."
                  className="border border-gray-300 rounded p-2 w-80 focus:ring-2 focus:ring-orange-400 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Filters Section - Matching Intent PO */}
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
                      <option value="">All Sites</option>
                      {sites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
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
                    className="px-6 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {deliveries.length === 0 ? (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No completed deliveries found</p>
              </div>
            ) : (
              <table className="min-w-full border-collapse border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">GRN ID</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Type</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">From</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">To</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Requested By</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700 bg-orange-50">Invoice Number</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700 bg-orange-50">Price (₹)</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700 bg-orange-50">Bill Date</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700 bg-orange-50">Discount</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700 bg-orange-50">Amount (₹)</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="border px-4 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <tr key={delivery._id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold">{delivery.transfer_number || delivery.st_id || 'N/A'}</span>
                          <span className="text-xs text-gray-500">
                            {delivery.type === 'PO' ? 'Vendor-wise PO' : 'ST ID'}
                          </span>
                        </div>
                      </td>
                      <td className="border px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          delivery.type === 'PO' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {delivery.type === 'PO' ? 'Purchase Order' : 'Site Transfer'}
                        </span>
                      </td>
                      <td className="border px-4 py-2">{delivery.from || 'N/A'}</td>
                      <td className="border px-4 py-2">{delivery.to || 'N/A'}</td>
                      <td className="border px-4 py-2">{delivery.createdBy || 'N/A'}</td>
                      
                      {/* Billing Columns */}
                      <td className="border px-4 py-2 bg-orange-50 font-medium text-gray-900">
                        {delivery.billing?.invoiceNumber || '-'}
                      </td>
                      <td className="border px-4 py-2 bg-orange-50 font-semibold text-gray-900">
                        {delivery.billing?.price ? `₹${delivery.billing.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="border px-4 py-2 bg-orange-50 text-gray-700">
                        {delivery.billing?.billDate 
                          ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          : '-'}
                      </td>
                      <td className="border px-4 py-2 bg-orange-50 text-gray-900">
                        {delivery.billing?.discount 
                          ? `${delivery.billing.discount}${delivery.billing.discountType === 'percentage' ? '%' : '₹'}`
                          : '-'}
                      </td>
                      <td className="border px-4 py-2 bg-orange-50 font-bold text-green-700">
                        {delivery.billing?.amount ? `₹${delivery.billing.amount.toFixed(2)}` : '-'}
                      </td>
                      
                      <td className="border px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                          {delivery.status?.charAt(0).toUpperCase() + delivery.status?.slice(1)}
                        </span>
                      </td>
                      <td className="border px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium text-sm">{formatDate(delivery.createdAt)}</span>
                          <span className="text-xs text-gray-500">Intent Request</span>
                        </div>
                      </td>
                      <td className="border px-4 py-2">
                        <button
                          onClick={() => handleViewDetails(delivery)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">GRN Details</h3>
                <p className="text-sm text-gray-500">{selectedDelivery.st_id || selectedDelivery.transfer_number}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {selectedDelivery.type === 'PO' ? 'Vendor-wise PO ID' : 'Site Transfer ID'}
                  </label>
                  <p className="text-gray-900 font-semibold">{selectedDelivery.transfer_number || selectedDelivery.st_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-gray-900">{selectedDelivery.type === 'PO' ? 'Purchase Order' : 'Site Transfer'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">From</label>
                  <p className="text-gray-900">{selectedDelivery.from || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">To</label>
                  <p className="text-gray-900">{selectedDelivery.to || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requested By</label>
                  <p className="text-gray-900">{selectedDelivery.createdBy || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Intent Request Date & Time</label>
                  <p className="text-gray-900">{formatDate(selectedDelivery.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Delivery Date & Time (Challan Upload)</label>
                  <p className="text-green-600 font-medium">{formatDate(selectedDelivery.updatedAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDelivery.status)}`}>
                    {selectedDelivery.status}
                  </span>
                </div>
              </div>

              {/* Billing Information Section */}
              <div className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-white">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                    <Receipt size={18} className="text-orange-600" />
                    Billing Information
                  </h4>
                  {!isEditMode ? (
                    <button
                      onClick={handleEditClick}
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded hover:bg-orange-600 transition-colors"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBilling}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Invoice Number (Read-only, Auto-generated) */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1 flex items-center gap-2">
                      Invoice Number
                      <span className="text-xs text-orange-600 font-normal">(Auto-generated)</span>
                    </label>
                    <div className="w-full border-2 border-orange-200 bg-orange-50 rounded px-3 py-2 text-sm">
                      <p className="text-gray-900 font-semibold">{billingData.invoiceNumber || 'Not set'}</p>
                    </div>
                  </div>

                  {/* Bill Date */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Bill Date</label>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={billingData.billDate}
                        onChange={(e) => handleBillingChange('billDate', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {billingData.billDate ? new Date(billingData.billDate).toLocaleDateString('en-IN') : 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Price (₹)</label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={billingData.price}
                        onChange={(e) => handleBillingChange('price', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">₹{billingData.price.toFixed(2)}</p>
                    )}
                  </div>

                  {/* Discount with Type Selector */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600 block mb-1">Discount</label>
                    {isEditMode ? (
                      <div className="flex gap-2">
                        {/* Discount Type Toggle */}
                        <div className="flex border border-gray-300 rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleBillingChange('discountType', 'flat')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              billingData.discountType === 'flat'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            ₹ Flat
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBillingChange('discountType', 'percentage')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-l ${
                              billingData.discountType === 'percentage'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            % Percentage
                          </button>
                        </div>
                        
                        {/* Discount Value Input */}
                        <input
                          type="number"
                          value={billingData.discount}
                          onChange={(e) => handleBillingChange('discount', e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={billingData.discountType === 'percentage' ? '0-100' : '0.00'}
                          step={billingData.discountType === 'percentage' ? '1' : '0.01'}
                          min="0"
                          max={billingData.discountType === 'percentage' ? '100' : undefined}
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {billingData.discount > 0 
                          ? `${billingData.discount}${billingData.discountType === 'percentage' ? '%' : '₹'}`
                          : 'No discount'}
                      </p>
                    )}
                  </div>

                  {/* Amount (Auto-calculated) */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600 block mb-1 flex items-center gap-2">
                      <DollarSign size={16} className="text-green-600" />
                      Total Amount (Auto-calculated)
                    </label>
                    <div className="bg-green-50 border-2 border-green-200 rounded px-4 py-3">
                      <p className="text-2xl font-bold text-green-700">₹{billingData.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {billingData.discountType === 'percentage'
                          ? `Price - (Price × ${billingData.discount}%) = Amount`
                          : `Price - ₹${billingData.discount} = Amount`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Materials Table */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Materials Received
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border px-3 py-2 text-left text-xs font-medium text-gray-700">Item</th>
                        <th className="border px-3 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                        <th className="border px-3 py-2 text-center text-xs font-medium text-gray-700">Approved Qty</th>
                        <th className="border px-3 py-2 text-center text-xs font-medium text-gray-700">Received Qty</th>
                        <th className="border px-3 py-2 text-center text-xs font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDelivery.items?.map((item, index) => {
                        const approvedQty = item.st_quantity || 0;
                        const receivedQty = item.received_quantity || 0;
                        const isFullyReceived = receivedQty >= approvedQty;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border px-3 py-2 text-sm text-gray-900">
                              {item.category || item.name || 'N/A'}
                            </td>
                            <td className="border px-3 py-2 text-sm text-gray-600">
                              {[item.sub_category, item.sub_category1, item.sub_category2]
                                .filter(Boolean)
                                .join(' - ') || '-'}
                            </td>
                            <td className="border px-3 py-2 text-center text-sm font-medium text-gray-900">
                              {approvedQty}
                            </td>
                            <td className="border px-3 py-2 text-center text-sm font-semibold text-green-600">
                              {receivedQty}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                isFullyReceived 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-orange-100 text-orange-600'
                              }`}>
                                {isFullyReceived ? 'Complete' : 'Partial'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attachments (Challan) */}
              {selectedDelivery.attachments && selectedDelivery.attachments.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText size={18} />
                    Attachments ({selectedDelivery.attachments.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedDelivery.attachments.map((attachment, index) => {
                      const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                      const fileName = attachmentUrl.split('/').pop();
                      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(attachmentUrl);
                      
                      return (
                        <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                          {/* Image Preview */}
                          {isImage ? (
                            <div className="relative bg-gray-100">
                              <img 
                                src={attachmentUrl} 
                                alt={`Challan ${index + 1}`}
                                className="w-full h-48 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-48 bg-gray-100">
                              <FileText size={48} className="text-gray-400" />
                            </div>
                          )}
                          
                          {/* File Info & Actions */}
                          <div className="p-3 bg-white border-t">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText size={16} className="text-orange-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 truncate">{fileName}</span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                              >
                                <Eye size={14} />
                                View
                              </a>
                              <a
                                href={attachmentUrl}
                                download
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
