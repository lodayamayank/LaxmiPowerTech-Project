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
import StatusBadge from "../../components/transfers/StatusBadge";
import useDebounce from "../../hooks/useDebounce";
import { useBranches } from "../../hooks/useBranches";
import DashboardLayout from "../../layouts/DashboardLayout";

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
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // for drawer/modal if you add later
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
          <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
          <select
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
          <label className="mb-1 block text-xs font-medium text-gray-600">From Branch</label>
          <select
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
          <label className="mb-1 block text-xs font-medium text-gray-600">To Branch</label>
          <select
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
          <label className="mb-1 block text-xs font-medium text-gray-600">Query</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Search items/reason"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
          />
        </div>
        <div className="md:col-span-3 flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">Start (Requested)</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={filters.start}
              onChange={(e) => setFilters((s) => ({ ...s, start: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">End (Requested)</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={filters.end}
              onChange={(e) => setFilters((s) => ({ ...s, end: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => loadData(1)}
              className="h-[38px] rounded-lg border px-3 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">From → To</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-sm">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No transfers found</td></tr>
            ) : (
              rows.map((r) => {
                const firstItem = r.items?.[0];
                const more = Math.max(0, (r.items?.length || 0) - 1);
                return (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r._id.slice(-6)}</td>
                    <td className="px-4 py-3">{r.requestedBy?.username || "—"}</td>
                    <td className="px-4 py-3">{branchName(r.fromBranchId?._id || r.fromBranchId)} → {branchName(r.toBranchId?._id || r.toBranchId)}</td>
                    <td className="px-4 py-3">
                      {firstItem ? (
                        <span>
                          {firstItem.name} ({firstItem.quantity} {firstItem.unit}){more ? ` +${more} more` : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">{r.requestedAt ? dayjs(r.requestedAt).format("DD MMM YYYY, HH:mm") : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {r.status === "pending" && (
                          <>
                            <button onClick={() => onApprove(r)} className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">Approve</button>
                            <button onClick={() => onReject(r)} className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">Reject</button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button onClick={() => onComplete(r)} className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">Mark Completed</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">Total: {total}</div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadData(p); }}
            disabled={page <= 1}
          >Prev</button>
          <span className="text-sm">{page} / {totalPages}</span>
          <button
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); loadData(p); }}
            disabled={page >= totalPages}
          >Next</button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
