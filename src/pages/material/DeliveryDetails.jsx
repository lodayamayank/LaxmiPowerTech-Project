import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
        <div className="p-4 bg-gray-50 min-h-screen">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Delivery Details: {type} - {item.id}
            </h2>

            <div className="bg-white p-4 rounded-xl shadow space-y-4">
                {materials.map((m) => (
                    <div
                        key={m.id}
                        className="flex items-center justify-between border-b pb-2"
                    >
                        <div>
                            <div className="text-sm font-medium text-gray-700">{m.name}</div>
                            <div className="flex gap-2 mt-1">
                                <div className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                                    P.O Qty: {m.poQty}
                                </div>
                                <div className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    Received: {m.receivedQty}
                                </div>
                            </div>
                        </div>

                        <input
                            type="checkbox"
                            checked={m.receivedQty >= m.poQty}
                            onChange={(e) => handleCheckbox(m.id, e.target.checked)}
                            className="w-5 h-5 accent-orange-500"
                        />
                    </div>
                ))}
            </div>

            <div className="flex gap-3 mt-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex-1 py-3 bg-gray-300 text-black font-semibold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition"
                >
                    Submit
                </button>
            </div>
        </div>
    );
}
