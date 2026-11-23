// src/utils/faceValidation.js

// Pure face validation logic. No React, camera, or MediaPipe imports.
// Kept for compatibility with components that still import these.
// They are no longer used for validation.
export const VALIDATION_CONFIG = {
  minFaceToGuideRatio: 0.55,
  maxFaceToGuideRatio: 1.15,
  maxCenterOffsetRatio: 0.35,
};
0
// Still used by the UI to draw the guide overlay.
export const DEFAULT_GUIDE = {
  centerX: 0.5,
  centerY: 0.5,
  radiusX: 0.32,
  radiusY: 0.32,
};

// User-facing messages for each validation state.
const STATUS_MESSAGES = {
  idle: "Starting camera…",
  searching: "Looking for face…",
  multipleFaces: "Only one person should be in the frame",
  holding: "Face detected",
  ready: "Face detected",
  capturing: "Capturing…",
  uploading: "Uploading…",
  success: "Capture successful",
  error: "Upload failed",
};

export function messageForStatus(status) {
  return STATUS_MESSAGES[status] || "";
}

// Creates a bounding box from MediaPipe's normalized landmark points.
// Kept in case other parts of the app (overlays, cropping) still use it.
export function getFaceBoundingBox(landmarks) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

// A frame is valid when exactly one face is visible.
// Position, size, and centering are intentionally not checked.
export function classifyFrame(frame) {
  const { faces } = frame;

  if (faces.length === 0) {
    return "searching";
  }

  if (faces.length > 1) {
    return "multipleFaces";
  }

  return "holding";
}

// Creates the status object consumed by the UI.
export function buildValidationResult(status, holdProgress = 0) {
  return {
    status,
    message: messageForStatus(status),
    holdProgress,
  };
}
