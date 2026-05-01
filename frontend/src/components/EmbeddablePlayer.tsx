import { useState, useEffect, useRef } from "react";

interface VideoPlayerProps {
  src: string;
  shareUrl?: string;
}

interface Cue {
  start: number;
  end: number;
  text: string;
}

function parseVTT(vttText: string): Cue[] {
  const cues: Cue[] = [];
  const lines = vttText.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    if (/^\d+$/.test(lines[i].trim())) {
      i++;
    }
    if (lines[i] && lines[i].includes('-->')) {
      const timing = lines[i];
      const times = timing.split('-->');
      const start = parseVTTTime(times[0].trim());
      const end = parseVTTTime(times[1].trim());
      i++;
      let text = '';
      while (i < lines.length && lines[i].trim() !== '') {
        text += (text ? ' ' : '') + lines[i].trim();
        i++;
      }
      if (text) {
        cues.push({ start, end, text });
      }
    }
    i++;
  }
  return cues;
}

function parseVTTTime(time: string): number {
  const parts = time.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0]) || 0;
  const millis = parseInt(secondsParts[1]) || 0;
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
}

function DojoYoshiLogo({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: 24, md: 32, lg: 48 };
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2">
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M10 8L24 26L38 8" stroke="#e85a4f" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 26L24 40" stroke="#e85a4f" strokeWidth="4.5" strokeLinecap="round"/>
        <circle cx="24" cy="26" r="4" fill="#e85a4f"/>
      </svg>
      <span className="font-bold" style={{ color: "var(--foreground)", fontSize: size === "sm" ? "14px" : "18px" }}>Dojo-Yoshi</span>
    </div>
  );
}

export default function EmbeddablePlayer({ src }: VideoPlayerProps) {
  const [showCaptions, setShowCaptions] = useState(false);
  const [captionsUrl, setCaptionsUrl] = useState<string | null>(null);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);
  const [currentCue, setCurrentCue] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Try to find captions URL
  useEffect(() => {
    const vttSrc = src.replace('.webm', '.vtt');
    setCaptionsUrl(vttSrc);
  }, [src]);

  async function toggleCaptions() {
    if (showCaptions) {
      setShowCaptions(false);
      return;
    }
    
    if (cues.length > 0) {
      setShowCaptions(true);
      return;
    }
    
    setLoadingCaptions(true);
    try {
      const vttSrc = src.replace('.webm', '.vtt');
      const res = await fetch(vttSrc);
      if (res.ok) {
        const text = await res.text();
        const parsed = parseVTT(text);
        setCues(parsed);
        setShowCaptions(true);
      } else {
        // Trigger transcription via shareUrl
        if (window.location.pathname.startsWith('/watch/')) {
          const key = window.location.pathname.split('/watch/')[1];
          const apiBase = window.location.origin + '/api';
          await fetch(`${apiBase}/screen-record/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoKey: key }),
          });
          // Retry captions
          const retryRes = await fetch(vttSrc);
          if (retryRes.ok) {
            const text = await retryRes.text();
            const parsed = parseVTT(text);
            setCues(parsed);
            setShowCaptions(true);
          }
        }
      }
    } catch (err) {
      console.error('Captions error:', err);
    } finally {
      setLoadingCaptions(false);
    }
  }

  useEffect(() => {
    if (!showCaptions || !videoRef.current || cues.length === 0) {
      setCurrentCue('');
      return;
    }

    const video = videoRef.current;
    const handleTimeUpdate = () => {
      const currentTime = video.currentTime * 1000;
      const activeCue = cues.find(cue => 
        currentTime >= cue.start && currentTime <= cue.end
      );
      setCurrentCue(activeCue?.text || '');
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [showCaptions, cues]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-2">
        <DojoYoshiLogo size="sm" />
        <button
          onClick={toggleCaptions}
          disabled={loadingCaptions}
          className="px-3 py-1 rounded text-sm font-medium"
          style={{ 
            backgroundColor: showCaptions ? "#e85a4f" : "#333", 
            color: "white" 
          }}
        >
          {loadingCaptions ? "Loading..." : showCaptions ? "CC ✓" : "CC"}
        </button>
      </div>
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          controls
          className="w-full rounded-lg"
        />
        {showCaptions && currentCue && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-lg font-medium text-center max-w-[80%] bg-black/80">
            {currentCue}
          </div>
        )}
      </div>
    </div>
  );
}