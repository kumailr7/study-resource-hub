import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { VideoPlayer } from "./VideoPlayer";
import { API_BASE_URL } from "../config";

export default function WatchPage() {
  const { key } = useParams<{ key: string }>();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (!key || !key.endsWith('.webm')) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchVideo() {
      if (!key) return;
      try {
        // Check if key needs screen-recordings/ prefix
        const fullKey = key.includes('/') ? key : `screen-recordings/${key}`;
        const videoRes = await fetch(`${API_BASE_URL}/screen-record/video/${fullKey}`);
        if (!videoRes.ok) {
          setNotFound(true);
          return;
        }
        const { url } = await videoRes.json();
        setVideoUrl(url);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchVideo();
  }, [key]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--surface)" }}>
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
  }

  if (notFound || !videoUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--surface)" }}>
        <p style={{ color: "var(--muted)" }}>Recording not found</p>
      </div>
    );
  }

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/watch/${key}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: "var(--surface)" }}>
      <VideoPlayer src={videoUrl} shareUrl={shareUrl} />
    </div>
  );
}