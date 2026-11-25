import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { getUser } from '@/lib/session';
import { EVENTS } from '@/lib/events';
import usePolling from '@/hooks/usePolling';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { useNavigate } from 'react-router-dom';
import { indentAPI, purchaseOrderAPI } from '@/api/material';
import { Plus, Image as ImageIcon, Filter } from 'lucide-react';
import AddIntentPopup from '@/pages/material/intent/components/AddIntentPopup';
import axios from '@/api/client';
import { getSelectedBranchId, getSelectedBranchName } from '@/lib/branchContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import PaginationBar from '@/components/common/PaginationBar';

const resolveFileUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = axios.defaults.baseURL || '';
  const backendBase = apiBase.replace(/\/api\/?$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${normalizedPath}`;
};

export default function Intent({ isTabView = false }) {
  const navigate = useNavigate();
  const [indents, setIndents] = useState([]); // Changed from purchaseOrders
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPopup, setShowPopup] = useState(false);
  
  // Get user and selected branch for data isolation
  const user = (getUser() || {});
  const userAssignedBranches = user?.assignedBranches || [];
  const selectedBranchId = getSelectedBranchId();
  const selectedBranchName = getSelectedBranchName();
  
  // Debug: Log branch context
  
  // ✅ Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sites, setSites] = useState([]);

  // Fetch indents (uploaded photos with PO IDs) from backend
  useEffect(() => {
    fetchIndents();
  }, [currentPage, filterSite, filterStatus, filterDateFrom, filterDateTo]);
  
  // Fetch sites once on mount
  useEffect(() => {
    fetchSites();
  }, []);
  
  // ✅ Fetch sites for filter dropdown
  const fetchSites = async () => {
    try {
      const branches = await fetchBranchesCached();
      
      // ✅ CRITICAL: For supervisor/subcontractor with selected branch, show ONLY that branch
      let filteredBranches = branches;
      if (selectedBranchId && isFieldRole(user.role)) {
        // Single branch isolation - show only selected branch
        filteredBranches = branches.filter(branch => branch._id === selectedBranchId);
      } else if (userAssignedBranches && userAssignedBranches.length > 0) {
        // Multi-branch mode for other roles with assignments
        const assignedBranchIds = userAssignedBranches.map(b => b._id || b);
        filteredBranches = branches.filter(branch => assignedBranchIds.includes(branch._id));
      }
      
      const sitesList = filteredBranches.map(branch => branch.name).sort();
      setSites(sitesList);
    } catch (err) {
      console.error('Error fetching sites:', err);
      // Fallback: use selected branch name if available
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
      fetchIndents();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage]);

  // Periodic polling every 30 seconds (paused while the tab is hidden)
  usePolling(() => fetchIndents(), 30000);

  // Listen for intent creation and status update events
  useEffect(() => {
    const handleIntentCreated = () => {
      fetchIndents();
    };
    
    const handleDeliveryRefresh = () => {
      fetchIndents();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === EVENTS.intentRefresh || e.key === EVENTS.upcomingDeliveryRefresh) {
        fetchIndents();
      }
    };
    
    window.addEventListener(EVENTS.intentCreated, handleIntentCreated);
    window.addEventListener(EVENTS.upcomingDeliveryRefresh, handleDeliveryRefresh);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener(EVENTS.intentCreated, handleIntentCreated);
      window.removeEventListener(EVENTS.upcomingDeliveryRefresh, handleDeliveryRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentPage]);

  const fetchIndents = async () => {
    try {
      setLoading(true);
      
      // ✅ CRITICAL FIX: Fetch BOTH Indents (photo) AND Purchase Orders (manual form)
      // This matches AdminIntent.jsx logic exactly
      const [indentsResponse, purchaseOrdersResponse] = await Promise.all([
        indentAPI.getAll(1, 100).catch(() => ({ success: false, data: [] })),
        purchaseOrderAPI.getAll(1, 100).catch(() => ({ success: false, data: [] }))
      ]);
      
      // Combine both types of data
      const indentsData = (indentsResponse.data || []).map(item => ({
        ...item,
        type: 'indent',
        displayId: item.indentId,
        hasImage: !!item.imageUrl
      }));
      
      const purchaseOrdersData = (purchaseOrdersResponse.data || []).map(item => ({
        ...item,
        type: 'purchaseOrder',
        displayId: item.purchaseOrderId,
        hasImage: false
      }));
      
      // Merge and sort by creation date (newest first)
      let combinedData = [...indentsData, ...purchaseOrdersData]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Completed PO/Intent records move out of Intent: approved goes to Upcoming,
      // transferred/delivered goes to GRN.
      combinedData = combinedData.filter(item => (
        !['approved', 'transferred', 'delivered'].includes(item.status?.toLowerCase())
      ));
      
      // ✅ CRITICAL: Single-branch isolation for supervisor/subcontractor
      if (selectedBranchName && isFieldRole(user.role)) {
        
        combinedData = combinedData.filter(item => {
          const deliverySite = item.deliverySite;
          const isMatch = deliverySite === selectedBranchName;
          return isMatch;
        });
        
      } else if (userAssignedBranches && userAssignedBranches.length > 0) {
        // Multi-branch filtering for other roles
        const assignedSiteNames = userAssignedBranches.map(b => b.name).filter(Boolean);
        
        combinedData = combinedData.filter(item => {
          const deliverySite = item.deliverySite;
          return assignedSiteNames.includes(deliverySite);
        });
        
      }
      
      // ✅ Apply filters client-side
      if (filterSite) {
        combinedData = combinedData.filter(item => 
          item.deliverySite?.toLowerCase().includes(filterSite.toLowerCase())
        );
      }
      
      if (filterStatus) {
        combinedData = combinedData.filter(item => 
          item.status?.toLowerCase() === filterStatus.toLowerCase()
        );
      }
      
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        combinedData = combinedData.filter(item => {
          const itemDate = new Date(item.createdAt);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate >= fromDate;
        });
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        combinedData = combinedData.filter(item => {
          const itemDate = new Date(item.createdAt);
          return itemDate <= toDate;
        });
      }
      
      
      // Calculate pagination based on combined data
      const itemsPerPage = 10;
      const totalItems = combinedData.length;
      const nextTotalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      const safePage = Math.min(currentPage, nextTotalPages);
      const startIndex = (safePage - 1) * itemsPerPage;

      if (safePage !== currentPage) {
        setCurrentPage(safePage);
      }

      setIndents(combinedData.slice(startIndex, startIndex + itemsPerPage));
      setTotalPages(nextTotalPages);
      
    } catch (err) {
      console.error('Error fetching Intent PO data:', err);
      setIndents([]);
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

  // Render content only (for tab view)
  const renderContent = () => (
    <div className="px-6 py-6">
      {/* ✅ Filter Toggle Button */}
      <div className="mb-3">
        <Button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full h-auto flex items-center justify-between px-3 py-2.5 border border-line-card bg-surface text-ink-1 hover:bg-surface-muted hover:text-ink-1 rounded-[10px] shadow-none"
        >
          <span className="font-semibold flex items-center gap-2 text-sm">
            <Filter size={16} />
            Filters
          </span>
          <span className="text-xs">{showFilters ? "▲" : "▼"}</span>
        </Button>
      </div>

      {/* ✅ Filters Panel */}
      {showFilters && (
        <div className="mb-3 bg-surface border border-line-card rounded-lg p-3 shadow-sm space-y-2.5">
          {/* Site Filter */}
          <div>
            <Label className="block text-xs font-semibold text-ink-2 mb-1">
              Site
            </Label>
            <select
              value={filterSite}
              onChange={(e) => {
                setFilterSite(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-line-input rounded-md px-2.5 py-2 text-sm text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
            >
              <option value="" className="text-ink-3">
                All Sites
              </option>
              {sites.map((site) => (
                <option key={site} value={site} className="text-ink-1">
                  {site}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <Label className="block text-xs font-semibold text-ink-2 mb-1">
              Status
            </Label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-line-input rounded-md px-2.5 py-2 text-sm text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
            >
              <option value="" className="text-ink-3">
                All Status
              </option>
              <option value="pending" className="text-ink-1">
                Pending
              </option>
              <option value="cancelled" className="text-ink-1">
                Cancelled
              </option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="block text-xs font-semibold text-ink-2 mb-1">
                From
              </Label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-line-input rounded-md px-2.5 py-2 text-xs text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
              />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-ink-2 mb-1">
                To
              </Label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-line-input rounded-md px-2.5 py-2 text-xs text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFilterSite("");
              setFilterStatus("");
              setFilterDateFrom("");
              setFilterDateTo("");
              setCurrentPage(1);
            }}
            className="w-full h-auto px-3 py-2 bg-surface-muted hover:bg-surface-muted text-ink-2 text-xs font-semibold rounded-md transition-colors"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-line-card p-5 space-y-4"
            >
              <div className="flex justify-between items-start">
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
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : indents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tone-highlight-soft flex items-center justify-center">
            <Plus size={32} className="text-tone-highlight-fg" />
          </div>
          <p className="text-ink-2 font-semibold text-base mb-1">
            No Intent Requests
          </p>
          <p className="text-ink-3 text-sm">
            Click the + button to upload your first intent
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {indents.map((indent) => (
            <div
              key={indent._id}
              onClick={() => {
                // Navigate to intent detail page
                navigate(ROUTES.material.intentDetail(indent._id));
              }}
              className="bg-surface-subtle rounded-2xl border border-line-card p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              {/* Header with Image Thumbnail */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {indent.hasImage && indent.imageUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-line-card flex-shrink-0">
                      <img loading="lazy" decoding="async"
                        src={resolveFileUrl(indent.imageUrl)}
                        alt="Intent"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentElement.innerHTML =
                            '<div class="w-full h-full bg-tone-highlight-soft flex items-center justify-center"><svg class="w-8 h-8 text-tone-highlight-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-tone-info-soft border-2 border-line-card flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-8 h-8 text-tone-info-fg"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-ink-1 text-base">
                      {indent.displayId ||
                        indent.indentId ||
                        indent.purchaseOrderId ||
                        "N/A"}
                    </h3>
                    <p className="text-xs text-ink-3 mt-1">
                      {formatDate(indent.createdAt)}
                    </p>
                    <p className="text-xs text-tone-info-fg font-medium mt-0.5">
                      {indent.type === "indent"
                        ? "📷 Photo Upload"
                        : "📝 Manual Entry"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm border-transparent ${getStatusColor(
                    indent.status
                  )}`}
                >
                  {getStatusText(indent.status)}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-ink-3 font-medium">PO ID</span>
                  <span className="font-semibold text-ink-1">
                    {indent.displayId ||
                      indent.indentId ||
                      indent.purchaseOrderId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-3 font-medium">
                    Requested By
                  </span>
                  <span className="font-semibold text-ink-1">
                    {indent.requestedBy?.name || indent.requestedBy || "N/A"}
                  </span>
                </div>
                {indent.deliverySite && (
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3 font-medium">
                      Delivery Site
                    </span>
                    <span className="font-semibold text-ink-1">
                      {indent.deliverySite}
                    </span>
                  </div>
                )}
                {indent.materials && indent.materials.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-ink-3 font-medium">Materials</span>
                    <span className="font-semibold text-tone-info-fg">
                      {indent.materials.length} items
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          variant="simple"
        />
      )}
    </div>
  );

  // If in tab view mode, return content only
  if (isTabView) {
    return (
      <>
        {renderContent()}
        
        {/* Floating Action Button - Bottom Center */}
        <Button
          type="button"
          onClick={() => setShowPopup(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 size-14 p-0 rounded-full shadow-lg z-50"
        >
          <Plus size={28} strokeWidth={2.5} className="size-7" />
        </Button>

        {/* Add Intent Popup */}
        {showPopup && (
          <AddIntentPopup
            onClose={() => setShowPopup(false)}
            onUploadClick={() => {
              setShowPopup(false);
              navigate(ROUTES.material.intentNew);
            }}
          />
        )}
      </>
    );
  }

  // Standalone mode with full page layout
  return (
    <div className="min-h-screen bg-tone-highlight-soft">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-surface shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-primary text-primary-foreground hover:bg-primary-strong px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <Button
            variant="ghost"
            className="mobile-back-button absolute top-6 left-6 h-auto px-2 py-1 text-primary-foreground hover:bg-surface-muted hover:text-primary-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </Button>

          <div className="text-center pt-8">
            <h1 className="text-primary-foreground text-2xl font-bold mb-2">Material Intent</h1>
            <p className="text-primary-foreground/80 text-sm">{user?.name || 'User'}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {renderContent().props.children}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-ink-4">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button - Bottom Center */}
      <Button
        type="button"
        onClick={() => setShowPopup(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 size-14 p-0 rounded-full shadow-lg z-50"
      >
        <Plus size={28} strokeWidth={2.5} className="size-7" />
      </Button>

      {/* Add Intent Popup */}
      {showPopup && (
        <AddIntentPopup
          onClose={() => setShowPopup(false)}
          onUploadClick={() => {
            setShowPopup(false);
            navigate(ROUTES.material.uploadPhoto);
          }}
        />
      )}
    </div>
  );
}