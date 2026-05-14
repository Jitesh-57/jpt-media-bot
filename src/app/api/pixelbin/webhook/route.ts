import { NextRequest, NextResponse } from "next/server";
import { updateMessage, postMessage } from "@/lib/slack";
import { mediaReadyBlock } from "@/lib/slack-blocks";

export const runtime = "nodejs";

// Actual PixelBin webhook payload shape:
// { id, event, data: { status, output: string[], ... } }
interface PixelBinWebhookPayload {
  id: string;
  event: string;
  data: {
    status: "SUCCESS" | "FAILURE" | "PROCESSING" | "PENDING";
    output?: string[];
    error?: string;
  };
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type    = searchParams.get("type") as "image" | "video" | null;
  const prompt  = searchParams.get("prompt") ?? "";
  const channel = searchParams.get("channel");
  const ts      = searchParams.get("ts") ?? undefined;
  const jobId   = searchParams.get("jobId") ?? "unknown";

  if (!type || !channel) {
    console.error("Webhook missing required params", Object.fromEntries(searchParams));
    return NextResponse.json({ ok: true });
  }

  const body: PixelBinWebhookPayload = await req.json();
  const { status, output, error } = body.data ?? {};

  console.log(`Webhook [${jobId}] event=${body.event} status=${status}`);

  if (status === "SUCCESS") {
    const mediaUrl = Array.isArray(output) && output.length > 0 ? output[0] : null;

    if (!mediaUrl) {
      console.error("SUCCESS but no URL in output:", JSON.stringify(body).slice(0, 500));
      await notifyFailure(channel, ts, type);
      return NextResponse.json({ ok: true });
    }

    const readyPayload = mediaReadyBlock(type, prompt, mediaUrl, jobId);
    if (ts) {
      await updateMessage(channel, ts, { ...readyPayload, text: `Your ${type} is ready!` });
    } else {
      await postMessage(channel, { ...readyPayload, text: `Your ${type} is ready!` });
    }

  } else if (status === "FAILURE") {
    await notifyFailure(channel, ts, type, error);
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
