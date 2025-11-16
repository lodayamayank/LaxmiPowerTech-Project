
import React from "react";

const ConfirmModal = ({ image, user, punchType, onConfirm, onCancel }) => {
  const time = new Date().toLocaleTimeString();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg text-center w-full max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">{user?.name || "User"}</h3>
        <div className="w-40 h-40 mx-auto overflow-hidden rounded-full border-4 border-emerald-600 shadow-lg mb-3">
          <img src={image} alt="selfie" className="object-cover w-full h-full" />
        </div>
        <p className="text-sm text-gray-700 mb-4">Punching {punchType} at {time}</p>
        <button
          onClick={onConfirm}
          className="bg-emerald-600 text-white px-4 py-2 rounded w-full mb-2 shadow-sm hover:bg-emerald-700"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-200 text-black px-4 py-2 rounded w-full hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ConfirmModal;
