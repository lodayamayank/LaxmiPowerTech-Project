import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaMoneyBillWave,
  FaEye,
  FaTimes,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";

const StatusBadge = ({ status }) => {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
      ? "bg-red-100 text-red-700"
      : status === "paid"
      ? "bg-blue-100 text-blue-700"
      : "bg-yellow-100 text-yellow-700";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
};

const AdminReimbursements = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReimbursement, setSelectedReimbursement] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: "",
    role: "",
    from: "",
    to: "",
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // ✅ FIX: Memoize token
  const token = useMemo(() => localStorage.getItem("token"), []);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  // ✅ FIX: Move fetchReimbursements inside useEffect to avoid dependency issues
  useEffect(() => {
    const fetchReimbursements = async () => {
      if (!token) {
        console.error('No token available');
        return;
      }

      try {
        setLoading(true);
        const params = { page, limit, ...filters };

        const res = await axios.get("/reimbursements", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        const data = res.data.rows || [];
        setReimbursements(data);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error("Failed to fetch reimbursements", err);
        if (err.response?.status === 403) {
          toast.error("Access denied. Admin privileges required.");
        } else {
          toast.error("Failed to load reimbursements");
        }
        setReimbursements([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchReimbursements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, token]);

  // ✅ FIX: Separate function for manual fetch (on search/filter)
  const refetchReimbursements = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = { page, limit, ...filters };

      const res = await axios.get("/reimbursements", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const data = res.data.rows || [];
      setReimbursements(data);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch reimbursements", err);
      if (err.response?.status === 403) {
        toast.error("Access denied. Admin privileges required.");
      } else {
        toast.error("Failed to load reimbursements");
      }
      setReimbursements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    refetchReimbursements();
  };

  const handleStatusUpdate = async (id, status, rejectionReason = "") => {
    try {
      await axios.patch(
        `/reimbursements/${id}/status`,
        { status, rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Reimbursement ${status} successfully`);
      refetchReimbursements();
      setShowDetailsModal(false);
      setSelectedReimbursement(null);
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleApprove = (id) => {
    if (window.confirm("Approve this reimbursement request?")) {
      handleStatusUpdate(id, "approved");
    }
  };

  const handleReject = (id) => {
    const reason = prompt("Enter rejection reason:");
    if (reason) {
      handleStatusUpdate(id, "rejected", reason);
    }
  };

  const handleMarkPaid = (id) => {
    if (window.confirm("Mark this reimbursement as paid?")) {
      handleStatusUpdate(id, "paid");
    }
  };

  const viewDetails = async (id) => {
    try {
      const res = await axios.get(`/reimbursements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedReimbursement(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      toast.error("Failed to load details");
    }
  };

  return (
    <DashboardLayout title="Reimbursement Management">
      <div className="space-y-4">
        {/* Filters */}
        <form
          onSubmit={onSearch}
          className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl shadow"
        >
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>

          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Roles</option>
            <option value="labour">Labour</option>
            <option value="staff">Staff</option>
            <option value="supervisor">Supervisor</option>
            <option value="subcontractor">Subcontractor</option>
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="border rounded-lg px-3 py-2"
            placeholder="From"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="border rounded-lg px-3 py-2"
            placeholder="To"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Filter
          </button>
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-2">User</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Total Amount</th>
                <th className="text-left px-4 py-2">Items</th>
                <th className="text-left px-4 py-2">Submitted</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Approver</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={8}>
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                      <span className="ml-3">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : reimbursements.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                    No records found
                  </td>
                </tr>
              ) : (
                reimbursements.map((reimb) => (
                  <tr key={reimb._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {reimb.user?.name || "Unknown"}
                    </td>
                    <td className="px-4 py-2 capitalize">{reimb.user?.role || "-"}</td>
                    <td className="px-4 py-2 font-semibold text-green-600">
                      ₹{reimb.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">{reimb.items.length}</td>
                    <td className="px-4 py-2">
                      {new Date(reimb.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={reimb.status} />
                    </td>
                    <td className="px-4 py-2">
                      {reimb.approver?.name || "-"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewDetails(reimb._id)}
                          className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                          title="View Details"
                        >
                          <FaEye size={14} />
                        </button>
                        {reimb.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(reimb._id)}
                              className="px-3 py-1 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 transition-colors"
                              title="Approve"
                            >
                              <FaCheck size={14} />
                            </button>
                            <button
                              onClick={() => handleReject(reimb._id)}
                              className="px-3 py-1 rounded-lg border border-red-600 text-red-700 hover:bg-red-50 transition-colors"
                              title="Reject"
                            >
                              <FaTimes size={14} />
                            </button>
                          </>
                        )}
                        {reimb.status === "approved" && (
                          <button
                            onClick={() => handleMarkPaid(reimb._id)}
                            className="px-3 py-1 rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 transition-colors text-xs"
                            title="Mark as Paid"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl shadow">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} · {total} records
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border rounded-lg px-2 py-1"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedReimbursement && (
        <ReimbursementDetailsModal
          reimbursement={selectedReimbursement}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReimbursement(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkPaid={handleMarkPaid}
        />
      )}
    </DashboardLayout>
  );
};


// Details Modal Component
const ReimbursementDetailsModal = ({ reimbursement, onClose, onApprove, onReject, onMarkPaid }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-white font-bold text-xl">Reimbursement Details</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* User Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Submitted By</h3>
                <p className="font-bold text-lg text-gray-800">{reimbursement.user?.name}</p>
                <p className="text-sm text-gray-600">{reimbursement.user?.email}</p>
                <p className="text-sm text-gray-600">{reimbursement.user?.mobileNumber}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 capitalize">
                    {reimbursement.user?.role}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(reimbursement.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-4xl font-bold text-green-600">
                  ₹{reimbursement.totalAmount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">{reimbursement.items.length} item(s)</p>
              </div>

              {/* Note */}
              {reimbursement.note && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Additional Note</p>
                  <p className="text-sm text-gray-600">{reimbursement.note}</p>
                </div>
              )}

              {/* Status Info */}
              {reimbursement.status !== "pending" && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Status Information</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Status:</span>{" "}
                      <StatusBadge status={reimbursement.status} />
                    </p>
                    {reimbursement.approver && (
                      <p className="text-gray-600">
                        <span className="font-medium">Approved by:</span> {reimbursement.approver.name}
                      </p>
                    )}
                    {reimbursement.approvedAt && (
                      <p className="text-gray-600">
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(reimbursement.approvedAt).toLocaleString()}
                      </p>
                    )}
                    {reimbursement.rejectionReason && (
                      <p className="text-red-600 mt-2">
                        <span className="font-medium">Reason:</span> {reimbursement.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Items */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 text-lg">Expense Items</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {reimbursement.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-semibold text-lg text-gray-800">
                          ₹{item.amount.toFixed(2)}
                        </span>
                        <span className="text-xs ml-2 px-2 py-1 rounded-full bg-orange-100 text-orange-700 capitalize">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.expenseDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                    {/* Receipts */}
                    {item.receipts && item.receipts.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Receipts:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {item.receipts.map((receipt, idx) => (
                            <a
                              key={idx}
                              href={`${axios.defaults.baseURL}${receipt}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={`${axios.defaults.baseURL}${receipt}`}
                                alt={`Receipt ${idx + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-gray-300 hover:border-orange-500 transition-all cursor-pointer"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            {reimbursement.status === "pending" && (
              <div className="flex gap-3">
                <button
                  onClick={() => onApprove(reimbursement._id)}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <FaCheck size={16} />
                  Approve
                </button>
                <button
                  onClick={() => onReject(reimbursement._id)}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <FaTimes size={16} />
                  Reject
                </button>
              </div>
            )}

            {reimbursement.status === "approved" && (
              <button
                onClick={() => onMarkPaid(reimbursement._id)}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all flex items-center justify-center gap-2"
              >
                <FaMoneyBillWave size={16} />
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReimbursements;