import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { upcomingDeliveryAPI } from "../../utils/materialAPI";
import { ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
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
                    {/* Info Card */}
                    <div className="bg-white rounded-lg border p-4 space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-600">ST-ID</label>
                                <p className="font-medium text-gray-900">{delivery.st_id}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600">Status</label>
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(delivery.status)}`}>
                                    {delivery.status}
                                </span>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600">From</label>
                                <p className="font-medium text-gray-900">{delivery.from}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600">To</label>
                                <p className="font-medium text-gray-900">{delivery.to}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-gray-600">Date</label>
                                <p className="font-medium text-gray-900">{formatDate(delivery.date)}</p>
                            </div>
                        </div>
                    </div>

                    {/* All Transferred Banner */}
                    {allTransferred && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 mb-4">
                            <CheckCircle className="text-green-600" size={20} />
                            <span className="text-sm text-green-700 font-medium">All items transferred</span>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-center">
                                <span className="block text-xs text-gray-600">Submitted</span>
                                <span className="block font-semibold text-gray-900">{totalSubmitted}</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-xs text-gray-600">Received</span>
                                <span className="block font-semibold text-green-600">{totalReceived}</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-xs text-gray-600">Missing</span>
                                <span className="block font-semibold text-orange-600">{missing}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.itemId || item._id} className="bg-white rounded-lg border p-3">
                        <div className="space-y-2">
                            {/* Item Info */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{item.category}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {item.sub_category} • {item.sub_category1}
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={item.is_received}
                                    onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                                    className="w-5 h-5 accent-orange-500 mt-1"
                                />
                            </div>

                            {/* Quantities */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">ST Quantity</label>
                                    <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium text-gray-700">
                                        {item.st_quantity}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Received Quantity</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={item.st_quantity}
                                        value={item.received_quantity}
                                        onChange={(e) => handleReceivedQuantityChange(index, e.target.value)}
                                        className={`w-full px-3 py-2 border rounded text-sm ${
                                            validationErrors[index] 
                                                ? 'border-red-500 focus:ring-red-500' 
                                                : 'border-gray-300 focus:ring-orange-500'
                                        } focus:ring-2 focus:outline-none`}
                                    />
                                </div>
                            </div>

                            {/* Validation Error */}
                            {validationErrors[index] && (
                                <div className="flex items-center gap-1 text-red-600 text-xs">
                                    <AlertCircle size={14} />
                                    <span>{validationErrors[index]}</span>
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
    );
}