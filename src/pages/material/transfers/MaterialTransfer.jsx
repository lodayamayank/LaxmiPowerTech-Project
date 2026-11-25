import React, { useState, useEffect } from "react";
import { ArrowLeft } from 'lucide-react';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { getUser } from '@/lib/session';
import { EVENTS } from '@/lib/events';
import usePolling from '@/hooks/usePolling';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { useNavigate } from "react-router-dom";
import { siteTransferAPI } from "@/api/material";
import { Filter, Plus, Truck } from "lucide-react";
import { getSelectedBranchId, getSelectedBranchName } from "@/lib/branchContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function MaterialTransfer() {
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

  const user = (getUser() || {});
  const userAssignedBranches = user?.assignedBranches || [];
  const selectedBranchId = getSelectedBranchId();
  const selectedBranchName = getSelectedBranchName();
  
  // Debug: Log branch context

  // Fetch site transfers from backend
  useEffect(() => {
    fetchTransfers();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  }, [currentPage, filterSite, filterStatus, filterDateFrom, filterDateTo]);
  
  // Fetch sites once on mount
  useEffect(() => {
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

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchTransfers();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  }, [currentPage]);

  // Periodic polling every 30 seconds (paused while the tab is hidden)
  usePolling(() => fetchTransfers(), 30000);

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
      if (e.key === EVENTS.deliveryRefresh || e.key === EVENTS.upcomingDeliveryRefresh || e.key === EVENTS.siteTransferRefresh) {
        fetchTransfers();
        localStorage.removeItem(e.key);
      }
    };
    
    window.addEventListener(EVENTS.deliveryUpdated, handleDeliveryUpdate);
    window.addEventListener(EVENTS.siteTransferCreated, handleSiteTransferCreated);
    window.addEventListener(EVENTS.upcomingDeliveryRefresh, handleUpcomingDeliveryRefresh);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener(EVENTS.deliveryUpdated, handleDeliveryUpdate);
      window.removeEventListener(EVENTS.siteTransferCreated, handleSiteTransferCreated);
      window.removeEventListener(EVENTS.upcomingDeliveryRefresh, handleUpcomingDeliveryRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
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
        if (selectedBranchName && isFieldRole(user.role)) {
          
          transfersData = transfersData.filter(transfer => {
            const fromSite = transfer.fromSite;
            const toSite = transfer.toSite;
            // Show transfer if either 'from' or 'to' matches selected branch
            const isMatch = fromSite === selectedBranchName || toSite === selectedBranchName;
            return isMatch;
          });
          
        } else if (userAssignedBranches && userAssignedBranches.length > 0) {
          // Multi-branch filtering for other roles
          const assignedSiteNames = userAssignedBranches.map(b => b.name).filter(Boolean);
          
          transfersData = transfersData.filter(transfer => {
            const fromSite = transfer.fromSite;
            const toSite = transfer.toSite;
            return assignedSiteNames.includes(fromSite) || assignedSiteNames.includes(toSite);
          });
          
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
        return 'bg-tone-ok-soft text-tone-ok-fg';
      case 'approved':
        return 'bg-tone-highlight-soft text-tone-highlight-fg';
      case 'pending':
        return 'bg-surface-muted text-ink-2';
      case 'cancelled':
        return 'bg-tone-bad-soft text-tone-bad-fg';
      default:
        return 'bg-surface-muted text-ink-3';
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
    navigate(ROUTES.material.transferNew);
  };

  // Render content only (for tab view)
  const renderContent = () => (
    <div className="flex flex-col gap-3.5">
      {/* ✅ Filter Toggle Button */}
      <div className="mb-3">
        <Button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="h-auto w-full flex items-center justify-between px-3 py-2.5 border border-line-card bg-surface text-ink-1 hover:bg-surface-muted hover:text-ink-1 rounded-[10px] shadow-none"
        >
          <span className="font-semibold flex items-center gap-2 text-sm">
            <Filter size={16} />
            Filters
          </span>
          <span className="text-xs">
            {showFilters ? '▲' : '▼'}
          </span>
        </Button>
      </div>
      
      {/* ✅ Filters Panel */}
      {showFilters && (
        <div className="mb-3 bg-surface border border-line-card rounded-lg p-3 space-y-2.5">
          {/* Site Filter */}
          <div>
            <Label htmlFor="transfer-filter-site" className="mb-1 block text-xs font-semibold leading-4 text-ink-2">Site</Label>
            <select
              id="transfer-filter-site"
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
            <Label htmlFor="transfer-filter-status" className="mb-1 block text-xs font-semibold leading-4 text-ink-2">Status</Label>
            <select
              id="transfer-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-line-input rounded-md px-2.5 py-2 text-sm text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
            >
              <option value="" className="text-ink-3">All Status</option>
              <option value="pending" className="text-ink-1">Pending</option>
              <option value="approved" className="text-ink-1">Approved</option>
              <option value="cancelled" className="text-ink-1">Cancelled</option>
            </select>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="transfer-filter-from" className="mb-1 block text-xs font-semibold leading-4 text-ink-2">From</Label>
              <Input
                id="transfer-filter-from"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-auto w-full rounded-md border-line-input bg-surface px-2.5 py-2 text-xs md:text-xs font-medium text-ink-1 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div>
              <Label htmlFor="transfer-filter-to" className="mb-1 block text-xs font-semibold leading-4 text-ink-2">To</Label>
              <Input
                id="transfer-filter-to"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-auto w-full rounded-md border-line-input bg-surface px-2.5 py-2 text-xs md:text-xs font-medium text-ink-1 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                style={{ colorScheme: 'light' }}
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          <Button
            type="button"
            onClick={() => {
              setFilterSite('');
              setFilterStatus('');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
            className="h-auto w-full px-3 py-2 bg-surface-muted hover:bg-surface-muted text-ink-2 hover:text-ink-1 text-xs font-semibold rounded-md transition-colors"
          >
            Clear Filters
          </Button>
        </div>
      )}
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="rounded-[14px] border-line-card">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tone-highlight-soft flex items-center justify-center">
            <Truck size={32} className="text-tone-highlight-fg" />
          </div>
          <p className="text-ink-2 font-semibold text-base mb-1">No Site Transfers</p>
          <p className="text-ink-3 text-sm">Click the + button to create your first transfer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <Card
              key={transfer._id}
              onClick={() => navigate(ROUTES.material.transferDetail(transfer._id))}
              className="bg-surface-subtle rounded-[14px] border-line-card transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-lg bg-tone-purple-soft border border-line-card flex items-center justify-center flex-shrink-0">
                      <Truck size={20} className="text-tone-purple-fg" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-1 text-base">
                        {transfer.siteTransferId}
                      </h3>
                      <p className="text-xs text-ink-3 mt-1">
                        {formatDate(transfer.createdAt)}
                      </p>
                      <p className="text-xs text-tone-purple-fg font-medium mt-0.5">
                        Site Transfer
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getStatusColor(transfer.status)}`}>
                    {getStatusText(transfer.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3 font-medium">ST ID</span>
                    <span className="font-semibold text-ink-1">{transfer.siteTransferId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3 font-medium">From Site</span>
                    <span className="font-semibold text-ink-1">{transfer.fromSite}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3 font-medium">To Site</span>
                    <span className="font-semibold text-ink-1">{transfer.toSite}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3 font-medium">Requested By</span>
                    <span className="font-semibold text-ink-1">{transfer.requestedBy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3 font-medium">Materials</span>
                    <span className="font-semibold text-tone-info-fg">{transfer.materials?.length || 0} items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-auto px-4 py-2 bg-surface border-line-card rounded-xl font-medium text-sm text-ink-2 hover:text-ink-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted transition-all"
          >
            Previous
          </Button>
          <span className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-strong rounded-xl font-semibold text-sm">
            {currentPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-auto px-4 py-2 bg-surface border-line-card rounded-xl font-medium text-sm text-ink-2 hover:text-ink-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted transition-all"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );

  // If in tab view mode, return content only
  // (The old standalone page layout with its own navy header was removed: this screen is only shown inside
  // the Materials page, which provides the mobile top bar, section chips and tab bar.)
  return (
    <>
      {renderContent()}
      
      {/* Floating Action Button - Bottom Center */}
      <Button
        type="button"
        onClick={handleCreateTransfer}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 size-14 p-0 rounded-full z-50 [&_svg]:size-7"
      >
        <Plus size={28} strokeWidth={2.5} />
      </Button>
    </>
  );

}