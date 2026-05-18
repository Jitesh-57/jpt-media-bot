import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, parseGenerateCommand, isGreeting, postMessage } from "@/lib/slack";
import { createImageJob, createVideoJob } from "@/lib/pixelbin";
import { generatingBlock, greetingBlock } from "@/lib/slack-blocks";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-slack-signature") ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";

  if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET!, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Slack URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (!event || event.type !== "app_mention" || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const { type, prompt } = parseGenerateCommand(event.text ?? "");

  // ── Greeting / no command → show the creator button ──────────────────────
  if (!type || isGreeting(event.text ?? "")) {
    await postMessage(event.channel, greetingBlock(event.user));
    return NextResponse.json({ ok: true });
  }

  // ── Generate command via mention (e.g. @JPT generate image of ...) ────────
  const generatingMsg = await postMessage(event.channel, {
    ...generatingBlock(type, prompt),
    text: `⏳ Generating your ${type}...`,
  });

  await kickOffGeneration({
    type,
    prompt,
    channel: event.channel,
    userId: event.user,
    ts: generatingMsg,
    platforms: [],
    customCaption: "",
  });

  return NextResponse.json({ ok: true });
}

// ── Shared job starter (used by both events + modal submission) ────────────────
export async function kickOffGeneration(params: {
  type: "image" | "video";
  prompt: string;
  channel: string;
  userId: string;
  ts?: string;
  platforms: string[];
  customCaption: string;
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
    ...(params.ts ? { ts: params.ts } : {}),
  });

  const webhookUrl = `${appUrl}/api/pixelbin/webhook?${qs.toString()}`;

  try {
    if (params.type === "image") {
      await createImageJob(params.prompt, webhookUrl);
    } else {
      await createVideoJob(params.prompt, webhookUrl);
    }
  } catch (err) {
    console.error("PixelBin job creation failed:", err);
    const { updateMessage, postMessage: pm } = await import("@/lib/slack");
    const errText = `❌ Failed to start ${params.type} generation. Please try again.`;
    if (params.ts) {
      await updateMessage(params.channel, params.ts, { text: errText, blocks: [] });
    } else {
      await pm(params.channel, { text: errText });
    }
  }
}
