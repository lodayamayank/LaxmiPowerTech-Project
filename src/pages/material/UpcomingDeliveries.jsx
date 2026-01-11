import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI, branchesAPI } from "../../utils/materialAPI";
import { Search, Filter, Package, Plus } from "lucide-react";
import { FaArrowLeft } from 'react-icons/fa';
import { getSelectedBranchId, getSelectedBranchName } from "../../utils/branchContext";

export default function UpcomingDeliveries({ isTabView = false }) {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, ST, PO
    
    // ✅ Additional filter states
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
    console.log('👤 Upcoming Deliveries - User:', user?.name, 'Role:', user?.role);
    console.log('🏢 Upcoming Deliveries - Assigned Branches:', userAssignedBranches);
    console.log('🎯 Upcoming Deliveries - Selected Branch:', selectedBranchId, selectedBranchName);

    useEffect(() => {
        fetchDeliveries();
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
                console.log('🔒 Upcoming Deliveries - Single branch mode:', selectedBranchName);
            } else if (userAssignedBranches && userAssignedBranches.length > 0) {
                const assignedBranchIds = userAssignedBranches.map(b => b._id || b);
                filteredBranches = branches.filter(branch => assignedBranchIds.includes(branch._id));
                console.log('✅ Upcoming Deliveries - Multi-branch mode:', filteredBranches.length, 'branches');
            } else {
                console.log('⚠️ Upcoming Deliveries - Admin mode - all sites');
            }
            
            const sitesList = filteredBranches.map(branch => branch.name).sort();
            setSites(sitesList);
            console.log('✅ Upcoming Deliveries - Site filter options:', sitesList);
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

    // Listen for Intent, Site Transfer, and Delivery update events
    useEffect(() => {
        const handleIntentChange = () => {
            console.log('🔄 Client Upcoming Deliveries: Intent update detected');
            fetchDeliveries();
        };

        const handleSiteTransferChange = () => {
            console.log('🔄 Client Upcoming Deliveries: Site Transfer update detected');
            fetchDeliveries();
        };

        const handleDeliveryRefresh = () => {
            console.log('🔄 Client Upcoming Deliveries: Delivery refresh triggered');
            fetchDeliveries();
        };

        const handleStorageChange = (e) => {
            if (e.key === 'intentRefresh' || e.key === 'upcomingDeliveryRefresh' || e.key === 'siteTransferRefresh') {
                console.log(`✅ Client Upcoming Deliveries: ${e.key} detected`);
                fetchDeliveries();
                localStorage.removeItem(e.key);
            }
        };

        window.addEventListener('intentCreated', handleIntentChange);
        window.addEventListener('siteTransferCreated', handleSiteTransferChange);
        window.addEventListener('upcomingDeliveryRefresh', handleDeliveryRefresh);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('intentCreated', handleIntentChange);
            window.removeEventListener('siteTransferCreated', handleSiteTransferChange);
            window.removeEventListener('upcomingDeliveryRefresh', handleDeliveryRefresh);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Auto-refresh when window gains focus (user switches back to tab)
    useEffect(() => {
        const handleFocus = () => {
            fetchDeliveries();
        };
        
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    // Periodic polling every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDeliveries();
        }, 30000); // 30 seconds
        
        return () => clearInterval(interval);
    }, []);

    const fetchDeliveries = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await upcomingDeliveryAPI.getAll(1, 100, "");
            if (response.success) {
                setDeliveries(response.data || []);
            }
        } catch (err) {
            console.error("Error fetching deliveries:", err);
            // Check if it's a 404 (endpoint not available yet)
            if (err.response?.status === 404) {
                setError("Upcoming Deliveries feature is not yet available. Please create the backend files.");
            } else {
                setError("Failed to load deliveries. Please check if the backend server is running.");
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ Enhanced filter deliveries by search term, type, site, status, and date range
    const filteredDeliveries = deliveries.filter((delivery) => {
        // ✅ CRITICAL: Hide transferred deliveries (they should only appear in GRN)
        if (delivery.status?.toLowerCase() === 'transferred') {
            return false;
        }
        
        // ✅ CRITICAL: Single-branch isolation for supervisor/subcontractor
        if (selectedBranchName && (user.role === 'supervisor' || user.role === 'subcontractor')) {
            const fromSite = delivery.from;
            const toSite = delivery.to;
            // Show delivery ONLY if either 'from' or 'to' matches SELECTED branch
            const isMatch = fromSite === selectedBranchName || toSite === selectedBranchName;
            if (!isMatch) {
                return false;
            }
        } else if (userAssignedBranches && userAssignedBranches.length > 0) {
            // Multi-branch filtering for other roles
            const assignedSiteNames = userAssignedBranches.map(b => b.name).filter(Boolean);
            const fromSite = delivery.from;
            const toSite = delivery.to;
            const isAllowed = assignedSiteNames.includes(fromSite) || assignedSiteNames.includes(toSite);
            if (!isAllowed) {
                return false;
            }
        }
        
        // Type filter
        if (typeFilter !== "ALL" && delivery.type !== typeFilter) {
            return false;
        }
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            const matchesSearch = (
                delivery.st_id?.toLowerCase().includes(searchLower) ||
                delivery.transfer_number?.toLowerCase().includes(searchLower)
            );
            if (!matchesSearch) return false;
        }
        
        // Site filter (matches from OR to)
        if (filterSite) {
            const matchesSite = (
                delivery.from?.toLowerCase().includes(filterSite.toLowerCase()) ||
                delivery.to?.toLowerCase().includes(filterSite.toLowerCase())
            );
            if (!matchesSite) return false;
        }
        
        // Status filter
        if (filterStatus) {
            if (delivery.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
        }
        
        // Date from filter
        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            const itemDate = new Date(delivery.date || delivery.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            if (itemDate < fromDate) return false;
        }
        
        // Date to filter
        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            const itemDate = new Date(delivery.date || delivery.createdAt);
            if (itemDate > toDate) return false;
        }
        
        return true;
    });

    const getStatusBadge = (status) => {
        const statusColors = {
            'Pending': 'bg-gray-100 text-gray-700',
            'Approved': 'bg-blue-100 text-blue-600',
            'Partial': 'bg-orange-100 text-orange-600',
            'Transferred': 'bg-green-100 text-green-600',
            'Cancelled': 'bg-red-100 text-red-600'
        };
        return statusColors[status] || 'bg-gray-100 text-gray-700';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    };

    const handleClick = (delivery) => {
        // Navigate with delivery data in state
        navigate(`/dashboard/material/deliveries/${delivery._id}`, {
            state: {
                item: {
                    id: delivery._id,
                    materials: delivery.items || [],
                    from: delivery.from,
                    to: delivery.to,
                    date: delivery.date,
                    createdAt: delivery.createdAt,
                    status: delivery.status,
                    transfer_number: delivery.transfer_number || delivery.st_id
                },
                type: delivery.type
            }
        });
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case 'transferred':
                return 'Transferred';
            case 'approved':
                return 'Approved';
            case 'partial':
                return 'Partial';
            case 'pending':
                return 'Pending';
            case 'cancelled':
                return 'Cancelled';
            default:
                return status;
        }
    };

    // Render content only (for tab view)
    const renderContent = () => (
        <div className="px-6 py-6">
            {/* Filter and Search */}
            <div className="mb-4 space-y-3">
                {/* ✅ Additional Filters Toggle Button */}
                <div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
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
                
                {/* ✅ Additional Filters Panel */}
                {showFilters && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-2.5">
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
                                <option value="partial" className="text-gray-900">Partial</option>
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
                        
                        {/* Clear Additional Filters Button */}
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
                
                {/* Type Filter */}
                <div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900 font-medium"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23f97316' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 1rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.25em 1.25em',
                            paddingRight: '2.5rem'
                        }}
                    >
                        <option value="ALL" className="text-gray-900 bg-white">All Deliveries</option>
                        <option value="ST" className="text-gray-900 bg-white">Site Transfers (ST)</option>
                        <option value="PO" className="text-gray-900 bg-white">Purchase Orders (PO)</option>
                    </select>
                </div>
                
                {/* Search bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by ST-ID or Transfer Number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                    />
                    <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-gray-600 text-sm">Loading deliveries...</p>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                    <button
                        onClick={fetchDeliveries}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                    >
                        Try Again
                    </button>
                </div>
            ) : filteredDeliveries.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <Package size={32} className="text-blue-500" />
                    </div>
                    <p className="text-gray-700 font-semibold text-base mb-1">No Upcoming Deliveries</p>
                    <p className="text-gray-500 text-sm">
                        {search ? "No deliveries found matching your search" : "Approved deliveries will appear here"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredDeliveries.map((delivery) => (
                        <div
                            key={delivery._id}
                            onClick={() => handleClick(delivery)}
                            className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br border-2 flex items-center justify-center flex-shrink-0 ${
                                        delivery.type === 'PO' 
                                            ? 'from-blue-100 to-blue-200 border-blue-300' 
                                            : 'from-purple-100 to-purple-200 border-purple-300'
                                    }`}>
                                        <Package size={28} className={delivery.type === 'PO' ? 'text-blue-600' : 'text-purple-600'} />
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
                                        <p className={`text-xs font-medium mt-1 ${
                                            delivery.type === 'PO' ? 'text-blue-600' : 'text-purple-600'
                                        }`}>
                                            {delivery.type === 'PO' ? '📋 Purchase Order' : '🚚 Site Transfer'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm ${getStatusBadge(delivery.status)}`}>
                                    {getStatusText(delivery.status)}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Delivery ID</span>
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
                                    <span className="text-gray-600 font-medium">Requested By</span>
                                    <span className="font-semibold text-gray-900">{delivery.requested_by || delivery.createdBy || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Intent Request Date</span>
                                    <span className="font-semibold text-gray-900">{formatDate(delivery.createdAt)}</span>
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
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
                    <button
                        className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft size={16} />
                        <span className="text-sm font-medium">Back</span>
                    </button>

                    <div className="text-center pt-8">
                        <h1 className="text-white text-2xl font-bold mb-2">Upcoming Deliveries</h1>
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
