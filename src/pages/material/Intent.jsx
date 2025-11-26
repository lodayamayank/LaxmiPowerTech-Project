import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { indentAPI, purchaseOrderAPI } from '../../utils/materialAPI';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { FaArrowLeft } from 'react-icons/fa';
import AddIntentPopup from './AddIntentPopup';
import axios from '../../utils/axios';

export default function Intent({ isTabView = false }) {
  const navigate = useNavigate();
  const [indents, setIndents] = useState([]); // Changed from purchaseOrders
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPopup, setShowPopup] = useState(false);

  // Fetch indents (uploaded photos with PO IDs) from backend
  useEffect(() => {
    fetchIndents();
  }, [currentPage]);

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchIndents();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage]);

  // Periodic polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIndents();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentPage]);

  // Listen for intent creation and status update events
  useEffect(() => {
    const handleIntentCreated = () => {
      fetchIndents();
    };
    
    const handleDeliveryRefresh = () => {
      fetchIndents();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === 'intentRefresh' || e.key === 'upcomingDeliveryRefresh') {
        console.log(`✅ ${e.key} - refreshing Intent list`);
        fetchIndents();
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

  const fetchIndents = async () => {
    try {
      setLoading(true);
      
      // ✅ CRITICAL FIX: Fetch BOTH Indents (photo) AND Purchase Orders (manual form)
      // This matches AdminIntent.jsx logic exactly
      const [indentsResponse, purchaseOrdersResponse] = await Promise.all([
        indentAPI.getAll(1, 100).catch(err => ({ success: false, data: [] })),
        purchaseOrderAPI.getAll(1, 100).catch(err => ({ success: false, data: [] }))
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
      const combinedData = [...indentsData, ...purchaseOrdersData]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      console.log(`✅ Fetched ${indentsData.length} indents + ${purchaseOrdersData.length} purchase orders = ${combinedData.length} total Intent PO records`);
      setIndents(combinedData);
      
      // Calculate pagination based on combined data
      const itemsPerPage = 10;
      const totalItems = combinedData.length;
      setTotalPages(Math.ceil(totalItems / itemsPerPage) || 1);
      
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

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Render content only (for tab view)
  const renderContent = () => (
    <div className="px-6 py-6">
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : indents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <Plus size={32} className="text-orange-500" />
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">No Intent Requests</p>
          <p className="text-gray-500 text-sm">Click the + button to upload your first intent</p>
        </div>
      ) : (
        <div className="space-y-4">
          {indents.map((indent) => (
            <div
              key={indent._id}
              onClick={() => {
                // Navigate to intent detail page
                navigate(`/material/intent-details/${indent._id}`);
              }}
              className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              {/* Header with Image Thumbnail */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {indent.hasImage && indent.imageUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-orange-200 flex-shrink-0">
                      <img 
                        src={`${axios.defaults.baseURL}${indent.imageUrl}`}
                        alt="Intent"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full bg-orange-100 flex items-center justify-center"><svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {indent.displayId || indent.indentId || indent.purchaseOrderId || 'N/A'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(indent.createdAt)}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">
                      {indent.type === 'indent' ? '📷 Photo Upload' : '📝 Manual Entry'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm ${getStatusColor(indent.status)}`}>
                  {getStatusText(indent.status)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">PO ID</span>
                  <span className="font-semibold text-gray-900">{indent.displayId || indent.indentId || indent.purchaseOrderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Requested By</span>
                  <span className="font-semibold text-gray-900">{indent.requestedBy?.name || indent.requestedBy || 'N/A'}</span>
                </div>
                {indent.deliverySite && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Delivery Site</span>
                    <span className="font-semibold text-gray-900">{indent.deliverySite}</span>
                  </div>
                )}
                {indent.materials && indent.materials.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Materials</span>
                    <span className="font-semibold text-blue-600">{indent.materials.length} items</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-sm shadow-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  // If in tab view mode, return content only
  if (isTabView) {
    return (
      <>
        {renderContent()}
        
        {/* Floating Action Button - Bottom Center */}
        <button
          onClick={() => setShowPopup(true)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 flex items-center justify-center z-50 transition-all duration-300"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {/* Add Intent Popup */}
        {showPopup && (
          <AddIntentPopup
            onClose={() => setShowPopup(false)}
            onUploadClick={() => {
              setShowPopup(false);
              navigate('/material/intent/new');
            }}
          />
        )}
      </>
    );
  }

  // Standalone mode with full page layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Material Intent</h1>
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

      {/* Floating Action Button - Bottom Center */}
      <button
        onClick={() => setShowPopup(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 flex items-center justify-center z-50 transition-all duration-300"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Add Intent Popup */}
      {showPopup && (
        <AddIntentPopup
          onClose={() => setShowPopup(false)}
          onUploadClick={() => {
            setShowPopup(false);
            navigate('/material/upload-photo');
          }}
        />
      )}
    </div>
  );
}