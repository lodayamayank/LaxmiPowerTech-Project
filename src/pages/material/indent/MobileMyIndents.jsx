// src/pages/material/indent/MobileMyIndents.jsx  (route: /material/my-indents, mobile)
// The signed-in user's indents with a status filter and a detail sheet. The request (GET /indents/mine) and the
// fields shown are unchanged; the screen uses the mobile frame, design chips, cards and badges.
import { useEffect, useState } from "react";
import axios from "@/api/client";
import dayjs from "dayjs";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChoiceChips } from "@/components/common/ChoiceChips";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/PageLoader";
import MobileCard from "@/layouts/mobile/MobileCard";
import MobilePage from "@/layouts/mobile/MobilePage";

const TONE = { pending: "warn", approved: "info", rejected: "bad", issued: "ok" };
const label = (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : "—");
const StatusPill = ({ value }) => <Badge variant={TONE[value] || "neutral"}>{label(value)}</Badge>;
const when = (v) => (v ? dayjs(v).format("DD MMM, HH:mm") : "—");

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "issued", label: "Issued" },
  { value: "rejected", label: "Rejected" },
];

export default function MobileMyIndents() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState([]);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the status filter changes
  useEffect(() => { fetchMine(); }, [status]);

  return (
    <MobilePage title="My indents" back>
      <ChoiceChips aria-label="Filter by status" value={status} onChange={setStatus} options={FILTERS} />

      {loading ? (
        <PageLoader label="Loading indents" className="min-h-[240px] bg-transparent" />
      ) : list.length === 0 ? (
        <MobileCard>
          <EmptyState icon={FileText} title="No indents yet" description="Indents you raise will appear here." />
        </MobileCard>
      ) : (
        list.map((it) => (
          <button
            key={it._id}
            type="button"
            onClick={() => setActive(it)}
            className="w-full rounded-[14px] border border-line-card bg-surface px-4 py-3 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-[14.5px] font-semibold text-ink-1">{it.project?.name || "Project"}</div>
              <StatusPill value={it.status} />
            </div>
            <div className="mt-0.5 text-small text-ink-3">{dayjs(it.requestedAt || it.createdAt).format("DD MMM YYYY · HH:mm")}</div>
            <div className="mt-1 line-clamp-1 text-body text-ink-2">{it.purpose || "—"}</div>
          </button>
        ))
      )}

      <Sheet open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-[20px]">
          {active ? (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>Indent details</SheetTitle>
                <SheetDescription className="sr-only">Project, status, dates and items of this indent.</SheetDescription>
              </SheetHeader>
              <div className="mt-3 flex flex-col gap-2 text-body">
                <div><span className="text-ink-3">Project:</span> {active.project?.name || "—"}</div>
                <div><span className="text-ink-3">Branch:</span> {active.branch?.name || "—"}</div>
                <div className="flex items-center gap-2"><span className="text-ink-3">Status:</span> <StatusPill value={active.status} /></div>
                <div><span className="text-ink-3">Purpose:</span> {active.purpose || "—"}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-ink-3">Requested:</span> {when(active.requestedAt)}</div>
                  <div><span className="text-ink-3">Approved:</span> {when(active.approvedAt)}</div>
                  <div><span className="text-ink-3">Issued:</span> {when(active.issuedAt)}</div>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="mb-1.5 text-[14.5px] font-semibold text-ink-1">Items</h4>
                <div className="divide-y divide-line rounded-[12px] border border-line-card">
                  {(active.items || []).map((x, i) => (
                    <div className="flex justify-between gap-3 px-3 py-2 text-body" key={i}>
                      <div className="font-medium text-ink-1">{x.name}</div>
                      <div className="text-ink-2">{x.quantity} {x.unit}</div>
                    </div>
                  ))}
                  {(!active.items || active.items.length === 0) && <div className="px-3 py-2 text-body text-ink-3">No items</div>}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </MobilePage>
  );
}
