import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function passwordMatches(input: string, expected: string): boolean {
  if (input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { password } = body;
  const expected = process.env.UPLOAD_PASSWORD;

  if (!password || !expected || !passwordMatches(password, expected)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
