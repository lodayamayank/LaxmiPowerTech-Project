import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI, branchesAPI } from "../../utils/materialAPI";
import { Package, Calendar, MapPin, FileText, User, TrendingUp, Eye, Filter, Search } from "lucide-react";
import { FaArrowLeft } from 'react-icons/fa';

export default function GRN({ isTabView = false }) {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userAssignedBranches = user?.assignedBranches || [];
  
  // Debug: Log user's assigned branches
  console.log('👤 GRN - User:', user?.name);
  console.log('🏢 GRN - Assigned Branches:', userAssignedBranches);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterSite, setFilterSite] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sites, setSites] = useState([]);

  useEffect(() => {
    fetchCompletedDeliveries();
    fetchSites();
  }, [search, filterSite, filterDateFrom, filterDateTo]);
  
  const fetchSites = async () => {
    try {
      const branches = await branchesAPI.getAll();
      
      // ✅ CRITICAL: Filter sites based on user's assigned branches
      let filteredBranches = branches;
      if (userAssignedBranches && userAssignedBranches.length > 0) {
        const assignedBranchIds = userAssignedBranches.map(b => b._id || b);
        console.log('🔍 GRN - Assigned Branch IDs:', assignedBranchIds);
        
        filteredBranches = branches.filter(branch => 
          assignedBranchIds.includes(branch._id)
        );
        console.log('✅ GRN - Filtered to assigned sites:', filteredBranches.length, 'of', branches.length);
      } else {
        console.log('⚠️ GRN - No assigned branches, showing all sites');
      }
      
      const sitesList = filteredBranches.map(branch => branch.name).sort();
      setSites(sitesList);
      console.log('✅ GRN - Site filter options:', sitesList);
    } catch (err) {
      console.error('Error fetching sites:', err);
      // If user has assigned branches, use only those
      if (userAssignedBranches && userAssignedBranches.length > 0) {
        const assignedSites = userAssignedBranches.map(b => b.name).filter(Boolean).sort();
        setSites(assignedSites);
        console.log('⚠️ GRN - Using assigned sites from user object:', assignedSites);
      } else {
        setSites([]);
      }
    }
  };

  // ❌ DISABLED: Auto-refresh removed per client request
  // No event listeners, no auto-polling, no auto-refresh
  // Data loads only on initial mount and manual filter changes

  const fetchCompletedDeliveries = async () => {
    try {
      setLoading(true);
      const response = await upcomingDeliveryAPI.getAll(1, 100, "");
      if (response.success) {
        // Filter only transferred/completed deliveries
        let completed = response.data.filter(d => 
          d.status?.toLowerCase() === 'transferred'
        );
        
        // ✅ CRITICAL: Filter by user's assigned branches
        if (userAssignedBranches && userAssignedBranches.length > 0) {
          const assignedSiteNames = userAssignedBranches.map(b => b.name).filter(Boolean);
          console.log('🔒 GRN - Filtering deliveries by assigned sites:', assignedSiteNames);
          
          completed = completed.filter(item => {
            const fromSite = item.from;
            const toSite = item.to;
            // Show delivery if either 'from' or 'to' matches user's assigned sites
            const isAllowed = assignedSiteNames.includes(fromSite) || assignedSiteNames.includes(toSite);
            return isAllowed;
          });
          
          console.log('✅ GRN - Filtered to', completed.length, 'deliveries for user\'s sites');
        } else {
          console.log('⚠️ GRN - No site restriction applied (admin or no assigned branches)');
        }
        
        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          completed = completed.filter(item => 
            item.transfer_number?.toLowerCase().includes(searchLower) ||
            item.st_id?.toLowerCase().includes(searchLower) ||
            item.from?.toLowerCase().includes(searchLower) ||
            item.to?.toLowerCase().includes(searchLower) ||
            item.createdBy?.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply site filter
        if (filterSite) {
          completed = completed.filter(item => 
            item.from?.toLowerCase().includes(filterSite.toLowerCase()) ||
            item.to?.toLowerCase().includes(filterSite.toLowerCase())
          );
        }
        
        // Apply date from filter (Intent Request Date)
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          completed = completed.filter(item => {
            const itemDate = new Date(item.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= fromDate;
          });
        }
        
        // Apply date to filter (Intent Request Date)
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          completed = completed.filter(item => {
            const itemDate = new Date(item.createdAt);
            return itemDate <= toDate;
          });
        }
        
        setDeliveries(completed);
        console.log(`📦 GRN: Found ${completed.length} transferred deliveries`);
      }
    } catch (err) {
      console.error("Error fetching GRN:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (delivery) => {
    // Navigate to GRN detail page (Intent-style view)
    navigate(`/material/grn/${delivery._id}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const renderContent = () => (
    <div className="px-6 py-6">
      {/* Filter and Search */}
      <div className="mb-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by GRN ID, site, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
          />
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
        </div>
        
        {/* Filters Toggle Button */}
        <div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <span className="font-semibold flex items-center gap-2 text-sm">
              <Filter size={16} />
              More Filters
            </span>
            <span className="text-xs">
              {showFilters ? '▲' : '▼'}
            </span>
          </button>
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-2.5">
            {/* Site Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Site</label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="" className="text-gray-500">All Sites</option>
                {sites.map(site => (
                  <option key={site} value={site} className="text-gray-900">{site}</option>
                ))}
              </select>
            </div>
            
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-xs text-gray-900 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-xs text-gray-900 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>
            
            {/* Clear Filters Button */}
            <button
              onClick={() => {
                setFilterSite('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSearch('');
              }}
              className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
            <Package size={32} className="text-green-500" />
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">No GRN Records</p>
          <p className="text-gray-500 text-sm">
            {search || filterSite || filterDateFrom || filterDateTo 
              ? "No records found matching your filters" 
              : "Completed deliveries will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <div
              key={delivery._id}
              onClick={() => handleViewDetails(delivery)}
              className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 flex items-center justify-center flex-shrink-0">
                    <Package size={28} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {delivery.transfer_number || delivery.st_id}
                    </h3>
                    <p className="text-xs text-gray-900 font-medium mt-1">
                      {formatDate(delivery.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Intent Request Date
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      {delivery.type === 'PO' ? '📋 Vendor-wise PO' : '🚚 Site Transfer'}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm bg-green-100 text-green-600">
                  ✅ Completed
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">GRN ID</span>
                  <span className="font-semibold text-gray-900">{delivery.transfer_number || delivery.st_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">From</span>
                  <span className="font-semibold text-gray-900">{delivery.from || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">To</span>
                  <span className="font-semibold text-gray-900">{delivery.to || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Intent Request Date</span>
                  <span className="font-semibold text-gray-900">{formatDate(delivery.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Delivery Date</span>
                  <span className="font-semibold text-green-600">{formatDate(delivery.updatedAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Materials</span>
                  <span className="font-semibold text-blue-600">{delivery.items?.length || 0} items</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // If in tab view mode, return content only
  if (isTabView) {
    return renderContent();
  }

  // Standalone mode with full page layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">GRN Records</h1>
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
    </div>
  );
}