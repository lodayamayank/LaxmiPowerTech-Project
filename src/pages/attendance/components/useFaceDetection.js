// src/hooks/useFaceDetection.js

import { useEffect, useRef, useState } from "react";
import { getFaceLandmarker, retainFaceLandmarker, releaseFaceLandmarker } from "@/services/faceLandmarker";
import {
  classifyFrame,
  buildValidationResult,
  getFaceBoundingBox,
  DEFAULT_GUIDE,
} from "@/lib/faceValidation";

// Limit model inference to about 5 checks per second.
const DETECTION_INTERVAL_MS = 200;

// How long to wait before trying to load the face model again after a failure.
const MODEL_RETRY_MS = 6000;

export function useFaceDetection(videoRef, guide = DEFAULT_GUIDE) {
  const [faceDetected, setFaceDetected] = useState(false);
  const [isFaceDetectionReady, setIsFaceDetectionReady] = useState(false);
  const [validation, setValidation] = useState(() =>
    buildValidationResult("idle")
  );

  // Last values reported to React, so state is only set when something actually changes.
  const lastFaceDetectedRef = useRef(false);
  const lastStatusRef = useRef("idle");

  useEffect(() => {
    // Everything this effect starts belongs to THIS run: its own flag, loop id and timer. React StrictMode (and
    // fast navigation) runs mount -> cleanup -> mount, and a run that was cleaned up must never start a loop or
    // schedule a retry afterwards.
    let cancelled = false;
    let rafId = null;
    let retryTimer = null;
    let lastRunTime = 0;

    retainFaceLandmarker();

    async function init() {
      const landmarker = await getFaceLandmarker();

      if (cancelled) return;

      // The model could not be loaded (slow or blocked network). Keep trying while the screen is open instead of
      // staying disabled forever; the supervisor-code fallback remains available meanwhile.
      if (!landmarker) {
        setIsFaceDetectionReady(false);
        retryTimer = setTimeout(init, MODEL_RETRY_MS);
        return;
      }

      setIsFaceDetectionReady(true);

      const detectLoop = (timestamp) => {
        if (cancelled) return;

        const video = videoRef.current;
        const elapsed = timestamp - lastRunTime;

        const videoIsPlayable =
          video &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0;

        // No inference while the tab is hidden (nothing to show, saves CPU/GPU and battery).
        if (elapsed >= DETECTION_INTERVAL_MS && videoIsPlayable && !document.hidden) {
          lastRunTime = timestamp;

          try {
            const result = landmarker.detectForVideo(video, timestamp);
            const rawFaces = result?.faceLandmarks || [];

            const faces = rawFaces.map((landmarks) => ({
              boundingBox: getFaceBoundingBox(landmarks),
            }));

            const status = classifyFrame({ faces }, guide);
            const detected = status === "holding";

            // Update React state only when the value changes.
            if (status !== lastStatusRef.current) {
              lastStatusRef.current = status;
              setValidation(buildValidationResult(status));
            }

            if (detected !== lastFaceDetectedRef.current) {
              lastFaceDetectedRef.current = detected;
              setFaceDetected(detected);
            }
          } catch (error) {
            console.error(
              "useFaceDetection: detection frame failed.",
              error
            );
          }
        }

        rafId = requestAnimationFrame(detectLoop);
      };

      rafId = requestAnimationFrame(detectLoop);
    }

    init();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      // Let the shared detector go when no screen uses it any more (it closes after a short idle time).
      releaseFaceLandmarker();
    };

    // videoRef and guide are stable for the lifetime of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    faceDetected,
    isFaceDetectionReady,
    status: validation.status,
    message: validation.message,
  };
}