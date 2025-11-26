import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI } from "../../utils/materialAPI";
import { Search } from "lucide-react";

export default function UpcomingDeliveries({ isTabView = false }) {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, ST, PO

    useEffect(() => {
        fetchDeliveries();
    }, []);

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

    const handleClick = (delivery) => {
        navigate(`/dashboard/material/delivery-checklist/${delivery._id}`);
    };

    // Filter deliveries by search term and type
    const filteredDeliveries = deliveries.filter((delivery) => {
        // Type filter
        if (typeFilter !== "ALL" && delivery.type !== typeFilter) {
            return false;
        }
        
        // Search filter
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            delivery.st_id?.toLowerCase().includes(searchLower) ||
            delivery.transfer_number?.toLowerCase().includes(searchLower)
        );
    });

    const getStatusBadge = (status) => {
        const statusColors = {
            'Pending': 'bg-gray-100 text-gray-700',
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

    return (
        <div className={isTabView ? "px-6 py-6" : "p-3"}>
            {/* Filter and Search */}
            <div className="mb-4 space-y-3">
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
                <div className="text-center py-12">
                    <p className="text-gray-500 text-sm">
                        {search ? "No deliveries found matching your search" : "No upcoming deliveries"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredDeliveries.map((delivery) => (
                        <div
                            key={delivery._id}
                            onClick={() => handleClick(delivery)}
                            className="p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-900">{delivery.st_id}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {delivery.transfer_number}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {formatDate(delivery.date)} • {delivery.from} → {delivery.to}
                                    </div>
                                </div>
                                <div
                                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(delivery.status)}`}
                                >
                                    {delivery.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
