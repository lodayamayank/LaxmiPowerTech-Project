import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import SmartTowerBuilder from '../components/SmartTowerBuilder';
import {
  FaProjectDiagram,
  FaMapMarkerAlt,
  FaBuilding,
  FaEdit,
  FaTrash,
  FaPlus,
  FaTimes,
  FaCheck
} from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CreateProject = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    branches: [],
    buildings: [],
  });
  const [projects, setProjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/branches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBranches(res.data);
    } catch (err) {
      console.error('Failed to fetch branches', err);
    }
  };


  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.address) {
        alert('Please fill in all required fields');
        return;
      }

      if (formData.buildings.length === 0) {
        alert('Please add at least one tower with floors and flats');
        return;
      }

      // Count total flats for validation
      const totalFlats = formData.buildings.reduce((sum, tower) => {
        return sum + (tower.wings?.[0]?.floors?.reduce((fSum, floor) => 
          fSum + (floor.flats?.length || 0), 0) || 0);
      }, 0);

      if (totalFlats === 0) {
        alert('Please add at least one flat to your project structure');
        return;
      }

      // Warn if structure is very large
      if (totalFlats > 5000) {
        const confirmed = window.confirm(
          `This project has ${totalFlats.toLocaleString()} flats. This is a large structure. Continue?`
        );
        if (!confirmed) return;
      }

      const projectData = {
        ...formData,
        buildings: formData.buildings
      };

      if (editingId) {
        await axios.put(`/projects/${editingId}`, projectData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Project updated successfully!');
      } else {
        await axios.post('/projects', projectData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Project created successfully!');
      }
      setFormData({ name: '', address: '', branches: [], buildings: [] });
      setEditingId(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to save project', err);
      if (err.response?.status === 413) {
        alert('Project structure too large. Please reduce the number of floors, flats, or buildings.');
      } else {
        alert(err.response?.data?.message || 'Failed to save project');
      }
    }
  };

  const handleEdit = (project) => {
    setFormData({
      name: project.name,
      address: project.address,
      branches: project.branches?.map((b) => b._id) || [],
      buildings: project.buildings || [],
    });
    setEditingId(project._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({ name: '', address: '', branches: [], buildings: [] });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await axios.delete(`/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchProjects();
      } catch (err) {
        console.error('Failed to delete project', err);
        alert('Failed to delete project');
      }
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchBranches();
  }, []);

  const totalBranches = projects.reduce((acc, proj) => acc + (proj.branches?.length || 0), 0);

  return (
    <DashboardLayout title="Projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Project Management</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage your projects</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Projects</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{projects.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FaProjectDiagram className="text-orange-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Branches</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{totalBranches}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FaBuilding className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Available Branches</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{branches.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaMapMarkerAlt className="text-green-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? 'Edit Project' : 'Create New Project'}
            </h2>
            {editingId && (
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cancel"
              >
                <FaTimes size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Project Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaProjectDiagram size={14} />
                </div>
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaMapMarkerAlt size={14} />
                </div>
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Enter project address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Assign Branches
              </label>
              <select
                multiple
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-40 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={formData.branches}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branches: Array.from(e.target.selectedOptions, (opt) => opt.value),
                  })
                }
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Hold Ctrl (Cmd on Mac) to select multiple branches
              </p>
            </div>
          </div>

          {/* Smart Tower Builder */}
          <div className="mt-6">
            <SmartTowerBuilder
              buildings={formData.buildings}
              onChange={(buildings) => setFormData({ ...formData, buildings })}
            />
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button
              onClick={handleSubmit}
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
            >
              {editingId ? (
                <>
                  <FaCheck size={14} />
                  Update Project
                </>
              ) : (
                <>
                  <FaPlus size={14} />
                  Create Project
                </>
              )}
            </Button>

            {editingId && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Projects List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your existing projects</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Project Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Address</th>
                  <th className="text-left px-6 py-3 font-semibold">Branches</th>
                  <th className="text-left px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-6 text-center text-gray-500">
                      Loading projects...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-6 text-center text-gray-500">
                      No projects found. Create your first project above.
                    </td>
                  </tr>
                ) : (
                  projects.map((proj) => (
                    <tr key={proj._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{proj.name}</td>
                      <td className="px-6 py-4 text-gray-600">{proj.address}</td>
                      <td className="px-6 py-4">
                        {proj.branches?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {proj.branches.map((b, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                              >
                                <FaMapMarkerAlt size={10} />
                                {b.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            onClick={() => handleEdit(proj)}
                            title="Edit"
                          >
                            <FaEdit size={14} />
                            Edit
                          </button>
                          <button
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium transition-colors"
                            onClick={() => handleDelete(proj._id)}
                            title="Delete"
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

export default CreateProject;