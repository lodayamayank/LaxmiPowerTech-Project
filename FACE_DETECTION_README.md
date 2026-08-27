# Face Detection for Selfie Attendance Capture

## Overview

This feature adds a face-detection/validation layer on top of the existing
selfie-based attendance capture flow. It does **not** change how attendance
is recorded — it only controls **when the existing Capture Photo button is
allowed to be clicked**.

---

## 1. Problem

The attendance flow lets a user tap **Capture Photo** at any time, even if:

- No face is visible in the frame at all (empty room, camera pointed away, etc.)
- The face is too far away, too close, or off to one side
- The resulting selfie is unusable for attendance verification

Since the captured image is submitted directly to the attendance API and
stored as the punch record, a bad or faceless photo becomes part of the
permanent attendance data with no recourse to catch it beforehand.

## 2. Goal / Constraints

The requirement was to add this as a **thin, additive layer**, with hard
constraints on what could *not* change:

- No changes to attendance logic, API calls, GPS/branch validation, or routing
- No changes to the existing `FormData` shape or the `/attendance/punch` endpoint
- No automatic capture — capture stays 100% manual, user-clicked
- No face recognition, face matching, embeddings, or identity verification —
  purely "is a usable face currently framed," nothing about *whose* face
- The app must never crash if the model fails to load or camera permission
  is denied
- No duplicate camera streams, no duplicate detection loops, no duplicate
  model instances

## 3. Solution Summary

A face-detection layer was added using **MediaPipe Tasks Vision
(FaceLandmarker)**, running entirely client-side in the browser. On each
processed frame it checks: is a face detected, and does its bounding box
satisfy the configured size/centering rules? That result becomes a status
(and a derived boolean) that gates the existing Capture Photo button —
nothing else.

```
Camera (existing react-webcam)
        ↓
Face Landmarker (MediaPipe, loaded once)
        ↓
useFaceDetection() — runs detection loop, converts landmarks to a bounding box
        ↓
faceValidation.js — given the bounding box + a guide shape, returns a status:
  searching / tooFar / tooClose / notCentered / holding
        ↓
faceDetected = (status === "holding")
        ↓
FaceCamera — reports faceDetected + status + message upward
        ↓
SelfieCaptureScreen — Capture Photo button enabled/disabled
        ↓
User manually clicks Capture Photo (unchanged)
        ↓
Existing capture() → ConfirmModal → handleConfirm() → submitOffline()
   (attendance submission flow retained, see §5.5)
```

---

## 4. Architecture — Why It's Split This Way

Each new file has exactly one job, so the existing screen stays untouched
wherever possible and detection logic can be tuned without touching UI code.

| Layer | File | Responsibility |
|---|---|---|
| Model loading | `src/services/faceLandmarker.js` | Load MediaPipe's FaceLandmarker **once**, as a singleton. Never throws. |
| Detection loop | `src/hooks/useFaceDetection.js` | Poll the video element at a throttled rate, run the model, classify the result. |
| Validation rules | `src/utils/faceValidation.js` | Pure functions: given a derived face bounding box + a guide shape, decide a status (`searching`, `tooFar`, `tooClose`, `notCentered`, `holding`, ...). No React, no camera code. Receives bounding-box data computed upstream in the hook — not raw landmark points directly. |
| Camera + wiring | `src/components/FaceCamera.jsx` | Renders the **existing** `react-webcam` config unchanged; connects its video element to `useFaceDetection`; reports results upward. |
| Screen integration | `src/pages/SelfieCaptureScreen.jsx` | Consumes `faceDetected`/status/message; gates the existing button; everything else unchanged. |

This separation means:
- Detection **thresholds** (size/centering tolerance) are tuned in one file (`faceValidation.js`) without touching the hook, camera, or screen.
- Detection **timing** (poll rate, throttling) is tuned in one file (`useFaceDetection.js`).
- The screen and camera component only ever consume a final boolean — they never contain detection logic themselves.

---

## 5. Implementation Details

### 5.1 Model loading — `faceLandmarker.js`

- Singleton pattern: the model is created once and reused for the lifetime of the app session; concurrent callers awaiting initialization share the same in-flight promise.
- Configured with `runningMode: "VIDEO"` and `numFaces: 1`. This limits how
  many faces the model **reports**, not how many people can physically be in
  frame — if multiple people are in the camera view, the model still returns
  at most one face (whichever it considers most prominent), and validation
  proceeds against that single reported face. This is **not** a guarantee
  that only one person is present.
- Wrapped entirely in try/catch. On any failure (missing package, network failure, unsupported browser, model load error), it logs the error and resolves to `null` instead of throwing. Callers treat `null` as "detection unavailable."
- After a failure, retries are allowed again after a cooldown window (see `RETRY_COOLDOWN_MS`) rather than being permanently blocked — a transient network/CDN issue doesn't require a page reload to recover from.

### 5.2 Detection loop — `useFaceDetection.js`

- Takes a `videoRef` (and an optional guide override) and returns `{ faceDetected, isFaceDetectionReady, status, message }`.
- Uses `requestAnimationFrame`, throttled to run actual inference only every **200ms (~5 checks/sec)** — the loop itself ticks every frame (cheap), but expensive model inference is rate-limited.
- Derives a bounding box from the raw MediaPipe landmark points and feeds it to `classifyFrame()` — the detected landmark points are converted into the bounding-box shape the validation rules expect.
- Only calls `setState` when a value actually **changes** (not on every frame), to avoid unnecessary re-renders.
- Fully cleans up on unmount: cancels any pending animation frame and stops processing via a mounted-ref guard.
- Guards against duplicate loops/instances via ref flags (`loopStartedRef`) — the effect only runs once per mount.

### 5.3 Validation rules — `faceValidation.js`

Given one frame's detected face(s) and a "guide" (the circular capture ring, expressed in normalized 0–1 coordinates), returns one status:

| Status | Meaning |
|---|---|
| `idle` | Camera/model still starting |
| `searching` | No face detected |
| `multipleFaces` | More than one face — **currently unreachable**, see note below |
| `tooFar` | Face too small relative to the guide |
| `tooClose` | Face too large relative to the guide |
| `notCentered` | Face present, right size, but off-center |
| `holding` | All checks pass — capture is allowed |

Tunable thresholds live in `VALIDATION_CONFIG`:
- `minFaceToGuideRatio` / `maxFaceToGuideRatio` — how close/far the user must be
- `maxCenterOffsetRatio` — how strictly centered the face must be

> **Known limitation:** `numFaces` is fixed at `1` in `faceLandmarker.js`, so the model only ever *reports* a single face regardless of how many people are physically in frame. The `multipleFaces` status exists in the code for forward-compatibility but cannot currently trigger, since `faces.length` from the model is capped at 1. **This is not multi-person rejection** — it does not detect or block a second person being present in the shot.

### 5.4 Camera + wiring — `FaceCamera.jsx`

- Uses the existing `react-webcam` configuration with the front-facing camera, audio disabled, and JPEG screenshots (`audio={false}`, `screenshotFormat="image/jpeg"`, `videoConstraints={{ facingMode: "user" }}`), same styling as before.
- Forwards the parent's `webcamRef` straight through, so `webcamRef.current?.getScreenshot()` behaves the same as before.
- Points `useFaceDetection` at the *same* video element the existing webcam already owns (via `webcamRef.current.video`) — no second camera stream is created.
- Reports `(faceDetected, isFaceDetectionReady, status, message)` to the parent via `onFaceDetected`.

### 5.5 Screen integration — `src/pages/SelfieCaptureScreen.jsx`

Only these changes were made to the original screen:
1. `<Webcam ...>` replaced with `<FaceCamera webcamRef={webcamRef} onFaceDetected={...} />`.
2. New state: `faceDetected`, `faceStatus`, `faceMessage`.
3. Capture button: `disabled={isSubmitting || !faceDetected}`.
4. `capture()` gains a defensive guard: `if (!faceDetected) return;` as its first line (redundant with the disabled button, but protects against edge cases).
5. The static "Ready to capture / Position your face in the circle" text is now driven by `faceMessage`/`faceStatus`, giving live guidance ("Move closer", "Move farther", "Center your face", "Face detected").

Everything else — `handleConfirm()`, `dataURLtoFile()`, the `FormData` fields, the `/attendance/punch` call, `submitOffline()`, `markPunchedLocally()`, GPS/branch handling, `ConfirmModal`, and navigation — retains the existing attendance submission flow: the same endpoint, the same `FormData` structure, the same offline-submission and confirmation behavior.

---

## 6. Safety Behaviors

| Failure scenario | Behavior |
|---|---|
| MediaPipe package not installed / fails to load | `getFaceLandmarker()` resolves to `null`; app doesn't crash; button simply never enables. Retries automatically after a cooldown window rather than failing permanently. |
| Camera permission denied | `FaceCamera.jsx` has no explicit `onUserMediaError` handler today; `react-webcam` itself does not crash on denial, but there is no dedicated user-facing error message for this case. With no video frames arriving, `faceDetected` stays `false` and the button stays disabled. If a user-facing "camera access denied" message is needed, that should be added explicitly to `FaceCamera.jsx`. |
| Detection throws on a single frame | Caught and logged; the loop continues to the next frame. **Known gap:** if an error occurs on the frame right after a successful "holding" detection, `faceDetected` is not reset — it can remain `true` (and the button enabled) based on the last successful frame until the next successful detection updates it. This has not yet been hardened with a fail-safe reset on error. |
| Component unmounts mid-detection | Loop stops via mounted-ref guard; pending animation frame is cancelled |
| Two `FaceCamera` instances mounted simultaneously | Each hook instance guards against starting more than one loop *for itself* (`loopStartedRef`); this has not been tested with multiple concurrent `FaceCamera` mounts, which is not part of the current screen's usage |

## 6.1 Explicit Limitation: No Liveness Detection

**This implementation does not perform liveness detection.** It validates
that a face is present and correctly framed (size and centering against a
guide) — it does **not** determine whether the detected face belongs to a
live person in front of the camera, versus a photo, screen, or video being
held up to it. If spoof resistance is a requirement, that is a separate,
unimplemented capability.

---

## 7. Dependency

```bash
npm install @mediapipe/tasks-vision
```

No other `package.json` changes.

---

## 8. Files Added / Modified

| File | Status |
|---|---|
| `src/services/faceLandmarker.js` | New |
| `src/hooks/useFaceDetection.js` | New |
| `src/utils/faceValidation.js` | New |
| `src/components/FaceCamera.jsx` | New |
| `src/pages/SelfieCaptureScreen.jsx` | Modified (minimal, see §5.5) |

---

## 9. Manual Test Checklist

- [ ] No face in frame → button disabled, message: "Looking for face…"
- [ ] Face far from camera → button disabled, message: "Move closer"
- [ ] Face very close to camera → button disabled, message: "Move farther"
- [ ] Face off to one side → button disabled, message: "Center your face"
- [ ] Face correctly framed → button enabled, message: "Face detected"
- [ ] Click Capture Photo while enabled → `ConfirmModal` opens as before
- [ ] Confirm → `submitOffline()` fires with the same `FormData` shape as before
- [ ] Deny camera permission → app does not crash; button stays disabled
- [ ] Simulate model load failure (e.g. block the MediaPipe CDN) → app does not crash; button stays disabled
- [ ] Only one `getUserMedia` prompt appears (no duplicate camera streams)
- [ ] No repeated initialization errors logged on every render (single log on failure, not a loop)

---

## 10. Explicitly Out of Scope

- Face recognition / identity matching / embeddings
- Age, gender, or emotion detection
- Automatic/timed capture
- **Liveness detection** — the system cannot distinguish a live person from a photo, screen, or video held up to the camera (see §6.1)
- **Guaranteed single-person-in-frame enforcement** — `numFaces: 1` limits what the model *reports*, not what's physically present; a second person in the shot is not detected or blocked (see §5.3 known limitation)
- Any change to attendance business logic, GPS/branch validation, or the attendance API contract
