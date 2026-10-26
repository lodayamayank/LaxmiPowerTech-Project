// src/pages/AdminIndents.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import Select from '../components/Select';

const StatusPill = ({ value }) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    issued: "bg-green-100 text-green-700",
  };
  return (
    <Badge
      variant="outline"
      className={`border-0 rounded-full px-2 py-1 text-xs font-medium ${map[value] || "bg-gray-100 text-gray-700"}`}
    >
      {value}
    </Badge>
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
        <Select
          value={filters.status}
          onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
          options={[
            { value: '', label: 'Status: All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'issued', label: 'Issued' },
          ]}
          placeholder="Status: All"
        />

        <Select
          value={filters.projectId}
          onChange={(e) => setFilters((s) => ({ ...s, projectId: e.target.value }))}
          options={[{ value: '', label: 'Project: All' }, ...projects.map((p) => ({ value: p._id, label: p.name }))]}
          placeholder="Project: All"
        />

        <Select
          value={filters.branchId}
          onChange={(e) => setFilters((s) => ({ ...s, branchId: e.target.value }))}
          options={[{ value: '', label: 'Branch: All' }, ...branches.map((b) => ({ value: b._id, label: b.name }))]}
          placeholder="Branch: All"
        />

        <Select
          value={filters.role}
          onChange={(e) => setFilters((s) => ({ ...s, role: e.target.value }))}
          options={[
            { value: '', label: 'Role: All' },
            { value: 'labour', label: 'Labour' },
            { value: 'staff', label: 'Staff' },
            { value: 'subcontractor', label: 'Subcontractor' },
            { value: 'supervisor', label: 'Supervisor' },
          ]}
          placeholder="Role: All"
        />

        <Input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))}
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))}
        />

        <Input
          type="text"
          className="md:col-span-2"
          placeholder="Search (purpose or username)"
          value={filters.search}
          onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
        />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" size="sm">Apply</Button>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Reset</Button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader className="bg-gray-50 text-left [&_tr]:border-b-0">
              <TableRow className="border-b-0 hover:bg-transparent">
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Date</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Requester</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Role</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Project</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Branch</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Items</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Purpose</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Status</TableHead>
                <TableHead className="h-auto px-4 py-3 font-bold text-inherit">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-t">
              {loading ? (
                <TableRow className="border-t border-b-0 hover:bg-transparent">
                  <TableCell className="px-4 py-6 text-center" colSpan={9}>Loading...</TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow className="border-t border-b-0 hover:bg-transparent">
                  <TableCell className="px-4 py-6 text-center" colSpan={9}>No indents</TableCell>
                </TableRow>
              ) : data.map((row) => (
                <TableRow key={row._id} className="border-t border-b-0 hover:bg-transparent">
                  <TableCell className="px-4 py-3">{dayjs(row.requestedAt || row.createdAt).format("DD MMM YYYY")}</TableCell>
                  <TableCell className="px-4 py-3">{row.requester?.username || row.user?.username || "—"}</TableCell>
                  <TableCell className="px-4 py-3">{row.requester?.role || "—"}</TableCell>
                  <TableCell className="px-4 py-3">{row.project?.name || "—"}</TableCell>
                  <TableCell className="px-4 py-3">{row.branch?.name || "—"}</TableCell>
                  <TableCell className="px-4 py-3">{row.items?.length || 0}</TableCell>
                  <TableCell className="px-4 py-3 truncate max-w-[220px]">{row.purpose || "—"}</TableCell>
                  <TableCell className="px-4 py-3"><StatusPill value={row.status} /></TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openDrawer(row)}>View</Button>
                      {row.status === "pending" && (
                        <>
                          <Button variant="outline" size="sm" className="border-green-600 text-green-700 hover:bg-green-50" onClick={() => actionCall(row._id, "approve")}>Approve</Button>
                          <Button variant="outline" size="sm" className="border-red-600 text-red-700 hover:bg-red-50" onClick={() => actionCall(row._id, "reject")}>Reject</Button>
                        </>
                      )}
                      {row.status === "approved" && (
                        <Button variant="outline" size="sm" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50" onClick={() => actionCall(row._id, "issue")}>Mark Issued</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages} • {total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {active && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side="right"
            className="w-full sm:w-[460px] sm:max-w-[460px] bg-white p-5 overflow-y-auto"
          >
            <SheetHeader className="mb-4 space-y-0 text-left">
              <SheetTitle className="text-lg font-semibold text-inherit">Indent Detail</SheetTitle>
              <SheetDescription className="sr-only">
                Details of the selected indent request
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-2 text-sm">
              {active.indentId && (
                <div><span className="text-gray-500">Indent ID:</span> <span className="font-semibold">{active.indentId}</span></div>
              )}
              <div><span className="text-gray-500">Requester:</span> {active.requester?.username || active.requestedBy?.name || "—"} ({active.requester?.role || active.requestedBy?.role || "—"})</div>
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

            {/* Photo Display */}
            {active.photoUrl && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Uploaded Photo</h4>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={active.photoUrl} 
                    alt="Indent List" 
                    className="w-full h-auto max-h-96 object-contain bg-gray-50 cursor-pointer"
                    onClick={() => window.open(active.photoUrl, '_blank')}
                  />
                  {active.fileName && (
                    <div className="px-3 py-2 bg-gray-50 text-xs text-gray-600 border-t">
                      {active.fileName}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => actionCall(active._id, "approve")}>Approve</Button>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => actionCall(active._id, "reject")}>Reject</Button>
                </>
              )}
              {active.status === "approved" && (
                <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white" onClick={() => actionCall(active._id, "issue")}>Mark Issued</Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </DashboardLayout>
  );
}