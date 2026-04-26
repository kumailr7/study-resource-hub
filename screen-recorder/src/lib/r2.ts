export function getPublicVideoUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function videoExists(key: string): Promise<boolean> {
  // For now, assume all keys exist - actual check would need backend
  return true;
}