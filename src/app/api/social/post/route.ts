import { NextRequest, NextResponse } from "next/server";
import { postToAllPlatforms } from "@/lib/social";
import type { SocialPostRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body: SocialPostRequest = await req.json();
  const { platforms, mediaUrl, mediaType, content } = body;

  if (!platforms?.length || !mediaUrl || !mediaType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const results = await postToAllPlatforms(platforms, mediaUrl, mediaType, content ?? "");
  return NextResponse.json(results);
}
