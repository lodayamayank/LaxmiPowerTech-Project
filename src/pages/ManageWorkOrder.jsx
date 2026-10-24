import { useEffect, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import { toast } from "sonner";
import { FaPlus, FaFilter, FaSearch } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// shadcn SelectItem can't use value="", so "All" options use a sentinel
const ALL = "all";

const thClass =
  "h-auto px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const orangeFocus =
  "focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30";
const purpleFocus =
  "focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/30";

const StatusPill = ({ value }) => {
  const statusColors = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    "on-hold": "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    triggered: "bg-purple-100 text-purple-700",
  };

  return (
    <Badge
      variant="outline"
      className={`border-transparent ${
        statusColors[value] || "bg-gray-100 text-gray-700"
      }`}
    >
      {value || "N/A"}
    </Badge>
  );
};

const FieldSelect = ({
  id,
  value,
  onValueChange,
  placeholder,
  items,
  disabled = false,
}) => (
  <Select value={value || ""} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger
      id={id}
      className={`w-full text-sm data-[size=default]:h-10 ${orangeFocus}`}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

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

export default function ManageWorkOrder() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
        color: "bg-red-100 text-red-700",
        isNotifiable: true,
      };
    }
    if (today >= reminderDate) {
      return {
        label: "Retention Due Soon",
        color: "bg-yellow-100 text-yellow-700",
        isNotifiable: true,
      };
    }
    return {
      label: "Reminder Scheduled",
      color: "bg-blue-100 text-blue-700",
      isNotifiable: false,
    };
  };

  const RetentionBadge = ({ order, fallback }) => {
    const state = getRetentionState(order);
    return (
      <Badge
        variant="outline"
        className={`border-transparent ${
          state?.color || "bg-gray-100 text-gray-700"
        }`}
      >
        {state?.label || fallback}
      </Badge>
    );
  };

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

  return (
    <DashboardLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Manage Work Orders
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Create, manage, and track work orders
          </p>
        </div>

        {/* Top Section - Project Dropdown and Add Button */}
        <Card className="gap-0 py-0 mb-6 rounded-lg shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
              <div className="flex-1 w-full sm:max-w-md">
                <Label
                  htmlFor="wo-project-select"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select Project
                </Label>
                <FieldSelect
                  id="wo-project-select"
                  value={selectedProject}
                  placeholder="-- Select Project --"
                  items={projects.map((p) => ({ value: p._id, label: p.name }))}
                  onValueChange={setSelectedProject}
                />
              </div>

              <Button
                onClick={handleAddWorkOrder}
                className="w-full sm:w-auto h-10 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <FaPlus />
                Add Work Order
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters Section */}
        <Card className="gap-0 py-0 mb-6 rounded-lg shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaFilter className="text-orange-500" />
                Filters
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-orange-500"
              >
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <Label htmlFor="wo-filter-search" className={labelClass}>
                    Search
                  </Label>
                  <Input
                    id="wo-filter-search"
                    type="text"
                    placeholder="Work Order No, Name..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className={`w-full h-10 text-sm ${orangeFocus}`}
                  />
                </div>

                <div>
                  <Label htmlFor="wo-filter-status" className={labelClass}>
                    Status
                  </Label>
                  <FieldSelect
                    id="wo-filter-status"
                    value={filters.status || ALL}
                    placeholder="All Status"
                    items={[
                      { value: ALL, label: "All Status" },
                      { value: "active", label: "Active" },
                      { value: "completed", label: "Completed" },
                      { value: "on-hold", label: "On Hold" },
                      { value: "cancelled", label: "Cancelled" },
                      { value: "triggered", label: "Triggered" },
                    ]}
                    onValueChange={(val) =>
                      setFilters({ ...filters, status: val === ALL ? "" : val })
                    }
                  />
                </div>

                <div className="sm:col-span-2 flex gap-2">
                  <Button
                    onClick={handleSearch}
                    className="h-10 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <FaSearch />
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Order List/Table Section */}
        <Card className="gap-0 py-0 rounded-lg shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Work Orders
            </h2>

            {!selectedProject ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Please select a project to view work orders
                </p>
              </div>
            ) : loading ? (
              <div className="space-y-3" aria-label="Loading work orders">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : workOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">No work orders found</p>
                <p className="text-gray-400 text-sm">
                  Click "Add Work Order" to create your first work order
                </p>
              </div>
            ) : (
              <Table className="min-w-full">
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={thClass}>Work Order No</TableHead>
                    <TableHead className={thClass}>Work Order Name</TableHead>
                    <TableHead className={thClass}>
                      Total Work Order Value
                    </TableHead>
                    <TableHead className={thClass}>
                      Total Bills Amount Used
                    </TableHead>
                    <TableHead className={thClass}>Remaining Amount</TableHead>
                    <TableHead className={thClass}>Number of Bills</TableHead>
                    <TableHead className={thClass}>
                      Retention Reminder
                    </TableHead>
                    <TableHead className={thClass}>Status</TableHead>
                    <TableHead className={thClass}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {workOrders.map((order) => (
                    <TableRow key={order._id} className="hover:bg-gray-50">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.workOrderNo || order.workOrderId || "N/A"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-normal text-sm text-gray-900">
                        {order.workOrderName ||
                          order.name ||
                          order.title ||
                          "N/A"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ₹{order.totalValue?.toLocaleString("en-IN") || "0"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹
                        {order.totalBillsAmount?.toLocaleString("en-IN") || "0"}
                      </TableCell>
                      <TableCell
                        className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                          remainingFor(order) < 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        ₹{remainingFor(order).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 rounded-full hover:bg-blue-100"
                        >
                          {order.billsCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-normal text-sm">
                        {order.retentionAmount && order.retentionDueDate ? (
                          <div className="space-y-1">
                            <RetentionBadge
                              order={order}
                              fallback="Scheduled"
                            />
                            <p className="text-gray-900 font-semibold">
                              {formatCurrency(order.retentionAmount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Pay by {formatDate(order.retentionDueDate)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Notify from{" "}
                              {formatDate(order.retentionReminderDate)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusPill value={order.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleViewBills(order)}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                          >
                            View Bills
                          </Button>
                          {order.isTriggered ? (
                            <Badge
                              variant="secondary"
                              className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 hover:bg-purple-100"
                            >
                              🔒 Triggered
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openTriggerModal(order)}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                            >
                              Trigger WO
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Work Order Dialog */}
        <Dialog
          open={showAddModal}
          onOpenChange={(open) => {
            if (!open) handleCloseModal();
          }}
        >
          <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Create Work Order
              </DialogTitle>
              <DialogDescription className="sr-only">
                Enter the work order number, name, date and total value.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitWorkOrder} className="space-y-4">
              <div>
                <Label htmlFor="wo-project-display" className={labelClass}>
                  Project <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="wo-project-display"
                  type="text"
                  value={
                    projects.find((p) => p._id === selectedProject)?.name || ""
                  }
                  disabled
                  className="w-full bg-gray-100 text-gray-600 cursor-not-allowed disabled:opacity-100"
                />
              </div>

              <div>
                <Label htmlFor="wo-number" className={labelClass}>
                  Work Order Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="wo-number"
                  type="text"
                  placeholder="Enter Work Order Number (e.g., WO001)"
                  value={formData.workOrderNo}
                  onChange={(e) =>
                    setFormData({ ...formData, workOrderNo: e.target.value })
                  }
                  className={`w-full ${orangeFocus}`}
                  required
                />
              </div>

              <div>
                <Label htmlFor="wo-name" className={labelClass}>
                  Work Order Name / Title{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="wo-name"
                  type="text"
                  placeholder="Enter Work Order Name"
                  value={formData.workOrderName}
                  onChange={(e) =>
                    setFormData({ ...formData, workOrderName: e.target.value })
                  }
                  className={`w-full ${orangeFocus}`}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wo-date" className={labelClass}>
                    Work Order Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="wo-date"
                    type="date"
                    value={formData.workOrderDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workOrderDate: e.target.value,
                      })
                    }
                    className={`w-full ${orangeFocus}`}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="wo-total-value" className={labelClass}>
                    Total Work Order Value (₹){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="wo-total-value"
                    type="number"
                    placeholder="Enter Total Value"
                    value={formData.totalValue}
                    onChange={(e) =>
                      setFormData({ ...formData, totalValue: e.target.value })
                    }
                    className={`w-full ${orangeFocus}`}
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                This will be the maximum billing limit for this work order
              </p>

              <div>
                <Label htmlFor="wo-description" className={labelClass}>
                  Description / Notes
                </Label>
                <Textarea
                  id="wo-description"
                  placeholder="Enter description or notes (optional)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className={`w-full resize-none ${orangeFocus}`}
                />
              </div>

              <Separator />

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "+ Add Work Order"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Trigger Work Order Dialog */}
        <Dialog
          open={showTriggerModal && !!triggerWorkOrder}
          onOpenChange={(open) => {
            if (!open && !submitting) closeTriggerModal();
          }}
        >
          <DialogContent className="max-w-xl sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Trigger Work Order
              </DialogTitle>
              <DialogDescription>
                {triggerWorkOrder?.workOrderNo} -{" "}
                {triggerWorkOrder?.workOrderName}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleTriggerWorkOrder} className="space-y-4">
              <Alert className="border-purple-200 bg-purple-50 text-purple-800">
                <AlertTitle className="text-sm font-semibold text-purple-800">
                  This will lock the work order.
                </AlertTitle>
                <AlertDescription className="text-xs text-purple-700">
                  After triggering, no new bills can be added. The retention
                  reminder starts one month before the due date.
                </AlertDescription>
              </Alert>

              <div>
                <Label
                  htmlFor="trigger-retention-amount"
                  className={labelClass}
                >
                  Retention Amount (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trigger-retention-amount"
                  type="number"
                  placeholder="Amount to pay to client"
                  value={triggerFormData.retentionAmount}
                  onChange={(e) =>
                    setTriggerFormData({
                      ...triggerFormData,
                      retentionAmount: e.target.value,
                    })
                  }
                  className={`w-full ${purpleFocus}`}
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="trigger-due-date" className={labelClass}>
                  Retention Due Date <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { label: "After 6 Months", months: 6 },
                    { label: "After 9 Months", months: 9 },
                    { label: "After 1 Year", months: 12 },
                  ].map((option) => {
                    const isActive =
                      triggerFormData.retentionDueDate ===
                      getDateAfterMonths(option.months);
                    return (
                      <Button
                        key={option.months}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setTriggerFormData({
                            ...triggerFormData,
                            retentionDueDate: getDateAfterMonths(option.months),
                          })
                        }
                        className={`text-xs font-semibold ${
                          isActive
                            ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-600 hover:text-white"
                            : "bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-700"
                        }`}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                <Input
                  id="trigger-due-date"
                  type="date"
                  value={triggerFormData.retentionDueDate}
                  onChange={(e) =>
                    setTriggerFormData({
                      ...triggerFormData,
                      retentionDueDate: e.target.value,
                    })
                  }
                  className={`w-full ${purpleFocus}`}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Reminder starts from{" "}
                  {triggerFormData.retentionDueDate
                    ? formatDate(
                        subtractOneMonth(triggerFormData.retentionDueDate)
                      )
                    : "one month before due date"}
                </p>
              </div>

              <div>
                <Label htmlFor="trigger-notes" className={labelClass}>
                  Notes
                </Label>
                <Textarea
                  id="trigger-notes"
                  placeholder="Optional retention/payment note"
                  value={triggerFormData.retentionNotes}
                  onChange={(e) =>
                    setTriggerFormData({
                      ...triggerFormData,
                      retentionNotes: e.target.value,
                    })
                  }
                  rows={3}
                  className={`w-full resize-none ${purpleFocus}`}
                />
              </div>

              <Separator />

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeTriggerModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={submitting}
                >
                  {submitting ? "Triggering..." : "Trigger & Save Reminder"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bills Management Dialog */}
        <Dialog
          open={showBillsModal && !!selectedWorkOrder}
          onOpenChange={(open) => {
            if (!open) handleCloseBillsModal();
          }}
        >
          <DialogContent className="max-w-6xl sm:max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50 text-left">
              <DialogTitle className="text-xl font-bold text-gray-800">
                Manage Bills
              </DialogTitle>
              <DialogDescription>
                Work Order: {selectedWorkOrder?.workOrderNo} -{" "}
                {selectedWorkOrder?.workOrderName}
              </DialogDescription>
            </DialogHeader>

            {selectedWorkOrder && (
              <div className="flex-1 overflow-y-auto">
                {/* Triggered Lock Banner */}
                {selectedWorkOrder.isTriggered && (
                  <Alert className="rounded-none border-x-0 border-t-0 border-purple-200 bg-purple-50">
                    <AlertTitle className="text-sm font-semibold text-purple-800">
                      🔒 This Work Order is Triggered and Locked
                    </AlertTitle>
                    <AlertDescription className="text-xs text-purple-600">
                      No new bills can be added. Retention payment:{" "}
                      {formatCurrency(selectedWorkOrder.retentionAmount)} by{" "}
                      {formatDate(selectedWorkOrder.retentionDueDate)}.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Work Order Summary */}
                <div className="p-6 bg-blue-50 border-b border-blue-100">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Total Work Order Value
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        ₹
                        {selectedWorkOrder.totalValue?.toLocaleString(
                          "en-IN"
                        ) || "0"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Total Bills Amount
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        ₹
                        {selectedWorkOrder.totalBillsAmount?.toLocaleString(
                          "en-IN"
                        ) || "0"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Remaining Amount
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          remainingFor(selectedWorkOrder) < 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        ₹
                        {remainingFor(selectedWorkOrder).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Number of Bills
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {bills.length}
                      </p>
                    </div>
                  </div>

                  {selectedWorkOrder.retentionAmount &&
                    selectedWorkOrder.retentionDueDate && (
                      <Card className="gap-0 py-0 mt-4 rounded-lg border-blue-200 shadow-none">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <RetentionBadge
                              order={selectedWorkOrder}
                              fallback="Retention Reminder"
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(
                                selectedWorkOrder.retentionAmount
                              )}
                            </span>
                            <span className="text-sm text-gray-600">
                              Pay by{" "}
                              {formatDate(selectedWorkOrder.retentionDueDate)}
                            </span>
                            <span className="text-sm text-gray-500">
                              Notify from{" "}
                              {formatDate(
                                selectedWorkOrder.retentionReminderDate
                              )}
                            </span>
                          </div>
                          {selectedWorkOrder.retentionNotes && (
                            <p className="text-sm text-gray-600 mt-2">
                              {selectedWorkOrder.retentionNotes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Add Bill Button — hidden when triggered */}
                  {!showAddBillForm && (
                    <div className="mb-6">
                      {selectedWorkOrder.isTriggered ? (
                        <Badge
                          variant="outline"
                          className="border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium px-4 py-2"
                        >
                          🔒 Work Order is locked — adding bills is disabled
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleAddBillClick}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          disabled={loadingBills}
                        >
                          <FaPlus />
                          Add Bill
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Add Bill Form */}
                  {showAddBillForm && (
                    <Card className="gap-0 py-0 mb-6 rounded-lg border-orange-200 bg-orange-50 shadow-none">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Add New Bill
                        </h3>
                        <form onSubmit={handleSubmitBill}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="bill-no" className={labelClass}>
                                Bill No <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="bill-no"
                                type="text"
                                placeholder="Enter Bill Number"
                                value={billFormData.billNo}
                                onChange={(e) =>
                                  setBillFormData({
                                    ...billFormData,
                                    billNo: e.target.value,
                                  })
                                }
                                className={`w-full bg-white ${orangeFocus}`}
                                required
                              />
                            </div>

                            <div>
                              <Label htmlFor="bill-date" className={labelClass}>
                                Bill Date{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="bill-date"
                                type="date"
                                value={billFormData.billDate}
                                onChange={(e) =>
                                  setBillFormData({
                                    ...billFormData,
                                    billDate: e.target.value,
                                  })
                                }
                                className={`w-full bg-white ${orangeFocus}`}
                                required
                              />
                            </div>

                            <div>
                              <Label
                                htmlFor="bill-total-value"
                                className={labelClass}
                              >
                                Total Bill Value (₹){" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="bill-total-value"
                                type="number"
                                placeholder="Enter Bill Amount"
                                value={billFormData.totalBillValue}
                                onChange={(e) =>
                                  setBillFormData({
                                    ...billFormData,
                                    totalBillValue: e.target.value,
                                  })
                                }
                                className={`w-full bg-white ${orangeFocus}`}
                                min="1"
                                step="0.01"
                                required
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Remaining: ₹
                                {remainingFor(selectedWorkOrder).toLocaleString(
                                  "en-IN"
                                )}
                              </p>
                            </div>

                            <div>
                              <Label
                                htmlFor="bill-retention-amount"
                                className={labelClass}
                              >
                                Retention Amount (₹)
                              </Label>
                              <Input
                                id="bill-retention-amount"
                                type="number"
                                placeholder="Enter Retention Amount"
                                value={billFormData.retentionAmount}
                                onChange={(e) =>
                                  setBillFormData({
                                    ...billFormData,
                                    retentionAmount: e.target.value,
                                  })
                                }
                                className={`w-full bg-white ${orangeFocus}`}
                                min="0"
                                step="0.01"
                              />
                            </div>

                            <div>
                              <Label
                                htmlFor="bill-holding-amount"
                                className={labelClass}
                              >
                                Holding Amount (₹)
                              </Label>
                              <Input
                                id="bill-holding-amount"
                                type="number"
                                placeholder="Enter Holding Amount"
                                value={billFormData.holdingAmount}
                                onChange={(e) =>
                                  setBillFormData({
                                    ...billFormData,
                                    holdingAmount: e.target.value,
                                  })
                                }
                                className={`w-full bg-white ${orangeFocus}`}
                                min="0"
                                step="0.01"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label
                                htmlFor="bill-notes"
                                className={labelClass}
                              >
                                Notes
                              </Label>
                              <Textarea
                                id="bill-notes"
                                placeholder="Enter notes (optional)"
                                value={billFormData.notes}
                                onChange={(e) =>
                                  setBillFormData({
                                    ...billFormData,
                                    notes: e.target.value,
                                  })
                                }
                                rows={3}
                                className={`w-full bg-white resize-none ${orangeFocus}`}
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancelAddBill}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                              disabled={submitting}
                            >
                              {submitting ? "Adding..." : "Add Bill"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Bills List */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Bills List
                    </h3>

                    {loadingBills ? (
                      <div className="space-y-3" aria-label="Loading bills">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : bills.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No bills found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Click "Add Bill" to create the first bill
                        </p>
                      </div>
                    ) : (
                      <Table className="min-w-full">
                        <TableHeader className="bg-gray-50">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className={thClass}>Bill No</TableHead>
                            <TableHead className={thClass}>Bill Date</TableHead>
                            <TableHead className={thClass}>
                              Total Value
                            </TableHead>
                            <TableHead className={thClass}>Retention</TableHead>
                            <TableHead className={thClass}>Holding</TableHead>
                            <TableHead className={thClass}>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {bills.map((bill, index) => (
                            <TableRow
                              key={bill._id || index}
                              className="hover:bg-gray-50"
                            >
                              <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {bill.billNo}
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {bill.billDate
                                  ? new Date(bill.billDate).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                ₹
                                {bill.totalBillValue?.toLocaleString("en-IN") ||
                                  "0"}
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₹
                                {bill.retentionAmount?.toLocaleString(
                                  "en-IN"
                                ) || "0"}
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₹
                                {bill.holdingAmount?.toLocaleString("en-IN") ||
                                  "0"}
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-normal text-sm text-gray-600">
                                {bill.notes || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseBillsModal}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
