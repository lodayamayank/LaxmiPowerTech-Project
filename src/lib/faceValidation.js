// src/utils/faceValidation.js

// Pure face validation logic. No React, camera, or MediaPipe imports.
// These values control when the face is considered ready for capture.
export const VALIDATION_CONFIG = {
  // Face width must be at least 55% of the guide width.
  minFaceToGuideRatio: 0.55,

  // Face width must not exceed 115% of the guide width.
  maxFaceToGuideRatio: 1.15,

  // Maximum allowed normalized distance from the guide center.
  // Lower values require more accurate centering.
  maxCenterOffsetRatio: 0.35,
};

// Guide position and size use the same normalized 0–1 coordinates as MediaPipe.
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
  multipleFaces: "Multiple faces detected",
  tooFar: "Move closer",
  tooClose: "Move farther",
  notCentered: "Center your face",
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
// FaceLandmarker provides landmarks rather than a ready-to-use bounding box.
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

// Determines whether the current face position and size are valid for capture.
export function classifyFrame(frame, guide) {
  const { faces } = frame;

  // No face detected.
  if (faces.length === 0) {
    return "searching";
  }

  // Kept for future multi-face support. Currently unreachable because
  // FaceLandmarker is configured with numFaces: 1.
  if (faces.length > 1) {
    return "multipleFaces";
  }

  const face = faces[0];

  // Compare face width with the width of the capture guide.
  const faceWidthRatio =
    face.boundingBox.width / (guide.radiusX * 2);

  // Face is too small, so the user needs to move closer.
  if (faceWidthRatio < VALIDATION_CONFIG.minFaceToGuideRatio) {
    return "tooFar";
  }

  // Face is too large, so the user needs to move farther away.
  if (faceWidthRatio > VALIDATION_CONFIG.maxFaceToGuideRatio) {
    return "tooClose";
  }

  // Calculate the face's distance from the center of the guide.
  const dx = face.boundingBox.centerX - guide.centerX;
  const dy = face.boundingBox.centerY - guide.centerY;

  // Normalize X/Y distance using the guide's dimensions.
  const normalizedOffset = Math.hypot(
    dx / guide.radiusX,
    dy / guide.radiusY
  );

  // Face is correctly sized but not sufficiently centered.
  if (normalizedOffset > VALIDATION_CONFIG.maxCenterOffsetRatio) {
    return "notCentered";
  }

  // All validation checks passed; Capture can be enabled.
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