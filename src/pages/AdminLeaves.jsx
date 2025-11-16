// src/pages/AdminLeaves.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import dayjs from "dayjs";
import { toast } from "react-toastify";
//import "react-toastify/dist/ReactToastify.css";


const StatusBadge = ({ status }) => {
    const cls =
        status === "approved"
            ? "bg-green-100 text-green-700"
            : status === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700";
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
            {status}
        </span>
    );
};

export default function AdminLeaves() {
    const [filters, setFilters] = useState({
        role: "",
        branchId: "",
        status: "",
        type: "",
        from: "",
        to: "",
        search: "",
    });
    const [branches, setBranches] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);

    const totalPages = useMemo(
        () => Math.max(Math.ceil(total / limit), 1),
        [total, limit]
    );

    // 🔹 Load branches for dropdown
    const loadBranches = async () => {
        try {
            const res = await axios.get("/branches");
            setBranches(res.data || []);
        } catch (e) {
            console.error("Failed to fetch branches", e);
        }
    };

    // 🔹 Load leave requests
    const loadLeaves = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/leaves", { params: { ...filters, page, limit } });
            setRows(res.data.rows || []);
            setTotal(res.data.total || 0);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load leaves");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBranches();
        loadLeaves();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const onSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadLeaves();
    };

    const handleAction = async (id, status) => {
        try {
            await axios.patch(`/leaves/${id}/status`, { status }); // ✅ correct endpoint
            setRows((prev) =>
                prev.map((r) => (r._id === id ? { ...r, status } : r))
            );
            toast.success(`Leave ${status} successfully`);

            // 🔹 optional: broadcast event for AdminDashboard & MyAttendance
            window.dispatchEvent(new CustomEvent("leave-updated", { detail: { id, status } }));
        } catch (e) {
            console.error(e);
            toast.error("Failed to update status");
        }
    };

    return (
        <DashboardLayout title="Leave Management">
            <div className="space-y-4">
                {/* Filters */}
                <form
                    onSubmit={onSearch}
                    className="grid grid-cols-1 md:grid-cols-7 gap-3 bg-white p-4 rounded-xl shadow"
                >
                    <select
                        value={filters.role}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, role: e.target.value }))
                        }
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="subcontractor">Subcontractor</option>
                        <option value="labour">Labour</option>
                    </select>

                    {/* 🔹 Branch dropdown */}
                    <select
                        value={filters.branchId}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, branchId: e.target.value }))
                        }
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                            <option key={b._id} value={b._id}>
                                {b.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.status}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, status: e.target.value }))
                        }
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <select
                        value={filters.type}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, type: e.target.value }))
                        }
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Types</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="sick">Sick</option>
                        <option value="casual">Casual</option>
                    </select>

                    <input
                        type="date"
                        value={filters.from}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, from: e.target.value }))
                        }
                        className="border rounded-lg px-3 py-2"
                    />

                    <input
                        type="date"
                        value={filters.to}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, to: e.target.value }))
                        }
                        className="border rounded-lg px-3 py-2"
                    />

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Search reason/username"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, search: e.target.value }))
                            }
                            className="border rounded-lg px-3 py-2 w-full"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-black text-white"
                        >
                            Filter
                        </button>
                    </div>
                </form>

                {/* Table */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="text-left px-4 py-2">User</th>
                                <th className="text-left px-4 py-2">Role</th>
                                <th className="text-left px-4 py-2">Branches</th>
                                <th className="text-left px-4 py-2">Type</th>
                                <th className="text-left px-4 py-2">Dates</th>
                                <th className="text-left px-4 py-2">Days</th>
                                <th className="text-left px-4 py-2">Reason</th>
                                <th className="text-left px-4 py-2">Status</th>
                                <th className="text-left px-4 py-2">Approver</th>
                                <th className="text-left px-4 py-2">Approved At</th>
                                <th className="text-left px-4 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td className="px-4 py-6" colSpan={11}>
                                        Loading…
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6" colSpan={11}>
                                        No records
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => {
                                    const days =
                                        (new Date(r.endDate) - new Date(r.startDate)) /
                                        (1000 * 60 * 60 * 24) +
                                        1;
                                    return (
                                        <tr key={r._id} className="border-t">
                                            <td className="px-4 py-2 font-medium">
                                                {r.user?.username}
                                            </td>
                                            <td className="px-4 py-2">{r.user?.role}</td>
                                            <td className="px-4 py-2">
                                                {Array.isArray(r.user?.assignedBranches) && r.user.assignedBranches.length
                                                    ? r.user.assignedBranches.map((b) => b?.name || "—").join(", ")
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-2 capitalize">{r.type || "—"}</td>
                                            <td className="px-4 py-2">
                                                {dayjs(r.startDate).format("DD MMM YYYY")} →{" "}
                                                {dayjs(r.endDate).format("DD MMM YYYY")}
                                            </td>
                                            <td className="px-4 py-2">{Math.max(1, days)}</td>
                                            <td className="px-4 py-2 max-w-xs whitespace-pre-wrap">
                                                {r.reason || "—"}
                                            </td>
                                            <td className="px-4 py-2">
                                                <StatusBadge status={r.status} />
                                            </td>
                                            <td className="px-4 py-2">
                                                {r.approver?.username || "—"}
                                            </td>
                                            <td className="px-4 py-2">
                                                {r.approvedAt
                                                    ? dayjs(r.approvedAt).format("DD MMM YYYY HH:mm")
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-2 space-x-2">
                                                <button
                                                    className="px-3 py-1 rounded-lg border border-green-600 text-green-700 disabled:opacity-40"
                                                    disabled={r.status === "approved"}
                                                    onClick={() => handleAction(r._id, "approved")}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="px-3 py-1 rounded-lg border border-red-600 text-red-700 disabled:opacity-40"
                                                    disabled={r.status === "rejected"}
                                                    onClick={() => handleAction(r._id, "rejected")}
                                                >
                                                    Reject
                                                </button>
                                                {r.status !== "pending" && (
                                                    <button
                                                        className="px-3 py-1 rounded-lg border text-gray-700"
                                                        onClick={() => handleAction(r._id, "pending")}
                                                    >
                                                        Mark Pending
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
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
                            className="px-3 py-1 rounded-lg border disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 rounded-lg border disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
