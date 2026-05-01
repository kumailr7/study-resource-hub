import { useState, useRef, useEffect } from "react";
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
    // Skip index line
    if (/^\d+$/.test(lines[i].trim())) {
      i++;
    }
    // Parse timing line
    if (lines[i] && lines[i].includes('-->')) {
      const timing = lines[i];
      const times = timing.split('-->');
      const start = parseVTTTime(times[0].trim());
      const end = parseVTTTime(times[1].trim());
      i++;
      // Collect text lines
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
  // Format: 00:00:00.000
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
  const [captionsUrl, setCaptionsUrl] = useState<string | null>(null);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);
  const [currentCue, setCurrentCue] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  async function toggleCaptions() {
    if (showCaptions) {
      setShowCaptions(false);
      return;
    }

    if (captionsUrl) {
      setShowCaptions(true);
      return;
    }
    
    setLoadingCaptions(true);
    try {
      // Extract video key from shareUrl - handle multiple formats
      let key = '';
      if (shareUrl.includes('/watch/')) {
        key = shareUrl.split('/watch/')[1] || '';
      } else if (shareUrl.includes('.r2.dev/')) {
        key = shareUrl.split('.r2.dev/')[1] || '';
      } else {
        key = shareUrl.split('/').pop() || '';
      }
      if (!key) throw new Error('Cannot extract video key');
      
      // For direct R2 URLs, VTT is in same location with .vtt extension
      // For watch URLs, check captions folder
      const isWatchUrl = shareUrl.includes('/watch/');
      const captionKey = key.replace('.webm', '.vtt');
      const potentialUrl = isWatchUrl 
        ? `${shareUrl.split('/watch/')[0]}/captions/${captionKey}`
        : shareUrl.replace('.webm', '.vtt');
      
      // Check if captions exist
      const check = await fetch(potentialUrl, { method: 'HEAD' });
      if (check.ok) {
        setCaptionsUrl(potentialUrl);
        // Fetch and parse VTT
        const vttRes = await fetch(potentialUrl);
        const vttText = await vttRes.text();
        const parsed = parseVTT(vttText);
        setCues(parsed);
        setShowCaptions(true);
      } else {
        // Need to transcribe
        throw new Error('Captions not found');
      }
    } catch (err) {
      console.log('[Captions] Error or not available:', err);
      // Try to trigger transcription
      try {
        console.log('[Transcribe] Extracting key from shareUrl:', shareUrl);
        const key = shareUrl.includes('/watch/') 
          ? shareUrl.split('/watch/')[1] 
          : shareUrl.split('/').pop();
        console.log('[Transcribe] Using key:', key);
        
        if (key) {
          const apiBase = (window as any).REACT_APP_API_BASE_URL || 'https://study-resource-hub-d18p.onrender.com/api';
          console.log('[Transcribe] Calling API:', `${apiBase}/screen-record/transcribe`);
          const transcribeRes = await fetch(`${apiBase}/screen-record/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoKey: key }),
          });
          
          console.log('[Transcribe] Response status:', transcribeRes.status);
          if (transcribeRes.ok) {
            const data = await transcribeRes.json();
            console.log('[Transcribe] Success:', data);
            setCaptionsUrl(data.captionsUrl);
            // Fetch and parse the new VTT
            const vttRes = await fetch(data.captionsUrl);
            const vttText = await vttRes.text();
            console.log('[Transcribe] VTT length:', vttText.length);
            const parsed = parseVTT(vttText);
            console.log('[Transcribe] Cues:', parsed.length);
            setCues(parsed);
            setShowCaptions(true);
          } else {
            const err = await transcribeRes.json();
            console.error('[Transcribe] Failed:', err);
          }
        }
      } catch (transErr) {
        console.log('[Transcribe] Failed:', transErr);
      }
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
      const currentTime = video.currentTime * 1000; // Convert to ms
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
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-lg font-medium text-center max-w-[80%] bg-black/80">
            {currentCue}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCaptions}
          disabled={loadingCaptions}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={{ 
            backgroundColor: showCaptions ? "var(--accent)" : "var(--surface)", 
            color: showCaptions ? "white" : "var(--foreground)",
            border: "1px solid var(--border)"
          }}
        >
          {loadingCaptions ? "Loading..." : showCaptions ? "CC ✓" : "CC"}
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