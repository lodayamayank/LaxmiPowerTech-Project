
import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ConfirmModal from "../components/ConfirmModal";

// Fix Leaflet marker icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 17);
  }, [lat, lng]);
  return null;
};

const PunchInScreen = ({ user }) => {
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [punchType, setPunchType] = useState("in");
  const webcamRef = useRef(null);

  const getLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
      },
      () => {
        alert("Failed to fetch location");
        setLoadingLocation(false);
      }
    );
  };

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowCamera(false);
    setShowConfirm(true);
  };

  const confirmPunch = async () => {
    const timestamp = new Date().toISOString();
    const payload = {
      punchType,
      lat: location.lat,
      lng: location.lng,
      timestamp,
    };

    const formData = new FormData();
    formData.append("selfie", dataURLtoBlob(capturedImage), "selfie.jpg");
    Object.entries(payload).forEach(([key, value]) =>
      formData.append(key, value)
    );

    try {
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        alert("Punch recorded!");
      } else {
        alert("Failed to punch");
      }
    } catch (err) {
      console.error("Punch failed:", err);
    }

    setShowConfirm(false);
  };

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <div className="min-h-screen bg-white p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Mark Attendance</h2>

      <div className="flex-col items-center relative w-full mb-4 rounded overflow-hidden shadow">
        {location && (
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={17}
            scrollWheelZoom={false}
            style={{ height: "300px", width: "300px" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[location.lat, location.lng]} />
            <RecenterMap lat={location.lat} lng={location.lng} />
          </MapContainer>
        )}
        {loadingLocation && <p className="text-sm">Fetching location...</p>}
        <button
          className=" mt-5 mb-5 mx-auto bg-orange-500 text-white text-sm px-3 py-1 rounded shadow border z-50"
          onClick={getLocation}
        >
          🔄 Refresh Location
        </button>
      </div>

      <button
        onClick={() => setShowCamera(true)}
        className="w-fit bg-orange-500 text-white py-3 rounded-lg font-bold shadow"
      >
        {`Punch ${punchType === "in" ? "In" : "Out"}`}
      </button>

      {showCamera && (
        <div className="mt-6 text-center">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="rounded-full w-64 h-64 mx-auto border-4 border-orange-500 shadow-lg"
            videoConstraints={{ facingMode: "user" }}
          />
          <button
            onClick={capture}
            className="mt-4 bg-orange-500 text-white py-2 px-4 rounded shadow"
          >
            📸 Capture
          </button>
        </div>
      )}

      {showConfirm && (
        <ConfirmModal
          image={capturedImage}
          user={user}
          punchType={punchType}
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmPunch}
        />
      )}
    </div>
  );
};

export default PunchInScreen;
