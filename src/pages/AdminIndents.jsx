// src/pages/AdminIndents.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import dayjs from "dayjs";
import { toast } from "react-toastify";

const StatusPill = ({ value }) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    issued: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[value] || "bg-gray-100 text-gray-700"}`}>
      {value}
    </span>
  );
};

export default function AdminIndents() {
  const [filters, setFilters] = useState({
    status: "",
    projectId: "",
    branchId: "",
    role: "",
    search: "",
    from: "",
    to: "",
  });
  const [projects, setProjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState(null);

  // bootstrap dropdowns
  useEffect(() => {
    (async () => {
      try {
        const [pRes, bRes] = await Promise.all([
          axios.get("/projects"),
          axios.get("/branches"),
        ]);
        setProjects(pRes.data || []);
        setBranches(bRes.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const fetchIndents = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort: "-requestedAt",
      };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });

      const res = await axios.get("/indents", { params });
      setData(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load indents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onSearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    fetchIndents();
  };

  const clearFilters = () => {
    setFilters({ status: "", projectId: "", branchId: "", role: "", search: "", from: "", to: "" });
    setPage(1);
    fetchIndents();
  };

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  const openDrawer = (row) => {
    setActive(row);
    setDrawerOpen(true);
  };

  const actionCall = async (id, action, payload = {}) => {
    try {
      const map = {
        approve: `/indents/${id}/approve`,
        reject: `/indents/${id}/reject`,
        issue: `/indents/${id}/issue`,
      };
      const res = await axios.patch(map[action], payload);
      toast.success(`Indent ${action}d`);
      setDrawerOpen(false);
      setActive(null);
      fetchIndents();
      return res.data;
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || `Failed to ${action}`);
    }
  };

  return (
    <DashboardLayout title="Indents">
      {/* Filters */}
      <form onSubmit={onSearch} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <select
          className="border rounded px-2 py-2"
          value={filters.status}
          onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
        >
          <option value="">Status: All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="issued">Issued</option>
        </select>

        <select
          className="border rounded px-2 py-2"
          value={filters.projectId}
          onChange={(e) => setFilters((s) => ({ ...s, projectId: e.target.value }))}
        >
          <option value="">Project: All</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>

        <select
          className="border rounded px-2 py-2"
          value={filters.branchId}
          onChange={(e) => setFilters((s) => ({ ...s, branchId: e.target.value }))}
        >
          <option value="">Branch: All</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>

        <select
          className="border rounded px-2 py-2"
          value={filters.role}
          onChange={(e) => setFilters((s) => ({ ...s, role: e.target.value }))}
        >
          <option value="">Role: All</option>
          <option value="labour">Labour</option>
          <option value="staff">Staff</option>
          <option value="subcontractor">Subcontractor</option>
          <option value="supervisor">Supervisor</option>
        </select>

        <input
          type="date"
          className="border rounded px-2 py-2"
          value={filters.from}
          onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))}
        />
        <input
          type="date"
          className="border rounded px-2 py-2"
          value={filters.to}
          onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))}
        />

        <input
          type="text"
          className="border rounded px-2 py-2 md:col-span-2"
          placeholder="Search (purpose or username)"
          value={filters.search}
          onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
        />
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="px-3 py-2 rounded bg-black text-white">Apply</button>
          <button type="button" onClick={clearFilters} className="px-3 py-2 rounded border">Reset</button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-center" colSpan={9}>Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td className="px-4 py-6 text-center" colSpan={9}>No indents</td></tr>
              ) : data.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="px-4 py-3">{dayjs(row.requestedAt || row.createdAt).format("DD MMM YYYY")}</td>
                  <td className="px-4 py-3">{row.requester?.username || row.user?.username || "—"}</td>
                  <td className="px-4 py-3">{row.requester?.role || "—"}</td>
                  <td className="px-4 py-3">{row.project?.name || "—"}</td>
                  <td className="px-4 py-3">{row.branch?.name || "—"}</td>
                  <td className="px-4 py-3">{row.items?.length || 0}</td>
                  <td className="px-4 py-3 truncate max-w-[220px]">{row.purpose || "—"}</td>
                  <td className="px-4 py-3"><StatusPill value={row.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-blue-600" onClick={() => openDrawer(row)}>View</button>
                      {row.status === "pending" && (
                        <>
                          <button className="text-green-600" onClick={() => actionCall(row._id, "approve")}>Approve</button>
                          <button className="text-red-600" onClick={() => actionCall(row._id, "reject")}>Reject</button>
                        </>
                      )}
                      {row.status === "approved" && (
                        <button className="text-emerald-700" onClick={() => actionCall(row._id, "issue")}>Mark Issued</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages} • {total} total
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="px-3 py-2 border rounded disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && active && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[460px] bg-white shadow-xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Indent Detail</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-500">✕</button>
            </div>

            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Requester:</span> {active.requester?.username || "—"} ({active.requester?.role || "—"})</div>
              <div><span className="text-gray-500">Project:</span> {active.project?.name || "—"}</div>
              <div><span className="text-gray-500">Branch:</span> {active.branch?.name || "—"}</div>
              <div><span className="text-gray-500">Purpose:</span> {active.purpose || "—"}</div>
              <div><span className="text-gray-500">Status:</span> <StatusPill value={active.status} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Requested:</span> {active.requestedAt ? dayjs(active.requestedAt).format("DD MMM, HH:mm") : "—"}</div>
                <div><span className="text-gray-500">Approved:</span> {active.approvedAt ? dayjs(active.approvedAt).format("DD MMM, HH:mm") : "—"}</div>
                <div><span className="text-gray-500">Issued:</span> {active.issuedAt ? dayjs(active.issuedAt).format("DD MMM, HH:mm") : "—"}</div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2">Items</h4>
              <div className="border rounded-lg divide-y">
                {(active.items || []).map((it, idx) => (
                  <div key={idx} className="px-3 py-2 text-sm flex justify-between">
                    <div className="font-medium">{it.name}</div>
                    <div>{it.quantity} {it.unit}</div>
                  </div>
                ))}
                {(!active.items || active.items.length === 0) && (
                  <div className="px-3 py-2 text-gray-500 text-sm">No items</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              {active.status === "pending" && (
                <>
                  <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={() => actionCall(active._id, "approve")}>Approve</button>
                  <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={() => actionCall(active._id, "reject")}>Reject</button>
                </>
              )}
              {active.status === "approved" && (
                <button className="px-3 py-2 rounded bg-emerald-700 text-white" onClick={() => actionCall(active._id, "issue")}>Mark Issued</button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
