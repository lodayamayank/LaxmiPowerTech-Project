import React, { useState, useEffect } from 'react';
import { showToast } from '@/lib/showToast';
import MobilePage from '@/layouts/mobile/MobilePage';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Package, Calendar, MapPin, User, FileText, CheckCircle } from 'lucide-react';
import { upcomingDeliveryAPI } from '@/api/material';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
          navigate(ROUTES.material.grn);
        }
      }
    } catch (err) {
      console.error('Error fetching GRN details:', err);
      showToast('Failed to load GRN details', 'error');
      navigate(ROUTES.material.grn);
    } finally {
      setLoading(false);
    }
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
        return 'bg-tone-ok-soft text-tone-ok-fg';
      case 'partial':
        return 'bg-tone-highlight-soft text-tone-highlight-fg';
      case 'pending':
        return 'bg-surface-muted text-ink-2';
      default:
        return 'bg-surface-muted text-ink-3';
    }
  };

  // Shared class overrides so shadcn Card/Label/Badge keep the original look
  const cardClass = 'bg-surface rounded-lg border py-0 gap-0 shadow-none';
  const cardContentClass = 'p-4';
  const labelClass = 'text-xs text-ink-3 font-normal leading-normal';
  const pillClass = 'px-2 py-1 text-xs rounded-full border-transparent';

  if (loading) {
    return (
      <MobilePage title="Details" back onBack={() => navigate(-1)}>

          {/* Content skeleton */}
          <div className="flex flex-col gap-3.5 space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
</MobilePage>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-tone-highlight-soft flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tone-bad-soft flex items-center justify-center">
            <X size={32} className="text-tone-bad-fg" />
          </div>
          <p className="text-ink-1 font-semibold text-lg mb-2">GRN Not Found</p>
          <p className="text-ink-3 text-sm mb-6">The requested GRN record could not be found</p>
          <Button
            onClick={() => navigate(-1)} 
            className="h-auto bg-primary text-primary-foreground hover:bg-primary-strong px-6 py-3 rounded-xl font-semibold   transition-all shadow-md"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <MobilePage title="GRN details" back onBack={() => navigate(-1)}>
      <p className="-mb-1 text-small text-ink-3">{delivery.transfer_number || delivery.st_id} &middot; {delivery.type === 'PO' ? 'Vendor-wise PO' : 'Site transfer'}</p>
        <div className="flex flex-col gap-3.5">
          <div className="space-y-4">
            {/* GRN Summary Card */}
            <Card className={cardClass}>
              <CardContent className={`${cardContentClass} space-y-3`}>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-tone-ok-fg" />
                  <h2 className="font-semibold text-ink-1">GRN Summary</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>
                      {delivery.type === 'PO' ? 'Vendor-wise PO ID' : 'ST ID'}
                    </Label>
                    <p className="font-bold text-ink-1 text-lg">{delivery.transfer_number || delivery.st_id}</p>
                  </div>
                  
                  <div>
                    <Label className={labelClass}>Status</Label>
                    <div>
                      <Badge variant="outline" className={`inline-block ${pillClass} font-normal ${getStatusColor(delivery.status)}`}>
                        ✅ {delivery.status}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className={labelClass}>Type</Label>
                    <div>
                      <Badge
                        variant="outline"
                        className={`inline-block ${pillClass} font-medium ${
                          delivery.type === 'PO' ? 'bg-tone-info-soft text-tone-info-fg' : 'bg-tone-purple-soft text-tone-purple-fg'
                        }`}
                      >
                        {delivery.type === 'PO' ? '📋 PO' : '🚚 ST'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className={labelClass}>Total Items</Label>
                    <p className="font-medium text-ink-1">{delivery.items?.length || 0}</p>
                  </div>

                  <div className="col-span-2">
                    <Label className={labelClass}>Intent Request Date & Time</Label>
                    <p className="font-medium text-ink-1 text-sm">
                      {formatDate(delivery.createdAt)}
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <Label className={labelClass}>Delivery Date & Time (Challan Upload)</Label>
                    <p className="font-medium text-tone-ok-fg text-sm">
                      {formatDate(delivery.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Details Card */}
            <Card className={cardClass}>
              <CardContent className={`${cardContentClass} space-y-3`}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={18} className="text-tone-info-fg" />
                  <h2 className="font-semibold text-ink-1">Transfer Details</h2>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className={labelClass}>From Location</Label>
                    <p className="font-medium text-ink-1">📍 {delivery.from || 'N/A'}</p>
                  </div>

                  <div>
                    <Label className={labelClass}>To Location</Label>
                    <p className="font-medium text-ink-1">📍 {delivery.to || 'N/A'}</p>
                  </div>

                  {delivery.createdBy && (
                    <div>
                      <Label className={labelClass}>Requested By</Label>
                      <p className="font-medium text-ink-1">👤 {delivery.createdBy}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Materials Received Card */}
            <Card className={cardClass}>
              <CardContent className={cardContentClass}>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-tone-ok-fg" />
                  <h2 className="font-semibold text-ink-1">Materials Received</h2>
                </div>

                <div className="space-y-3">
                  {delivery.items && delivery.items.length > 0 ? (
                    delivery.items.map((item, idx) => {
                      const orderedQty = item.st_quantity || 0;
                      const receivedQty = item.received_quantity || 0;
                      const pendingQty = Math.max(0, orderedQty - receivedQty);
                      const isFullyReceived = receivedQty >= orderedQty;
                      
                      return (
                        <div key={idx} className="bg-surface-subtle rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-ink-1 text-sm">
                                {item.category || item.name || 'N/A'}
                              </p>
                              {(item.sub_category || item.sub_category1) && (
                                <p className="text-xs text-ink-3 mt-0.5">
                                  {[item.sub_category, item.sub_category1, item.sub_category2]
                                    .filter(Boolean)
                                    .join(' - ')}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`${pillClass} font-medium ml-2 ${
                                isFullyReceived 
                                  ? 'bg-tone-ok-soft text-tone-ok-fg' 
                                  : 'bg-tone-highlight-soft text-tone-highlight-fg'
                              }`}
                            >
                              {isFullyReceived ? '✓ Complete' : 'Partial'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-ink-3">Ordered</span>
                              <p className="font-bold text-tone-info-fg">{orderedQty}</p>
                            </div>
                            <div>
                              <span className="text-ink-3">Received</span>
                              <p className="font-bold text-tone-ok-fg">✓ {receivedQty}</p>
                            </div>
                            <div>
                              <span className="text-ink-3">Pending</span>
                              <p className="font-bold text-tone-highlight-fg">{pendingQty}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-ink-3 text-sm py-4">No materials found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Challan Attachments Card */}
            {delivery.attachments && delivery.attachments.length > 0 && (
              <Card className={cardClass}>
                <CardContent className={cardContentClass}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-tone-highlight-fg" />
                    <h2 className="font-semibold text-ink-1">Challan ({delivery.attachments.length})</h2>
                  </div>

                  <div className="space-y-3">
                    {delivery.attachments.map((attachment, index) => {
                      const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                      const fileName = attachmentUrl.split('/').pop();
                      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(attachmentUrl);
                      
                      return (
                        <div key={index} className="border rounded-lg overflow-hidden bg-surface shadow-sm">
                          {/* Image Thumbnail - Clickable */}
                          {isImage ? (
                            <div 
                              className="relative bg-surface-muted cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedImage(attachmentUrl);
                                setShowImageModal(true);
                              }}
                            >
                              <img loading="lazy" decoding="async" 
                                src={attachmentUrl} 
                                alt={`Challan ${index + 1}`}
                                className="w-full h-48 object-contain"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all">
                                <div className="bg-surface rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity">
                                  <FileText size={24} className="text-tone-highlight-fg" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-48 bg-surface-muted">
                              <FileText size={48} className="text-ink-4" />
                            </div>
                          )}
                          
                          {/* File Info */}
                          <div className="p-3 bg-surface border-t">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText size={16} className="text-tone-highlight-fg flex-shrink-0" />
                              <span className="text-sm text-ink-2 truncate flex-1">{fileName}</span>
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedImage(attachmentUrl);
                                setShowImageModal(true);
                              }}
                              className="w-full h-auto px-3 py-2 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary-strong transition-colors flex items-center justify-center gap-1"
                            >
                              <FileText size={14} />
                              View Full Size
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GRN Summary Stats */}
            <Card className="bg-tone-ok-soft rounded-lg border border-tone-ok-border py-0 gap-0 shadow-none">
              <CardContent className={cardContentClass}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-tone-ok-fg" />
                  <h3 className="font-semibold text-ink-1">Delivery Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-ink-3">Total Materials</p>
                    <p className="font-bold text-ink-1">{delivery.items?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-ink-3">Status</p>
                    <p className="font-bold text-tone-ok-fg">✅ Transferred</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-ink-3">Intent Request Date</p>
                    <p className="font-medium text-ink-1">{formatDate(delivery.createdAt)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-ink-3">Delivery Date (Challan Upload)</p>
                    <p className="font-medium text-tone-ok-fg">{formatDate(delivery.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </MobilePage>

      {/* Full-Size Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-scrim/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-primary-foreground hover:text-ink-1 transition-colors"
            >
              <X size={32} />
            </button>
            
            {/* Full-Size Image */}
            <img loading="lazy" decoding="async" 
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
                className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary-strong transition-colors flex items-center gap-2"
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
    </>
  );
}
