import React, { useState, useEffect } from "react";
import axios from "../utils/axios";
import { toast } from "react-toastify";
import Select from "../components/Select";
import InputField from "../components/InputField";
import {
    FaUser,
    FaUserTag,
    FaPhone,
    FaEnvelope,
    FaCalendarAlt,
    FaBriefcase,
    FaMapMarkerAlt,
    FaIdCard,
    FaTimes,
    FaBuilding,
    FaUserCircle,
    FaAddressCard,
    FaUserTie,
    FaRupeeSign,
    FaMoneyBillWave,
} from "react-icons/fa";

const EditUserModal = ({ user, onClose, onSave }) => {
    const token = localStorage.getItem("token");
    const [activeTab, setActiveTab] = useState("basic");
    const [form, setForm] = useState(user || {});
    const [branches, setBranches] = useState([]);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        if (user) {
            // Initialize with all possible fields to ensure controlled inputs
            setForm({
                // Basic Info
                name: user.name || '',
                username: user.username || '',
                mobileNumber: user.mobileNumber || '',
                role: user.role || '',
                jobTitle: user.jobTitle || '',
                
                // Relational
                project: user.project?._id || user.project || "",
                assignedBranches: user.assignedBranches?.map(b => 
                    typeof b === 'object' ? b._id : b
                ) || [],
                
                // Personal Details
                personalEmail: user.personalEmail || '',
                dateOfBirth: user.dateOfBirth || '',
                maritalStatus: user.maritalStatus || '',
                aadhaarNumber: user.aadhaarNumber || '',
                panNumber: user.panNumber || '',
                drivingLicense: user.drivingLicense || '',
                emergencyContact: user.emergencyContact || '',
                address: user.address || '',
                
                // Employee Details
                employeeType: user.employeeType || '',
                dateOfJoining: user.dateOfJoining || '',
                dateOfLeaving: user.dateOfLeaving || '',
                employeeId: user.employeeId || '',
                department: user.department || '',
                
                // Salary Details
                ctcAmount: user.ctcAmount || 0,
                salaryType: user.salaryType || 'monthly',
                salaryEffectiveDate: user.salaryEffectiveDate || '',
                
                // Keep other fields that might exist
                _id: user._id,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                __v: user.__v
            });
        }
        fetchMeta();
    }, [user, user?._id]);

    const fetchMeta = async () => {
        try {
            const [projRes, branchRes] = await Promise.all([
                axios.get("/projects", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get("/branches", { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setProjects(projRes.data || []);
            setBranches(branchRes.data || []);
        } catch (err) {
            console.error("Failed to load meta data", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // ✅ Create payload and exclude password
            const { password, ...updatePayload } = form;
            
            console.log('🔍 [EditUserModal] Form state:', form);
            console.log('📤 [EditUserModal] Sending payload:', updatePayload);
            
            const res = await axios.put(`/users/${user._id}`, updatePayload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            console.log('📥 [EditUserModal] Response data:', res.data);
            
            toast.success("User updated successfully");
            
            // ✅ Pass the updated user back
            if (onSave && res.data) {
                onSave(res.data);
            }
            
            // ✅ Update local form state with response
            setForm({
                ...res.data,
                project: res.data.project?._id || res.data.project || "",
                assignedBranches: res.data.assignedBranches?.map(b => 
                    typeof b === 'object' ? b._id : b
                ) || []
            });
            
        } catch (err) {
            toast.error("Failed to update user");
            console.error('❌ [EditUserModal] Error:', err);
        }
    };

    const TabButton = ({ id, label, icon }) => (
        <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === id
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab(id)}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

 
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn !mt-0">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl transform transition-all animate-slideUp">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <FaUserCircle className="text-orange-500 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Edit User</h2>
                            <p className="text-sm text-gray-500">Update user information</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 px-6 pt-4 border-b border-gray-200">
                    <TabButton id="basic" label="Basic Info" icon={<FaUser size={14} />} />
                    <TabButton id="personal" label="Personal" icon={<FaAddressCard size={14} />} />
                    <TabButton id="employee" label="Employment" icon={<FaBriefcase size={14} />} />
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
                        {activeTab === "basic" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Full Name"
                                        name="name"
                                        icon={<FaUser size={14} />}
                                        placeholder="Enter full name"
                                        value={form.name}
                                        onChange={handleChange}
                                    />
                                    <InputField
                                        label="Username"
                                        name="username"
                                        icon={<FaUserTag size={14} />}
                                        placeholder="Enter username"
                                        value={form.username}
                                        onChange={handleChange}
                                    />
                                    <InputField
                                        label="Mobile Number"
                                        name="mobileNumber"
                                        icon={<FaPhone size={14} />}
                                        placeholder="Enter mobile number"
                                        value={form.mobileNumber}
                                        onChange={handleChange}
                                    />
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Role
                                        </label>
                                        <Select
                                            value={form.role || ""}
                                            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                                            options={[
                                                { value: "admin", label: "Admin" },
                                                { value: "staff", label: "Staff" },
                                                { value: "supervisor", label: "Supervisor" },
                                                { value: "subcontractor", label: "Subcontractor" },
                                                { value: "labour", label: "Labour" },
                                            ]}
                                            icon={<FaUserTie size={14} />}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Project
                                        </label>
                                        <Select
                                            value={form.project?._id || form.project || ""}
                                            onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))}
                                            placeholder="Select Project"
                                            options={projects.map((p) => ({ value: p._id, label: p.name }))}
                                            icon={<FaBuilding size={14} />}
                                        />
                                    </div>
                                </div>

                                {/* Assigned Branches */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Assigned Branches
                                    </label>
                                    <div className="flex flex-wrap gap-2 border border-gray-300 rounded-lg p-3 min-h-[50px] bg-gray-50">
                                        {(form.assignedBranches || []).map((branchItem) => {
                                            const branchId = typeof branchItem === "object" ? branchItem._id : branchItem;
                                            const branch = branches.find((b) => b._id === branchId);
                                            return (
                                                <span
                                                    key={branchId}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                                                >
                                                    <FaMapMarkerAlt size={12} />
                                                    {branch?.name || "Unknown Branch"}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                assignedBranches: prev.assignedBranches.filter(
                                                                    (b) => (typeof b === "object" ? b._id : b) !== branchId
                                                                ),
                                                            }))
                                                        }
                                                        className="ml-1 hover:text-orange-900 font-bold"
                                                    >
                                                        <FaTimes size={12} />
                                                    </button>
                                                </span>
                                            );
                                        })}

                                        <Select
                                            value=""
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (!value) return;
                                                setForm((prev) => ({
                                                    ...prev,
                                                    assignedBranches: [...(prev.assignedBranches || []), value],
                                                }));
                                            }}
                                            placeholder="+ Add Branch"
                                            options={branches
                                                .filter(
                                                    (b) =>
                                                        !(form.assignedBranches || []).some(
                                                            (id) => id === b._id || id._id === b._id
                                                        )
                                                )
                                                .map((b) => ({ value: b._id, label: b.name }))}
                                            icon={<FaMapMarkerAlt size={14} />}
                                            className="flex-1 min-w-[200px]"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "personal" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Personal Email"
                                    name="personalEmail"
                                    type="email"
                                    icon={<FaEnvelope size={14} />}
                                    placeholder="email@example.com"
                                    value={form.personalEmail || ""}
                                    onChange={handleChange}
                                />
                                <InputField
                                    label="Date of Birth"
                                    name="dateOfBirth"
                                    type="date"
                                    icon={<FaCalendarAlt size={14} />}
                                    value={form.dateOfBirth?.split("T")[0] || ""}
                                    onChange={handleChange}
                                />
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Marital Status
                                    </label>
                                    <Select
                                        value={form.maritalStatus || ""}
                                        onChange={(e) => setForm((prev) => ({ ...prev, maritalStatus: e.target.value }))}
                                        options={[
                                            { value: "single", label: "Single" },
                                            { value: "married", label: "Married" },
                                            { value: "other", label: "Other" },
                                        ]}
                                    />
                                </div>

                                <InputField
                                    label="Aadhaar Number"
                                    name="aadhaarNumber"
                                    icon={<FaIdCard size={14} />}
                                    placeholder="XXXX-XXXX-XXXX"
                                    value={form.aadhaarNumber}
                                    onChange={handleChange}
                                />
                                <InputField
                                    label="PAN Number"
                                    name="panNumber"
                                    icon={<FaIdCard size={14} />}
                                    placeholder="ABCDE1234F"
                                    value={form.panNumber}
                                    onChange={handleChange}
                                />
                                <InputField
                                    label="Driving License"
                                    name="drivingLicense"
                                    icon={<FaIdCard size={14} />}
                                    placeholder="DL Number"
                                    value={form.drivingLicense}
                                    onChange={handleChange}
                                />

                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Address
                                    </label>
                                    <textarea
                                        name="address"
                                        value={form.address || ""}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Enter complete address"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <InputField
                                        label="Emergency Contact"
                                        name="emergencyContact"
                                        icon={<FaPhone size={14} />}
                                        placeholder="Emergency contact number"
                                        value={form.emergencyContact}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "employee" && (
                            <div className="space-y-6">
                                {/* Employee Information Section */}
                                <div>
                                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaBriefcase className="text-orange-500" />
                                        Employee Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Employee Type
                                            </label>
                                            <Select
                                                value={form.employeeType || ""}
                                                onChange={(e) => setForm((prev) => ({ ...prev, employeeType: e.target.value }))}
                                                options={[
                                                    { value: "permanent", label: "Permanent" },
                                                    { value: "contract", label: "Contract" },
                                                    { value: "intern", label: "Intern" },
                                                    { value: "consultant", label: "Consultant" },
                                                ]}
                                                icon={<FaBriefcase size={14} />}
                                            />
                                        </div>

                                        <InputField
                                            label="Employee ID"
                                            name="employeeId"
                                            icon={<FaIdCard size={14} />}
                                            placeholder="EMP-001"
                                            value={form.employeeId || ""}
                                            onChange={handleChange}
                                        />
                                        <InputField
                                            label="Department"
                                            name="department"
                                            icon={<FaBuilding size={14} />}
                                            placeholder="e.g., Engineering"
                                            value={form.department || ""}
                                            onChange={handleChange}
                                        />
                                        <InputField
                                            label="Job Title"
                                            name="jobTitle"
                                            icon={<FaUserTie size={14} />}
                                            placeholder="e.g., Electrician"
                                            value={form.jobTitle || ""}
                                            onChange={handleChange}
                                        />
                                        <InputField
                                            label="Date of Joining"
                                            name="dateOfJoining"
                                            type="date"
                                            icon={<FaCalendarAlt size={14} />}
                                            value={form.dateOfJoining?.split("T")[0] || ""}
                                            onChange={handleChange}
                                        />
                                        <InputField
                                            label="Date of Leaving"
                                            name="dateOfLeaving"
                                            type="date"
                                            icon={<FaCalendarAlt size={14} />}
                                            value={form.dateOfLeaving?.split("T")[0] || ""}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Salary Information Section */}
                                <div>
                                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaMoneyBillWave className="text-green-500" />
                                        Salary Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg border border-green-200">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                CTC Amount <span className="text-gray-500 text-xs">(₹)</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                    <FaRupeeSign size={14} />
                                                </div>
                                                <input
                                                    type="number"
                                                    name="ctcAmount"
                                                    value={form.ctcAmount || 0}
                                                    onChange={handleChange}
                                                    placeholder="Enter CTC amount"
                                                    min="0"
                                                    step="1000"
                                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Enter annual CTC in rupees</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Salary Type
                                            </label>
                                            <Select
                                                value={form.salaryType || "monthly"}
                                                onChange={(e) => setForm((prev) => ({ ...prev, salaryType: e.target.value }))}
                                                options={[
                                                    { value: "monthly", label: "Monthly" },
                                                    { value: "weekly", label: "Weekly" },
                                                    { value: "daily", label: "Daily" },
                                                ]}
                                                icon={<FaMoneyBillWave size={14} />}
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <InputField
                                                label="Effective Date of Change"
                                                name="salaryEffectiveDate"
                                                type="date"
                                                icon={<FaCalendarAlt size={14} />}
                                                value={form.salaryEffectiveDate?.split("T")[0] || ""}
                                                onChange={handleChange}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Date when this salary becomes effective (leave blank for current date)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors shadow-md hover:shadow-lg"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;