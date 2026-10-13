// src/pages/AdminLeaves.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/Select';
//import "react-toastify/dist/ReactToastify.css";

// Radix SelectItem cannot use an empty-string value, so "All ..." options use
// this sentinel in the UI. It is mapped back to "" before touching filters state.
const ALL = "__all__";

const selectTriggerClass =
    "rounded-lg border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 focus:ring-offset-0";

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
    const loadBranches = useCallback(async () => {
        try {
            const res = await axios.get("/branches");
            setBranches(res.data || []);
        } catch (e) {
            console.error("Failed to fetch branches", e);
        }
    }, []);

    // 🔹 Load leave requests
    const loadLeaves = useCallback(async () => {
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
    }, [filters, page, limit]);

    useEffect(() => {
        loadBranches();
        loadLeaves();
    }, [loadBranches, loadLeaves]);

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
                            <Select
                                value={filters.role || ALL}
                                onValueChange={(value) =>
                                    setFilters((f) => ({ ...f, role: value === ALL ? "" : value }))
                                }
                            >
                                <SelectTrigger aria-label="Filter by role" className={selectTriggerClass}>
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All Roles</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                                    <SelectItem value="labour">Labour</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* 🔹 Branch dropdown */}
                            <Select
                                value={filters.branchId || ALL}
                                onValueChange={(value) =>
                                    setFilters((f) => ({ ...f, branchId: value === ALL ? "" : value }))
                                }
                            >
                                <SelectTrigger aria-label="Filter by branch" className={selectTriggerClass}>
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All Branches</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b._id} value={String(b._id)}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.status || ALL}
                                onValueChange={(value) =>
                                    setFilters((f) => ({ ...f, status: value === ALL ? "" : value }))
                                }
                            >
                                <SelectTrigger aria-label="Filter by status" className={selectTriggerClass}>
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.type || ALL}
                                onValueChange={(value) =>
                                    setFilters((f) => ({ ...f, type: value === ALL ? "" : value }))
                                }
                            >
                                <SelectTrigger aria-label="Filter by leave type" className={selectTriggerClass}>
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All Types</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                    <SelectItem value="sick">Sick</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                </SelectContent>
                            </Select>

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
                            <Select
                                value={String(limit)}
                                onValueChange={(value) => {
                                    setLimit(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger
                                    aria-label="Rows per page"
                                    className="h-8 w-auto gap-2 rounded-lg border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
                                >
                                    <SelectValue placeholder="20 / page" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50, 100].map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n} / page
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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