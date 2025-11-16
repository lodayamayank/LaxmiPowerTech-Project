import React from "react";
import { useNavigate } from "react-router-dom";

export default function UploadPhoto() {
  const navigate = useNavigate();

  return (
    <div className="p-6 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">New Request</h2>
        <p className="text-gray-600 mb-2 font-medium">Indent ID</p>
        <input
          type="text"
          placeholder="Enter Indent ID"
          className="w-full border rounded-lg p-2 mb-6 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <p className="font-medium text-gray-600 mb-2">Upload Material List Photo</p>
        <div className="flex justify-center">
          <button className="bg-orange-500 text-white text-2xl w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition">
            +
          </button>
        </div>
      </div>

      <button
        onClick={() => navigate("/indent")} // navigate back to Indent page
        className="mt-6 w-full py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        ← Back
      </button>
    </div>
  );
}
