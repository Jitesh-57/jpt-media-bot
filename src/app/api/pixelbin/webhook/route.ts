import { NextRequest, NextResponse } from "next/server";
import { updateMessage, postMessage, uploadVideoToSlack } from "@/lib/slack";
import { imageReadyBlock, videoReadyBlock } from "@/lib/slack-blocks";
import { generateCaption } from "@/lib/ai";

export const runtime = "nodejs";

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
  const type          = searchParams.get("type") as "image" | "video" | null;
  const prompt        = searchParams.get("prompt") ?? "";
  const channel       = searchParams.get("channel");
  const ts            = searchParams.get("ts") ?? undefined;
  const jobId         = searchParams.get("jobId") ?? "unknown";
  const platformsRaw  = searchParams.get("platforms") ?? "";
  const customCaption = searchParams.get("customCaption") ?? "";

  if (!type || !channel) {
    console.error("Webhook missing params", Object.fromEntries(searchParams));
    return NextResponse.json({ ok: true });
  }

  const platforms = platformsRaw ? platformsRaw.split(",").filter(Boolean) : [];

  const body: PixelBinWebhookPayload = await req.json();
  const { status, output, error } = body.data ?? {};

  console.log(`Webhook [${jobId}] event=${body.event} status=${status}`);

  if (status === "SUCCESS") {
    const mediaUrl = Array.isArray(output) && output.length > 0 ? output[0] : null;
    if (!mediaUrl) {
      console.error("SUCCESS but no URL in output:", JSON.stringify(body).slice(0, 300));
      await notifyFailure(channel, ts, type);
      return NextResponse.json({ ok: true });
    }

    // Generate or use provided caption
    const caption = customCaption.trim() || await generateCaption(prompt, type);

    if (type === "image") {
      const payload = imageReadyBlock({ prompt, mediaUrl, caption, jobId, platforms });
      if (ts) {
        await updateMessage(channel, ts, payload);
      } else {
        await postMessage(channel, payload);
      }
    } else {
      // Video: update the "generating..." message with ready block
      const payload = videoReadyBlock({ prompt, mediaUrl, caption, jobId, platforms });
      if (ts) {
        await updateMessage(channel, ts, payload);
      } else {
        await postMessage(channel, payload);
      }

      // Upload video to Slack for native in-channel playback
      try {
        await uploadVideoToSlack(channel, mediaUrl, prompt, caption);
      } catch (uploadErr) {
        console.error("Video upload to Slack failed:", uploadErr);
        // Non-fatal — user still has the download link
      }
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
