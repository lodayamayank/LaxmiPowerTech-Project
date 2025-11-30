import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { siteTransferAPI, branchesAPI } from "../../utils/materialAPI";
import { Filter } from "lucide-react";

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
      const sitesList = branches.map(branch => branch.name).sort();
      setSites(sitesList);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    }
  };

  // Auto-refresh when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchTransfers();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage]);

  // Periodic polling every 30 seconds (optimized from 2s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransfers();
    }, 30000); // 30 seconds - balanced performance
    
    return () => clearInterval(interval);
  }, [currentPage]);

  // Listen for delivery, site transfer, and intent update events (INSTANT SYNC)
  useEffect(() => {
    const handleDeliveryUpdate = () => {
      console.log('🔄 Client Material Transfer: Delivery update detected');
      fetchTransfers();
    };
    
    const handleSiteTransferCreated = () => {
      console.log('🔄 Client Material Transfer: Site Transfer created');
      fetchTransfers();
    };
    
    const handleUpcomingDeliveryRefresh = () => {
      console.log('🔄 Client Material Transfer: Upcoming Delivery refresh');
      fetchTransfers();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === 'deliveryRefresh' || e.key === 'upcomingDeliveryRefresh' || e.key === 'siteTransferRefresh') {
        console.log(`⚡ INSTANT SYNC - ${e.key} detected!`);
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
      const response = await siteTransferAPI.getAll(currentPage, 10);
      if (response.success) {
        let data = response.data || [];
        
        // ✅ Apply filters client-side
        if (filterSite) {
          data = data.filter(item => 
            item.fromSite?.toLowerCase().includes(filterSite.toLowerCase()) ||
            item.toSite?.toLowerCase().includes(filterSite.toLowerCase())
          );
        }
        
        if (filterStatus) {
          data = data.filter(item => 
            item.status?.toLowerCase() === filterStatus.toLowerCase()
          );
        }
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          data = data.filter(item => {
            const itemDate = new Date(item.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= fromDate;
          });
        }
        
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          data = data.filter(item => {
            const itemDate = new Date(item.createdAt);
            return itemDate <= toDate;
          });
        }
        
        setTransfers(data);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to new transfer form page (like Intent PO)
  const handleCreateTransfer = () => {
    navigate('/material/transfer/new');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    // Unified status colors matching Upcoming Deliveries
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-600';
      case 'approved': // Partial delivery in progress
        return 'bg-orange-100 text-orange-600';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <>
      {/* Transfer List - Mobile-First */}
      <div className={isTabView ? "px-6 pb-20 pt-6" : "px-3 pb-20 pt-3"}>
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
                <option value="transferred" className="text-gray-900">Transferred</option>
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {transfers.map((transfer) => (
              <div
                key={transfer._id}
                onClick={() => navigate(`/dashboard/material/transfer/${transfer._id}`)}
                className="border rounded-xl p-3 shadow-sm bg-gray-50 text-sm mb-3 cursor-pointer hover:shadow-md hover:bg-white transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-800 text-sm">ST ID: {transfer.siteTransferId}</p>
                  <span className={`px-2 py-1 text-xs rounded-md ${getStatusColor(transfer.status)}`}>
                    {transfer.status?.charAt(0).toUpperCase() + transfer.status?.slice(1)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">From Site</span>
                    <span className="text-gray-800 text-xs font-medium">{transfer.fromSite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">To Site</span>
                    <span className="text-gray-800 text-xs font-medium">{transfer.toSite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">Materials</span>
                    <span className="text-gray-700 text-xs">{transfer.materials?.length || 0} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">Requested By</span>
                    <span className="text-gray-700 text-xs">{transfer.requestedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Date</span>
                    <span className="text-gray-700 text-xs">{formatDate(transfer.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}

            {transfers.length === 0 && !loading && (
              <div className="border rounded-xl p-3 shadow-sm bg-gray-50 text-sm text-gray-600">
                No transfers yet. Click the + button to create one.
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={handleCreateTransfer}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-2xl font-bold rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-110"
      >
        +
      </button>
    </>
  );
}