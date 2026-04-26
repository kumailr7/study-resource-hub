"use client";

import { useEffect, useRef } from "react";

interface RecordingPreviewProps {
  mode: "screen" | "camera";
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
}

export function RecordingPreview({
  mode,
  screenStream,
  cameraStream,
}: RecordingPreviewProps) {
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  return (
    <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden bg-surface border border-border shadow-lg shadow-black/30">
      {/* Screen-only preview */}
      {mode === "screen" && (
        <video
          ref={screenVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
        />
      )}

      {/* Camera-only preview */}
      {mode === "camera" && (
        <video
          ref={cameraVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain mirror"
          style={{ transform: "scaleX(-1)" }}
        />
      )}
    </div>
  );
}
