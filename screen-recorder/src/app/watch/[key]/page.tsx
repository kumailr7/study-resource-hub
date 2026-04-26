import { notFound } from "next/navigation";
import { videoExists, getPublicVideoUrl } from "@/lib/r2";
import { VideoPlayer } from "@/components/video-player";

interface WatchPageProps {
  params: Promise<{ key: string }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { key } = await params;

  // Validate key format (uuid.webm)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webm$/.test(key)) {
    notFound();
  }

  const exists = await videoExists(key);
  if (!exists) {
    notFound();
  }

  const videoUrl = getPublicVideoUrl(key);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
    || "http://localhost:3000";
  const shareUrl = `${baseUrl}/watch/${key}`;

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <VideoPlayer src={videoUrl} shareUrl={shareUrl} />
    </main>
  );
}
