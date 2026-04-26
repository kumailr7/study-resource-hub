import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DeviceSelector } from "./DeviceSelector";
import { RecordingPreview } from "./RecordingPreview";
import { DojoYoshiLogo } from "./Logo";
import { API_BASE_URL } from "../config";
import { PasswordGate } from "./PasswordGate";

type RecordingMode = string;
type RecorderState = string;

interface RecorderProps {
  password?: string;
}

export function Recorder({ password = "" }: RecorderProps) {
  const [mode, setMode] = useState<RecordingMode>("screen");
  const [micId, setMicId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authPassword, setAuthPassword] = useState(password);
  const [searchParams] = useSearchParams();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const startPreview = useCallback(async () => {
    if (mode === "screen" || mode === "screen+camera") {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setPreviewStream(stream);
      } catch (err) { /* Preview permission denied */ }
    } else if (mode === "camera") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { frameRate: { ideal: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setPreviewStream(stream);
      } catch (err) { /* Preview permission denied */ }
    }
  }, [mode]);

  useEffect(() => {
    startPreview();
    return () => { previewStream?.getTracks().forEach(t => t.stop()); };
  }, [mode]);

  function stopAllStreams() {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    setScreenStream(null);
    setCameraStream(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function startRecording() {
    if (!authPassword) {
      setShowAuth(true);
      return;
    }
    setError("");
    chunksRef.current = [];
    try {
      let recordStream: MediaStream | undefined;
      if (mode === "screen" || mode === "screen+camera") {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 60 }, width: { ideal: 3840 }, height: { ideal: 2160 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        screenStreamRef.current = screen;
        setScreenStream(screen);
        if (micId) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            micStream.getAudioTracks().forEach(track => screen.addTrack(track));
          } catch (e) { console.log("[Dojo-Yoshi] Mic not added:", e); }
        }
        screen.getVideoTracks()[0].addEventListener("ended", () => stopRecording());
      }
      if (mode === "camera" || mode === "screen+camera") {
        const camera = await navigator.mediaDevices.getUserMedia({
          video: { frameRate: { ideal: 60, min: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: mode === "camera" ? (micId ? { deviceId: { exact: micId } } : true) : false,
        });
        cameraStreamRef.current = camera;
        setCameraStream(camera);
      }
      if (mode === "screen") {
        recordStream = screenStreamRef.current!;
      } else if (mode === "camera") {
        recordStream = cameraStreamRef.current!;
      } else if (mode === "screen+camera" && screenStreamRef.current && cameraStreamRef.current) {
        // Combine screen and camera
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d")!;
        
        const screenVideo = document.createElement("video");
        screenVideo.srcObject = screenStreamRef.current;
        screenVideo.muted = true;
        await screenVideo.play();
        
        const cameraVideo = document.createElement("video");
        cameraVideo.srcObject = cameraStreamRef.current;
        cameraVideo.muted = true;
        await cameraVideo.play();
        
        const drawFrame = () => {
          if (screenVideo.videoWidth && screenVideo.videoHeight) {
            ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          }
          if (cameraVideo.videoWidth && cameraVideo.videoHeight) {
            const cw = 320, ch = 180;
            ctx.drawImage(cameraVideo, canvas.width - cw - 20, canvas.height - ch - 20, cw, ch);
          }
          if (state === "recording") requestAnimationFrame(drawFrame);
        };
        drawFrame();
        
        const canvasStream = canvas.captureStream(30);
        recordStream = canvasStream;
      }
      const codecs = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp8", "video/webm", ""];
      const mimeType = codecs.find((c) => c === "" || MediaRecorder.isTypeSupported(c)) || "";
      if (!recordStream) {
        setError("No stream available");
        setState("idle");
        return;
      }
      const mediaRecorder = new MediaRecorder(recordStream, { mimeType, videoBitsPerSecond: mode === "camera" ? 5_000_000 : 10_000_000 });
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => handleRecordingComplete();
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } catch (err: unknown) {
      stopAllStreams();
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Permission denied.");
      } else {
        setError("Failed to start recording.");
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleRecordingComplete() {
    setState("uploading");
    stopAllStreams();
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size === 0) {
      setError("No data captured.");
      setState("idle");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/screen-record/upload-url`, {
        method: "POST",
        headers: { "x-upload-password": authPassword, "Content-Type": "application/json" },
        body: JSON.stringify({ author: "kumail", title: "session", tags: mode }),
      });
      if (!res.ok) throw new Error("Failed to get URL");
      const { presignedUrl, key, publicUrl } = await res.json();
      if (!presignedUrl) throw new Error("Invalid response");
      
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", "video/webm");
      
      const progressInterval = setInterval(() => setUploadProgress(prev => prev < 100 ? prev + 5 : 100), 250);
      
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          clearInterval(progressInterval);
          setUploadProgress(100);
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => { clearInterval(progressInterval); reject(new Error("Upload failed")); };
        xhr.send(blob);
      });
      
      setShareUrl(publicUrl || `${window.location.origin}/watch/${key}`);
      setState("done");
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
      setState("idle");
    }
  }

  function reset() {
    setState("idle");
    setShareUrl("");
    setElapsed(0);
    setUploadProgress(0);
    setError("");
    chunksRef.current = [];
  }

  function formatTime(seconds: number): string {
    return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  }

  const [copied, setCopied] = useState(false);
  async function copyToClipboard() {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* Ignore */ }
  }

  if (state === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: "var(--surface)" }}>
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="rounded-full w-10 h-10 flex items-center justify-center mx-auto" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--accent)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke={getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#10b981"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div><h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Recording uploaded</h2><p className="text-sm" style={{ color: "var(--muted)" }}>Share the link below</p></div>
          <div className="flex items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
            <input readOnly value={shareUrl} className="flex-1 bg-transparent text-sm outline-none truncate" style={{ color: "var(--muted)" }} />
            <button onClick={copyToClipboard} className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-all" style={{ backgroundColor: "var(--accent)", color: "white" }}>{copied ? "Copied!" : "Copy"}</button>
          </div>
          <button onClick={reset} className="text-sm transition-colors" style={{ color: "var(--muted)" }}>Record another</button>
        </div>
      </div>
    );
  }

  if (state === "uploading") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: "var(--surface)" }}>
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Uploading...</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, backgroundColor: "var(--accent)" }} />
          </div>
          <p className="text-sm font-mono tabular-nums" style={{ color: "var(--muted)" }}>{uploadProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showAuth && !authPassword && (
        <PasswordGate onAuthenticated={(pw) => { setAuthPassword(pw); setShowAuth(false); }} />
      )}
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8" style={{ backgroundColor: "var(--surface)" }}>
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center"><DojoYoshiLogo size="sm" /></div>
          {(state as string) === "idle" && previewStream && (
            <video autoPlay muted playsInline ref={(el) => { if (el) el.srcObject = previewStream; }} className="w-full rounded-xl border shadow-lg aspect-video object-contain" style={{ borderColor: "var(--border)" }} />
          )}
          {(state as string) !== "idle" && (state as string) !== "done" && (state as string) !== "uploading" && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "var(--accent)", opacity: 0.2 }}>
                <span className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Recording</span>
                <span className="text-sm font-mono" style={{ color: "var(--foreground)" }}>{formatTime(elapsed)}</span>
              </div>
            </div>
          )}
          {(state as string) === "idle" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {([{ value: "screen", label: "Screen", icon: "🖥️" }, { value: "camera", label: "Camera", icon: "📷" }, { value: "screen+camera", label: "Screen + Cam", icon: "🖥️+📷" }] as const).map((opt) => (
                  <button key={opt.value} onClick={() => setMode(opt.value)} className="rounded-lg border p-3 text-center transition-all" style={{ backgroundColor: mode === opt.value ? "var(--accent)" : "var(--surface)", borderColor: mode === opt.value ? "var(--accent)" : "var(--border)" }}>
                    <div className="text-lg mb-1">{opt.icon}</div>
                    <div className="text-xs font-medium" style={{ color: mode === opt.value ? "white" : "var(--foreground)" }}>{opt.label}</div>
                  </button>
                ))}
              </div>
              <DeviceSelector kind="audioinput" label="Microphone" value={micId} onChange={setMicId} />
              {(mode === "camera" || mode === "screen+camera") && <DeviceSelector kind="videoinput" label="Camera" value={cameraId} onChange={setCameraId} />}
            </>
          )}
          {error && <p className="text-sm text-center" style={{ color: "#f87171" }}>{error}</p>}
          <div className="flex items-center justify-center gap-4">
            {(state as string) === "idle" && (
              <button onClick={startRecording} className="rounded-lg px-8 py-2.5 text-sm font-semibold transition-all shadow-lg" style={{ backgroundColor: "var(--accent)", color: "white" }}>Start Recording</button>
            )}
            {(state as string) === "recording" && (
              <>
                <span className="flex items-center gap-2 text-sm font-mono tabular-nums" style={{ color: "var(--muted)" }}>
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent)" }} />{formatTime(elapsed)}
                </span>
                <button onClick={stopRecording} className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-all" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--foreground)" }}>Stop</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}