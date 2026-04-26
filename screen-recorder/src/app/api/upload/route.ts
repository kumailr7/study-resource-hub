import { NextRequest, NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "crypto";

function passwordMatches(input: string, expected: string): boolean {
  if (input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const password = request.headers.get("x-upload-password");
  const expected = process.env.UPLOAD_PASSWORD;

  if (!password || !expected || !passwordMatches(password, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiBase = process.env.REACT_APP_API_BASE_URL || 'https://study-resource-hub-d18p.onrender.com/api';
    const res = await fetch(`${apiBase}/screen-record/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-upload-password': password,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to get upload URL from backend');
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error getting upload URL:', err);
    return NextResponse.json({ error: 'Failed to get upload URL' }, { status: 500 });
  }
}
