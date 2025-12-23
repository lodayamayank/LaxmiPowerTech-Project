import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Package, Calendar, MapPin, User, FileText, CheckCircle } from 'lucide-react';
import { FaArrowLeft } from 'react-icons/fa';
import { upcomingDeliveryAPI } from '../../utils/materialAPI';

export default function GRNCardDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    fetchGRNDetails();
  }, [id]);

  const fetchGRNDetails = async () => {
    try {
      setLoading(true);
      const response = await upcomingDeliveryAPI.getAll(1, 1000, "");
      if (response.success) {
        const grnRecord = response.data.find(d => d._id === id);
        if (grnRecord && grnRecord.status?.toLowerCase() === 'transferred') {
          setDelivery(grnRecord);
        } else {
          showToast('GRN record not found', 'error');
          navigate('/material/grn');
        }
      }
    } catch (err) {
      console.error('Error fetching GRN details:', err);
      showToast('Failed to load GRN details', 'error');
      navigate('/material/grn');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-[9999] transition-opacity ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-600';
      case 'partial':
        return 'bg-orange-100 text-orange-600';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading GRN details...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
            <X size={32} className="text-red-500" />
          </div>
          <p className="text-gray-900 font-semibold text-lg mb-2">GRN Not Found</p>
          <p className="text-gray-600 text-sm mb-6">The requested GRN record could not be found</p>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
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
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle size={24} className="text-white" />
              <h1 className="text-white text-2xl font-bold">GRN Details</h1>
            </div>
            <p className="text-white/90 text-sm font-medium">{delivery.transfer_number || delivery.st_id}</p>
            <p className="text-white/70 text-xs mt-1">
              {delivery.type === 'PO' ? '📋 Vendor-wise PO' : '🚚 Site Transfer'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4 pb-24">
          <div className="space-y-4">
            {/* GRN Summary Card */}
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-green-600" />
                <h2 className="font-semibold text-gray-900">GRN Summary</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">
                    {delivery.type === 'PO' ? 'Vendor-wise PO ID' : 'ST ID'}
                  </label>
                  <p className="font-bold text-gray-900 text-lg">{delivery.transfer_number || delivery.st_id}</p>
                </div>
                
                <div>
                  <label className="text-xs text-gray-600">Status</label>
                  <p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(delivery.status)}`}>
                      ✅ {delivery.status}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Type</label>
                  <p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      delivery.type === 'PO' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {delivery.type === 'PO' ? '📋 PO' : '🚚 ST'}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Total Items</label>
                  <p className="font-medium text-gray-900">{delivery.items?.length || 0}</p>
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Intent Request Date & Time</label>
                  <p className="font-medium text-gray-900 text-sm">
                    {formatDate(delivery.createdAt)}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Delivery Date & Time (Challan Upload)</label>
                  <p className="font-medium text-green-600 text-sm">
                    {formatDate(delivery.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Details Card */}
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-blue-600" />
                <h2 className="font-semibold text-gray-900">Transfer Details</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600">From Location</label>
                  <p className="font-medium text-gray-900">📍 {delivery.from || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-xs text-gray-600">To Location</label>
                  <p className="font-medium text-gray-900">📍 {delivery.to || 'N/A'}</p>
                </div>

                {delivery.createdBy && (
                  <div>
                    <label className="text-xs text-gray-600">Requested By</label>
                    <p className="font-medium text-gray-900">👤 {delivery.createdBy}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Materials Received Card */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-green-600" />
                <h2 className="font-semibold text-gray-900">Materials Received</h2>
              </div>

              <div className="space-y-3">
                {delivery.items && delivery.items.length > 0 ? (
                  delivery.items.map((item, idx) => {
                    const orderedQty = item.st_quantity || 0;
                    const receivedQty = item.received_quantity || 0;
                    const pendingQty = Math.max(0, orderedQty - receivedQty);
                    const isFullyReceived = receivedQty >= orderedQty;
                    
                    return (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {item.category || item.name || 'N/A'}
                            </p>
                            {(item.sub_category || item.sub_category1) && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {[item.sub_category, item.sub_category1, item.sub_category2]
                                  .filter(Boolean)
                                  .join(' - ')}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 ${
                            isFullyReceived 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            {isFullyReceived ? '✓ Complete' : 'Partial'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Ordered</span>
                            <p className="font-bold text-blue-600">{orderedQty}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Received</span>
                            <p className="font-bold text-green-600">✓ {receivedQty}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Pending</span>
                            <p className="font-bold text-orange-600">{pendingQty}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">No materials found</p>
                )}
              </div>
            </div>

            {/* Challan Attachments Card */}
            {delivery.attachments && delivery.attachments.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-orange-600" />
                  <h2 className="font-semibold text-gray-900">Challan ({delivery.attachments.length})</h2>
                </div>

                <div className="space-y-3">
                  {delivery.attachments.map((attachment, index) => {
                    const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                    const fileName = attachmentUrl.split('/').pop();
                    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(attachmentUrl);
                    
                    return (
                      <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        {/* Image Thumbnail - Clickable */}
                        {isImage ? (
                          <div 
                            className="relative bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedImage(attachmentUrl);
                              setShowImageModal(true);
                            }}
                          >
                            <img 
                              src={attachmentUrl} 
                              alt={`Challan ${index + 1}`}
                              className="w-full h-48 object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all">
                              <div className="bg-white rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity">
                                <FileText size={24} className="text-orange-600" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-48 bg-gray-100">
                            <FileText size={48} className="text-gray-400" />
                          </div>
                        )}
                        
                        {/* File Info */}
                        <div className="p-3 bg-white border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText size={16} className="text-orange-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedImage(attachmentUrl);
                              setShowImageModal(true);
                            }}
                            className="w-full px-3 py-2 bg-orange-500 text-white text-xs font-medium rounded hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <FileText size={14} />
                            View Full Size
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GRN Summary Stats */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-green-600" />
                <h3 className="font-semibold text-gray-900">Delivery Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Total Materials</p>
                  <p className="font-bold text-gray-900">{delivery.items?.length || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-bold text-green-600">✅ Transferred</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Intent Request Date</p>
                  <p className="font-medium text-gray-900">{formatDate(delivery.createdAt)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Delivery Date (Challan Upload)</p>
                  <p className="font-medium text-green-600">{formatDate(delivery.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Size Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={32} />
            </button>
            
            {/* Full-Size Image */}
            <img 
              src={selectedImage} 
              alt="Challan Full Size"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Download Button */}
            <div className="mt-4 flex justify-center">
              <a
                href={selectedImage}
                download
                className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
