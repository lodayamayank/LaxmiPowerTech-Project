import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { siteTransferAPI, branchesAPI } from "../../utils/materialAPI";
import { Filter, Plus, Truck } from "lucide-react";
import { FaArrowLeft } from 'react-icons/fa';
import { getSelectedBranchId, getSelectedBranchName } from "../../utils/branchContext";

export default function MaterialTransfer({ isTabView = false }) {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // ✅ Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sites, setSites] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userAssignedBranches = user?.assignedBranches || [];
  const selectedBranchId = getSelectedBranchId();
  const selectedBranchName = getSelectedBranchName();
  
  // Debug: Log branch context
  console.log('👤 Material Transfer - User:', user?.name, 'Role:', user?.role);
  console.log('🏢 Material Transfer - Assigned Branches:', userAssignedBranches);
  console.log('🎯 Material Transfer - Selected Branch:', selectedBranchId, selectedBranchName);

  // Fetch site transfers from backend
  useEffect(() => {
    fetchTransfers();
  }, [currentPage, filterSite, filterStatus, filterDateFrom, filterDateTo]);
  
  // Fetch sites once on mount
  useEffect(() => {
    fetchSites();
  }, []);
  
  // ✅ Fetch sites for filter dropdown
  const fetchSites = async () => {
    try {
      const branches = await branchesAPI.getAll();
      
      // ✅ CRITICAL: Single-branch isolation for supervisor/subcontractor
      let filteredBranches = branches;
      if (selectedBranchId && (user.role === 'supervisor' || user.role === 'subcontractor')) {
        filteredBranches = branches.filter(branch => branch._id === selectedBranchId);
        console.log('🔒 Material Transfer - Single branch mode:', selectedBranchName);
      } else if (userAssignedBranches && userAssignedBranches.length > 0) {
        const assignedBranchIds = userAssignedBranches.map(b => b._id || b);
        filteredBranches = branches.filter(branch => assignedBranchIds.includes(branch._id));
        console.log('✅ Material Transfer - Multi-branch mode:', filteredBranches.length, 'branches');
      } else {
        console.log('⚠️ Material Transfer - Admin mode - all sites');
      }
      
      const sitesList = filteredBranches.map(branch => branch.name).sort();
      setSites(sitesList);
      console.log('✅ Material Transfer - Site filter options:', sitesList);
    } catch (err) {
      console.error('Error fetching sites:', err);
      if (selectedBranchName) {
        setSites([selectedBranchName]);
      } else if (userAssignedBranches && userAssignedBranches.length > 0) {
        const assignedSites = userAssignedBranches.map(b => b.name).filter(Boolean).sort();
        setSites(assignedSites);
      } else {
        setSites([]);
      }
    }
  };

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchTransfers();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage]);

  // Periodic polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransfers();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentPage]);

  // Listen for delivery, site transfer, and intent update events
  useEffect(() => {
    const handleDeliveryUpdate = () => {
      fetchTransfers();
    };
    
    const handleSiteTransferCreated = () => {
      fetchTransfers();
    };
    
    const handleUpcomingDeliveryRefresh = () => {
      fetchTransfers();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === 'deliveryRefresh' || e.key === 'upcomingDeliveryRefresh' || e.key === 'siteTransferRefresh') {
        fetchTransfers();
        localStorage.removeItem(e.key);
      }
    };
    
    window.addEventListener('deliveryUpdated', handleDeliveryUpdate);
    window.addEventListener('siteTransferCreated', handleSiteTransferCreated);
    window.addEventListener('upcomingDeliveryRefresh', handleUpcomingDeliveryRefresh);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('deliveryUpdated', handleDeliveryUpdate);
      window.removeEventListener('siteTransferCreated', handleSiteTransferCreated);
      window.removeEventListener('upcomingDeliveryRefresh', handleUpcomingDeliveryRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentPage]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await siteTransferAPI.getAll(1, 100);
      
      if (response.success) {
        let transfersData = response.data || [];
        
        // ✅ CRITICAL: Hide transferred and approved items (they should only appear in Upcoming Deliveries)
        transfersData = transfersData.filter(transfer => {
          const status = transfer.status?.toLowerCase();
          return status !== 'transferred' && status !== 'approved';
        });
        
        // ✅ CRITICAL: Single-branch isolation for supervisor/subcontractor
        if (selectedBranchName && (user.role === 'supervisor' || user.role === 'subcontractor')) {
          console.log('🔒 Material Transfer - STRICT ISOLATION: Filtering by selected branch only:', selectedBranchName);
          
          transfersData = transfersData.filter(transfer => {
            const fromSite = transfer.fromSite;
            const toSite = transfer.toSite;
            // Show transfer if either 'from' or 'to' matches selected branch
            const isMatch = fromSite === selectedBranchName || toSite === selectedBranchName;
            return isMatch;
          });
          
          console.log('✅ Material Transfer - Isolated to', transfersData.length, 'transfers for branch:', selectedBranchName);
        } else if (userAssignedBranches && userAssignedBranches.length > 0) {
          // Multi-branch filtering for other roles
          const assignedSiteNames = userAssignedBranches.map(b => b.name).filter(Boolean);
          console.log('🔒 Material Transfer - Multi-branch filtering:', assignedSiteNames);
          
          transfersData = transfersData.filter(transfer => {
            const fromSite = transfer.fromSite;
            const toSite = transfer.toSite;
            return assignedSiteNames.includes(fromSite) || assignedSiteNames.includes(toSite);
          });
          
          console.log('✅ Material Transfer - Filtered to', transfersData.length, 'transfers');
        } else {
          console.log('⚠️ Material Transfer - Admin mode - no filtering');
        }
        
        // ✅ Apply filters client-side
        if (filterSite) {
          transfersData = transfersData.filter(transfer => 
            transfer.fromSite?.toLowerCase().includes(filterSite.toLowerCase()) ||
            transfer.toSite?.toLowerCase().includes(filterSite.toLowerCase())
          );
        }
        
        if (filterStatus) {
          transfersData = transfersData.filter(transfer => 
            transfer.status?.toLowerCase() === filterStatus.toLowerCase()
          );
        }
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          transfersData = transfersData.filter(transfer => {
            const transferDate = new Date(transfer.createdAt);
            transferDate.setHours(0, 0, 0, 0);
            return transferDate >= fromDate;
          });
        }
        
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          transfersData = transfersData.filter(transfer => {
            const transferDate = new Date(transfer.createdAt);
            return transferDate <= toDate;
          });
        }
        
        setTransfers(transfersData);
        
        // Calculate pagination
        const itemsPerPage = 10;
        const totalItems = transfersData.length;
        setTotalPages(Math.ceil(totalItems / itemsPerPage) || 1);
      }
    } catch (err) {
      console.error("Error fetching site transfers:", err);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-600';
      case 'approved':
        return 'bg-orange-100 text-orange-600';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'Transferred';
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleCreateTransfer = () => {
    navigate('/material/transfer/new');
  };

  // Render content only (for tab view)
  const renderContent = () => (
    <div className="px-6 py-6">
      {/* ✅ Filter Toggle Button */}
      <div className="mb-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          <span className="font-semibold flex items-center gap-2 text-sm">
            <Filter size={16} />
            Filters
          </span>
          <span className="text-xs">
            {showFilters ? '▲' : '▼'}
          </span>
        </button>
      </div>
      
      {/* ✅ Filters Panel */}
      {showFilters && (
        <div className="mb-3 bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-2.5">
          {/* Site Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Site</label>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              <option value="" className="text-gray-500">All Sites</option>
              {sites.map(site => (
                <option key={site} value={site} className="text-gray-900">{site}</option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              <option value="" className="text-gray-500">All Status</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="approved" className="text-gray-900">Approved</option>
              <option value="cancelled" className="text-gray-900">Cancelled</option>
            </select>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-xs text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-xs text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setFilterSite('');
              setFilterStatus('');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
            className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <Truck size={32} className="text-orange-500" />
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">No Site Transfers</p>
          <p className="text-gray-500 text-sm">Click the + button to create your first transfer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div
              key={transfer._id}
              onClick={() => navigate(`/material/transfer/${transfer._id}`)}
              className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-300 flex items-center justify-center flex-shrink-0">
                    <Truck size={28} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {transfer.siteTransferId}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(transfer.createdAt)}
                    </p>
                    <p className="text-xs text-purple-600 font-medium mt-0.5">
                      🚚 Site Transfer
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm ${getStatusColor(transfer.status)}`}>
                  {getStatusText(transfer.status)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">ST ID</span>
                  <span className="font-semibold text-gray-900">{transfer.siteTransferId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">From Site</span>
                  <span className="font-semibold text-gray-900">{transfer.fromSite}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">To Site</span>
                  <span className="font-semibold text-gray-900">{transfer.toSite}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Requested By</span>
                  <span className="font-semibold text-gray-900">{transfer.requestedBy}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Materials</span>
                  <span className="font-semibold text-blue-600">{transfer.materials?.length || 0} items</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-sm shadow-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  // If in tab view mode, return content only
  if (isTabView) {
    return (
      <>
        {renderContent()}
        
        {/* Floating Action Button - Bottom Center */}
        <button
          onClick={handleCreateTransfer}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 flex items-center justify-center z-50 transition-all duration-300"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </>
    );
  }

  // Standalone mode with full page layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Site Transfers</h1>
            <p className="text-white/80 text-sm">{user?.name || 'User'}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {renderContent().props.children}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button - Bottom Center */}
      <button
        onClick={handleCreateTransfer}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 flex items-center justify-center z-50 transition-all duration-300"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
