// src/pages/projects/components/useWorkOrders.js
// All data, requests, validations and handlers of the Work orders page, moved here from ManageWorkOrder.jsx
// UNCHANGED, except that getRetentionState returns a badge tone name where it used to return Tailwind classes.
import { useEffect, useState } from 'react';
import { fetchProjectsCached } from '@/hooks/useProjects';
import axios from '@/api/client';
import { toast } from 'sonner';

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyWorkOrderForm = () => ({
  workOrderNo: "",
  workOrderName: "",
  workOrderDate: todayISO(),
  totalValue: "",
  description: "",
});

const emptyBillForm = () => ({
  billNo: "",
  billDate: todayISO(),
  totalBillValue: "",
  retentionAmount: "",
  holdingAmount: "",
  notes: "",
});

export default function useWorkOrders() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [showAddBillForm, setShowAddBillForm] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [triggerWorkOrder, setTriggerWorkOrder] = useState(null);
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const [formData, setFormData] = useState(emptyWorkOrderForm());
  const [billFormData, setBillFormData] = useState(emptyBillForm());
  const [triggerFormData, setTriggerFormData] = useState({
    retentionAmount: "",
    retentionDueDate: "",
    retentionNotes: "",
  });

  const formatCurrency = (value) =>
    `₹${(Number(value) || 0).toLocaleString("en-IN")}`;

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const subtractOneMonth = (dateValue) => {
    const date = new Date(dateValue);
    const originalDay = date.getDate();
    date.setMonth(date.getMonth() - 1);
    if (date.getDate() !== originalDay) {
      date.setDate(0);
    }
    return date.toISOString().split("T")[0];
  };

  const getDateAfterMonths = (months) => {
    const date = new Date();
    const originalDay = date.getDate();
    date.setMonth(date.getMonth() + months);
    if (date.getDate() !== originalDay) {
      date.setDate(0);
    }
    return date.toISOString().split("T")[0];
  };

  const getRetentionState = (order) => {
    if (
      !order?.isTriggered ||
      !order.retentionAmount ||
      !order.retentionDueDate
    ) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(order.retentionDueDate);
    dueDate.setHours(0, 0, 0, 0);
    const reminderDate = new Date(
      order.retentionReminderDate || subtractOneMonth(order.retentionDueDate)
    );
    reminderDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      return {
        label: "Retention Overdue",
        tone: "bad",
        isNotifiable: true,
      };
    }
    if (today >= reminderDate) {
      return {
        label: "Retention Due Soon",
        tone: "warn",
        isNotifiable: true,
      };
    }
    return {
      label: "Reminder Scheduled",
      tone: "info",
      isNotifiable: false,
    };
  };


  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = { data: await fetchProjectsCached() };
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
      const activeFilters =
        overrideFilters !== undefined ? overrideFilters : filters;
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

  useEffect(() => {
    const notifiableOrders = workOrders.filter(
      (order) => getRetentionState(order)?.isNotifiable
    );
    notifiableOrders.slice(0, 3).forEach((order) => {
      const retentionState = getRetentionState(order);
      toast.warning(
        `${order.workOrderName || order.workOrderNo}: ${
          retentionState.label
        }. Pay ${formatCurrency(order.retentionAmount)} by ${formatDate(
          order.retentionDueDate
        )}.`,
        { id: `retention-${order._id}`, duration: 8000 }
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders]);

  const handleAddWorkOrder = () => {
    if (!selectedProject) {
      toast.warning("Please select a project first");
      return;
    }
    setFormData(emptyWorkOrderForm());
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData(emptyWorkOrderForm());
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
      toast.error(
        error.response?.data?.message || "Failed to create work order"
      );
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
    setBillFormData(emptyBillForm());
  };

  const handleAddBillClick = () => {
    setShowAddBillForm(true);
    setBillFormData(emptyBillForm());
  };

  const handleCancelAddBill = () => {
    setShowAddBillForm(false);
    setBillFormData(emptyBillForm());
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
    if (
      !billFormData.totalBillValue ||
      parseFloat(billFormData.totalBillValue) <= 0
    ) {
      toast.error("Total Bill Value must be greater than 0");
      return false;
    }

    // CRITICAL BUSINESS RULE: Check if total bills would exceed Work Order total value
    const newBillValue = parseFloat(billFormData.totalBillValue);
    const currentTotalBills = selectedWorkOrder?.totalBillsAmount || 0;
    const workOrderTotalValue = selectedWorkOrder?.totalValue || 0;
    const remainingAmount = workOrderTotalValue - currentTotalBills;

    if (newBillValue > remainingAmount) {
      toast.error("Total bill amount cannot exceed Work Order Total Value", {
        description: (
          <div className="space-y-0.5">
            <div>
              Work Order Total: ₹{workOrderTotalValue.toLocaleString("en-IN")}
            </div>
            <div>
              Already Billed: ₹{currentTotalBills.toLocaleString("en-IN")}
            </div>
            <div>Remaining: ₹{remainingAmount.toLocaleString("en-IN")}</div>
            <div>Your Bill: ₹{newBillValue.toLocaleString("en-IN")}</div>
          </div>
        ),
        duration: 5000,
      });
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

  const openTriggerModal = (order) => {
    setTriggerWorkOrder(order);
    setTriggerFormData({
      retentionAmount: "",
      retentionDueDate: getDateAfterMonths(12),
      retentionNotes: "",
    });
    setShowTriggerModal(true);
  };

  const closeTriggerModal = () => {
    setShowTriggerModal(false);
    setTriggerWorkOrder(null);
    setTriggerFormData({
      retentionAmount: "",
      retentionDueDate: "",
      retentionNotes: "",
    });
  };

  const validateTriggerForm = () => {
    const amount = Number(triggerFormData.retentionAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Retention amount must be greater than 0");
      return false;
    }

    if (!triggerFormData.retentionDueDate) {
      toast.error("Retention due date is required");
      return false;
    }

    return true;
  };

  const handleTriggerWorkOrder = async (e) => {
    e.preventDefault();

    if (!triggerWorkOrder || !validateTriggerForm()) return;

    try {
      setSubmitting(true);
      await axios.patch(`/work-orders/${triggerWorkOrder._id}/trigger`, {
        retentionAmount: Number(triggerFormData.retentionAmount),
        retentionDueDate: triggerFormData.retentionDueDate,
        retentionNotes: triggerFormData.retentionNotes.trim(),
      });
      toast.success(
        `Work Order "${triggerWorkOrder.workOrderNo}" has been triggered and locked.`
      );
      closeTriggerModal();
      fetchWorkOrders();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to trigger work order"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remainingFor = (order) =>
    (order?.totalValue || 0) - (order?.totalBillsAmount || 0);
  return {
    projects, selectedProject, setSelectedProject, workOrders, loading,
    showAddModal, showBillsModal, showAddBillForm, showTriggerModal, submitting,
    selectedWorkOrder, triggerWorkOrder, bills, loadingBills, filters, setFilters,
    formData, setFormData, billFormData, setBillFormData, triggerFormData, setTriggerFormData,
    formatCurrency, formatDate, subtractOneMonth, getDateAfterMonths, getRetentionState, remainingFor,
    handleAddWorkOrder, handleCloseModal, handleSubmitWorkOrder, handleViewBills, handleCloseBillsModal,
    handleAddBillClick, handleCancelAddBill, handleSubmitBill, handleSearch, clearFilters,
    openTriggerModal, closeTriggerModal, handleTriggerWorkOrder,
  };
}
