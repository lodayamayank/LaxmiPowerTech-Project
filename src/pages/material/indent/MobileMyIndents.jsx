// src/pages/mobile/MobileMyIndents.jsx
import { useEffect, useState } from "react";
import axios from "@/api/client";
import dayjs from "dayjs";
import { Button } from '@/components/ui/button';

const StatusPill = ({ value }) => {
  const map = {
    pending: "bg-tone-warn-soft text-tone-warn-fg",
    approved: "bg-tone-info-soft text-tone-info-fg",
    rejected: "bg-tone-bad-soft text-tone-bad-fg",
    issued: "bg-tone-ok-soft text-tone-ok-fg",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[value] || "bg-surface-muted text-ink-2"}`}>{value}</span>;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  useEffect(() => { fetchMine(); }, [status]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">My Indents</h1>
        <select
          aria-label="Filter by status"
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
          <div className="text-sm text-ink-3">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-ink-3">No indents yet</div>
        ) : list.map((it) => (
          <button
            key={it._id}
            onClick={() => { setActive(it); setOpen(true); }}
            className="w-full text-left bg-surface rounded-xl border px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.project?.name || "Project"}</div>
              <StatusPill value={it.status} />
            </div>
            <div className="text-xs text-ink-3">
              {dayjs(it.requestedAt || it.createdAt).format("DD MMM YYYY • HH:mm")}
            </div>
            <div className="text-sm mt-1 line-clamp-1">{it.purpose || "—"}</div>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {open && active && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-scrim/40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Indent Detail</h3>
              <Button
                type="button"
                variant="ghost"
                aria-label="Close"
                className="h-auto w-auto p-0 font-normal text-ink-3 hover:bg-transparent hover:text-ink-1"
                onClick={() => setOpen(false)}
              >
                ✕
              </Button>
            </div>
            <div className="text-sm space-y-1">
              <div><span className="text-ink-3">Project:</span> {active.project?.name || "—"}</div>
              <div><span className="text-ink-3">Branch:</span> {active.branch?.name || "—"}</div>
              <div><span className="text-ink-3">Status:</span> <StatusPill value={active.status} /></div>
              <div><span className="text-ink-3">Purpose:</span> {active.purpose || "—"}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-ink-3">Requested:</span> {active.requestedAt ? dayjs(active.requestedAt).format("DD MMM, HH:mm") : "—"}</div>
                <div><span className="text-ink-3">Approved:</span> {active.approvedAt ? dayjs(active.approvedAt).format("DD MMM, HH:mm") : "—"}</div>
                <div><span className="text-ink-3">Issued:</span> {active.issuedAt ? dayjs(active.issuedAt).format("DD MMM, HH:mm") : "—"}</div>
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
                  <div className="px-3 py-2 text-ink-3 text-sm">No items</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}