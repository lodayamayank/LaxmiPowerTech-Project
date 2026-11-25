// src/pages/admin/components/useBranchesPage.js
// Data, map handlers, validation and save/delete handlers of the Branches page (moved unchanged from AdminBranches.jsx).
// Replaced: window.confirm -> a ConfirmDialog (deleteId state).
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useJsApiLoader } from "@react-google-maps/api";
import { getToken } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import { useBranches, BRANCHES_KEY } from "@/hooks/useBranches";
import axios from "@/api/client";

export default function useBranchesPage() {
  const { data: branches, isLoading: loading } = useBranches();
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null); // UI only: delete confirmation

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
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        toast.success("Branch updated");
      } else {
        await axios.post("/branches", payload, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        toast.success("Branch created");
      }
      setFormData({ name: "", lat: null, lng: null, radius: 100, address: "" });
      setSearchInput("");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: BRANCHES_KEY });
    } catch (err) {
      console.error("Error saving branch:", err);
      toast.error("Failed to save branch");
    }
  };

  const handleDelete = (id) => setDeleteId(id); // the confirmation is a ConfirmDialog (was window.confirm)

  const confirmDelete = async () => {
    const id = deleteId;
    try {
      await axios.delete(`/branches/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      toast.success("Branch deleted");
      queryClient.invalidateQueries({ queryKey: BRANCHES_KEY });
    } catch {
      toast.error("Failed to delete branch");
    }
    setDeleteId(null);
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
  return {
    branches, loading, editingId, formData, setFormData, searchInput, setSearchInput, autocompleteRef, isLoaded, onMapLoad,
    handleMapClick, onPlaceChanged, handleSubmit, handleDelete, confirmDelete, handleEdit, handleCancelEdit, deleteId, setDeleteId,
  };
}
