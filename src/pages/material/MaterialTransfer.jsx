import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MaterialTransferForm from "./MaterialTransferForm";
import { siteTransferAPI } from "../../utils/materialAPI";

export default function MaterialTransfer({ isTabView = false }) {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch site transfers from backend
  useEffect(() => {
    fetchTransfers();
  }, [currentPage]);

  // Auto-refresh when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchTransfers();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage]);

  // Periodic polling every 30 seconds (optimized from 2s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransfers();
    }, 30000); // 30 seconds - balanced performance
    
    return () => clearInterval(interval);
  }, [currentPage]);

  // Listen for delivery, site transfer, and intent update events (INSTANT SYNC)
  useEffect(() => {
    const handleDeliveryUpdate = () => {
      console.log('🔄 Client Material Transfer: Delivery update detected');
      fetchTransfers();
    };
    
    const handleSiteTransferCreated = () => {
      console.log('🔄 Client Material Transfer: Site Transfer created');
      fetchTransfers();
    };
    
    const handleUpcomingDeliveryRefresh = () => {
      console.log('🔄 Client Material Transfer: Upcoming Delivery refresh');
      fetchTransfers();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === 'deliveryRefresh' || e.key === 'upcomingDeliveryRefresh' || e.key === 'siteTransferRefresh') {
        console.log(`⚡ INSTANT SYNC - ${e.key} detected!`);
        fetchTransfers();
        localStorage.removeItem(e.key);
      }
    };
    
    window.addEventListener('deliveryUpdated', handleDeliveryUpdate);
    window.addEventListener('siteTransferCreated', handleSiteTransferCreated);
    window.addEventListener('upcomingDeliveryRefresh', handleUpcomingDeliveryRefresh);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('deliveryUpdated', handleDeliveryUpdate);
      window.removeEventListener('siteTransferCreated', handleSiteTransferCreated);
      window.removeEventListener('upcomingDeliveryRefresh', handleUpcomingDeliveryRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentPage]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await siteTransferAPI.getAll(currentPage, 10);
      if (response.success) {
        setTransfers(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = () => {
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
  };

  const handleFormSuccess = (newTransfer) => {
    // Refresh the transfers list
    fetchTransfers();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    // Unified status colors matching Upcoming Deliveries
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-600';
      case 'approved': // Partial delivery in progress
        return 'bg-orange-100 text-orange-600';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <>
      {/* Transfer List - Mobile-First */}
      <div className={isTabView ? "px-6 pb-20 pt-6" : "px-3 pb-20 pt-3"}>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {transfers.map((transfer) => (
              <div
                key={transfer._id}
                onClick={() => navigate(`/dashboard/material/transfer/${transfer._id}`)}
                className="border rounded-xl p-3 shadow-sm bg-gray-50 text-sm mb-3 cursor-pointer hover:shadow-md hover:bg-white transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-800 text-sm">ST ID: {transfer.siteTransferId}</p>
                  <span className={`px-2 py-1 text-xs rounded-md ${getStatusColor(transfer.status)}`}>
                    {transfer.status?.charAt(0).toUpperCase() + transfer.status?.slice(1)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">From Site</span>
                    <span className="text-gray-800 text-xs font-medium">{transfer.fromSite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">To Site</span>
                    <span className="text-gray-800 text-xs font-medium">{transfer.toSite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">Materials</span>
                    <span className="text-gray-700 text-xs">{transfer.materials?.length || 0} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">Requested By</span>
                    <span className="text-gray-700 text-xs">{transfer.requestedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Date</span>
                    <span className="text-gray-700 text-xs">{formatDate(transfer.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}

            {transfers.length === 0 && !loading && (
              <div className="border rounded-xl p-3 shadow-sm bg-gray-50 text-sm text-gray-600">
                No transfers yet. Click the + button to create one.
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={openForm}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-2xl font-bold rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-110 ${
          showForm ? "rotate-45 bg-gray-400" : "bg-orange-500"
        }`}
      >
        +
      </button>

      {/* Material Transfer Form */}
      {showForm && (
        <MaterialTransferForm 
          onClose={closeForm} 
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}