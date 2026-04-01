import { useEffect, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import { toast } from "react-toastify";
import { FaPlus, FaFilter, FaSearch, FaTimes } from "react-icons/fa";

const StatusPill = ({ value }) => {
  const statusColors = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    "on-hold": "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    triggered: "bg-purple-100 text-purple-700",
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || "bg-gray-100 text-gray-700"}`}>
      {value || "N/A"}
    </span>
  );
};

export default function ManageWorkOrder() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [showAddBillForm, setShowAddBillForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const [formData, setFormData] = useState({
    workOrderNo: "",
    workOrderName: "",
    workOrderDate: new Date().toISOString().split('T')[0],
    totalValue: "",
    description: "",
  });
  const [billFormData, setBillFormData] = useState({
    billNo: "",
    billDate: new Date().toISOString().split('T')[0],
    totalBillValue: "",
    retentionAmount: "",
    holdingAmount: "",
    notes: "",
  });

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data || []);
      
      // Auto-select first project if available
      if (res.data && res.data.length > 0) {
        setSelectedProject(res.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const fetchWorkOrders = async (overrideFilters) => {
    if (!selectedProject) {
      return;
    }

    setLoading(true);
    try {
      const activeFilters = overrideFilters !== undefined ? overrideFilters : filters;
      const params = {
        project: selectedProject,
        ...activeFilters,
      };
      
      const res = await axios.get("/work-orders", { params });
      setWorkOrders(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchWorkOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const handleAddWorkOrder = () => {
    if (!selectedProject) {
      toast.warning("Please select a project first");
      return;
    }
    setShowAddModal(true);
    // Reset form
    setFormData({
      workOrderNo: "",
      workOrderName: "",
      workOrderDate: new Date().toISOString().split('T')[0],
      totalValue: "",
      description: "",
    });
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData({
      workOrderNo: "",
      workOrderName: "",
      workOrderDate: new Date().toISOString().split('T')[0],
      totalValue: "",
      description: "",
    });
  };

  const validateForm = () => {
    if (!formData.workOrderNo.trim()) {
      toast.error("Work Order Number is required");
      return false;
    }
    if (!formData.workOrderName.trim()) {
      toast.error("Work Order Name is required");
      return false;
    }
    if (!formData.totalValue || parseFloat(formData.totalValue) <= 0) {
      toast.error("Total Work Order Value must be greater than 0");
      return false;
    }
    if (!formData.workOrderDate) {
      toast.error("Work Order Date is required");
      return false;
    }
    return true;
  };

  const handleSubmitWorkOrder = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        project: selectedProject,
        workOrderNo: formData.workOrderNo.trim(),
        workOrderName: formData.workOrderName.trim(),
        workOrderDate: formData.workOrderDate,
        totalValue: parseFloat(formData.totalValue),
        description: formData.description.trim(),
        status: "active",
        totalBillsAmount: 0,
      };

      await axios.post("/work-orders", payload);
      
      toast.success("Work Order created successfully!");
      handleCloseModal();
      fetchWorkOrders(); // Refresh list
    } catch (error) {
      console.error("Error creating work order:", error);
      toast.error(error.response?.data?.message || "Failed to create work order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewBills = async (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowBillsModal(true);
    setShowAddBillForm(false);
    await fetchBills(workOrder._id);
  };

  const fetchBills = async (workOrderId) => {
    setLoadingBills(true);
    try {
      const res = await axios.get(`/work-orders/${workOrderId}/bills`);
      setBills(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching bills:", error);
      // Don't show error toast for now since endpoint doesn't exist yet
      setBills([]);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleCloseBillsModal = () => {
    setShowBillsModal(false);
    setShowAddBillForm(false);
    setSelectedWorkOrder(null);
    setBills([]);
    setBillFormData({
      billNo: "",
      billDate: new Date().toISOString().split('T')[0],
      totalBillValue: "",
      retentionAmount: "",
      holdingAmount: "",
      notes: "",
    });
  };

  const handleAddBillClick = () => {
    setShowAddBillForm(true);
    setBillFormData({
      billNo: "",
      billDate: new Date().toISOString().split('T')[0],
      totalBillValue: "",
      retentionAmount: "",
      holdingAmount: "",
      notes: "",
    });
  };

  const handleCancelAddBill = () => {
    setShowAddBillForm(false);
    setBillFormData({
      billNo: "",
      billDate: new Date().toISOString().split('T')[0],
      totalBillValue: "",
      retentionAmount: "",
      holdingAmount: "",
      notes: "",
    });
  };

  const validateBillForm = () => {
    if (!billFormData.billNo.trim()) {
      toast.error("Bill Number is required");
      return false;
    }
    if (!billFormData.billDate) {
      toast.error("Bill Date is required");
      return false;
    }
    if (!billFormData.totalBillValue || parseFloat(billFormData.totalBillValue) <= 0) {
      toast.error("Total Bill Value must be greater than 0");
      return false;
    }

    // CRITICAL BUSINESS RULE: Check if total bills would exceed Work Order total value
    const newBillValue = parseFloat(billFormData.totalBillValue);
    const currentTotalBills = selectedWorkOrder?.totalBillsAmount || 0;
    const workOrderTotalValue = selectedWorkOrder?.totalValue || 0;
    const remainingAmount = workOrderTotalValue - currentTotalBills;

    if (newBillValue > remainingAmount) {
      toast.error(
        `Total bill amount cannot exceed Work Order Total Value.\n\n` +
        `Work Order Total: ₹${workOrderTotalValue.toLocaleString('en-IN')}\n` +
        `Already Billed: ₹${currentTotalBills.toLocaleString('en-IN')}\n` +
        `Remaining: ₹${remainingAmount.toLocaleString('en-IN')}\n` +
        `Your Bill: ₹${newBillValue.toLocaleString('en-IN')}`,
        { autoClose: 5000 }
      );
      return false;
    }

    return true;
  };

  const handleSubmitBill = async (e) => {
    e.preventDefault();
    
    if (!validateBillForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        billNo: billFormData.billNo.trim(),
        billDate: billFormData.billDate,
        totalBillValue: parseFloat(billFormData.totalBillValue),
        retentionAmount: parseFloat(billFormData.retentionAmount) || 0,
        holdingAmount: parseFloat(billFormData.holdingAmount) || 0,
        notes: billFormData.notes.trim(),
      };

      await axios.post(`/work-orders/${selectedWorkOrder._id}/bills`, payload);
      
      toast.success("Bill added successfully!");
      handleCancelAddBill();

      // Refresh bills list
      await fetchBills(selectedWorkOrder._id);

      // Refresh work orders list in background
      fetchWorkOrders();

      // Fetch updated work order directly to avoid stale state issue
      try {
        const woRes = await axios.get(`/work-orders/${selectedWorkOrder._id}`);
        if (woRes.data?.data) {
          setSelectedWorkOrder(woRes.data.data);
        }
      } catch {
        // Silently ignore - modal still shows refreshed bills
      }
    } catch (error) {
      console.error("Error adding bill:", error);
      toast.error(error.response?.data?.message || "Failed to add bill");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = () => {
    fetchWorkOrders();
  };

  const clearFilters = () => {
    const reset = { status: "", search: "" };
    setFilters(reset);
    fetchWorkOrders(reset);
  };

  const handleTriggerWorkOrder = async (order) => {
    const confirmed = window.confirm(
      `Are you sure you want to TRIGGER Work Order "${order.workOrderNo}"?\n\nOnce triggered:\n- This Work Order will be LOCKED\n- No new bills can be added\n- No edits allowed\n\nThis action CANNOT be undone.`
    );
    if (!confirmed) return;

    try {
      await axios.patch(`/work-orders/${order._id}/trigger`);
      toast.success(`Work Order "${order.workOrderNo}" has been triggered and locked.`);
      fetchWorkOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to trigger work order");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Manage Work Orders</h1>
          <p className="text-gray-600 text-sm mt-1">Create, manage, and track work orders</p>
        </div>

        {/* Top Section - Project Dropdown and Add Button */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Project Dropdown */}
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="">-- Select Project --</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Work Order Button */}
            <div className="w-full sm:w-auto sm:mt-6">
              <button
                onClick={handleAddWorkOrder}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FaPlus />
                Add Work Order
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FaFilter className="text-orange-500" />
              Filters
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-orange-500 hover:text-orange-600 text-sm font-medium"
            >
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Work Order No, Name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="col-span-1 sm:col-span-2 flex gap-2">
                <button
                  onClick={handleSearch}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <FaSearch />
                  Search
                </button>
                <button
                  onClick={clearFilters}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Work Order List/Table Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Work Orders</h2>

          {!selectedProject ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Please select a project to view work orders</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <p className="text-gray-500 mt-2">Loading work orders...</p>
            </div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No work orders found</p>
              <p className="text-gray-400 text-sm">Click "Add Work Order" to create your first work order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Order No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Order Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Work Order Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Bills Amount Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Number of Bills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.workOrderNo || order.workOrderId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.workOrderName || order.name || order.title || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ₹{order.totalValue?.toLocaleString('en-IN') || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹{order.totalBillsAmount?.toLocaleString('en-IN') || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <span className={`${
                          (order.totalValue - (order.totalBillsAmount || 0)) < 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          ₹{((order.totalValue || 0) - (order.totalBillsAmount || 0)).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                          {order.billsCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusPill value={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleViewBills(order)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-medium transition-colors text-xs"
                          >
                            View Bills
                          </button>
                          {order.isTriggered ? (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-2 rounded-lg">
                              🔒 Triggered
                            </span>
                          ) : (
                            <button
                              onClick={() => handleTriggerWorkOrder(order)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-xs"
                            >
                              Trigger WO
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Work Order Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Create Work Order</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitWorkOrder} className="p-6">
                <div className="space-y-4">
                  {/* Project (Display Only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={projects.find(p => p._id === selectedProject)?.name || ""}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  {/* Work Order Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Order Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Work Order Number (e.g., WO001)"
                      value={formData.workOrderNo}
                      onChange={(e) => setFormData({ ...formData, workOrderNo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      required
                    />
                  </div>

                  {/* Work Order Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Order Name / Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Work Order Name"
                      value={formData.workOrderName}
                      onChange={(e) => setFormData({ ...formData, workOrderName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      required
                    />
                  </div>

                  {/* Work Order Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Order Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.workOrderDate}
                      onChange={(e) => setFormData({ ...formData, workOrderDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      required
                    />
                  </div>

                  {/* Total Work Order Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Work Order Value (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Enter Total Value"
                      value={formData.totalValue}
                      onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      min="1"
                      step="0.01"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be the maximum billing limit for this work order
                    </p>
                  </div>

                  {/* Description / Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description / Notes
                    </label>
                    <textarea
                      placeholder="Enter description or notes (optional)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    {submitting ? "Creating..." : "+ Add Work Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bills Management Modal */}
        {showBillsModal && selectedWorkOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Manage Bills</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Work Order: {selectedWorkOrder.workOrderNo} - {selectedWorkOrder.workOrderName}
                  </p>
                </div>
                <button
                  onClick={handleCloseBillsModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {/* Triggered Lock Banner */}
              {selectedWorkOrder.isTriggered && (
                <div className="px-6 py-3 bg-purple-50 border-b border-purple-200 flex items-center gap-3">
                  <span className="text-purple-700 text-lg">🔒</span>
                  <div>
                    <p className="text-sm font-semibold text-purple-800">This Work Order is Triggered and Locked</p>
                    <p className="text-xs text-purple-600">No new bills can be added. All data is read-only.</p>
                  </div>
                </div>
              )}

              {/* Work Order Summary */}
              <div className="p-6 bg-blue-50 border-b border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Work Order Value</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{selectedWorkOrder.totalValue?.toLocaleString('en-IN') || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Bills Amount</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₹{selectedWorkOrder.totalBillsAmount?.toLocaleString('en-IN') || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Remaining Amount</p>
                    <p className={`text-lg font-bold ${
                      (selectedWorkOrder.totalValue - (selectedWorkOrder.totalBillsAmount || 0)) < 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      ₹{((selectedWorkOrder.totalValue || 0) - (selectedWorkOrder.totalBillsAmount || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Number of Bills</p>
                    <p className="text-lg font-bold text-gray-900">
                      {bills.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Add Bill Button — hidden when triggered */}
                {!showAddBillForm && (
                  <div className="mb-6">
                    {selectedWorkOrder.isTriggered ? (
                      <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium px-4 py-2 rounded-lg">
                        🔒 Work Order is locked — adding bills is disabled
                      </div>
                    ) : (
                      <button
                        onClick={handleAddBillClick}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        disabled={loadingBills}
                      >
                        <FaPlus />
                        Add Bill
                      </button>
                    )}
                  </div>
                )}

                {/* Add Bill Form */}
                {showAddBillForm && (
                  <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Bill</h3>
                    <form onSubmit={handleSubmitBill}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bill No */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bill No <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter Bill Number"
                            value={billFormData.billNo}
                            onChange={(e) => setBillFormData({ ...billFormData, billNo: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            required
                          />
                        </div>

                        {/* Bill Date */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bill Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={billFormData.billDate}
                            onChange={(e) => setBillFormData({ ...billFormData, billDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            required
                          />
                        </div>

                        {/* Total Bill Value */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Bill Value (₹) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="Enter Bill Amount"
                            value={billFormData.totalBillValue}
                            onChange={(e) => setBillFormData({ ...billFormData, totalBillValue: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            min="1"
                            step="0.01"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Remaining: ₹{((selectedWorkOrder.totalValue || 0) - (selectedWorkOrder.totalBillsAmount || 0)).toLocaleString('en-IN')}
                          </p>
                        </div>

                        {/* Retention Amount */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Retention Amount (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="Enter Retention Amount"
                            value={billFormData.retentionAmount}
                            onChange={(e) => setBillFormData({ ...billFormData, retentionAmount: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {/* Holding Amount */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Holding Amount (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="Enter Holding Amount"
                            value={billFormData.holdingAmount}
                            onChange={(e) => setBillFormData({ ...billFormData, holdingAmount: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            placeholder="Enter notes (optional)"
                            value={billFormData.notes}
                            onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                          />
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex gap-3 mt-4">
                        <button
                          type="button"
                          onClick={handleCancelAddBill}
                          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={submitting}
                        >
                          {submitting ? "Adding..." : "Add Bill"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Bills List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Bills List</h3>
                  
                  {loadingBills ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                      <p className="text-gray-500 mt-2">Loading bills...</p>
                    </div>
                  ) : bills.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No bills found</p>
                      <p className="text-gray-400 text-sm mt-1">Click "Add Bill" to create the first bill</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bill No
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bill Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Retention
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Holding
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bills.map((bill, index) => (
                            <tr key={bill._id || index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {bill.billNo}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                ₹{bill.totalBillValue?.toLocaleString('en-IN') || '0'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₹{bill.retentionAmount?.toLocaleString('en-IN') || '0'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₹{bill.holdingAmount?.toLocaleString('en-IN') || '0'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {bill.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={handleCloseBillsModal}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
