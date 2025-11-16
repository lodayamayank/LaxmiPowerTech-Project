import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import { syncOfflineAttendance } from "../utils/syncAttendance";
import useNotifier from "../hooks/useNotifier";
import { GoogleMap, MarkerF, CircleF, useJsApiLoader } from "@react-google-maps/api";
import { formatIST } from "../utils/date";
import { 
  FaArrowLeft, 
  FaClock, 
  FaMapMarkerAlt, 
  FaCheckCircle, 
  FaTimesCircle,
  FaSyncAlt,
  FaFingerprint,
  FaSignOutAlt,
  FaBuilding,
  FaWifi,
  FaExclamationTriangle
} from "react-icons/fa";

// --- utils (unchanged) ---
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MAP_STYLE = { height: "350px", width: "100%" };
const DEFAULT_ZOOM = 17;

const PunchInScreen = () => {
  const notifier = useNotifier();

  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [punchStatus, setPunchStatus] = useState({
    punchedIn: false,
    punchedOut: false,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nearestBranch, setNearestBranch] = useState(null);
  const [branchDistance, setBranchDistance] = useState(null);

  const mapRef = useRef(null);
  const navigate = useNavigate();

  // Load Google Maps
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const recenter = useCallback((lat, lng) => {
    if (mapRef.current && lat && lng) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(DEFAULT_ZOOM);
    }
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate nearest branch and distance
  useEffect(() => {
    if (location && user?.assignedBranches?.length) {
      const { lat, lng } = location;
      let minDistance = Infinity;
      let nearest = null;

      user.assignedBranches.forEach((branch) => {
        const d = getDistanceMeters(lat, lng, branch.lat, branch.lng);
        if (d < minDistance) {
          minDistance = d;
          nearest = branch;
        }
      });

      setNearestBranch(nearest);
      setBranchDistance(Math.round(minDistance));
    }
  }, [location, user]);

  const getLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setLoadingLocation(false);
        recenter(loc.lat, loc.lng);
      },
      () => {
        notifier.error("Failed to fetch location");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  };

  const fetchUser = async () => {
    try {
      const res = await axios.get("/auth/me", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUser(res.data.user);
    } catch (err) {
      notifier.error("Failed to load user. Please log in again.");
      console.error(err);
    }
  };

  const fetchPunchStatus = async () => {
    try {
      const res = await axios.get("/attendance/today", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPunchStatus({
        punchedIn: res.data.punchedIn,
        punchedOut: res.data.punchedOut,
      });
    } catch (err) {
      console.error("Failed to fetch punch status", err);
    }
  };

  const queuePunchOffline = (data) => {
    const existing = JSON.parse(localStorage.getItem("offlinePunchQueue") || "[]");
    existing.push({ ...data, queuedAt: new Date().toISOString() });
    localStorage.setItem("offlinePunchQueue", JSON.stringify(existing));
    notifier.info("Offline – Punch queued locally and will sync when online.");
  };

  const handlePunchClick = async (type) => {
    if (!location || !user?.assignedBranches?.length) {
      notifier.error("Missing location or branch assignment.");
      return;
    }
    const { lat, lng } = location;

    const nearbyBranch = user.assignedBranches.find((branch) => {
      const d = getDistanceMeters(lat, lng, branch.lat, branch.lng);
      console.log(`🏢 Branch: ${branch.name}, Dist: ${d}m, Radius: ${branch.radius}m`);
      return d <= branch.radius;
    });

    if (!nearbyBranch) {
      notifier.error("You are not within any of your assigned branch locations.");
      return;
    }

    const punchPayload = {
      punchType: type,
      location: { lat, lng },
      branchId: nearbyBranch._id,
      timestamp: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      queuePunchOffline(punchPayload);
      return;
    }

    navigate("/selfie", { state: punchPayload });
  };

  useEffect(() => {
    fetchUser();
    getLocation();
    fetchPunchStatus();
    syncOfflineAttendance();

    const handleOnline = () => {
      console.log("🔌 Back online — syncing offline punches...");
      syncOfflineAttendance();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const renderPunchButton = () => {
    const isWithinRange = branchDistance !== null && nearestBranch && branchDistance <= nearestBranch.radius;

    if (!punchStatus.punchedIn) {
      return (
        <button
          onClick={() => handlePunchClick("in")}
          disabled={!isWithinRange || !location}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-3 ${
            isWithinRange && location
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] active:scale-[0.98]"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <FaFingerprint size={24} />
          <span className="text-lg">Punch In</span>
        </button>
      );
    } else if (!punchStatus.punchedOut) {
      return (
        <button
          onClick={() => handlePunchClick("out")}
          disabled={!isWithinRange || !location}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-3 ${
            isWithinRange && location
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transform hover:scale-[1.02] active:scale-[0.98]"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <FaSignOutAlt size={20} />
          <span className="text-lg">Punch Out</span>
        </button>
      );
    }
    return (
      <button
        disabled
        className="w-full py-4 rounded-2xl font-bold shadow-lg bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed flex items-center justify-center gap-3"
      >
        <FaCheckCircle size={20} />
        <span className="text-lg">Attendance Complete for Today</span>
      </button>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user...</p>
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
            <FaArrowLeft className="text-orange-500" size={16} />
            <span className="text-sm text-orange-500 font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Mark Attendance</h1>
            <p className="text-white/80 text-sm">{user?.name}</p>
          </div>

          {/* Time Display */}
          <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center gap-3">
            <FaClock className="text-white" size={24} />
            <div className="text-center">
              <div className="text-white text-3xl font-bold">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div className="text-white/80 text-sm">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Status Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-4 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {punchStatus.punchedIn && !punchStatus.punchedOut ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <FaCheckCircle className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Status: Punched In</p>
                      <p className="text-xs text-gray-600">You are currently at work</p>
                    </div>
                  </>
                ) : punchStatus.punchedOut ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
                      <FaCheckCircle className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Status: Completed</p>
                      <p className="text-xs text-gray-600">Attendance marked for today</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <FaClock className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Status: Not Punched In</p>
                      <p className="text-xs text-gray-600">Mark your attendance now</p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Online/Offline indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${navigator.onLine ? 'bg-green-100' : 'bg-red-100'}`}>
                {navigator.onLine ? (
                  <FaWifi className="text-green-600" size={12} />
                ) : (
                  <FaExclamationTriangle className="text-red-600" size={12} />
                )}
                <span className={`text-xs font-medium ${navigator.onLine ? 'text-green-600' : 'text-red-600'}`}>
                  {navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Branch Distance Info */}
          {nearestBranch && branchDistance !== null && (
            <div className={`rounded-2xl p-4 mb-4 border shadow-sm ${
              branchDistance <= nearestBranch.radius
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  branchDistance <= nearestBranch.radius ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  <FaBuilding className="text-white" size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    Nearest Branch: {nearestBranch.name}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Distance: <span className="font-semibold">{branchDistance}m</span> away
                  </p>
                  {branchDistance <= nearestBranch.radius ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <FaCheckCircle size={14} />
                      <span className="text-xs font-medium">Within range - You can mark attendance</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-700">
                      <FaExclamationTriangle size={14} />
                      <span className="text-xs font-medium">
                        Move {branchDistance - nearestBranch.radius}m closer to mark attendance
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Map Container */}
          <div className="relative w-full mb-4 rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
            {isLoaded && location ? (
              <GoogleMap
                mapContainerStyle={MAP_STYLE}
                center={{ lat: location.lat, lng: location.lng }}
                zoom={DEFAULT_ZOOM}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  clickableIcons: false,
                  styles: [
                    {
                      featureType: "poi",
                      elementType: "labels",
                      stylers: [{ visibility: "off" }],
                    },
                  ],
                }}
                onLoad={onMapLoad}
              >
                <MarkerF position={{ lat: location.lat, lng: location.lng }} />
                {/* Show branch radius circles */}
                {user?.assignedBranches?.map((branch) => (
                  <CircleF
                    key={branch._id}
                    center={{ lat: branch.lat, lng: branch.lng }}
                    radius={branch.radius}
                    options={{
                      fillColor: "#22c55e",
                      fillOpacity: 0.1,
                      strokeColor: "#22c55e",
                      strokeOpacity: 0.5,
                      strokeWeight: 2,
                    }}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="h-[350px] bg-gray-100 flex items-center justify-center">
                {loadingLocation ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Fetching location...</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Unable to load map</p>
                )}
              </div>
            )}

            {/* Refresh Location Button */}
            <button
              className="absolute top-3 right-3 bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2 font-medium text-sm"
              onClick={getLocation}
              disabled={loadingLocation}
            >
              <FaSyncAlt className={loadingLocation ? 'animate-spin' : ''} size={14} />
              Refresh
            </button>
          </div>

          {/* Punch Button */}
          {renderPunchButton()}

          {/* Info Section */}
          <div className="mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <FaMapMarkerAlt className="text-orange-500 mt-1" size={16} />
              <div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {location 
                    ? "Your location is being tracked. Make sure you are within your assigned branch radius to mark attendance."
                    : "Please enable location access to mark attendance."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PunchInScreen;