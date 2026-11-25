import React from "react";
import { ROUTES } from '@/lib/routes';
import { useNavigate, useLocation } from "react-router-dom";
import Intent from "@/pages/material/intent/Intent";
import MaterialTransfer from "@/pages/material/transfers/MaterialTransfer";
import UpcomingDeliveries from "@/pages/material/deliveries/UpcomingDeliveries";
import GRN from "@/pages/material/grn/GRN";
import { getSelectedBranchName } from "@/lib/branchContext";
import { ChoiceChips } from "@/components/common/ChoiceChips";
import MobilePage from "@/layouts/mobile/MobilePage";

export default function Material({ activeTab }) {
  const navigate = useNavigate();
  const location = useLocation();
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
    { label: 'Intent', path: ROUTES.material.intent, value: 'intent' },
    { label: 'Transfer', path: ROUTES.material.transfer, value: 'transfer' },
    { label: 'Deliveries', path: ROUTES.material.deliveries, value: 'deliveries' },
    { label: 'GRN', path: ROUTES.material.grn, value: 'grn' },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'intent':
        return <Intent />;
      case 'transfer':
        return <MaterialTransfer />;
      case 'deliveries':
        return <UpcomingDeliveries />;
      case 'grn':
          return <GRN />;
      default:
        return <Intent />;
    }
  };

  return (
    <MobilePage title="Materials" back onBack={() => navigate(ROUTES.dashboard)} tabs="manager">
      {selectedBranchName ? <p className="-mb-1 text-small text-ink-3">Project: {selectedBranchName}</p> : null}
      <ChoiceChips
        aria-label="Material section"
        value={currentTab}
        onChange={(value) => navigate(tabs.find((t) => t.value === value).path, { state: { branchId } })}
        options={tabs.map(({ label, value }) => ({ label, value }))}
      />
      {renderContent()}
    </MobilePage>
  );
}
