import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function DeliveryDetails() {
    const location = useLocation();
    const navigate = useNavigate();

    const { item, type } = location.state || {};
    const [materials, setMaterials] = useState(item?.materials || []);

    if (!item || !type) {
        navigate("/"); // fallback if accessed directly
        return null;
    }

    const handleCheckbox = (id, checked) => {
        setMaterials((prev) =>
            prev.map((m) =>
                m.id === id ? { ...m, receivedQty: checked ? m.poQty : 0 } : m
            )
        );
    };

    const handleSubmit = () => {
        // send updated materials back
        navigate(-1, {
            state: {
                updated: true,
                type,
                id: item.id,
                materials,
            },
        });
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
                        {/* Materials Card */}
                        <div className="bg-white rounded-lg border p-4">
                            <h2 className="font-semibold text-gray-900 mb-3">Materials</h2>
                            
                            <div className="space-y-3">
                                {materials.map((m) => (
                                    <div
                                        key={m.id}
                                        className="bg-white rounded-lg border border-gray-200 p-4"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={m.receivedQty >= m.poQty}
                                                onChange={(e) => handleCheckbox(m.id, e.target.checked)}
                                                className="w-5 h-5 accent-orange-500 cursor-pointer"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">P.O Qty</label>
                                                <p className="text-sm font-medium text-orange-600">{m.poQty}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Received</label>
                                                <p className="text-sm font-medium text-gray-900">{m.receivedQty}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fixed Bottom Buttons */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
                    <div className="max-w-[390px] mx-auto px-4 py-3">
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(-1)}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
