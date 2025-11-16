import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import { toast } from "react-toastify";
import {
  GoogleMap,
  MarkerF,
  CircleF,
  Autocomplete,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  FaMapMarkerAlt,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCheck,
  FaTimes,
  FaBuilding,
  FaRulerCombined,
  FaSearchLocation
} from "react-icons/fa";

const MAP_STYLE = { height: "400px", width: "100%" };
const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 5;

const AdminBranches = () => {
  const [branches, setBranches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    address: "",
    name: "",
    lat: null,
    lng: null,
    radius: 100,
  });

  const [searchInput, setSearchInput] = useState("");
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = useCallback((lat, lng, zoom = 15) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(zoom);
    }
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/branches", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setBranches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const reverseGeocode = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      return results?.[0]?.formatted_address || "Unknown location";
    } catch (e) {
      console.error("Reverse geocode failed", e);
      return "Unknown location";
    }
  };

  const handleMapClick = async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const address = await reverseGeocode(lat, lng);

    setFormData((prev) => ({
      ...prev,
      lat,
      lng,
      address,
    }));
    setSearchInput(address);
    toast.success("Location selected!");
  };

  const onPlaceChanged = async () => {
    const ac = autocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    if (!place || !place.geometry) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || place.name || searchInput;

    setFormData((prev) => ({
      ...prev,
      lat,
      lng,
      address,
    }));
    setSearchInput(address);
    panTo(lat, lng, 15);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.lat || !formData.lng) {
      toast.error("Please provide name and location");
      return;
    }

    const payload = {
      name: formData.name,
      lat: formData.lat,
      lng: formData.lng,
      radius: formData.radius,
      address: formData.address,
    };

    try {
      if (editingId) {
        await axios.put(`/branches/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success("Branch updated");
      } else {
        await axios.post("/branches", payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success("Branch created");
      }
      setFormData({ name: "", lat: null, lng: null, radius: 100, address: "" });
      setSearchInput("");
      setEditingId(null);
      fetchBranches();
    } catch (err) {
      console.error("Error saving branch:", err);
      toast.error("Failed to save branch");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this branch?")) return;
    try {
      await axios.delete(`/branches/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Branch deleted");
      fetchBranches();
    } catch (e) {
      toast.error("Failed to delete branch");
    }
  };

  const handleEdit = (branch) => {
    setEditingId(branch._id);
    setFormData({
      name: branch.name,
      lat: branch.lat,
      lng: branch.lng,
      radius: branch.radius,
      address: branch.address || "",
    });
    setSearchInput(branch.address || "");
    if (branch.lat && branch.lng) panTo(branch.lat, branch.lng, 15);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", lat: null, lng: null, radius: 100, address: "" });
    setSearchInput("");
  };

  return (
    <DashboardLayout title="Branches">
      <div className="space-y-6">
        {/* Header */}
        <div>
          {/* <h1 className="text-2xl font-bold text-gray-800">Branch Management</h1> */}
          <p className="text-sm text-gray-500 mt-1">Manage your branch locations with geofencing</p>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Branches</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{branches.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FaBuilding className="text-orange-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Branch" : "Add New Branch"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cancel"
              >
                <FaTimes size={18} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter branch name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Radius (meters) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaRulerCombined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="number"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter radius"
                    value={formData.radius}
                    onChange={(e) =>
                      setFormData({ ...formData, radius: parseInt(e.target.value || "0", 10) })
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  readOnly
                  value={formData.address || "Select location on map or search below"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Search Location <span className="text-red-500">*</span>
              </label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(ac) => (autocompleteRef.current = ac)}
                  onPlaceChanged={onPlaceChanged}
                >
                  <div className="relative">
                    <FaSearchLocation className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Search for a place or address"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  placeholder="Loading Google Maps..."
                  disabled
                />
              )}
              <p className="text-xs text-gray-500 mt-1.5">
                💡 Tip: Try searching "Mahim Mumbai" or a PIN code if the full address fails.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Select Location on Map
              </label>
              {isLoaded && (
                <div className="rounded-lg overflow-hidden border border-gray-300">
                  <GoogleMap
                    mapContainerStyle={MAP_STYLE}
                    center={
                      formData.lat && formData.lng
                        ? { lat: formData.lat, lng: formData.lng }
                        : DEFAULT_CENTER
                    }
                    zoom={formData.lat ? 15 : DEFAULT_ZOOM}
                    options={{ disableDefaultUI: true, zoomControl: true, clickableIcons: false }}
                    onLoad={onMapLoad}
                    onClick={handleMapClick}
                  >
                    {formData.lat && formData.lng && (
                      <>
                        <MarkerF position={{ lat: formData.lat, lng: formData.lng }} />
                        <CircleF
                          center={{ lat: formData.lat, lng: formData.lng }}
                          radius={Number(formData.radius) || 0}
                          options={{ 
                            fillColor: "#ff6b35",
                            fillOpacity: 0.15, 
                            strokeColor: "#ff6b35",
                            strokeOpacity: 0.6, 
                            strokeWeight: 2 
                          }}
                        />
                      </>
                    )}
                  </GoogleMap>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors shadow-md hover:shadow-lg"
            >
              {editingId ? (
                <>
                  <FaCheck size={14} />
                  Update Branch
                </>
              ) : (
                <>
                  <FaPlus size={14} />
                  Save Branch
                </>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Branches Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Branches List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your existing branches</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Address</th>
                  <th className="text-left px-6 py-3 font-semibold">Radius (m)</th>
                  <th className="text-left px-6 py-3 font-semibold">Coordinates</th>
                  <th className="text-left px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-6 text-center text-gray-500">
                      Loading branches...
                    </td>
                  </tr>
                ) : branches.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-6 text-center text-gray-500">
                      No branches found. Add your first branch above.
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{b.name}</td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                        {b.address || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{b.radius}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {b.lat?.toFixed(6)}, {b.lng?.toFixed(6)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(b)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            <FaEdit size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(b._id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium transition-colors"
                          >
                            <FaTrash size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBranches;