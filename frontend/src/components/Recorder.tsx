import { useState, useRef, useCallback } from "react";
import { DeviceSelector } from "./DeviceSelector";
import { RecordingPreview } from "./RecordingPreview";
import { YoomLogo } from "./Logo";
import { API_BASE_URL } from "../config";

type RecordingMode = "screen" | "camera" | "screen+camera";
type RecorderState = "idle" | "recording" | "uploading" | "done";

interface RecorderProps {
  password: string;
}

export function Recorder({ password }: RecorderProps) {
  const [mode, setMode] = useState<RecordingMode>("screen");
  const [micId, setMicId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const screenVideoElRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoElRef = useRef<HTMLVideoElement | null>(null);

  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const stopAllStreams = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    setScreenStream(null);
    setCameraStream(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
    screenVideoElRef.current = null;
    cameraVideoElRef.current = null;
  }, []);

  function startCanvasCompositing(
    canvas: HTMLCanvasElement,
    screen: MediaStream,
    camera: MediaStream,
  ): Promise<void> {
    const screenVideo = document.createElement("video");
    screenVideo.srcObject = screen;
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.play();
    screenVideoElRef.current = screenVideo;

    const cameraVideo = document.createElement("video");
    cameraVideo.srcObject = camera;
    cameraVideo.muted = true;
    cameraVideo.playsInline = true;
    cameraVideo.play();
    cameraVideoElRef.current = cameraVideo;

    const ctx = canvas.getContext("2d")!;

    return new Promise<void>((resolve) => {
      let resolved = false;
      let lastW = 0;
      let lastH = 0;
      let lastCamW = 0;
      let lastCamH = 0;
      let clipPath: Path2D | null = null;
      let strokePath: Path2D | null = null;
      let camX = 0;
      let camY = 0;
      let camWidth = 0;
      let camHeight = 0;

      function rebuildOverlay(w: number, h: number, cw: number, ch: number) {
        camWidth = Math.round(w * 0.2);
        camHeight = Math.round(camWidth * (ch / (cw || 1)));
        const padding = 20;
        camX = w - camWidth - padding;
        camY = h - camHeight - padding;
        const r = 12;

        const p = new Path2D();
        p.moveTo(camX + r, camY);
        p.lineTo(camX + camWidth - r, camY);
        p.quadraticCurveTo(camX + camWidth, camY, camX + camWidth, camY + r);
        p.lineTo(camX + camWidth, camY + camHeight - r);
        p.quadraticCurveTo(camX + camWidth, camY + camHeight, camX + camWidth - r, camY + camHeight);
        p.lineTo(camX + r, camY + camHeight);
        p.quadraticCurveTo(camX, camY + camHeight, camX, camY + camHeight - r);
        p.lineTo(camX, camY + r);
        p.quadraticCurveTo(camX, camY, camX + r, camY);
        p.closePath();
        clipPath = p;
        strokePath = new Path2D(p);

        lastW = w;
        lastH = h;
        lastCamW = cw;
        lastCamH = ch;
      }

      function draw() {
        const sw = screenVideo.videoWidth;
        const sh = screenVideo.videoHeight;

        if (sw > 0) {
          if (canvas.width !== sw || canvas.height !== sh) {
            canvas.width = sw;
            canvas.height = sh;
          }

          const cw = cameraVideo.videoWidth;
          const ch = cameraVideo.videoHeight;
          if (sw !== lastW || sh !== lastH || cw !== lastCamW || ch !== lastCamH) {
            rebuildOverlay(sw, sh, cw, ch);
          }

          ctx.drawImage(screenVideo, 0, 0, sw, sh);

          if (clipPath && camWidth > 0 && camHeight > 0) {
            ctx.save();
            ctx.clip(clipPath);
            ctx.drawImage(cameraVideo, camX, camY, camWidth, camHeight);
            ctx.restore();

            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = 2;
            ctx.stroke(strokePath!);
          }

          if (!resolved) {
            resolved = true;
            resolve();
          }
        }

        animationRef.current = requestAnimationFrame(draw);
      }

      draw();
    });
  }

  async function startRecording() {
    setError("");
    chunksRef.current = [];

    try {
      let recordStream: MediaStream;

      if (mode === "screen" || mode === "screen+camera") {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 60 },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
          },
          audio: true,
        });
        screenStreamRef.current = screen;
        setScreenStream(screen);

        screen.getVideoTracks()[0].addEventListener("ended", () => {
          stopRecording();
        });
      }

      if (mode === "camera" || mode === "screen+camera") {
        const cameraConstraints: MediaTrackConstraints = {
          frameRate: { ideal: 60, min: 30 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        };
        if (cameraId) {
          cameraConstraints.deviceId = { exact: cameraId };
        }
        const camera = await navigator.mediaDevices.getUserMedia({
          video: cameraConstraints,
          audio: mode === "camera" ? (micId ? { deviceId: { exact: micId } } : true) : false,
        });
        cameraStreamRef.current = camera;
        setCameraStream(camera);
      }

      if (mode === "screen") {
        recordStream = screenStreamRef.current!;
        if (micId) {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: micId } },
          });
          micStream.getAudioTracks().forEach((t) => recordStream.addTrack(t));
        }
      } else if (mode === "camera") {
        recordStream = cameraStreamRef.current!;
        if (micId) {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: micId } },
          });
          cameraStreamRef.current!.getVideoTracks().forEach((t) => t.stop());
          recordStream = new MediaStream([
            ...cameraStreamRef.current!.getVideoTracks(),
            ...micStream.getAudioTracks(),
          ]);
        }
      } else {
        const canvas = canvasRef.current!;
        await startCanvasCompositing(canvas, screenStreamRef.current!, cameraStreamRef.current!);
        const canvasStream = canvas.captureStream(60);

        if (micId) {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: micId } },
          });
          micStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
        } else if (screenStreamRef.current!.getAudioTracks().length > 0) {
          screenStreamRef.current!.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
        }

        recordStream = canvasStream;
      }

      const codecs = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp8",
        "video/webm",
        "",
      ];
      const mimeType = codecs.find((c) => c === "" || MediaRecorder.isTypeSupported(c)) || "";

      const videoBitsPerSecond = mode === "camera" ? 5_000_000 : 10_000_000;

      const recorderOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond,
      };
      const mediaRecorder = new MediaRecorder(recordStream, recorderOptions);

      mediaRecorder.ondataavailable = (e) => {
        console.log(`[Yoom] chunk received: ${e.data.size} bytes`);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        console.error("[Yoom] MediaRecorder error:", e);
      };

      mediaRecorder.onstop = () => {
        console.log(`[Yoom] recording stopped, ${chunksRef.current.length} chunks, total ${chunksRef.current.reduce((a, b) => a + b.size, 0)} bytes`);
        handleRecordingComplete();
      };

      console.log(`[Yoom] starting MediaRecorder with mimeType: "${mediaRecorder.mimeType}", stream tracks:`, recordStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setState("recording");

      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      stopAllStreams();
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Permission denied. Please allow screen/camera access.");
      } else {
        setError("Failed to start recording. Check your device permissions.");
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
      setError("Recording captured no data. Please try again.");
      setState("idle");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/screen-record/upload-url`, {
        method: "POST",
        headers: { "x-upload-password": password },
      });

      if (!res.ok) throw new Error("Failed to get upload URL");

      const { presignedUrl, key } = await res.json();

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", "video/webm");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(blob);
      });

      const appUrl = window.location.origin;
      setShareUrl(`${appUrl}/watch/${key}`);
      setState("done");
    } catch {
      setError("Upload failed. Please try again.");
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
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  if (state === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: "var(--surface)" }}>
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="rounded-full w-10 h-10 flex items-center justify-center mx-auto" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--accent)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke={getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#10b981"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Recording uploaded</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Share the link below</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-sm outline-none truncate"
              style={{ color: "var(--muted)" }}
            />
            <button
              onClick={copyToClipboard}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
              style={{ backgroundColor: "var(--accent)", color: "white" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={reset}
            className="text-sm transition-colors"
            style={{ color: "var(--muted)" }}
          >
            Record another
          </button>
        </div>
      </div>
    );
  }

  if (state === "uploading") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: "var(--surface)" }}>
        <div className="w-full max-w-md space-y-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)", opacity: 0.7 }}>Uploading</p>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
            <div
              className="h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${uploadProgress}%`, backgroundColor: "var(--accent)" }}
            />
          </div>
          <p className="text-sm font-mono tabular-nums" style={{ color: "var(--muted)" }}>{uploadProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8" style={{ backgroundColor: "var(--surface)" }}>
      {mode === "screen+camera" && (
        <canvas
          ref={canvasRef}
          className={state === "recording"
            ? "w-full max-w-2xl aspect-video rounded-xl overflow-hidden border shadow-lg"
            : "hidden"}
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        />
      )}

      {state === "recording" && mode !== "screen+camera" && (
        <RecordingPreview
          mode={mode}
          screenStream={screenStream}
          cameraStream={cameraStream}
        />
      )}

      <div className="w-full max-w-md space-y-6">
        {state === "idle" && (
          <>
            <div className="flex justify-center">
              <YoomLogo size="sm" />
            </div>

            {/* Preview thumbnails */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "screen", label: "Screen", icon: "🖥️" },
                { value: "camera", label: "Camera", icon: "📷" },
                { value: "screen+camera", label: "Screen + Cam", icon: "🖥️+📷" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`rounded-lg border p-3 text-center transition-all ${
                    mode === opt.value ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{
                    backgroundColor: mode === opt.value ? "var(--accent)" : "var(--surface)",
                    borderColor: mode === opt.value ? "var(--accent)" : "var(--border)",
                  }}
                >
                  <div className="text-lg mb-1">{opt.icon}</div>
                  <div className="text-xs font-medium" style={{ color: mode === opt.value ? "white" : "var(--foreground)" }}>
                    {opt.label}
                  </div>
                </button>
              ))}
            </div>

            <DeviceSelector
              kind="audioinput"
              label="Microphone"
              value={micId}
              onChange={setMicId}
            />
            {(mode === "camera" || mode === "screen+camera") && (
              <DeviceSelector
                kind="videoinput"
                label="Camera"
                value={cameraId}
                onChange={setCameraId}
              />
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-center" style={{ color: "#f87171" }}>{error}</p>
        )}

        <div className="flex items-center justify-center gap-4">
          {state === "idle" && (
            <button
              onClick={startRecording}
              className="rounded-lg px-8 py-2.5 text-sm font-semibold transition-all shadow-lg"
              style={{ backgroundColor: "var(--accent)", color: "white" }}
            >
              Start Recording
            </button>
          )}

          {state === "recording" && (
            <>
              <span className="flex items-center gap-2 text-sm font-mono tabular-nums" style={{ color: "var(--muted)" }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                {formatTime(elapsed)}
              </span>
              <button
                onClick={stopRecording}
                className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-all"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--foreground)" }}
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}