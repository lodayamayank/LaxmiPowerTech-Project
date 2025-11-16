import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DashboardLayout from '../layouts/DashboardLayout';
import { toast } from 'react-toastify';

let debounceTimeout;

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LocationPicker = ({ onSelect }) => {
    useMapEvents({
        click(e) {
            onSelect(e.latlng);
        },
    });
    return null;
};

const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], 15);
        }
    }, [lat, lng, map]);
    return null;
};

const AdminBranches = () => {
    const [branches, setBranches] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        address: '',
        name: '',
        lat: null,
        lng: null,
        radius: 100,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const fetchBranches = async () => {
        try {
          const res = await axios.get('/branches', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
      
          if (Array.isArray(res.data)) {
            setBranches(res.data);
          } else {
            console.error("Expected array for branches, got:", res.data);
            setBranches([]); // prevent crash
          }
        } catch (err) {
          console.error("Failed to fetch branches:", err);
          setBranches([]); // prevent crash on error
        }
      };
      

    useEffect(() => {
        fetchBranches();
    }, []);

    const reverseGeocode = async (lat, lon) => {
        try {
            const res = await axios.get(`/map/reverse?lat=${lat}&lon=${lon}`);
            return res.data.display_name || '';
        } catch {
            return 'Unknown Location (map selected)';
        }
    };

    const updateLocationWithAddress = async (lat, lon) => {
        const address = await reverseGeocode(lat, lon);
        setFormData((prev) => ({
            ...prev,
            lat: parseFloat(lat),
            lng: parseFloat(lon),
            address,
        }));
    };

    const handleSelectResult = async (result) => {
        setShowDropdown(false);
        setSearchResults([]);
        setSearchQuery(result.display_name);
        await updateLocationWithAddress(result.lat, result.lon);
        toast.success("Location selected!");
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setLoading(true);
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
            try {
                const res = await axios.get(`/map/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.data && res.data.length > 0) {
                    setSearchResults(res.data);
                    setShowDropdown(true);
                } else {
                    setSearchResults([]);
                    setShowDropdown(false);
                }
            } catch (err) {
                console.error("Autocomplete search error:", err);
                toast.error("Autocomplete search failed");
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(debounceTimeout);
    }, [searchQuery]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.lat || !formData.lng) {
            toast.error('Please provide name and location');
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
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
            } else {
                await axios.post('/branches', payload, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
            }

            setFormData({ name: '', lat: null, lng: null, radius: 100, address: '' });
            setEditingId(null);
            fetchBranches();
        } catch (err) {
            console.error('Error saving branch:', err);
            toast.error('Failed to save branch');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this branch?')) return;
        await axios.delete(`/branches/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        fetchBranches();
    };

    const handleEdit = (branch) => {
        setEditingId(branch._id);
        setFormData({
            name: branch.name,
            lat: branch.lat,
            lng: branch.lng,
            radius: branch.radius,
            address: branch.address || '',
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', lat: null, lng: null, radius: 100, address: '' });
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-black">Manage Branches</h2>

                <form onSubmit={handleSubmit} className="bg-white shadow rounded p-4 mb-6">
                    <div className="mb-4">
                        <label className="block font-semibold text-black">Branch Name</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-black">Radius (meters)</label>
                        <input
                            type="number"
                            className="w-full border p-2 rounded"
                            value={formData.radius}
                            onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block font-semibold text-black">Address</label>
                        <input type="text" className="w-full border p-2 rounded bg-gray-100" readOnly value={formData.address || ''} />
                    </div>
                    <p className="text-sm text-gray-500 italic mt-1">
                        Tip: Try searching “Mahim Mumbai” or pin code if full address fails
                    </p>
                    <div className="mb-4">
                        <label className="block font-semibold mb-1 text-black">Search Location</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="Search for a place"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                type="button"
                                className="bg-blue-600 text-white px-4 py-2 rounded"
                                disabled
                            >
                                {loading ? "Searching..." : "Search"}
                            </button>
                        </div>

                        {showDropdown && searchResults.length > 0 && (
                            <ul className="border border-gray-300 rounded shadow bg-white max-h-48 overflow-y-auto">
                                {searchResults.map((item, index) => (
                                    <li
                                        key={index}
                                        className="p-2 hover:bg-blue-100 cursor-pointer text-sm text-black"
                                        onClick={() => handleSelectResult(item)}
                                    >
                                        {item.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <MapContainer
                            center={[formData.lat || -33.8688, formData.lng || 151.2093]}
                            zoom={formData.lat ? 15 : 3}
                            style={{ height: '300px', width: '100%' }}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <LocationPicker onSelect={(latlng) => updateLocationWithAddress(latlng.lat, latlng.lng)} />
                            <RecenterMap lat={formData.lat} lng={formData.lng} />
                            {formData.lat && <Marker position={[formData.lat, formData.lng]} />}
                        </MapContainer>
                    </div>

                    <div className="flex gap-3">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
                            {editingId ? 'Update Branch' : 'Save Branch'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                className="bg-gray-500 text-white px-4 py-2 rounded text-black"
                                onClick={handleCancelEdit}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>

                <div className="bg-white shadow rounded p-4">
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'black' }}>All Branches</h3>
                    <table className="w-full table-auto border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border" style={{ color: 'black' }}>Name</th>
                                <th className="p-2 border" style={{ color: 'black' }}>Radius (m)</th>
                                <th className="p-2 border" style={{ color: 'black' }}>Latitude</th>
                                <th className="p-2 border" style={{ color: 'black' }}>Longitude</th>
                                <th className="p-2 border" style={{ color: 'black' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(branches) &&branches.map((b) => (
                                <tr key={b._id}>
                                    <td className="p-2 border" style={{ color: 'black' }}>{b.name}</td>
                                    <td className="p-2 border" style={{ color: 'black' }}>{b.radius}</td>
                                    <td className="p-2 border" style={{ color: 'black' }}>{b.lat}</td>
                                    <td className="p-2 border" style={{ color: 'black' }}>{b.lng}</td>
                                    <td className="p-2 border">
                                        <button
                                            onClick={() => handleEdit(b)}
                                            className="text-white hover:underline mr-2 bg-orange-500"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(b._id)}
                                            className="text-white hover:underline mr-2 bg-orange-500"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {branches.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-500">
                                        No branches yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminBranches;
