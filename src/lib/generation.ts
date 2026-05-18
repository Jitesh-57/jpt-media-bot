import { createImageJob, createVideoJob } from "@/lib/pixelbin";
import type { AspectRatio } from "@/types";

// ── Shared job starter (used by both events route + modal submission) ─────────
export async function kickOffGeneration(params: {
  type: "image" | "video";
  prompt: string;
  channel: string;
  userId: string;
  ts?: string;
  platforms: string[];
  customCaption: string;
  aspectRatio: AspectRatio;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const qs = new URLSearchParams({
    jobId,
    type: params.type,
    prompt: params.prompt,
    channel: params.channel,
    userId: params.userId,
    platforms: params.platforms.join(","),
    customCaption: params.customCaption,
    aspectRatio: params.aspectRatio,
    ...(params.ts ? { ts: params.ts } : {}),
  });

  const webhookUrl = `${appUrl}/api/pixelbin/webhook?${qs.toString()}`;

  try {
    if (params.type === "image") {
      await createImageJob(params.prompt, webhookUrl, params.aspectRatio);
    } else {
      await createVideoJob(params.prompt, webhookUrl, params.aspectRatio);
    }
  } catch (err) {
    console.error("PixelBin job creation failed:", err);
    const { updateMessage, postMessage } = await import("@/lib/slack");
    const errText = `❌ Failed to start ${params.type} generation. Please try again.`;
    if (params.ts) {
      await updateMessage(params.channel, params.ts, { text: errText, blocks: [] });
    } else {
      await postMessage(params.channel, { text: errText });
    }
  }
}
