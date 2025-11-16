import React, { useRef, useEffect } from "react";
import { FileUp, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AddIndentPopup({ onClose, onUploadClick }) {
  const popupRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleCreateIntent = () => {
    onClose(); // close popup
    navigate("/intent/create"); // go to create intent (PO) page
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        ref={popupRef}
        className="bg-white rounded-t-2xl w-full max-w-[390px] p-6 shadow-xl animate-slide-up"
      >
        <h3 className="text-orange-500 font-semibold text-base mb-4">
          Create New Indent
        </h3>

        <div className="flex flex-col space-y-4">
          <button
            onClick={handleCreateIntent}
            className="flex items-center space-x-3 text-gray-800 font-medium hover:text-orange-600 transition"
          >
            <ShoppingCart size={20} className="text-orange-500" />
            <span>Create Intent List (PO)</span>
          </button>

          <button
            onClick={onUploadClick}
            className="flex items-center space-x-3 text-gray-800 font-medium hover:text-orange-600 transition"
          >
            <FileUp size={20} className="text-orange-500" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
