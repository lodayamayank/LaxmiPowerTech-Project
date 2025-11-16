import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { 
  FaEye, 
  FaEyeSlash, 
  FaUserTag, 
  FaUser,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from "react-icons/fa";
import EditUserModal from './EditUserModal';
import Select from '../components/Select';

const AdminMyTeam = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filterRole, setFilterRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editId, setEditId] = useState(null);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: 'default123',
    mobileNumber: '', // ✅ Changed from 'contact' to 'mobileNumber'
    role: 'labour',
    assignedBranches: [],
  });
  const [roleOptions, setRoleOptions] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
    fetchProjects();
    fetchBranches();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
    finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
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

  const fetchRoles = async () => {
    try {
      const res = await axios.get('/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoleOptions(res.data);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.username || !formData.role) {
        alert("Please fill required fields (name, username, role)");
        return;
      }

      const payload = { ...formData };

      // ✅ Fixed password handling
      if (editId) {
        // When editing, only include password if it's been changed
        if (!formData.password || formData.password.trim() === "") {
          delete payload.password;
        } else {
          payload.password = formData.password.trim();
        }
      } else {
        // When creating new user, ensure password is set
        if (!payload.password || payload.password.trim() === "") {
          payload.password = "default123"; // ✅ Use default if empty
        }
      }

      // ✅ Remove project field if not set
      if (!payload.project || payload.project === '') {
        delete payload.project;
      }

      console.log('📤 Sending payload:', payload); // Debug log

      if (editId) {
        await axios.put(`/users/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEditId(null);
        alert('User updated successfully!');
      } else {
        await axios.post(`/users/register`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('User registered successfully!');
      }

      // ✅ Reset form with default password
      setFormData({
        name: "",
        username: "",
        password: "default123", // ✅ Reset to default123 instead of empty
        mobileNumber: "", // ✅ Changed from contact
        role: "labour",
        assignedBranches: [],
      });

      fetchUsers();
    } catch (err) {
      console.error("Error submitting form", err?.response?.data || err.message);
      alert(`Error: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      mobileNumber: user.mobileNumber || '', // ✅ Changed from contact
      role: user.role,
      assignedBranches: user.assignedBranches?.map((b) => b._id) || [],
      project: user.project?._id || '',
    });
    setEditId(user._id);
    setShowPasswordField(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('User deleted successfully!');
      
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user', err);
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter((user) =>
    (!filterRole || user.role === filterRole) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleResetPassword = async (username) => {
    if (!window.confirm(`Reset password for ${username} to default123?`)) return;
    try {
      await axios.post(`/users/reset-password/${username}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Password reset for ${username} to default123`);
    } catch (err) {
      console.error('Failed to reset password', err);
      alert('Error resetting password');
    }
  };

  const handleUserUpdated = (updatedUser) => {
    // Update the users list
    setUsers((prev) =>
        prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
    );
    
    // ✅ Update editingUser so if modal stays open, it shows updated data
    setEditingUser(updatedUser);
    
    // ✅ Optionally close modal after a brief delay to show success
    setTimeout(() => {
        setEditingUser(null);
    }, 500);
};

  if (loading) {
    return <p className="p-4 text-gray-500">Loading users...</p>;
  }

  return (
    <DashboardLayout title="My Team">
      <div className="space-y-4">
        {/* Add/Edit User Form */}
        <div className="bg-white p-4 rounded-xl shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {editId ? 'Edit User' : 'Add New User'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Username *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />

            {editId ? (
              <div className="flex flex-col">
                <label className="text-sm mb-1 text-gray-700">
                  <input
                    type="checkbox"
                    checked={showPasswordField}
                    onChange={() => setShowPasswordField(!showPasswordField)}
                    className="mr-2"
                  />
                  Change Password
                </label>

                {showPasswordField && (
                  <div className="relative">
                    <input
                      className="border rounded-lg px-3 py-2 w-full pr-10"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  className="border rounded-lg px-3 py-2 w-full pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (default: default123)"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            )}

            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Mobile Number"
              value={formData.mobileNumber} // ✅ Changed from contact
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} // ✅ Changed
            />

            <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={Array.isArray(roleOptions) ? roleOptions.map((r) => {
                const role = typeof r === 'string' ? r : r.role || '';
                return {
                  value: role,
                  label: role.charAt(0).toUpperCase() + role.slice(1)
                };
              }) : []}
              icon={<FaUserTag size={14} />}
            />

            {formData.role !== 'admin' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Branches</label>
                <select
                  multiple
                  value={formData.assignedBranches}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assignedBranches: Array.from(e.target.selectedOptions, (opt) => opt.value),
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2 h-40"
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple.</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              {editId ? 'Update User' : 'Add User'}
            </button>

            <button
              onClick={() => {
                setEditId(null);
                setFormData({
                  name: '',
                  username: '',
                  password: 'default123', // ✅ Reset to default
                  mobileNumber: '', // ✅ Changed from contact
                  role: 'labour',
                  assignedBranches: [],
                });
                setShowPasswordField(false);
                setShowPassword(false);
              }}
              className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-xl shadow">
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            placeholder="All Roles"
            options={roleOptions.map((role) => ({
              value: role,
              label: role.charAt(0).toUpperCase() + role.slice(1)
            }))}
            icon={<FaUser size={14} />}
          />

          <input
            type="text"
            placeholder="Search by name or username"
            className="border rounded-lg px-3 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Results Info & Items Per Page */}
        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl shadow">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(endIndex, totalItems)}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalItems}</span> users
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Username</th>
                <th className="text-left px-4 py-2">Mobile</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={5}>
                    No users found
                  </td>
                </tr>
              ) : (
                currentItems.map((user) => (
                  <tr key={user._id} className="border-t">
                    <td className="px-4 py-2 font-medium">{user.name}</td>
                    <td className="px-4 py-2">{user.username}</td>
                    <td className="px-4 py-2">{user.mobileNumber || '—'}</td>
                    <td className="px-4 py-2 capitalize">{user.role}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => setEditingUser(user)}
                        >
                          View/Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDelete(user._id)}
                        >
                          Delete
                        </button>
                        <button
                          className="text-orange-600 hover:underline"
                          onClick={() => handleResetPassword(user.username)}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 py-3 rounded-xl shadow">
            <div className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First Page"
              >
                <FaAngleDoubleLeft size={14} />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <FaChevronLeft size={14} />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              {/* Next Page */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <FaChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last Page"
              >
                <FaAngleDoubleRight size={14} />
              </button>
            </div>
          </div>
        )}

        {editingUser && (
          <EditUserModal
            user={editingUser}
            branches={branches}
            projects={projects}
            onClose={() => setEditingUser(null)}
            onSave={handleUserUpdated}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminMyTeam;