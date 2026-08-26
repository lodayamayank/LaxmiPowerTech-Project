// src/components/FaceCamera.jsx

import React, { useEffect, useMemo } from "react";
import Webcam from "react-webcam";
import { useFaceDetection } from "../hooks/useFaceDetection";

const videoConstraints = { facingMode: "user" };

const FaceCamera = ({ webcamRef, onFaceDetected, className }) => {
  // Use the video element already created by react-webcam.
  const videoRef = useMemo(
    () => ({
      get current() {
        return webcamRef?.current?.video ?? null;
      },
    }),
    [webcamRef]
  );

  const {
    faceDetected,
    isFaceDetectionReady,
    status,
    message,
  } = useFaceDetection(videoRef);

  // Send face validation results to the parent screen.
  useEffect(() => {
    onFaceDetected?.(
      faceDetected,
      isFaceDetectionReady,
      status,
      message
    );
  }, [
    faceDetected,
    isFaceDetectionReady,
    status,
    message,
    onFaceDetected,
  ]);

  return (
    <Webcam
      ref={webcamRef}
      audio={false}
      screenshotFormat="image/jpeg"
      className={className || "w-full h-full object-cover"}
      videoConstraints={videoConstraints}
    />
  );
};

export default FaceCamera;