// src/screens/SelfieCaptureScreen.jsx
import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { useNavigate, useLocation } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { storeOfflinePunch } from "../utils/syncAttendance";
import api from "../utils/axios";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaCamera,
  FaCheckCircle,
  FaRedo,
  FaWifi,
  FaExclamationTriangle,
  FaUserCircle,
} from "react-icons/fa";

const SelfieCaptureScreen = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const webcamRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const locationState = useLocation().state || {};
  const { punchType, location, branchId, timestamp } = locationState;

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    setCapturedImage(imageSrc);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!user?._id || !location?.lat || !location?.lng || !punchType || !capturedImage) {
        toast.error("Missing required data. Please try again.");
        return;
      }

      const selfieFile = dataURLtoFile(capturedImage, "selfie.jpg");

      // Offline fallback
      if (!navigator.onLine) {
        storeOfflinePunch({
          selfie: selfieFile,
          punchType,
          lat: location.lat,
          lng: location.lng,
          branchId,
          timestamp,
        });
        toast.info("📴 You're offline. Punch saved and will sync when internet is back.");
        navigate("/dashboard");
        return;
      }

      // Build multipart form data
      const formData = new FormData();
      formData.append("selfie", selfieFile);
      formData.append("punchType", punchType);
      formData.append("lat", String(location.lat));
      formData.append("lng", String(location.lng));
      if (branchId) formData.append("branchId", branchId);
      if (timestamp) formData.append("timestamp", String(timestamp));

      const res = await api.post("/attendance/punch", formData);
      if (!res || res.status < 200 || res.status >= 300) {
        throw new Error("Punch failed");
      }

      toast.success("✅ Punch recorded successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error(
        "Punch error:",
        err.response?.status,
        err.response?.data || err.message
      );
      toast.error(`❌ Failed to punch. ${err.response?.data?.message || "Please try again."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  function dataURLtoFile(dataURL, filename) {
    const [header, data] = dataURL.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(data);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
    return new File([u8], filename, { type: mime });
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
            <FaCamera className="text-white mx-auto mb-3" size={40} />
            <h1 className="text-white text-2xl font-bold mb-2">Selfie Attendance</h1>
            <p className="text-white/80 text-sm">
              {punchType === "in" ? "Punch In" : "Punch Out"} • {user?.name}
            </p>
          </div>

          {/* Punch Type Badge */}
          <div className="mt-4 flex justify-center">
            <div
              className={`px-4 py-2 rounded-full font-semibold text-sm ${
                punchType === "in"
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              } shadow-lg`}
            >
              {punchType === "in" ? "🟢 Punching In" : "🔴 Punching Out"}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Status Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaUserCircle className="text-blue-600" size={32} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Ready to capture</p>
                  <p className="text-xs text-gray-600">Position your face in the circle</p>
                </div>
              </div>

              {/* Online/Offline indicator */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  navigator.onLine ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {navigator.onLine ? (
                  <FaWifi className="text-green-600" size={12} />
                ) : (
                  <FaExclamationTriangle className="text-red-600" size={12} />
                )}
                <span
                  className={`text-xs font-medium ${
                    navigator.onLine ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {navigator.onLine ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Webcam Container */}
          <div className="relative mb-6">
            <div className="relative mx-auto" style={{ width: "280px", height: "280px" }}>
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-orange-300 animate-pulse"></div>

              {/* Inner Ring */}
              <div className="absolute inset-2 rounded-full border-4 border-orange-500 shadow-2xl overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "user" }}
                />
              </div>

              {/* Corner Guides */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-orange-500 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-orange-500 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-orange-500 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-orange-500 rounded-br-3xl"></div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 mb-6 border border-yellow-200">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-orange-500 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Capture Guidelines</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Ensure your face is clearly visible</li>
                  <li>• Good lighting is recommended</li>
                  <li>• Remove glasses if possible</li>
                  <li>• Look directly at the camera</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Capture Button */}
          <button
            onClick={capture}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaCamera size={20} />
            <span className="text-lg">{isSubmitting ? "Processing..." : "Capture Photo"}</span>
          </button>

          {/* Help Text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Your photo will be used for attendance verification only
            </p>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          image={capturedImage}
          user={user}
          punchType={punchType}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default SelfieCaptureScreen;