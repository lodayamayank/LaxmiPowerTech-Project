// src/pages/mobile/MobileMyIndents.jsx
import { useEffect, useState } from "react";
import axios from "../../utils/axios";
import dayjs from "dayjs";

const StatusPill = ({ value }) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    issued: "bg-green-100 text-green-700",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[value] || "bg-gray-100 text-gray-700"}`}>{value}</span>;
};

export default function MobileMyIndents() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMine = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/indents/mine", { params: { status, limit: 100 } });
      setList(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMine(); /* eslint-disable-next-line */ }, [status]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">My Indents</h1>
        <select
          className="border rounded px-2 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="issued">Issued</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-gray-500">No indents yet</div>
        ) : list.map((it) => (
          <button
            key={it._id}
            onClick={() => { setActive(it); setOpen(true); }}
            className="w-full text-left bg-white rounded-xl border px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.project?.name || "Project"}</div>
              <StatusPill value={it.status} />
            </div>
            <div className="text-xs text-gray-500">
              {dayjs(it.requestedAt || it.createdAt).format("DD MMM YYYY • HH:mm")}
            </div>
            <div className="text-sm mt-1 line-clamp-1">{it.purpose || "—"}</div>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {open && active && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Indent Detail</h3>
              <button className="text-gray-500" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="text-sm space-y-1">
              <div><span className="text-gray-500">Project:</span> {active.project?.name || "—"}</div>
              <div><span className="text-gray-500">Branch:</span> {active.branch?.name || "—"}</div>
              <div><span className="text-gray-500">Status:</span> <StatusPill value={active.status} /></div>
              <div><span className="text-gray-500">Purpose:</span> {active.purpose || "—"}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Requested:</span> {active.requestedAt ? dayjs(active.requestedAt).format("DD MMM, HH:mm") : "—"}</div>
                <div><span className="text-gray-500">Approved:</span> {active.approvedAt ? dayjs(active.approvedAt).format("DD MMM, HH:mm") : "—"}</div>
                <div><span className="text-gray-500">Issued:</span> {active.issuedAt ? dayjs(active.issuedAt).format("DD MMM, HH:mm") : "—"}</div>
              </div>
            </div>
            <div className="mt-3">
              <h4 className="font-medium mb-1">Items</h4>
              <div className="border rounded-lg divide-y">
                {(active.items || []).map((x, i) => (
                  <div className="px-3 py-2 text-sm flex justify-between" key={i}>
                    <div className="font-medium">{x.name}</div>
                    <div>{x.quantity} {x.unit}</div>
                  </div>
                ))}
                {(!active.items || active.items.length === 0) && (
                  <div className="px-3 py-2 text-gray-500 text-sm">No items</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
