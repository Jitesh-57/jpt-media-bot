import { NextRequest, NextResponse } from "next/server";
import { updateMessage, postMessage } from "@/lib/slack";
import { mediaReadyBlock } from "@/lib/slack-blocks";
import { extractMediaUrl } from "@/lib/pixelbin";
import type { PredictionResult } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // All context is encoded in the URL — no in-memory store needed
  const { searchParams } = req.nextUrl;
  const jobId   = searchParams.get("jobId");
  const type    = searchParams.get("type") as "image" | "video" | null;
  const prompt  = searchParams.get("prompt") ?? "";
  const channel = searchParams.get("channel");
  const ts      = searchParams.get("ts") ?? undefined;

  if (!jobId || !type || !channel) {
    console.error("Webhook missing required params", Object.fromEntries(searchParams));
    return NextResponse.json({ ok: true });
  }

  const result: PredictionResult = await req.json();
  console.log(`Webhook [${jobId}] status=${result.status}`);

  if (result.status === "SUCCESS") {
    const mediaUrl = extractMediaUrl(result);
    if (!mediaUrl) {
      console.error("SUCCESS but no media URL in result:", JSON.stringify(result).slice(0, 500));
      await notifyFailure(channel, ts, type);
      return NextResponse.json({ ok: true });
    }

    const readyPayload = mediaReadyBlock(type, prompt, mediaUrl, jobId);
    if (ts) {
      await updateMessage(channel, ts, { ...readyPayload, text: `Your ${type} is ready!` });
    } else {
      await postMessage(channel, { ...readyPayload, text: `Your ${type} is ready!` });
    }

  } else if (result.status === "FAILURE") {
    await notifyFailure(channel, ts, type, result.error);
  }

  return NextResponse.json({ ok: true });
}

async function notifyFailure(channel: string, ts: string | undefined, type: string, error?: string) {
  const text = `❌ ${type} generation failed.${error ? `\n> ${error}` : ""}\nPlease try again.`;
  if (ts) {
    await updateMessage(channel, ts, { text, blocks: [] });
  } else {
    await postMessage(channel, { text });
  }
}
