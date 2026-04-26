import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";

interface WatchPageProps {
  params: Promise<{ key: string }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { key } = await params;

  // Validate key format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webm$/.test(key)) {
    notFound();
  }

  // Get video URL from backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://study-resource-hub-d18p.onrender.com/api';
  const videoRes = await fetch(`${apiUrl}/screen-record/video/${key}`, {
    next: { revalidate: 300 }
  });
  
  if (!videoRes.ok) {
    notFound();
  }
  
  const { url: videoUrl } = await videoRes.json();
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
    || "https://hub.devops-dojo.ninja";
  const shareUrl = `${baseUrl}/watch/${key}`;

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <VideoPlayer src={videoUrl} shareUrl={shareUrl} />
    </main>
  );
}
