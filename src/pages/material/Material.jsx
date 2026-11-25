import React from "react";
import { Folder } from 'lucide-react';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { getUser } from '@/lib/session';
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Truck, Package, ClipboardCheck } from "lucide-react";
import Intent from "@/pages/material/intent/Intent";
import MaterialTransfer from "@/pages/material/transfers/MaterialTransfer";
import UpcomingDeliveries from "@/pages/material/deliveries/UpcomingDeliveries";
import GRN from "@/pages/material/grn/GRN";
import { getSelectedBranchName } from "@/lib/branchContext";
import { Button } from "@/components/ui/button";

export default function Material({ activeTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = (getUser() || {});
  
  // Get branchId from location state if passed from supervisor/subcontractor flow
  const branchId = location.state?.branchId;
  const selectedBranchName = getSelectedBranchName();

  // Determine active tab based on route or prop
  const getCurrentTab = () => {
    if (activeTab) return activeTab;
    const path = location.pathname;
    if (path.includes('/material/transfer')) return 'transfer';
    if (path.includes('/material/deliveries')) return 'deliveries';
    if (path.includes('/material/grn')) return 'grn';
    return 'intent';
  };

  const currentTab = getCurrentTab();

  const tabs = [
    { name: 'Intent', path: ROUTES.material.intent, key: 'intent', icon: FileText, color: 'blue' },
    { name: 'Material Transfer', path: ROUTES.material.transfer, key: 'transfer', icon: Truck, color: 'orange' },
    { name: 'Upcoming Deliveries', path: ROUTES.material.deliveries, key: 'deliveries', icon: Package, color: 'purple' },
    { name: 'GRN', path: ROUTES.material.grn, key: 'grn', icon: ClipboardCheck, color: 'green' },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'intent':
        return <Intent isTabView={true} branchId={branchId} />;
      case 'transfer':
        return <MaterialTransfer isTabView={true} branchId={branchId} />;
      case 'deliveries':
        return <UpcomingDeliveries isTabView={true} branchId={branchId} />;
      case 'grn':
          return <GRN isTabView={true} branchId={branchId} />;
      default:
        return <Intent isTabView={true} branchId={branchId} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-surface shadow-2xl">
        {/* Modern Header */}
        <div className="bg-primary text-primary-foreground hover:bg-primary-strong px-4 pt-4 pb-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              className="mobile-back-button h-auto px-3 py-2 text-white hover:bg-white/20 hover:text-white"
              onClick={() => navigate(ROUTES.dashboard)}
            >
              <ArrowLeft size={18} className="size-[18px]" />
              <span className="text-sm font-semibold">Back</span>
            </Button>
            <div className="text-right">
              <p className="text-white/90 text-xs font-medium">{user?.name || 'User'}</p>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-white text-xl font-bold">Material Management</h1>
            {selectedBranchName && isFieldRole(user.role) && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <div className="bg-surface/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Folder className="text-white" size={14} />
                  <span className="text-white text-xs font-medium">{selectedBranchName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Professional Tab Navigation */}
        <div className="bg-surface border-b border-line-card sticky top-0 z-10 shadow-sm">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(tab.path, { state: { branchId } })}
                  className={`flex-1 min-w-[90px] h-auto rounded-none whitespace-normal px-3 py-3 flex flex-col items-center gap-1.5 transition-all relative ${
                    isActive
                      ? 'text-tone-highlight-fg bg-tone-highlight-soft hover:text-primary-strong hover:bg-tone-highlight-soft'
                      : 'text-ink-3 hover:text-primary-strong hover:bg-surface-muted'
                  }`}
                >
                  <Icon size={20} className={`size-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  <span className={`text-[10px] font-semibold leading-tight text-center ${
                    isActive ? 'text-tone-highlight-fg' : 'text-ink-3'
                  }`}>
                    {tab.name}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-surface-subtle min-h-[calc(100vh-180px)]">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="bg-surface border-t border-line-card py-3">
          <div className="text-center">
            <p className="text-xs text-ink-3 font-medium">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}