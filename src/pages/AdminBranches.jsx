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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

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
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Branches</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{branches.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                  <FaBuilding className="text-orange-600 dark:text-orange-400" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {editingId ? "Edit Branch" : "Add New Branch"}
            </CardTitle>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Cancel"
              >
                <FaTimes size={16} />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block mb-1.5 font-semibold">
                    Branch Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                      type="text"
                      className="pl-10"
                      placeholder="Enter branch name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="block mb-1.5 font-semibold">
                    Radius (meters) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <FaRulerCombined className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                      type="number"
                      className="pl-10"
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
                <Label className="block mb-1.5 font-semibold">Address</Label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input
                    type="text"
                    className="pl-10 bg-gray-50 dark:bg-gray-800"
                    readOnly
                    value={formData.address || "Select location on map or search below"}
                  />
                </div>
              </div>

              <div>
                <Label className="block mb-1.5 font-semibold">
                  Search Location <span className="text-destructive">*</span>
                </Label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(ac) => (autocompleteRef.current = ac)}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <div className="relative">
                      <FaSearchLocation className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input
                        type="text"
                        className="pl-10"
                        placeholder="Search for a place or address"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                    </div>
                  </Autocomplete>
                ) : (
                  <Input
                    type="text"
                    className="bg-gray-50 dark:bg-gray-800"
                    placeholder="Loading Google Maps..."
                    disabled
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  💡 Tip: Try searching "Mahim Mumbai" or a PIN code if the full address fails.
                </p>
              </div>

              <div>
                <Label className="block mb-1.5 font-semibold">
                  Select Location on Map
                </Label>
                {isLoaded && (
                  <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
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

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
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
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Branches Table */}
        <Card>
          <CardHeader className="border-b border-gray-100 dark:border-gray-700">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Branches List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Manage your existing branches</p>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Name</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Address</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Radius (m)</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Coordinates</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : branches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No branches found. Add your first branch above.
                    </TableCell>
                  </TableRow>
                ) : (
                  branches.map((b) => (
                    <TableRow key={b._id} className="dark:border-gray-700 dark:hover:bg-gray-700/60">
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {b.address || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.radius}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {b.lat?.toFixed(6)}, {b.lng?.toFixed(6)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(b)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 font-medium"
                          >
                            <FaEdit size={14} />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(b._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1 font-medium"
                          >
                            <FaTrash size={14} />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminBranches;