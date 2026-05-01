import { useState, useEffect, useRef } from "react";
import { DojoYoshiLogo } from "./Logo";

interface VideoPlayerProps {
  src: string;
  shareUrl: string;
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

export function VideoPlayer({ src, shareUrl }: VideoPlayerProps) {
  const [copied, setCopied] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);
  const [currentCue, setCurrentCue] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Extract video key from URL
  function getVideoKey(url: string): string {
    if (url.includes('/watch/')) {
      return url.split('/watch/')[1] || '';
    }
    if (url.includes('.r2.dev/')) {
      return url.split('.r2.dev/')[1] || '';
    }
    return url.split('/').pop() || '';
  }

  // Get VTT URL from video key
  function getVTTUrl(key: string): string {
    const vttKey = key.replace('.webm', '.vtt');
    // VTT files are stored at R2 root
    return `https://pub-06887d867b864cb3ae5f4d29399c676c.r2.dev/${vttKey}`;
  }

  async function loadCaptions() {
    const key = getVideoKey(shareUrl);
    if (!key) return;
    
    const vttUrl = getVTTUrl(key);
    console.log('[Captions] Loading from:', vttUrl);
    
    try {
      const res = await fetch(vttUrl);
      if (res.ok) {
        const text = await res.text();
        const parsed = parseVTT(text);
        console.log('[Captions] Loaded cues:', parsed.length);
        setCues(parsed);
        setShowCaptions(true);
      } else {
        console.log('[Captions] VTT not found, triggering transcription');
        // Trigger transcription
        const apiBase = 'https://study-resource-hub-d18p.onrender.com/api';
        const transcribeRes = await fetch(`${apiBase}/screen-record/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoKey: key }),
        });
        if (transcribeRes.ok) {
          // Wait and try again
          setTimeout(async () => {
            const retryRes = await fetch(vttUrl);
            if (retryRes.ok) {
              const retryText = await retryRes.text();
              const retryParsed = parseVTT(retryText);
              setCues(retryParsed);
              setShowCaptions(true);
            }
          }, 5000);
        }
      }
    } catch (err) {
      console.log('[Captions] Error:', err);
    }
  }

  function toggleCaptions() {
    if (showCaptions) {
      setShowCaptions(false);
    } else {
      if (cues.length === 0) {
        setLoading(true);
        loadCaptions().finally(() => setLoading(false));
      } else {
        setShowCaptions(true);
      }
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  // Update current caption based on video time
  useEffect(() => {
    if (!showCaptions || !videoRef.current || cues.length === 0) {
      setCurrentCue('');
      return;
    }

    const video = videoRef.current;
    const updateCue = () => {
      const time = video.currentTime * 1000;
      const cue = cues.find(c => time >= c.start && time <= c.end);
      setCurrentCue(cue?.text || '');
    };

    video.addEventListener('timeupdate', updateCue);
    return () => video.removeEventListener('timeupdate', updateCue);
  }, [showCaptions, cues]);

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex justify-center mb-2">
        <DojoYoshiLogo size="sm" />
      </div>
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          className="w-full rounded-xl border shadow-lg"
          style={{ borderColor: "var(--border)" }}
        />
        {showCaptions && currentCue && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-lg font-medium text-center max-w-[80%] bg-black/80">
            {currentCue}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCaptions}
          disabled={loading}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={{ 
            backgroundColor: showCaptions ? "var(--accent)" : "var(--surface)", 
            color: showCaptions ? "white" : "var(--foreground)",
            border: "1px solid var(--border)"
          }}
        >
          {loading ? "Loading..." : showCaptions ? "CC ✓" : "CC"}
        </button>
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