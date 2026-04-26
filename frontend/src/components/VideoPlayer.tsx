import { useState } from "react";
import { YoomLogo } from "./Logo";

interface VideoPlayerProps {
  src: string;
  shareUrl: string;
}

export function VideoPlayer({ src, shareUrl }: VideoPlayerProps) {
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

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex justify-center mb-2">
        <YoomLogo size="sm" />
      </div>
      <video
        src={src}
        controls
        autoPlay
        className="w-full rounded-xl border shadow-lg"
        style={{ borderColor: "var(--border)" }}
      />
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border px-3 py-2" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          <span className="text-sm truncate block" style={{ color: "var(--muted)" }}>{shareUrl}</span>
        </div>
        <button
          onClick={copyToClipboard}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}