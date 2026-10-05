// src/pages/AdminLeaves.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
//import "react-toastify/dist/ReactToastify.css";


const StatusBadge = ({ status }) => {
    const cls =
        status === "approved"
            ? "bg-green-100 text-green-700"
            : status === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700";
    return (
        <Badge variant="outline" className={`border-transparent ${cls}`}>
            {status}
        </Badge>
    );
};

const getProofUrl = (proofUrl) => {
    if (!proofUrl) return "";
    if (/^https?:\/\//i.test(proofUrl)) return proofUrl;
    const backendUrl = (axios.defaults.baseURL || window.location.origin).replace(/\/api\/?$/, "");
    return `${backendUrl}${proofUrl}`;
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
                <Card>
                    <CardContent className="pt-6">
                        <form
                            onSubmit={onSearch}
                            className="grid grid-cols-1 md:grid-cols-7 gap-3"
                        >
                            <select
                                value={filters.role}
                                onChange={(e) =>
                                    setFilters((f) => ({ ...f, role: e.target.value }))
                                }
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="">All Types</option>
                                <option value="paid">Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="sick">Sick</option>
                                <option value="casual">Casual</option>
                            </select>

                            <Input
                                type="date"
                                value={filters.from}
                                onChange={(e) =>
                                    setFilters((f) => ({ ...f, from: e.target.value }))
                                }
                            />

                            <Input
                                type="date"
                                value={filters.to}
                                onChange={(e) =>
                                    setFilters((f) => ({ ...f, to: e.target.value }))
                                }
                            />

                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Search reason/username"
                                    value={filters.search}
                                    onChange={(e) =>
                                        setFilters((f) => ({ ...f, search: e.target.value }))
                                    }
                                    className="w-full"
                                />
                                <Button type="submit">
                                    Filter
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="overflow-x-auto">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-gray-700">
                                    <TableHead className="text-gray-600 dark:text-gray-300">User</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Role</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Branches</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Type</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Dates</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Days</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Reason</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Proof</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Status</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Approver</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Approved At</TableHead>
                                    <TableHead className="text-gray-600 dark:text-gray-300">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={`skeleton-${i}`}>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center text-muted-foreground py-6">
                                            No records
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((r) => {
                                        const days =
                                            (new Date(r.endDate) - new Date(r.startDate)) /
                                            (1000 * 60 * 60 * 24) +
                                            1;
                                        return (
                                            <TableRow key={r._id} className="dark:border-gray-700 dark:hover:bg-gray-700/60">
                                                <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                                    {r.user?.username}
                                                </TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300 capitalize">{r.user?.role}</TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300">
                                                    {Array.isArray(r.user?.assignedBranches) && r.user.assignedBranches.length
                                                        ? r.user.assignedBranches.map((b) => b?.name || "—").join(", ")
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="capitalize text-gray-700 dark:text-gray-300">{r.type || "—"}</TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300">
                                                    {dayjs(r.startDate).format("DD MMM YYYY")} →{" "}
                                                    {dayjs(r.endDate).format("DD MMM YYYY")}
                                                </TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300">{Math.max(1, days)}</TableCell>
                                                <TableCell className="max-w-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                                    {r.reason || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {r.proofUrl ? (
                                                        <a
                                                            href={getProofUrl(r.proofUrl)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title="Open medical proof"
                                                        >
                                                            <img
                                                                src={getProofUrl(r.proofUrl)}
                                                                alt="Medical proof"
                                                                className="h-12 w-12 rounded-md border object-cover"
                                                            />
                                                        </a>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={r.status} />
                                                </TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300">
                                                    {r.approver?.username || "—"}
                                                </TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300">
                                                    {r.approvedAt
                                                        ? dayjs(r.approvedAt).format("DD MMM YYYY HH:mm")
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {r.status === "pending" ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40"
                                                                onClick={() => handleAction(r._id, "approved")}
                                                            >
                                                                Approve
                                                            </Button>
                                                            
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                                onClick={() => handleAction(r._id, "rejected")}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                            Finalized
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                <Card>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> of{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span> ·{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{total}</span> records
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                {[10, 20, 50, 100].map((n) => (
                                    <option key={n} value={n}>
                                        {n} / page
                                    </option>
                                ))}
                            </select>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
