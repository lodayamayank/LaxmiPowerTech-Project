// src/hooks/useFaceDetection.js

import { useEffect, useRef, useState } from "react";
import { getFaceLandmarker } from "../services/faceLandmarker";
import {
  classifyFrame,
  buildValidationResult,
  getFaceBoundingBox,
  DEFAULT_GUIDE,
} from "../utils/faceValidation";

// Limit model inference to about 5 checks per second.
const DETECTION_INTERVAL_MS = 200;

export function useFaceDetection(videoRef, guide = DEFAULT_GUIDE) {
  const [faceDetected, setFaceDetected] = useState(false);
  const [isFaceDetectionReady, setIsFaceDetectionReady] = useState(false);
  const [validation, setValidation] = useState(() =>
    buildValidationResult("idle")
  );

  // Track the detection loop and component lifecycle.
  const rafIdRef = useRef(null);
  const lastRunTimeRef = useRef(0);
  const loopStartedRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastFaceDetectedRef = useRef(false);
  const lastStatusRef = useRef("idle");

  useEffect(() => {
    isMountedRef.current = true;
    loopStartedRef.current = false;

    async function init() {
      const landmarker = await getFaceLandmarker();

      // Stop if the component was unmounted while the model was loading.
      if (!isMountedRef.current) {
        return;
      }

      // Detection is unavailable if the model could not be loaded.
      if (!landmarker) {
        setIsFaceDetectionReady(false);
        return;
      }

      setIsFaceDetectionReady(true);

      // Prevent duplicate detection loops.
      if (loopStartedRef.current) {
        return;
      }

      loopStartedRef.current = true;

      const detectLoop = (timestamp) => {
        if (!isMountedRef.current) {
          return;
        }

        const video = videoRef.current;
        const elapsed = timestamp - lastRunTimeRef.current;

        const videoIsPlayable =
          video &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0;

        if (elapsed >= DETECTION_INTERVAL_MS && videoIsPlayable) {
          lastRunTimeRef.current = timestamp;

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

        rafIdRef.current = requestAnimationFrame(detectLoop);
      };

      rafIdRef.current = requestAnimationFrame(detectLoop);
    }

    init();

    return () => {
      isMountedRef.current = false;

      // Cancel the detection loop when the component unmounts.
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      loopStartedRef.current = false;
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