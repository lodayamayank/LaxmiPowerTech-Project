import React, { useState, useEffect } from "react";
import { ArrowLeft } from 'lucide-react';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { getUser } from '@/lib/session';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI } from "@/api/material";
import { Package, Calendar, MapPin, FileText, User, TrendingUp, Eye, Filter, Search } from "lucide-react";
import { getSelectedBranchId, getSelectedBranchName } from "@/lib/branchContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function GRN({ isTabView = false }) {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = (getUser() || {});
  const userAssignedBranches = user?.assignedBranches || [];
  const selectedBranchId = getSelectedBranchId();
  const selectedBranchName = getSelectedBranchName();
  
  // Debug: Log branch context
  console.log('👤 GRN - User:', user?.name, 'Role:', user?.role);
  console.log('🏢 GRN - Assigned Branches:', userAssignedBranches);
  console.log('🎯 GRN - Selected Branch:', selectedBranchId, selectedBranchName);
  
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
      const branches = await fetchBranchesCached();
      
      // ✅ CRITICAL: Single-branch isolation for supervisor/subcontractor
      let filteredBranches = branches;
      if (selectedBranchId && isFieldRole(user.role)) {
        filteredBranches = branches.filter(branch => branch._id === selectedBranchId);
        console.log('🔒 GRN - Single branch mode:', selectedBranchName);
      } else if (userAssignedBranches && userAssignedBranches.length > 0) {
        const assignedBranchIds = userAssignedBranches.map(b => b._id || b);
        filteredBranches = branches.filter(branch => assignedBranchIds.includes(branch._id));
        console.log('✅ GRN - Multi-branch mode:', filteredBranches.length, 'branches');
      } else {
        console.log('⚠️ GRN - Admin mode - all sites');
      }
      
      const sitesList = filteredBranches.map(branch => branch.name).sort();
      setSites(sitesList);
      console.log('✅ GRN - Site filter options:', sitesList);
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
        
        // ✅ CRITICAL: Single-branch isolation for supervisor/subcontractor
        if (selectedBranchName && isFieldRole(user.role)) {
          console.log('🔒 GRN - STRICT ISOLATION: Filtering by selected branch only:', selectedBranchName);
          
          completed = completed.filter(item => {
            const fromSite = item.from;
            const toSite = item.to;
            // Show delivery ONLY if either 'from' or 'to' matches SELECTED branch
            const isMatch = fromSite === selectedBranchName || toSite === selectedBranchName;
            return isMatch;
          });
          
          console.log('✅ GRN - Isolated to', completed.length, 'deliveries for branch:', selectedBranchName);
        } else if (userAssignedBranches && userAssignedBranches.length > 0) {
          // Multi-branch filtering for other roles
          const assignedSiteNames = userAssignedBranches.map(b => b.name).filter(Boolean);
          console.log('🔒 GRN - Multi-branch filtering:', assignedSiteNames);
          
          completed = completed.filter(item => {
            const fromSite = item.from;
            const toSite = item.to;
            return assignedSiteNames.includes(fromSite) || assignedSiteNames.includes(toSite);
          });
          
          console.log('✅ GRN - Filtered to', completed.length, 'deliveries');
        } else {
          console.log('⚠️ GRN - Admin mode - no filtering');
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
    navigate(ROUTES.material.grnDetail(delivery._id));
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
          <Input
            type="text"
            placeholder="Search by GRN ID, site, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg pl-10 pr-4 border-line-input bg-surface text-ink-1 focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
        </div>
        
        {/* Filters Toggle Button */}
        <div>
          <Button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full h-auto flex items-center justify-between px-3 py-2.5 border border-line-card bg-surface text-ink-1 hover:bg-surface-muted hover:text-ink-1 rounded-[10px] shadow-none"
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
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-surface border border-line-card rounded-lg p-3 shadow-sm space-y-2.5">
            {/* Site Filter */}
            <div>
              <Label className="block text-xs font-semibold text-ink-2 mb-1">Site</Label>
              <select
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
            
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="block text-xs font-semibold text-ink-2 mb-1">From Date</Label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full border border-line-input rounded-md px-2.5 py-2 text-xs text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
                />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-ink-2 mb-1">To Date</Label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full border border-line-input rounded-md px-2.5 py-2 text-xs text-ink-1 font-medium focus:ring-2 focus-visible:ring-ring focus-visible:border-primary bg-surface"
                />
              </div>
            </div>
            
            {/* Clear Filters Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFilterSite('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSearch('');
              }}
              className="w-full h-auto px-3 py-2 bg-surface-muted hover:bg-surface-muted text-ink-2 text-xs font-semibold rounded-md transition-colors"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-line-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tone-ok-soft flex items-center justify-center">
            <Package size={32} className="text-tone-ok-fg" />
          </div>
          <p className="text-ink-2 font-semibold text-base mb-1">No GRN Records</p>
          <p className="text-ink-3 text-sm">
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
              className="bg-surface-subtle rounded-2xl border border-line-card p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-tone-ok-soft border-2 border-tone-ok-border flex items-center justify-center flex-shrink-0">
                    <Package size={28} className="text-tone-ok-fg" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink-1 text-base">
                      {delivery.transfer_number || delivery.st_id}
                    </h3>
                    <p className="text-xs text-ink-1 font-medium mt-1">
                      {formatDate(delivery.createdAt)}
                    </p>
                    <p className="text-xs text-ink-3 mt-0.5">
                      Intent Request Date
                    </p>
                    <p className="text-xs text-tone-ok-fg font-medium mt-0.5">
                      {delivery.type === 'PO' ? '📋 Vendor-wise PO' : '🚚 Site Transfer'}
                    </p>
                  </div>
                </div>
                <Badge className="text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm bg-tone-ok-soft text-tone-ok-fg hover:bg-tone-ok-soft border-transparent">
                  ✅ Completed
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-ink-3 font-medium">GRN ID</span>
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
                  <span className="text-ink-3 font-medium">Intent Request Date</span>
                  <span className="font-semibold text-ink-1">{formatDate(delivery.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-3 font-medium">Delivery Date</span>
                  <span className="font-semibold text-tone-ok-fg">{formatDate(delivery.updatedAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-3 font-medium">Materials</span>
                  <span className="font-semibold text-tone-info-fg">{delivery.items?.length || 0} items</span>
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
    <div className="min-h-screen bg-tone-highlight-soft">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-surface shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-primary text-primary-foreground hover:bg-primary-strong px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="mobile-back-button absolute top-6 left-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-primary-foreground text-2xl font-bold mb-2">GRN Records</h1>
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
    </div>
  );
}