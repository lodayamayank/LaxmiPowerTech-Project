// src/services/faceLandmarker.js
//
// Responsibility: load and expose a single, reusable MediaPipe FaceLandmarker
// instance for webcam/video use. No React, no camera rendering, no
// attendance/capture-button logic lives here.

// Requires: @mediapipe/tasks-vision
//   npm install @mediapipe/tasks-vision

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Module-level singleton state. Ensures the model is loaded only once and
// concurrent callers await the same in-flight initialization instead of
// triggering duplicate loads.
let faceLandmarkerInstance = null;
let initPromise = null;
let initFailed = false;

/**
 * Initializes (if needed) and returns the shared FaceLandmarker instance.
 *
 * Resolves to `null` (never throws) if MediaPipe isn't installed, the model
 * fails to load, or the browser/environment doesn't support it. Callers
 * should treat a `null` result as "face detection unavailable" and continue
 * without it.
 *
 * @returns {Promise<import('@mediapipe/tasks-vision').FaceLandmarker | null>}
 */
export async function getFaceLandmarker() {
  if (faceLandmarkerInstance) {
    return faceLandmarkerInstance;
  }

  if (initFailed) {
    // Already tried and failed this session; don't retry endlessly.
    return null;
  }

  if (initPromise) {
    // Initialization already in progress — reuse it.
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const { FaceLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );

      const filesetResolver = await FilesetResolver.forVisionTasks(
        WASM_BASE_URL
      );

      faceLandmarkerInstance = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        }
      );

      return faceLandmarkerInstance;
    } catch (error) {
      console.error("FaceLandmarker: failed to initialize.", error);
      initFailed = true;
      faceLandmarkerInstance = null;
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}