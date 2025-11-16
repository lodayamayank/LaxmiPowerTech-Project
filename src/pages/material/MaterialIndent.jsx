import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddIndentPopup from "./AddIntentPopup";
import { purchaseOrderAPI } from "../../utils/materialAPI";

export default function MaterialIndent() {
  const [showPopup, setShowPopup] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const togglePopup = () => setShowPopup((prev) => !prev);

  const handleUploadClick = () => {
    setShowPopup(false);
    navigate("/indent/uploadphoto");
  };

  // Fetch purchase orders
  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing Intent data');
      fetchPurchaseOrders();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Periodic polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh - fetching latest Intent data');
      fetchPurchaseOrders();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for intent creation events
  useEffect(() => {
    const handleIntentCreated = () => {
      fetchPurchaseOrders();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === 'intentRefresh') {
        fetchPurchaseOrders();
      }
    };
    
    window.addEventListener('intentCreated', handleIntentCreated);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('intentCreated', handleIntentCreated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderAPI.getAll(1, 100);
      if (response.success) {
        setPurchaseOrders(response.data || []);
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
      </div>

      {/* Floating Add Button - fixed at bottom */}
      <button
        onClick={togglePopup}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-2xl font-bold rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-110 ${
          showPopup ? "rotate-45 bg-gray-400" : "bg-orange-500"
        }`}
      >
        +
      </button>

      {/* Bottom Popup */}
      {showPopup && (
        <AddIndentPopup onClose={togglePopup} onUploadClick={handleUploadClick} />
      )}
    </>
  );
}
