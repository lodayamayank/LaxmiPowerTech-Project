import React, { useState, useEffect } from "react";
import { ArrowLeft } from 'lucide-react';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { getUser } from '@/lib/session';
import { EVENTS } from '@/lib/events';
import usePolling from '@/hooks/usePolling';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI } from "@/api/material";
import { Search, Filter, Package, Plus } from "lucide-react";
import { getSelectedBranchId, getSelectedBranchName } from "@/lib/branchContext";
// NOTE: import paths assume the standard shadcn "@/" alias. Adjust if this project uses relative paths.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function UpcomingDeliveries() {
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

    const user = (getUser() || {});
    const userAssignedBranches = user?.assignedBranches || [];
    const selectedBranchId = getSelectedBranchId();
    const selectedBranchName = getSelectedBranchName();
    
    // Debug: Log branch context

    useEffect(() => {
        fetchDeliveries();
        fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
    }, []);
    
    // ✅ Fetch sites for filter dropdown
    const fetchSites = async () => {
        try {
            const branches = await fetchBranchesCached();
            
            // ✅ CRITICAL: Single-branch isolation for supervisor/subcontractor
            let filteredBranches = branches;
            if (selectedBranchId && isFieldRole(user.role)) {
                filteredBranches = branches.filter(branch => branch._id === selectedBranchId);
            } else if (userAssignedBranches && userAssignedBranches.length > 0) {
                const assignedBranchIds = userAssignedBranches.map(b => b._id || b);
                filteredBranches = branches.filter(branch => assignedBranchIds.includes(branch._id));
            }
            
            const sitesList = filteredBranches.map(branch => branch.name).sort();
            setSites(sitesList);
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
            fetchDeliveries();
        };

        const handleSiteTransferChange = () => {
            fetchDeliveries();
        };

        const handleDeliveryRefresh = () => {
            fetchDeliveries();
        };

        const handleStorageChange = (e) => {
            if (e.key === EVENTS.intentRefresh || e.key === EVENTS.upcomingDeliveryRefresh || e.key === EVENTS.siteTransferRefresh) {
                fetchDeliveries();
                localStorage.removeItem(e.key);
            }
        };

        window.addEventListener(EVENTS.intentCreated, handleIntentChange);
        window.addEventListener(EVENTS.siteTransferCreated, handleSiteTransferChange);
        window.addEventListener(EVENTS.upcomingDeliveryRefresh, handleDeliveryRefresh);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener(EVENTS.intentCreated, handleIntentChange);
            window.removeEventListener(EVENTS.siteTransferCreated, handleSiteTransferChange);
            window.removeEventListener(EVENTS.upcomingDeliveryRefresh, handleDeliveryRefresh);
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

    // Periodic polling every 30 seconds (paused while the tab is hidden)
    usePolling(() => fetchDeliveries(), 30000);

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
        if (selectedBranchName && isFieldRole(user.role)) {
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
            'Pending': 'bg-surface-muted text-ink-2',
            'Approved': 'bg-tone-info-soft text-tone-info-fg',
            'Partial': 'bg-tone-highlight-soft text-tone-highlight-fg',
            'Transferred': 'bg-tone-ok-soft text-tone-ok-fg',
            'Cancelled': 'bg-tone-bad-soft text-tone-bad-fg'
        };
        return statusColors[status] || 'bg-surface-muted text-ink-2';
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
        navigate(ROUTES.adminMaterial.deliveryDetail(delivery._id), {
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

    // Shared body (filters + list). Plain render function (NOT a nested component),
    // so inputs keep focus across re-renders. Each mode supplies its own wrapper padding.
    const renderBody = () => (
        <>
            {/* Filter and Search */}
            <div className="mb-4 space-y-3">
                {/* ✅ Additional Filters Toggle Button */}
                <div>
                    <Button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full h-auto flex items-center justify-between px-3 py-2.5 border border-line-card bg-surface text-ink-1 hover:bg-surface-muted rounded-[10px] shadow-none"
                    >
                        <span className="font-semibold flex items-center gap-2 text-sm">
                            <Filter size={16} />
                            More Filters
                        </span>
                        <span className="text-xs">
                            {showFilters ? '▲' : '▼'}
                        </span>
                    </Button>
                </div>
                
                {/* ✅ Additional Filters Panel */}
                {showFilters && (
                    <div className="bg-surface border border-line-card rounded-lg p-3 space-y-2.5">
                        {/* Site Filter */}
                        <div>
                            <Label htmlFor="upcoming-deliveries-site" className="block text-xs font-semibold text-ink-2 mb-1">Site</Label>
                            <select
                                id="upcoming-deliveries-site"
                                value={filterSite}
                                onChange={(e) => setFilterSite(e.target.value)}
                                className="w-full border border-line-input rounded-md px-2.5 py-2 text-sm text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
                            >
                                <option value="" className="text-ink-3">All Sites</option>
                                {sites.map(site => (
                                    <option key={site} value={site} className="text-ink-1">{site}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Status Filter */}
                        <div>
                            <Label htmlFor="upcoming-deliveries-status" className="block text-xs font-semibold text-ink-2 mb-1">Status</Label>
                            <select
                                id="upcoming-deliveries-status"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full border border-line-input rounded-md px-2.5 py-2 text-sm text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
                            >
                                <option value="" className="text-ink-3">All Status</option>
                                <option value="pending" className="text-ink-1">Pending</option>
                                <option value="approved" className="text-ink-1">Approved</option>
                                <option value="partial" className="text-ink-1">Partial</option>
                                <option value="transferred" className="text-ink-1">Transferred</option>
                                <option value="cancelled" className="text-ink-1">Cancelled</option>
                            </select>
                        </div>
                        
                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="upcoming-deliveries-date-from" className="block text-xs font-semibold text-ink-2 mb-1">From</Label>
                                <Input
                                    id="upcoming-deliveries-date-from"
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="w-full h-auto border-line-input rounded-md px-2.5 py-2 text-xs md:text-xs text-ink-1 font-medium shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
                                />
                            </div>
                            <div>
                                <Label htmlFor="upcoming-deliveries-date-to" className="block text-xs font-semibold text-ink-2 mb-1">To</Label>
                                <Input
                                    id="upcoming-deliveries-date-to"
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="w-full h-auto border-line-input rounded-md px-2.5 py-2 text-xs md:text-xs text-ink-1 font-medium shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
                                />
                            </div>
                        </div>
                        
                        {/* Clear Additional Filters Button */}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setFilterSite('');
                                setFilterStatus('');
                                setFilterDateFrom('');
                                setFilterDateTo('');
                            }}
                            className="w-full h-auto px-3 py-2 bg-surface-muted hover:bg-surface-muted text-ink-2 hover:text-ink-1 text-xs font-semibold rounded-md transition-colors"
                        >
                            Clear Filters
                        </Button>
                    </div>
                )}
                
                {/* Type Filter (native select retained: custom chevron styling + exact ALL/ST/PO values) */}
                <div>
                    <select
                        aria-label="Delivery type"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-line-input rounded-lg focus:outline-none focus:ring-2 focus-visible:ring-ring bg-surface text-ink-1 font-medium"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 1rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.25em 1.25em',
                            paddingRight: '2.5rem'
                        }}
                    >
                        <option value="ALL" className="text-ink-1 bg-surface">All Deliveries</option>
                        <option value="ST" className="text-ink-1 bg-surface">Site Transfers (ST)</option>
                        <option value="PO" className="text-ink-1 bg-surface">Purchase Orders (PO)</option>
                    </select>
                </div>
                
                {/* Search bar */}
                <div className="relative">
                    <Input
                        type="text"
                        placeholder="Search by ST-ID or Transfer Number..."
                        aria-label="Search deliveries"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-auto px-4 py-2 pl-10 text-base md:text-base border-line-input rounded-lg shadow-none focus-visible:ring-2 focus-visible:ring-ring bg-surface text-ink-1 placeholder:text-muted-foreground"
                    />
                    <Search size={18} className="absolute left-3 top-3 text-ink-4 pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line-card mb-4"></div>
                    <p className="text-ink-3 text-sm">Loading deliveries...</p>
                </div>
            ) : error ? (
                <div className="p-4 bg-tone-bad-soft border border-tone-bad-border rounded-lg">
                    <p className="text-tone-bad-fg text-sm">{error}</p>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={fetchDeliveries}
                        className="mt-2 h-auto p-0 text-sm font-normal text-tone-bad-fg hover:text-primary-strong hover:bg-transparent underline"
                    >
                        Try Again
                    </Button>
                </div>
            ) : filteredDeliveries.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tone-info-soft flex items-center justify-center">
                        <Package size={32} className="text-tone-info-fg" />
                    </div>
                    <p className="text-ink-2 font-semibold text-base mb-1">No Upcoming Deliveries</p>
                    <p className="text-ink-3 text-sm">
                        {search ? "No deliveries found matching your search" : "Approved deliveries will appear here"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredDeliveries.map((delivery) => (
                        <Card
                            key={delivery._id}
                            onClick={() => handleClick(delivery)}
                            className="bg-surface-subtle rounded-[14px] border border-line-card transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
                        >
                            <CardContent className="p-5">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-11 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                                            delivery.type === 'PO' ? 'border-line-card bg-tone-info-soft' : 'border-line-card bg-tone-purple-soft'
                                        }`}>
                                            <Package size={20} className={delivery.type === 'PO' ? 'text-tone-info-fg' : 'text-tone-purple-fg'} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-ink-1 text-base">
                                                {delivery.transfer_number || delivery.st_id}
                                            </h3>
                                            <p className="text-xs text-ink-1 font-medium mt-1">
                                                {formatDate(delivery.createdAt)}
                                            </p>
                                            <p className="text-xs text-ink-3 mt-0.5">
                                                Intent Request Date
                                            </p>
                                            <p className={`text-xs font-medium mt-1 ${
                                                delivery.type === 'PO' ? 'text-tone-info-fg' : 'text-tone-purple-fg'
                                            }`}>
                                                {delivery.type === 'PO' ? '📋 Purchase Order' : '🚚 Site Transfer'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getStatusBadge(delivery.status)}`}>
                                        {getStatusText(delivery.status)}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-ink-3 font-medium">Delivery ID</span>
                                        <span className="font-semibold text-ink-1">{delivery.transfer_number || delivery.st_id}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-ink-3 font-medium">From</span>
                                        <span className="font-semibold text-ink-1">{delivery.from || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-ink-3 font-medium">To</span>
                                        <span className="font-semibold text-ink-1">{delivery.to || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-ink-3 font-medium">Requested By</span>
                                        <span className="font-semibold text-ink-1">{delivery.requested_by || delivery.createdBy || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-ink-3 font-medium">Intent Request Date</span>
                                        <span className="font-semibold text-ink-1">{formatDate(delivery.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-ink-3 font-medium">Materials</span>
                                        <span className="font-semibold text-tone-info-fg">{delivery.items?.length || 0} items</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    );

    // Tab view: body inside the standard padded wrapper
  // (The old standalone page layout with its own navy header was removed: this screen is only shown inside
  // the Materials page, which provides the mobile top bar, section chips and tab bar.)
      return <div className="flex flex-col gap-3.5">{renderBody()}</div>;
  
}