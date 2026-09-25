// src/services/faceLandmarker.js
// Loads one shared MediaPipe instance.
// Tries GPU first, then CPU.
// Returns null if initialization fails.
//
//   const landmarker = await getFaceLandmarker();
//   if (!landmarker) {
//     // show "detection unavailable" UI, don't call detectForVideo
//     return;
//   }

const WASM_VERSION = "0.10.14";

const WASM_BASE_URL =
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${WASM_VERSION}/wasm`;

const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const INIT_TIMEOUT_MS = 20_000;

// Minimum time to wait after a failure before allowing another attempt.
// Prevents retry storms (e.g. a render loop calling this every frame)
// from hammering the CDN/model server when it's down.
const RETRY_COOLDOWN_MS = 5_000;

let faceLandmarkerInstance = null;
let initPromise = null;
let lastError = null;
let lastFailureAt = 0;

const listeners = new Set();

/**
 * Listen for model loading status changes: "loading" | "gpu-failed" | "ready" | "failed".
 */
export function onFaceLandmarkerStatus(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emit(status, detail) {
  for (const callback of listeners) {
    try {
      callback(status, detail);
    } catch (error) {
      console.error("FaceLandmarker: status listener error.", error);
    }
  }
}

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`FaceLandmarker: "${label}" timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * Returns the shared FaceLandmarker instance, or null if it could not be
 * loaded (unsupported browser, network/CDN failure, timeout, etc).
 *
 * Never throws. Never rejects. Safe to call without try/catch.
 * Always check the return value before using it.
 *
 * @param {Object} [options]
 * @param {number} [options.numFaces=1]
 * @param {boolean} [options.preferGPU=true]
 * @returns {Promise<import('@mediapipe/tasks-vision').FaceLandmarker | null>}
 */
export async function getFaceLandmarker(options = {}) {
  try {
    const { numFaces = 1, preferGPU = true } = options;

    if (faceLandmarkerInstance) {
      return faceLandmarkerInstance;
    }

    if (initPromise) {
      // Already loading — reuse the same promise.
      return initPromise;
    }

    // Cooldown: don't retry immediately after a recent failure.
    if (lastError && Date.now() - lastFailureAt < RETRY_COOLDOWN_MS) {
      return null;
    }

    lastError = null;
    emit("loading");

    initPromise = loadFaceLandmarker(numFaces, preferGPU).finally(() => {
      initPromise = null;
    });

    return await initPromise;
  } catch (unexpectedError) {
    // Last-resort guard: even a bug in this function itself must not
    // throw out to the caller. Log it, record it, return null.
    console.error("FaceLandmarker: unexpected error in getFaceLandmarker.", unexpectedError);
    lastError = unexpectedError;
    lastFailureAt = Date.now();
    emit("failed", unexpectedError);
    return null;
  }
}

async function loadFaceLandmarker(numFaces, preferGPU) {
  try {
    const { FaceLandmarker, FilesetResolver } = await withTimeout(
      import("@mediapipe/tasks-vision"),
      INIT_TIMEOUT_MS,
      "load tasks-vision module"
    );

    const filesetResolver = await withTimeout(
      FilesetResolver.forVisionTasks(WASM_BASE_URL),
      INIT_TIMEOUT_MS,
      "load WASM fileset"
    );

    // Try GPU first.
    if (preferGPU) {
      try {
        console.log("FaceLandmarker: trying GPU...");

        const instance = await withTimeout(
          FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: { modelAssetPath: MODEL_ASSET_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces,
          }),
          INIT_TIMEOUT_MS,
          "create GPU FaceLandmarker"
        );

        faceLandmarkerInstance = instance;
        console.log("FaceLandmarker: GPU ready.");
        emit("ready", { delegate: "GPU" });
        return instance;
      } catch (gpuError) {
        console.warn("FaceLandmarker: GPU failed. Trying CPU.", gpuError);
        emit("gpu-failed", gpuError);
      }
    }

    // Fall back to CPU.
    console.log("FaceLandmarker: trying CPU...");

    const instance = await withTimeout(
      FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MODEL_ASSET_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        numFaces,
      }),
      INIT_TIMEOUT_MS,
      "create CPU FaceLandmarker"
    );

    faceLandmarkerInstance = instance;
    console.log("FaceLandmarker: CPU ready.");
    emit("ready", { delegate: "CPU" });
    return instance;
  } catch (error) {
    console.error("FaceLandmarker: initialization failed.", error);
    faceLandmarkerInstance = null;
    lastError = error;
    lastFailureAt = Date.now();
    emit("failed", error);
    return null; // caller (getFaceLandmarker) just returns this up
  }
}

/**
 * Returns the latest initialization error, or null if the last attempt
 * succeeded (or nothing has been tried yet). Use this to show a real
 * error message instead of a generic "unavailable" state.
 */
export function getLastFaceLandmarkerError() {
  return lastError;
}

/**
 * Releases the current FaceLandmarker instance and resets state so the
 * next getFaceLandmarker() call starts fresh (ignores cooldown too).
 */
export function closeFaceLandmarker() {
  try {
    faceLandmarkerInstance?.close();
  } catch (error) {
    console.error("FaceLandmarker: close failed.", error);
  }
  faceLandmarkerInstance = null;
  initPromise = null;
  lastError = null;
  lastFailureAt = 0;
}

/** True when a ready detector instance currently exists. */
export function isFaceLandmarkerReady() {
  return faceLandmarkerInstance !== null;
}
