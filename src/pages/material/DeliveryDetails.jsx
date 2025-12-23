import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X } from "lucide-react";

export default function DeliveryDetails() {
    const location = useLocation();
    const navigate = useNavigate();

    const { item, type } = location.state || {};
    const [materials, setMaterials] = useState(item?.materials || []);
    const [deliveryImages, setDeliveryImages] = useState([]);
    const [imagePreview, setImagePreview] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [validationError, setValidationError] = useState('');

    // ✅ Fix: Move navigate to useEffect to avoid render-phase navigation
    useEffect(() => {
        if (!item || !type) {
            console.warn('⚠️ DeliveryDetails: Missing item or type, redirecting...');
            // Navigate back to previous page
            navigate(-1);
        }
    }, [item, type, navigate]);

    // Show loading while checking for data
    if (!item || !type) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading delivery details...</p>
                </div>
            </div>
        );
    }

    const handleCheckbox = (id, checked) => {
        setMaterials((prev) =>
            prev.map((m) => {
                if ((m.itemId || m._id) === id) {
                    const requestedQty = m.quantity || m.st_quantity || 0;
                    return {
                        ...m,
                        received_quantity: checked ? requestedQty : 0,
                        is_received: checked
                    };
                }
                return m;
            })
        );
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        setDeliveryImages(prev => [...prev, ...files]);
        
        // Create preview URLs
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setDeliveryImages(prev => prev.filter((_, i) => i !== index));
        setImagePreview(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        // ✅ Validation: Check if delivery proof is uploaded
        if (deliveryImages.length === 0) {
            setValidationError('⚠️ Delivery Proof (Challan) is required. Please upload at least one image.');
            // Scroll to error message
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        // Clear any previous validation errors
        setValidationError('');
        
        try {
            // Import the API
            const { upcomingDeliveryAPI } = await import('../../utils/materialAPI');
            
            // Format items for backend
            const formattedItems = materials.map(m => ({
                itemId: m.itemId || m._id,
                received_quantity: m.received_quantity || 0,
                is_received: m.is_received || false
            }));
            
            console.log('📤 Submitting delivery update:', {
                deliveryId: item.id,
                items: formattedItems
            });
            
            // Update items on backend
            const response = await upcomingDeliveryAPI.updateItems(item.id, formattedItems);
            
            if (response.success) {
                console.log('✅ Delivery updated successfully:', response.data);
                
                // Check if status is now Transferred - should go to GRN
                const updatedStatus = response.data?.status || 'Pending';
                if (updatedStatus === 'Transferred') {
                    console.log('🎯 Status is Transferred, delivery moved to GRN');
                }
                
                // Navigate back to Upcoming Deliveries list
                navigate(-1);
            } else {
                console.error('❌ Failed to update delivery:', response.message);
                alert('Failed to update delivery: ' + response.message);
            }
        } catch (error) {
            console.error('❌ Error updating delivery:', error);
            alert('Error updating delivery. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
            {/* Container with consistent mobile width */}
            <div className="max-w-md mx-auto bg-white shadow-xl">
                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
                    <button
                        className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                        <span className="text-sm font-medium">Back</span>
                    </button>

                    <div className="text-center pt-8">
                        <h1 className="text-white text-2xl font-bold mb-2">Delivery Details</h1>
                        <p className="text-white/80 text-sm">{type} - {item.id}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-6 py-6 -mt-4 pb-24">
                    <div className="space-y-4">
                        {/* Validation Error Message */}
                        {validationError && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 animate-shake">
                                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-white font-bold text-sm">!</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-red-700 text-sm font-medium">{validationError}</p>
                                </div>
                                <button
                                    onClick={() => setValidationError('')}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                        {/* Delivery Information Card */}
                        <div className="bg-white rounded-lg border p-4">
                            <h2 className="font-semibold text-gray-900 mb-3">Delivery Information</h2>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Delivery ID</span>
                                    <span className="font-semibold text-gray-900">{item.transfer_number || item.id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Type</span>
                                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                        type === 'PO' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                    }`}>
                                        {type === 'PO' ? '📋 Purchase Order' : '🚚 Site Transfer'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">From</span>
                                    <span className="font-semibold text-gray-900">{item.from || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">To</span>
                                    <span className="font-semibold text-gray-900">{item.to || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Date</span>
                                    <span className="font-semibold text-gray-900">{new Date(item.date).toLocaleDateString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Status</span>
                                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                        item.status === 'Transferred' ? 'bg-green-100 text-green-700' :
                                        item.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                                        item.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {item.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Materials Card */}
                        <div className="bg-white rounded-lg border p-4">
                            <h2 className="font-semibold text-gray-900 mb-3">Materials ({materials.length})</h2>
                            
                            <div className="space-y-3">
                                {materials.map((m) => {
                                    const itemId = m.itemId || m._id;
                                    const itemName = m.name || m.itemName || 'Unknown';
                                    const requestedQty = m.quantity || m.st_quantity || 0;
                                    const receivedQty = m.received_quantity || 0;
                                    const isReceived = m.is_received || false;
                                    
                                    return (
                                    <div
                                        key={itemId}
                                        className="bg-white rounded-lg border border-gray-200 p-4"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{itemName}</p>
                                            </div>
                                            {isEditMode && (
                                                <input
                                                    type="checkbox"
                                                    checked={isReceived && receivedQty >= requestedQty}
                                                    onChange={(e) => handleCheckbox(itemId, e.target.checked)}
                                                    className="w-5 h-5 accent-orange-500 cursor-pointer"
                                                />
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Requested</label>
                                                <p className="text-sm font-medium text-orange-600">{requestedQty}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Received</label>
                                                <p className="text-sm font-medium text-gray-900">{receivedQty}</p>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Delivery Proof Upload - Only in Edit Mode */}
                        {isEditMode && (
                        <div className="bg-white rounded-lg border-2 border-orange-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <h2 className="font-semibold text-gray-900">Delivery Proof - Challan Upload</h2>
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">* REQUIRED</span>
                            </div>
                            
                            {/* Image Preview */}
                            {imagePreview.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {imagePreview.map((preview, index) => (
                                        <div key={index} className="relative border border-gray-300 rounded-lg overflow-hidden">
                                            <img 
                                                src={preview} 
                                                alt={`Delivery proof ${index + 1}`}
                                                className="w-full h-32 object-cover"
                                            />
                                            <button
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                            <div className="p-2 bg-white border-t border-gray-200">
                                                <p className="text-xs text-gray-600 truncate">{deliveryImages[index]?.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Upload Button */}
                            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors bg-orange-50/30">
                                <Upload size={20} className="text-orange-600" />
                                <span className="text-sm text-gray-900 font-semibold">Upload Delivery Proof (Challan, etc.) *</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-red-600 font-medium mt-2">* Required: Upload images of delivery challan or proof</p>
                        </div>
                        )}
                    </div>
                </div>

                {/* Fixed Bottom Buttons */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
                    <div className="max-w-[390px] mx-auto px-4 py-3">
                        {!isEditMode ? (
                            // View mode: Show only Edit button (No Delete)
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setIsEditMode(true)}
                                    className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md"
                                >
                                    Edit
                                </button>
                            </div>
                        ) : (
                            // Edit mode: Show Cancel and Submit buttons
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsEditMode(false);
                                        setMaterials(item?.materials || []);
                                        setDeliveryImages([]);
                                        setImagePreview([]);
                                        setValidationError('');
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md"
                                >
                                    Submit
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
