// src/pages/leaves/Leaves.jsx  (mobile: the "Requests" tab)
// Laid out like the Leave design: a request card (type chips, dates, reason, proof for sick leave) and "My requests".
// The requests (GET /leaves/my, POST /leaves through the offline queue) are unchanged.
import { useEffect, useRef, useState } from "react";
import axios from "@/api/client";
import { submitOffline } from "@/pwa/offlineSubmit";
import Webcam from "react-webcam";
import dayjs from "dayjs";
import { toast } from 'sonner';
import { Camera, CalendarOff, Send, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChips } from "@/components/common/ChoiceChips";
import { EmptyState } from "@/components/common/EmptyState";
import { FormField } from "@/components/common/FormField";
import { PageLoader } from "@/components/common/PageLoader";
import { StatusBadge } from "@/components/common/StatusBadge";
import MobileCard from "@/layouts/mobile/MobileCard";
import MobilePage from "@/layouts/mobile/MobilePage";
import { getLeaveTypeTone } from "@/lib/status";

const TYPES = [
  { value: "paid", label: "Paid" },
  { value: "sick", label: "Sick" },
  { value: "casual", label: "Casual" },
  { value: "unpaid", label: "Unpaid" },
];

export default function Leaves() {
  const webcamRef = useRef(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "paid",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [sickProof, setSickProof] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const setProofFile = (file) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (file && (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
      toast.error("Photo not accepted", { description: "Choose an image smaller than 10 MB." });
      setSickProof(null);
      return;
    }
    setSickProof(file || null);
  };

// Validate sick-proof image type and size before storing it.
  const handleProofChange = (event) => {
    setProofFile(event.target.files?.[0] || null);
  };

  const captureProof = () => {
    const imageData = webcamRef.current?.getScreenshot();
    if (!imageData) {
      toast.error("Camera isn\u2019t ready", { description: "Wait a moment and try again." });
      return;
    }

    fetch(imageData)
      .then((response) => response.blob())
      .then((blob) => {
        setProofFile(new File([blob], `sick-proof-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setCameraOpen(false);
      })
      .catch(() => toast.error("Couldn\u2019t capture the photo", { description: "Hold still and try again." }));
  };

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/leaves/my");
      setLeaves(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Couldn\u2019t load your requests", { description: "Check your connection and try again.", action: { label: "Retry", onClick: () => loadLeaves() } });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.type === "sick" && !sickProof) {
      toast.error("Add a medical proof", { description: "Sick leave needs a photo of the certificate." });
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (form.type === "sick") formData.append("proof", sickProof);

      const result = await submitOffline({
        module: "leave",
        endpoint: "/leaves",
        formData,
        label: `Leave request (${form.type})`,
      });

      if (result.offline) {
        toast.info("Saved on your phone", { description: "Will send when you\u2019re back online" });
      } else {
        toast.success("Leave request sent", { description: "Your supervisor will review it" });
      }

      setForm({ type: "paid", startDate: "", endDate: "", reason: "" });
      setSickProof(null);
      // Nothing new to list until the queued request actually reaches the server.
      if (!result.offline) loadLeaves();
    } catch (err) {
      console.error(err);
      toast.error("Couldn\u2019t send the request", { description: err.response?.data?.message || "Check your connection and try again." });
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  if (loading) return <PageLoader label="Loading your requests" />;

  return (
    <MobilePage title="Leave" back tabs="worker">
      <form onSubmit={handleSubmit}>
        <MobileCard title="Request leave" className="flex flex-col gap-3.5">
          <FormField label="Type">
            <ChoiceChips
              aria-label="Leave type"
              options={TYPES}
              value={form.type}
              // Update leave type and clear sick proof when not using sick leave.
              onChange={(type) => {
                setForm((f) => ({ ...f, type }));
                if (type !== "sick") setSickProof(null);
              }}
            />
          </FormField>

          {form.type === "sick" && (
            <FormField label="Medical proof" required htmlFor="leave-proof" hint={sickProof ? sickProof.name : "Upload or capture an image to continue"}>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => document.getElementById("leave-proof")?.click()}>
                  <Upload /> Upload image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCameraError("");
                    setCameraOpen(true);
                  }}
                >
                  <Camera /> Capture image
                </Button>
                <Input
                  id="leave-proof"
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleProofChange}
                  className="hidden"
                />
              </div>
              {cameraOpen && (
                <div className="mt-3 rounded-card border border-line-card bg-surface-subtle p-3">
                  {cameraError ? (
                    <p className="text-small text-tone-bad-fg">{cameraError}</p>
                  ) : (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.8}
                      onUserMediaError={() => setCameraError("Camera access was denied or is unavailable. Please allow camera access and try again.")}
                      videoConstraints={{ facingMode: { ideal: "environment" } }}
                      className="w-full rounded-control object-cover"
                    />
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button type="button" onClick={captureProof} disabled={Boolean(cameraError)} className="flex-1">
                      Take photo
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCameraOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="From" htmlFor="leave-start-date">
              <Input id="leave-start-date" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
            </FormField>
            <FormField label="To" htmlFor="leave-end-date">
              <Input id="leave-end-date" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
            </FormField>
          </div>

          <FormField label="Reason (optional)" htmlFor="leave-reason">
            <Textarea id="leave-reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Add a short note for your manager" />
          </FormField>

          <Button type="submit" size="xl" className="w-full">
            <Send /> Send request
          </Button>
        </MobileCard>
      </form>

      <MobileCard title="My requests">
        {leaves.length === 0 ? (
          <EmptyState icon={CalendarOff} title="No leave requests yet" description="Requests you send show here with their status." />
        ) : (
          <ul>
            {leaves.map((l) => {
              const days = Math.max(1, Math.round((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1);
              return (
                <li key={l._id} className="flex flex-col gap-1.5 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant={getLeaveTypeTone(l.type)} className="capitalize">
                      {l.type} leave
                    </Badge>
                    <StatusBadge status={l.status} />
                  </div>
                  <div className="text-small tabular-nums text-ink-2">
                    {dayjs(l.startDate).format("DD MMM YYYY")} → {dayjs(l.endDate).format("DD MMM YYYY")}
                    <span className="text-ink-3">
                      {" "}
                      · {days} {days === 1 ? "day" : "days"}
                    </span>
                  </div>
                  {l.reason ? <p className="text-small italic text-ink-3">&ldquo;{l.reason}&rdquo;</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </MobileCard>
    </MobilePage>
  );
}
