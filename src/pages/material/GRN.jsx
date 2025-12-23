import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI } from "../../utils/materialAPI";
import { Package, Calendar, MapPin, FileText, User, TrendingUp, Eye } from "lucide-react";
import { FaArrowLeft } from 'react-icons/fa';

export default function GRN({ isTabView = false }) {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchCompletedDeliveries();
  }, []);

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchCompletedDeliveries();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Listen for delivery updates
  useEffect(() => {
    const handleDeliveryUpdate = () => {
      fetchCompletedDeliveries();
    };
    
    window.addEventListener('deliveryUpdated', handleDeliveryUpdate);
    window.addEventListener('upcomingDeliveryRefresh', handleDeliveryUpdate);
    
    return () => {
      window.removeEventListener('deliveryUpdated', handleDeliveryUpdate);
      window.removeEventListener('upcomingDeliveryRefresh', handleDeliveryUpdate);
    };
  }, []);

  const fetchCompletedDeliveries = async () => {
    try {
      setLoading(true);
      const response = await upcomingDeliveryAPI.getAll(1, 100, "");
      if (response.success) {
        // Filter only transferred/completed deliveries
        const completed = response.data.filter(d => 
          d.status?.toLowerCase() === 'transferred'
        );
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
    navigate(`/material/grn/${delivery._id}`);
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
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
            <Package size={32} className="text-green-500" />
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">No GRN Records</p>
          <p className="text-gray-500 text-sm">Completed deliveries will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <div
              key={delivery._id}
              onClick={() => handleViewDetails(delivery)}
              className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 flex items-center justify-center flex-shrink-0">
                    <Package size={28} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {delivery.transfer_number || delivery.st_id}
                    </h3>
                    <p className="text-xs text-gray-900 font-medium mt-1">
                      {formatDate(delivery.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Intent Request Date
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      {delivery.type === 'PO' ? '📋 Vendor-wise PO' : '🚚 Site Transfer'}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm bg-green-100 text-green-600">
                  ✅ Completed
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">GRN ID</span>
                  <span className="font-semibold text-gray-900">{delivery.transfer_number || delivery.st_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">From</span>
                  <span className="font-semibold text-gray-900">{delivery.from || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">To</span>
                  <span className="font-semibold text-gray-900">{delivery.to || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Intent Request Date</span>
                  <span className="font-semibold text-gray-900">{formatDate(delivery.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Delivery Date</span>
                  <span className="font-semibold text-green-600">{formatDate(delivery.updatedAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Materials</span>
                  <span className="font-semibold text-blue-600">{delivery.items?.length || 0} items</span>
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">GRN Records</h1>
            <p className="text-white/80 text-sm">{user?.name || 'User'}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {renderContent().props.children}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}