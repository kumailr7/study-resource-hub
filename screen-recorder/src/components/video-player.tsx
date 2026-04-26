"use client";

import { useState } from "react";
import { YoomLogo } from "./logo";

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
      // Fallback for insecure contexts
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
        className="w-full rounded-xl border border-border shadow-lg shadow-black/30"
      />
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-border bg-surface px-3 py-2">
          <span className="text-sm text-muted truncate block">{shareUrl}</span>
        </div>
        <button
          onClick={copyToClipboard}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-all"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
