import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Truck, Package, ClipboardCheck } from "lucide-react";
import Intent from "./Intent";
import MaterialTransfer from "./MaterialTransfer";
import UpcomingDeliveries from "./UpcomingDeliveries";
import GRN from "./GRN";

export default function Material({ activeTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Get branchId from location state if passed from supervisor/subcontractor flow
  const branchId = location.state?.branchId;

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
    { name: 'Intent', path: '/material/intent', key: 'intent', icon: FileText, color: 'blue' },
    { name: 'Material Transfer', path: '/material/transfer', key: 'transfer', icon: Truck, color: 'orange' },
    { name: 'Upcoming Deliveries', path: '/material/deliveries', key: 'deliveries', icon: Package, color: 'purple' },
    { name: 'GRN', path: '/material/grn', key: 'grn', icon: ClipboardCheck, color: 'green' },
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 px-4 pt-4 pb-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <button
              className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-semibold">Back</span>
            </button>
            <div className="text-right">
              <p className="text-white/90 text-xs font-medium">{user?.name || 'User'}</p>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-white text-xl font-bold">Material Management</h1>
          </div>
        </div>

        {/* Professional Tab Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.path, { state: { branchId } })}
                  className={`flex-1 min-w-[90px] px-3 py-3 flex flex-col items-center gap-1.5 transition-all relative ${
                    isActive
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-orange-500 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
                  <span className={`text-[10px] font-semibold leading-tight text-center ${
                    isActive ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {tab.name}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-gray-50 min-h-[calc(100vh-180px)]">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 py-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
