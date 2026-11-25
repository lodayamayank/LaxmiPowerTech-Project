// src/screens/SelfieCaptureScreen.jsx
import React, { useEffect, useRef, useState } from "react";
import { ROUTES } from '@/lib/routes';
import { getUserRaw } from '@/lib/session';
import { useNavigate, useLocation } from "react-router-dom";
import ConfirmModal from "@/pages/attendance/components/ConfirmModal";
import FaceCamera from "@/pages/attendance/components/FaceCamera";
import { submitOffline } from "@/pwa/offlineSubmit";
import { markPunchedLocally } from "@/lib/punchStatusCache";
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Delete, Fingerprint, MapPin, UserCheck } from 'lucide-react';
import { IconTile } from '@/components/common/IconTile';
import { Notice } from '@/components/common/Notice';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';
import { cn } from '@/lib/utils';

const FALLBACK_DELAY_MS = 30000;

// Gate debug logs so they don't ship to prod consoles (and don't leak
// user id / location / timestamps to anyone with devtools open).
const isDev = !import.meta.env.PROD;
const devLog = (...args) => { if (isDev) console.log(...args); };

// localStorage can contain a corrupted/partial value (old app version,
// manual tampering, interrupted write). Never let JSON.parse crash render.
function readStoredUser() {
  try {
    const raw = getUserRaw();
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("SelfieCaptureScreen: failed to parse stored user.", err);
    return null;
  }
}

const SelfieCaptureScreen = () => {
  const user = readStoredUser();
  const webcamRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [showSupervisorInput, setShowSupervisorInput] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStatus, setFaceStatus] = useState("idle");
  const [faceMessage, setFaceMessage] = useState("Starting camera…");

  const navigate = useNavigate();
  const locationState = useLocation().state || {};
  const { punchType, location, branchId, branchName, timestamp } = locationState;
  const [done, setDone] = useState(null); // { offline, viaCode } once the punch is recorded (shows the success screen)

  // Missing required navigation state (deep link, refresh, back/forward
  // nav) — tell the user immediately instead of letting them take a
  // selfie first and find out on submit.
  const hasRequiredParams = Boolean(punchType && location?.lat && location?.lng);

  useEffect(() => {
    if (!hasRequiredParams) {
      toast.error("Missing punch details. Please start again from the dashboard.");
      navigate(ROUTES.dashboard, { replace: true });
    }
    // Only needs to run once on mount; locationState is fixed for this screen instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  // Single source of truth for the "couldn't capture? here's a fallback"
  // timer, used both on mount and after a cancelled/failed capture.
  const armFallbackTimer = () => {
    clearFallbackTimer();
    setShowFallback(false);
    fallbackTimerRef.current = setTimeout(() => {
      setShowFallback(true);
      fallbackTimerRef.current = null;
    }, FALLBACK_DELAY_MS);
  };

  useEffect(() => {
    armFallbackTimer();
    return clearFallbackTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    if (!faceDetected) return;

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Couldn\u2019t capture the photo", { description: "Hold still and try again." });
      return;
    }
    clearFallbackTimer();
    setShowFallback(false);
    setCapturedImage(imageSrc);
    setShowConfirm(true);
  };

  const cancelConfirmation = () => {
    setShowConfirm(false);
    setCapturedImage(null);
    // Re-arm the fallback timer, but leave any supervisor code the user
    // already typed alone — cancelling the selfie confirm is unrelated
    // to the supervisor-code recovery flow.
    armFallbackTimer();
  };

  function dataURLtoFile(dataURL, filename) {
    const [header, data] = dataURL.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(data);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
    return new File([u8], filename, { type: mime });
  }

  const extractErrorMessage = (err, fallback) =>
    err.response?.data?.message || err.response?.data?.error || err.message || fallback;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      devLog('📸 Starting punch submission...');
      devLog('User:', user?._id);
      devLog('Location:', location);
      devLog('PunchType:', punchType);
      devLog('BranchId:', branchId);
      devLog('Timestamp:', timestamp);
      devLog('CapturedImage:', capturedImage ? 'Present' : 'Missing');

      if (!user?._id || !location?.lat || !location?.lng || !punchType || !capturedImage) {
        toast.error("Missing required data. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const selfieFile = dataURLtoFile(capturedImage, "selfie.jpg");
      devLog('📷 Selfie file created:', selfieFile.name, selfieFile.size, 'bytes', selfieFile.type);

      const formData = new FormData();
      formData.append("selfie", selfieFile);
      formData.append("punchType", punchType);
      formData.append("lat", String(location.lat));
      formData.append("lng", String(location.lng));
      if (branchId) formData.append("branchId", branchId);

      // One call for both cases: sent now if there is a connection, stored in
      // IndexedDB (selfie File and all) and replayed later if there is not.
      // capturedAt is the moment the user punched, so a punch that syncs hours
      // later is still recorded at the time it was actually made.
      const result = await submitOffline({
        module: "attendance",
        endpoint: "/attendance/punch",
        formData,
        capturedAt: timestamp || new Date().toISOString(),
        label: `Punch ${punchType}`,
        meta: { branchId, punchType },
      });

      markPunchedLocally(punchType);

      if (result.offline) {
        toast.info("Saved on your phone", { description: "Will send when you\u2019re back online" });
      }
      setShowConfirm(false);
      setDone({ offline: Boolean(result.offline), viaCode: false });
    } catch (err) {
      console.error('❌ Punch error:', err.response?.status, err.response?.data, err.message);
      toast.error(`Couldn\u2019t punch ${punchType}`, {
        description: extractErrorMessage(err, "Please try again."),
        action: { label: "Retry", onClick: () => handleConfirm() },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupervisorCodeSubmit = async () => {
    if (isSubmitting) return;

    if (supervisorCode.length !== 6) {
      toast.error("Enter the 6-digit code", { description: "Ask your supervisor for today\u2019s code." });
      return;
    }

    if (!user?._id || !location?.lat || !location?.lng || !punchType) {
      toast.error("Missing required data. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("code", supervisorCode);
      formData.append("punchType", punchType);
      formData.append("lat", String(location.lat));
      formData.append("lng", String(location.lng));
      if (branchId) formData.append("branchId", branchId);

      // Same offline-safe path as the selfie punch, so a supervisor-code
      // punch made with no signal still queues and syncs later instead
      // of failing outright — this is a fallback path, it should be at
      // least as resilient as the primary one, not less.
      const result = await submitOffline({
        module: "attendance",
        endpoint: "/attendance/supervisor-code-punch",
        formData,
        capturedAt: timestamp || new Date().toISOString(),
        label: `Punch ${punchType} (supervisor code)`,
        meta: { branchId, punchType },
      });

      markPunchedLocally(punchType);

      if (result.offline) {
        toast.info("Saved on your phone", { description: "Will send when you\u2019re back online" });
      }
      setDone({ offline: Boolean(result.offline), viaCode: true });
    } catch (err) {
      console.error("❌ Supervisor code punch error:", err.response?.status, err.response?.data, err.message);
      toast.error("Couldn\u2019t record attendance", {
        description: extractErrorMessage(err, "Check the code and try again."),
        action: { label: "Retry", onClick: () => handleSupervisorCodeSubmit() },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Required nav state is missing — we've already redirected in the effect
  // above; render nothing in the meantime rather than a half-usable screen.
  if (!hasRequiredParams) {
    return null;
  }

  const typeWord = punchType === "in" ? "in" : "out";
  const online = navigator.onLine;
  const when = new Date(timestamp || Date.now());
  const siteLabel = branchName || "Your assigned site";

  if (done) {
    const rows = [
      ["Time", `${when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}, ${when.toLocaleDateString("en-GB", { weekday: "short" })}, ${when.getDate()} ${when.toLocaleDateString("en-GB", { month: "short" })}`],
      ["Site", siteLabel],
      [done.viaCode ? "Verified by" : "Selfie", done.viaCode ? "Supervisor code" : "Verified"],
      ["Status", done.offline ? "Saved on your phone" : "Sent to office"],
    ];
    return (
      <MobilePage title="Mark attendance" className="items-center justify-center gap-5 text-center">
        <span className="flex size-[88px] items-center justify-center rounded-full bg-tone-ok-soft text-tone-ok-fg ring-[10px] ring-tone-ok-soft/50">
          <UserCheck className="size-10" />
        </span>
        <div>
          <div className="text-[24px] font-semibold text-ink-1">You&apos;re punched {typeWord}</div>
          <div className="mt-1 text-[15px] text-ink-3">{punchType === "in" ? "Have a safe day at work." : "See you tomorrow."}</div>
        </div>
        <MobileCard className="w-full text-left">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
              <span className="w-20 text-small text-ink-3">{label}</span>
              <span className="flex-1 text-[14.5px] font-semibold text-ink-1">{value}</span>
            </div>
          ))}
        </MobileCard>
        <Button size="xl" className="w-full" onClick={() => navigate(ROUTES.dashboard)}>
          Done
        </Button>
      </MobilePage>
    );
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <>
      <MobilePage
        title="Mark attendance"
        back
        onBack={() => navigate(-1)}
        right={
          <Badge variant={online ? "ok" : "bad"} className="gap-1.5">
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {online ? "Online" : "Offline"}
          </Badge>
        }
        footer={
          showSupervisorInput ? (
            <Button size="xl" className="w-full" disabled={supervisorCode.length !== 6 || isSubmitting} onClick={handleSupervisorCodeSubmit}>
              {isSubmitting ? "Verifying…" : `Punch ${typeWord} with code`}
            </Button>
          ) : (
            <Button size="xl" className="w-full" onClick={capture} disabled={isSubmitting || !faceDetected}>
              <Fingerprint /> {isSubmitting ? "Processing…" : `Take selfie & punch ${typeWord}`}
            </Button>
          )
        }
      >
        {showSupervisorInput ? (
          <>
            <MobileCard className="flex flex-col gap-3.5">
              <div>
                <h2 className="text-[15px] font-semibold text-ink-1">Enter today&apos;s code</h2>
                <div className="mt-0.5 text-small text-ink-3">Ask your supervisor for the 6-digit code.</div>
              </div>
              <div className="flex gap-2" role="group" aria-label="Attendance code" id="supervisor-code">
                {Array.from({ length: 6 }, (_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "flex h-[52px] flex-1 items-center justify-center rounded-control border bg-surface text-[22px] font-semibold tabular-nums",
                      idx === supervisorCode.length ? "border-2 border-primary" : "border-line-input",
                    )}
                  >
                    {supervisorCode[idx] || ""}
                  </span>
                ))}
              </div>
            </MobileCard>
            <div className="grid grid-cols-3 gap-2 rounded-[14px] bg-surface-muted p-2">
              {keys.map((key, idx) =>
                key === "" ? (
                  <span key={idx} />
                ) : key === "del" ? (
                  <Button key={idx} type="button" variant="ghost" aria-label="Delete digit" className="!h-[54px] rounded-[12px]" onClick={() => setSupervisorCode((c) => c.slice(0, -1))}>
                    <Delete className="!size-5" />
                  </Button>
                ) : (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    className="!h-[54px] rounded-[12px] border-0 bg-surface text-[22px] font-semibold tabular-nums text-ink-1"
                    onClick={() => setSupervisorCode((c) => (c.length < 6 ? c + key : c))}
                  >
                    {key}
                  </Button>
                ),
              )}
            </div>
            <Button type="button" variant="link" onClick={() => setShowSupervisorInput(false)}>
              Back to selfie
            </Button>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="text-[30px] font-semibold tabular-nums text-primary">
                {when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
              </div>
              <div className="text-small text-ink-3">{when.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            </div>

            <div className="relative flex h-[330px] items-center justify-center overflow-hidden rounded-[18px] bg-ink-1">
              <FaceCamera
                webcamRef={webcamRef}
                onFaceDetected={(detected, ready, status, message) => {
                  setFaceDetected(detected);
                  setFaceStatus(status);
                  setFaceMessage(ready ? message : "Loading face check… this can take a moment on a slow connection");
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="relative h-[240px] w-[190px] rounded-full border-[3px] border-dashed border-surface/70" aria-hidden="true" />
              <Badge variant="neutral" className="absolute left-3 top-3">
                Front camera
              </Badge>
              <span className="absolute inset-x-0 bottom-3.5 px-3 text-center text-[13.5px] text-surface" aria-live="polite">
                {faceStatus === "holding" ? "Hold still, ready to capture" : faceMessage || "Fit your face inside the oval"}
              </span>
            </div>

            <MobileCard className="flex items-center gap-3">
              <IconTile icon={MapPin} tone="ok" className="size-10" />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold text-ink-1">Inside {siteLabel}</div>
                <div className="text-small text-ink-3">Location checked just now · within geofence</div>
              </div>
              <Badge variant="ok">OK</Badge>
            </MobileCard>

            {showFallback && !capturedImage ? (
              <Notice tone="warn" title="Unable to capture your selfie?">
                Use today&apos;s 6-digit code from your supervisor instead.
              </Notice>
            ) : null}

            <Button type="button" variant="link" className="text-[14px] font-semibold" onClick={() => setShowSupervisorInput(true)}>
              Selfie not working? Use today&apos;s code
            </Button>
          </>
        )}
      </MobilePage>

      {showConfirm && (
        <ConfirmModal image={capturedImage} user={user} punchType={punchType} onCancel={cancelConfirmation} onConfirm={handleConfirm} />
      )}
    </>
  );
};

export default SelfieCaptureScreen;
