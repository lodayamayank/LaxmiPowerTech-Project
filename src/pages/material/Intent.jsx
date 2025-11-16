import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderAPI } from '../../utils/materialAPI';
import { Plus } from 'lucide-react';
import AddIntentPopup from './AddIntentPopup';

export default function Intent() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPopup, setShowPopup] = useState(false);

  // Fetch purchase orders from backend
  useEffect(() => {
    fetchPurchaseOrders();
  }, [currentPage]);

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchPurchaseOrders();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage]);

  // Periodic polling every 30 seconds (optimized from 2s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPurchaseOrders();
    }, 30000); // 30 seconds - balanced performance
    
    return () => clearInterval(interval);
  }, [currentPage]);

  // Listen for intent creation and status update events
  useEffect(() => {
    const handleIntentCreated = () => {
      fetchPurchaseOrders();
    };
    
    const handleDeliveryRefresh = () => {
      fetchPurchaseOrders();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === 'intentRefresh' || e.key === 'upcomingDeliveryRefresh') {
        console.log(`✅ ${e.key} - refreshing Intent list`);
        fetchPurchaseOrders();
      }
    };
    
    window.addEventListener('intentCreated', handleIntentCreated);
    window.addEventListener('upcomingDeliveryRefresh', handleDeliveryRefresh);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('intentCreated', handleIntentCreated);
      window.removeEventListener('upcomingDeliveryRefresh', handleDeliveryRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentPage]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderAPI.getAll(currentPage, 10);
      if (response.success) {
        console.log(`📊 Fetched ${response.data?.length || 0} purchase orders`);
        setPurchaseOrders(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
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
        return 'bg-green-100 text-green-600';
      case 'approved':
        return 'bg-orange-100 text-orange-600';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
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

  return (
    <>
      {/* Intent List - Mobile-First */}
      <div className="px-3 pb-20 pt-3">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm">No intent requests found</p>
            <p className="text-gray-400 text-xs mt-1">Click + to create your first intent</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchaseOrders.map((po) => (
              <div
                key={po._id}
                onClick={() => navigate(`/intent-details/${po._id}`)}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">
                      {po.purchaseOrderId}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {po.purchaseOrderId}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(po.status)}`}>
                    {getStatusText(po.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Site</span>
                    <span className="font-medium text-gray-900">{po.deliverySite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Materials</span>
                    <span className="font-medium text-gray-900">{po.materials?.length || 0} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested By</span>
                    <span className="font-medium text-gray-900">{po.requestedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium text-gray-900">{formatDate(po.requestDate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Button - Bottom Center */}
      <button
        onClick={() => setShowPopup(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 flex items-center justify-center z-50"
      >
        <Plus size={24} />
      </button>

      {/* Add Intent Popup */}
      {showPopup && (
        <AddIntentPopup
          onClose={() => setShowPopup(false)}
          onUploadClick={() => {
            setShowPopup(false);
            navigate('/indent/uploadphoto');
          }}
        />
      )}
    </>
  );
}