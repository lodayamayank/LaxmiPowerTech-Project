// src/screens/SelfieCaptureScreen.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import FaceCamera from "../components/FaceCamera";
import { submitOffline } from "../utils/offlineSubmit";
import { markPunchedLocally } from "../utils/punchStatusCache";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaCamera,
  FaCheckCircle,
  FaWifi,
  FaExclamationTriangle,
  FaUserCircle,
} from "react-icons/fa";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const FALLBACK_DELAY_MS = 30000;

// Gate debug logs so they don't ship to prod consoles (and don't leak
// user id / location / timestamps to anyone with devtools open).
const isDev = process.env.NODE_ENV !== "production";
const devLog = (...args) => { if (isDev) console.log(...args); };

// localStorage can contain a corrupted/partial value (old app version,
// manual tampering, interrupted write). Never let JSON.parse crash render.
function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("SelfieCaptureScreen: failed to parse stored user.", err);
    return null;
  }
}

const SelfieCaptureScreen = () => {
  const user = readStoredUser();
  const webcamRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [showSupervisorInput, setShowSupervisorInput] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStatus, setFaceStatus] = useState("idle");
  const [faceMessage, setFaceMessage] = useState("Starting camera…");

  const navigate = useNavigate();
  const locationState = useLocation().state || {};
  const { punchType, location, branchId, timestamp } = locationState;

  // Missing required navigation state (deep link, refresh, back/forward
  // nav) — tell the user immediately instead of letting them take a
  // selfie first and find out on submit.
  const hasRequiredParams = Boolean(punchType && location?.lat && location?.lng);

  useEffect(() => {
    if (!hasRequiredParams) {
      toast.error("Missing punch details. Please start again from the dashboard.");
      navigate("/dashboard", { replace: true });
    }
    // Only needs to run once on mount; locationState is fixed for this screen instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  // Single source of truth for the "couldn't capture? here's a fallback"
  // timer, used both on mount and after a cancelled/failed capture.
  const armFallbackTimer = () => {
    clearFallbackTimer();
    setShowFallback(false);
    fallbackTimerRef.current = setTimeout(() => {
      setShowFallback(true);
      fallbackTimerRef.current = null;
    }, FALLBACK_DELAY_MS);
  };

  useEffect(() => {
    armFallbackTimer();
    return clearFallbackTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    if (!faceDetected) return;

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Couldn't capture photo. Please try again.");
      return;
    }
    clearFallbackTimer();
    setShowFallback(false);
    setCapturedImage(imageSrc);
    setShowConfirm(true);
  };

  const cancelConfirmation = () => {
    setShowConfirm(false);
    setCapturedImage(null);
    // Re-arm the fallback timer, but leave any supervisor code the user
    // already typed alone — cancelling the selfie confirm is unrelated
    // to the supervisor-code recovery flow.
    armFallbackTimer();
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

  const extractErrorMessage = (err, fallback) =>
    err.response?.data?.message || err.response?.data?.error || err.message || fallback;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      devLog('📸 Starting punch submission...');
      devLog('User:', user?._id);
      devLog('Location:', location);
      devLog('PunchType:', punchType);
      devLog('BranchId:', branchId);
      devLog('Timestamp:', timestamp);
      devLog('CapturedImage:', capturedImage ? 'Present' : 'Missing');

      if (!user?._id || !location?.lat || !location?.lng || !punchType || !capturedImage) {
        toast.error("Missing required data. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const selfieFile = dataURLtoFile(capturedImage, "selfie.jpg");
      devLog('📷 Selfie file created:', selfieFile.name, selfieFile.size, 'bytes', selfieFile.type);

      const formData = new FormData();
      formData.append("selfie", selfieFile);
      formData.append("punchType", punchType);
      formData.append("lat", String(location.lat));
      formData.append("lng", String(location.lng));
      if (branchId) formData.append("branchId", branchId);

      // One call for both cases: sent now if there is a connection, stored in
      // IndexedDB (selfie File and all) and replayed later if there is not.
      // capturedAt is the moment the user punched, so a punch that syncs hours
      // later is still recorded at the time it was actually made.
      const result = await submitOffline({
        module: "attendance",
        endpoint: "/attendance/punch",
        formData,
        capturedAt: timestamp || new Date().toISOString(),
        label: `Punch ${punchType}`,
        meta: { branchId, punchType },
      });

      markPunchedLocally(punchType);

      if (result.offline) {
        toast.info("📴 You're offline. Punch saved and will sync when internet is back.");
      } else {
        toast.success("✅ Punch recorded successfully!");
      }
      navigate("/dashboard");
    } catch (err) {
      console.error('❌ Punch error:', err.response?.status, err.response?.data, err.message);
      toast.error(`❌ Failed to punch: ${extractErrorMessage(err, "Please try again.")}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupervisorCodeSubmit = async () => {
    if (isSubmitting) return;

    if (supervisorCode.length !== 6) {
      toast.error("Please enter a valid 6-digit supervisor code.");
      return;
    }

    if (!user?._id || !location?.lat || !location?.lng || !punchType) {
      toast.error("Missing required data. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("code", supervisorCode);
      formData.append("punchType", punchType);
      formData.append("lat", String(location.lat));
      formData.append("lng", String(location.lng));
      if (branchId) formData.append("branchId", branchId);

      // Same offline-safe path as the selfie punch, so a supervisor-code
      // punch made with no signal still queues and syncs later instead
      // of failing outright — this is a fallback path, it should be at
      // least as resilient as the primary one, not less.
      const result = await submitOffline({
        module: "attendance",
        endpoint: "/attendance/supervisor-code-punch",
        formData,
        capturedAt: timestamp || new Date().toISOString(),
        label: `Punch ${punchType} (supervisor code)`,
        meta: { branchId, punchType },
      });

      markPunchedLocally(punchType);

      if (result.offline) {
        toast.info("📴 You're offline. Punch saved and will sync when internet is back.");
      } else {
        toast.success(result.data?.message || "Attendance recorded successfully!");
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Supervisor code punch error:", err.response?.status, err.response?.data, err.message);
      toast.error(`❌ ${extractErrorMessage(err, "Failed to record attendance.")}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Required nav state is missing — we've already redirected in the effect
  // above; render nothing in the meantime rather than a half-usable screen.
  if (!hasRequiredParams) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <Button
            variant="ghost"
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full h-auto"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </Button>

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
                  <p className="text-sm font-semibold text-gray-800">{faceMessage}</p>
                  <p className="text-xs text-gray-600">
                    {faceStatus === "holding"
                      ? "You can capture your photo"
                      : "Follow the instructions above"}
                  </p>
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
                <FaceCamera
                  webcamRef={webcamRef}
                  onFaceDetected={(detected, ready, status, message) => {
                    setFaceDetected(detected);
                    setFaceStatus(status);
                    setFaceMessage(message);
                  }}
                  className="w-full h-full object-cover"
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
            disabled={isSubmitting || !faceDetected}
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

          {showFallback && !capturedImage && (
            <Card className="mt-6 border-orange-200 bg-orange-50/70">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-semibold text-gray-800">
                  Unable to capture selfie?
                </p>
                {!showSupervisorInput ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() => setShowSupervisorInput(true)}
                  >
                    Enter Supervisor Code
                  </Button>
                ) : (
                  <div className="mt-3 space-y-3 text-left">
                    <label
                      htmlFor="supervisor-code"
                      className="text-sm font-medium text-gray-700"
                    >
                      Supervisor Code
                    </label>
                    <input
                      id="supervisor-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={supervisorCode}
                      onChange={(event) =>
                        setSupervisorCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Enter 6-digit code"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className={`w-full ${
                        supervisorCode.length === 6 && !isSubmitting
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : ""
                      }`}
                      disabled={supervisorCode.length !== 6 || isSubmitting}
                      onClick={handleSupervisorCodeSubmit}
                    >
                      {isSubmitting ? "Verifying..." : "Continue"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          image={capturedImage}
          user={user}
          punchType={punchType}
          onCancel={cancelConfirmation}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default SelfieCaptureScreen;