import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI } from "../../utils/materialAPI";
import { ArrowLeft, AlertCircle, CheckCircle, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { FaArrowLeft } from 'react-icons/fa';

export default function DeliveryChecklist() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [delivery, setDelivery] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingCheckbox, setPendingCheckbox] = useState(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [deletingAttachment, setDeletingAttachment] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchDeliveryDetails();
    }, [id]);

    const fetchDeliveryDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await upcomingDeliveryAPI.getById(id);
            if (response.success) {
                setDelivery(response.data);
                setItems(response.data.items.map(item => ({ ...item })));
            }
        } catch (err) {
            // Error fetching delivery details
            setError("Failed to load delivery details");
        } finally {
            setLoading(false);
        }
    };

    const handleReceivedQuantityChange = (index, value) => {
        const updatedItems = [...items];
        const qty = parseInt(value) || 0;
        
        // Validate
        const errors = { ...validationErrors };
        if (qty < 0) {
            errors[index] = "Quantity must be >= 0";
        } else if (qty > updatedItems[index].st_quantity) {
            errors[index] = `Cannot exceed ST quantity (${updatedItems[index].st_quantity})`;
        } else {
            delete errors[index];
        }
        
        setValidationErrors(errors);
        updatedItems[index].received_quantity = qty;
        setItems(updatedItems);
    };

    const handleCheckboxChange = (index, checked) => {
        const item = items[index];
        
        // If checking and received_quantity < st_quantity, show confirmation
        if (checked && item.received_quantity < item.st_quantity) {
            setPendingCheckbox({ index, checked });
            setShowConfirmModal(true);
        } else {
            const updatedItems = [...items];
            updatedItems[index].is_received = checked;
            setItems(updatedItems);
        }
    };

    // ✅ UPLOAD DELIVERY RECEIPT IMAGES
    const handleUploadReceipts = async (files) => {
        if (!files || files.length === 0) return;
        
        try {
            setUploadingReceipt(true);
            const response = await upcomingDeliveryAPI.uploadReceipts(id, Array.from(files));
            
            if (response.success) {
                // Update delivery data with new attachments
                setDelivery(response.data);
                showToast(`${files.length} receipt(s) uploaded successfully!`, 'success');
                
                // Clear file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload receipts', 'error');
        } finally {
            setUploadingReceipt(false);
        }
    };

    // ✅ DELETE ATTACHMENT
    const handleDeleteAttachment = async (attachmentIndex) => {
        if (!window.confirm('Are you sure you want to delete this attachment?')) {
            return;
        }
        
        try {
            setDeletingAttachment(attachmentIndex);
            const response = await upcomingDeliveryAPI.deleteAttachment(id, attachmentIndex);
            
            if (response.success) {
                // Update delivery data
                setDelivery(response.data);
                showToast('Attachment deleted successfully', 'success');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete attachment', 'error');
        } finally {
            setDeletingAttachment(null);
        }
    };

    const handleConfirmAutoFill = () => {
        const { index } = pendingCheckbox;
        const updatedItems = [...items];
        updatedItems[index].received_quantity = updatedItems[index].st_quantity;
        updatedItems[index].is_received = true;
        setItems(updatedItems);
        setShowConfirmModal(false);
        setPendingCheckbox(null);
    };

    const handleCancelAutoFill = () => {
        const { index } = pendingCheckbox;
        const updatedItems = [...items];
        updatedItems[index].is_received = true;
        setItems(updatedItems);
        setShowConfirmModal(false);
        setPendingCheckbox(null);
    };

    // Toast notification helper
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

    const handleSubmit = async () => {
        // Validate all items
        const errors = {};
        items.forEach((item, index) => {
            if (item.received_quantity < 0) {
                errors[index] = "Quantity must be >= 0";
            } else if (item.received_quantity > item.st_quantity) {
                errors[index] = `Cannot exceed ST quantity (${item.st_quantity})`;
            }
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            showToast("Please fix validation errors before submitting", 'error');
            return;
        }

        try {
            setSubmitting(true);
            const itemUpdates = items.map(item => ({
                itemId: item.itemId,
                received_quantity: item.received_quantity,
                is_received: item.is_received
            }));

            const response = await upcomingDeliveryAPI.updateItems(id, itemUpdates);
            if (response.success) {
                window.dispatchEvent(new Event('deliveryUpdated'));
                window.dispatchEvent(new Event('upcomingDeliveryRefresh'));
                window.dispatchEvent(new Event('intentCreated'));
                
                localStorage.setItem('deliveryRefresh', Date.now().toString());
                localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
                localStorage.setItem('intentRefresh', Date.now().toString());
                
                showToast("Delivery updated successfully!", 'success');
                
                setTimeout(() => {
                    navigate(-1);
                }, 500);
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update delivery", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate summary
    const totalSubmitted = items.reduce((sum, item) => sum + item.st_quantity, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.received_quantity, 0);
    const missing = totalSubmitted - totalReceived;

    // Check if all transferred
    const allTransferred = items.every(item => 
        item.is_received && item.received_quantity >= item.st_quantity
    );

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            'Pending': 'bg-gray-100 text-gray-700',
            'Partial': 'bg-orange-100 text-orange-600',
            'Transferred': 'bg-green-100 text-green-600'
        };
        const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700';
        return `text-xs px-2 py-1 rounded-full font-medium ${colorClass}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                <p className="text-gray-600 text-sm">Loading delivery details...</p>
            </div>
        );
    }

    if (error || !delivery) {
        return (
            <div className="p-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error || "Delivery not found"}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
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
                        <h1 className="text-white text-2xl font-bold mb-2">Delivery Checklist</h1>
                        <p className="text-white/80 text-sm">{delivery.transfer_number}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-6 py-6 -mt-4 pb-24">
                    {/* Info Card - Fixed Colors */}
                    <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4 space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">ST-ID</label>
                                <p className="font-bold text-gray-900">{delivery.st_id}</p>
                            </div>
                            <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(delivery.status)}`}>
                                    {delivery.status}
                                </span>
                            </div>
                            <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">From</label>
                                <p className="font-bold text-gray-900">{delivery.from}</p>
                            </div>
                            <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">To</label>
                                <p className="font-bold text-gray-900">{delivery.to}</p>
                            </div>
                            <div className="col-span-2 bg-gradient-to-r from-gray-50 to-white rounded-lg p-2 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Date</label>
                                <p className="font-bold text-gray-900">{formatDate(delivery.date)}</p>
                            </div>
                        </div>
                    </div>

                    {/* All Transferred Banner */}
                    {allTransferred && (
                        <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl flex items-center gap-2 mb-4 shadow-sm">
                            <CheckCircle className="text-green-600" size={20} />
                            <span className="text-sm text-green-800 font-bold">All items transferred</span>
                        </div>
                    )}

                    {/* Summary - Fixed Colors */}
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-xl mb-4 shadow-md">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="text-center bg-white rounded-lg p-2 border border-gray-200">
                                <span className="block text-xs font-semibold text-gray-600 mb-1">Submitted</span>
                                <span className="block font-bold text-lg text-gray-900">{totalSubmitted}</span>
                            </div>
                            <div className="text-center bg-white rounded-lg p-2 border border-green-200">
                                <span className="block text-xs font-semibold text-gray-600 mb-1">Received</span>
                                <span className="block font-bold text-lg text-green-600">{totalReceived}</span>
                            </div>
                            <div className="text-center bg-white rounded-lg p-2 border border-orange-200">
                                <span className="block text-xs font-semibold text-gray-600 mb-1">Missing</span>
                                <span className="block font-bold text-lg text-orange-600">{missing}</span>
                            </div>
                        </div>
                    </div>

                    {/* ✅ ATTACHMENTS SECTION - Delivery Receipt Images */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                Delivery Receipts ({delivery.attachments?.length || 0})
                            </h3>
                            <label className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold shadow-sm">
                                <Upload size={14} />
                                {uploadingReceipt ? 'Uploading...' : 'Upload'}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingReceipt}
                                    onChange={(e) => handleUploadReceipts(e.target.files)}
                                />
                            </label>
                        </div>
                        
                        {delivery.attachments && delivery.attachments.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {delivery.attachments.map((attachment, index) => {
                                    // ✅ Handle both old string format and new Cloudinary object format
                                    const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                                    const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
                                    const fileURL = attachmentUrl.startsWith('http') ? attachmentUrl : `${baseURL}${attachmentUrl}`;
                                    const fileName = attachmentUrl.split('/').pop();
                                    const isImage = attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                                    
                                    return (
                                        <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                            <div className="relative">
                                                {/* Image Thumbnail */}
                                                {isImage ? (
                                                    <img 
                                                        src={fileURL} 
                                                        alt={fileName}
                                                        className="w-full h-32 object-cover cursor-pointer"
                                                        onClick={() => window.open(fileURL, '_blank')}
                                                        onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="30"%3E🖼️%3C/text%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-32 flex items-center justify-center bg-gray-100">
                                                        <span className="text-4xl">📎</span>
                                                    </div>
                                                )}
                                                
                                                {/* Delete Button Overlay */}
                                                <button
                                                    onClick={() => handleDeleteAttachment(index)}
                                                    disabled={deletingAttachment === index}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                                    title="Delete attachment"
                                                >
                                                    {deletingAttachment === index ? (
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                    ) : (
                                                        <Trash2 size={12} />
                                                    )}
                                                </button>
                                            </div>
                                            
                                            {/* File Info */}
                                            <div className="p-2 bg-white border-t border-gray-200">
                                                <p className="text-xs font-medium text-gray-900 truncate">{fileName}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {isImage ? 'Image' : 'File'} • #{index + 1}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500 text-xs font-semibold">No receipt images</p>
                                <p className="text-gray-400 text-xs mt-1">Upload delivery proof here</p>
                            </div>
                        )}
                    </div>

                    {/* Items List - Fixed Colors */}
                    <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.itemId || item._id} className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-md">
                        <div className="space-y-3">
                            {/* Item Info */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-gray-900">{item.category}</div>
                                    <div className="text-xs text-gray-600 mt-1 font-medium">
                                        {item.sub_category} • {item.sub_category1}
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={item.is_received}
                                    onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                                    className="w-6 h-6 accent-orange-500 mt-1 cursor-pointer"
                                />
                            </div>

                            {/* Quantities */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">ST Quantity</label>
                                    <div className="px-3 py-2.5 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg text-sm font-bold text-gray-900 border border-gray-300">
                                        {item.st_quantity}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Received Quantity</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={item.st_quantity}
                                        value={item.received_quantity}
                                        onChange={(e) => handleReceivedQuantityChange(index, e.target.value)}
                                        className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm font-bold bg-white ${
                                            validationErrors[index] 
                                                ? 'border-red-500 focus:ring-red-500 text-red-900' 
                                                : 'border-gray-300 focus:ring-orange-500 text-gray-900'
                                        } focus:ring-2 focus:outline-none`}
                                        style={{ colorScheme: 'light' }}
                                    />
                                </div>
                            </div>

                            {/* Validation Error */}
                            {validationErrors[index] && (
                                <div className="flex items-center gap-2 text-red-700 text-xs bg-red-50 border border-red-200 rounded-lg p-2">
                                    <AlertCircle size={14} />
                                    <span className="font-semibold">{validationErrors[index]}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    ))}
                    </div>
                </div>

                {/* Fixed Bottom Button */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
                    <div className="max-w-md mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || Object.keys(validationErrors).length > 0}
                        className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                        {submitting ? "Submitting..." : "Submit Changes"}
                    </button>
                    </div>
                </div>

                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mark as Fully Received?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                The received quantity is less than the ST quantity. Do you want to automatically set 
                                received quantity equal to ST quantity?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelAutoFill}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    No, Keep Current
                                </button>
                                <button
                                    onClick={handleConfirmAutoFill}
                                    className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                                >
                                    Yes, Auto-fill
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}