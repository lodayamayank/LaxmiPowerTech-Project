// src/pages/admin/AdminTransfers.jsx
// Admin UI page wrapped with DashboardLayout
// Tech: React + Tailwind + Axios (service in src/api/materialTransfers.api.js)

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  getAllTransfers,
  decideTransfer,
  completeTransfer,
} from "../../api/materialTransfers.api";
import StatusBadge, { TRANSFER_STATUS_COLORS } from "../../components/common/StatusBadge";
import useDebounce from "../../hooks/useDebounce";
import { useBranches } from "../../hooks/useBranches";
import DashboardLayout from "../layouts/DashboardLayout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---- Default export: page wrapped in DashboardLayout ----
export default function AdminTransfers() {
  return (
    <DashboardLayout>
      <AdminTransfersInner />
    </DashboardLayout>
  );
}

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
];

function AdminTransfersInner() {
  const [filters, setFilters] = useState({ status: "", from: "", to: "", q: "", start: "", end: "" });
  const debouncedQ = useDebounce(filters.q, 400);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { branches } = useBranches();

  const branchName = (id) => branches?.find((b) => b._id === id)?.name || "—";

  const loadData = async (p = page) => {
    try {
      setLoading(true);
      const params = { ...filters, q: debouncedQ, page: p, limit };
      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] == null) delete params[k];
      });
      const res = await getAllTransfers(params);
      setRows(res?.data || []);
      setTotal(res?.pagination?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filters.status, filters.from, filters.to, filters.start, filters.end]);

  const onApprove = async (row) => {
    await decideTransfer(row._id, "approve", "Approved by admin");
    loadData();
  };

  const onReject = async (row) => {
    const note = prompt("Reason to reject? (optional)", "Insufficient stock");
    await decideTransfer(row._id, "reject", note || "");
    loadData();
  };

  const onComplete = async (row) => {
    await completeTransfer(row._id);
    loadData();
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Material Transfers</h1>
          <p className="text-sm text-gray-500">Review, approve/reject and complete transfer requests.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="md:col-span-1">
          <Label htmlFor="transfer-status" className="mb-1 block text-xs font-medium text-gray-600">Status</Label>
          <select
            id="transfer-status"
            className="w-full rounded-lg border px-2 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="transfer-from-branch" className="mb-1 block text-xs font-medium text-gray-600">From Branch</Label>
          <select
            id="transfer-from-branch"
            className="w-full rounded-lg border px-2 py-2 text-sm"
            value={filters.from}
            onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))}
          >
            <option value="">All</option>
            {branches?.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="transfer-to-branch" className="mb-1 block text-xs font-medium text-gray-600">To Branch</Label>
          <select
            id="transfer-to-branch"
            className="w-full rounded-lg border px-2 py-2 text-sm"
            value={filters.to}
            onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))}
          >
            <option value="">All</option>
            {branches?.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-1">
          <Label htmlFor="transfer-query" className="mb-1 block text-xs font-medium text-gray-600">Query</Label>
          <Input
            id="transfer-query"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Search items/reason"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
          />
        </div>
        <div className="md:col-span-3 flex gap-2">
          <div className="flex-1">
            <Label htmlFor="transfer-start" className="mb-1 block text-xs font-medium text-gray-600">Start (Requested)</Label>
            <Input
              id="transfer-start"
              type="date"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={filters.start}
              onChange={(e) => setFilters((s) => ({ ...s, start: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="transfer-end" className="mb-1 block text-xs font-medium text-gray-600">End (Requested)</Label>
            <Input
              id="transfer-end"
              type="date"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={filters.end}
              onChange={(e) => setFilters((s) => ({ ...s, end: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={() => loadData(1)}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <Table className="min-w-full divide-y divide-gray-200">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-xs font-semibold text-gray-600">
              <TableHead className="px-4 py-3">ID</TableHead>
              <TableHead className="px-4 py-3">Requested By</TableHead>
              <TableHead className="px-4 py-3">From → To</TableHead>
              <TableHead className="px-4 py-3">Items</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3">Requested</TableHead>
              <TableHead className="px-4 py-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 bg-white text-sm">
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-6 text-center text-gray-500">No transfers found</TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const firstItem = r.items?.[0];
                const more = Math.max(0, (r.items?.length || 0) - 1);
                return (
                  <TableRow key={r._id} className="hover:bg-gray-50">
                    <TableCell className="px-4 py-3 font-mono text-xs text-gray-700">{r._id.slice(-6)}</TableCell>
                    <TableCell className="px-4 py-3">{r.requestedBy?.username || "—"}</TableCell>
                    <TableCell className="px-4 py-3">{branchName(r.fromBranchId?._id || r.fromBranchId)} → {branchName(r.toBranchId?._id || r.toBranchId)}</TableCell>
                    <TableCell className="px-4 py-3">
                      {firstItem ? (
                        <span>
                          {firstItem.name} ({firstItem.quantity} {firstItem.unit}){more ? ` +${more} more` : ""}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3"><StatusBadge status={r.status} colorMap={TRANSFER_STATUS_COLORS} /></TableCell>
                    <TableCell className="px-4 py-3">{r.requestedAt ? dayjs(r.requestedAt).format("DD MMM YYYY, HH:mm") : "—"}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => onApprove(r)} className="bg-blue-600 hover:bg-blue-700 text-white">Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => onReject(r)}>Reject</Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" onClick={() => onComplete(r)} className="bg-green-600 hover:bg-green-700 text-white">Mark Completed</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">Total: {total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadData(p); }} disabled={page <= 1}>Prev</Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); loadData(p); }} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
