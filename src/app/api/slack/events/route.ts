import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, parseGenerateCommand, postMessage } from "@/lib/slack";
import { createImageJob, createVideoJob } from "@/lib/pixelbin";
import { saveJob } from "@/lib/job-store";
import { generatingBlock } from "@/lib/slack-blocks";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify Slack signature
  const signature = req.headers.get("x-slack-signature") ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;

  if (!verifySlackSignature(signingSecret, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Slack URL verification challenge (needed when first setting up the app)
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (!event) return NextResponse.json({ ok: true });

  // Only handle app_mention events
  if (event.type !== "app_mention") return NextResponse.json({ ok: true });
  // Ignore bot messages
  if (event.bot_id) return NextResponse.json({ ok: true });

  const { type, prompt } = parseGenerateCommand(event.text ?? "");

  if (!type) {
    await postMessage(event.channel, {
      text: `Hi <@${event.user}>! 👋\n\nI'm JPT, your media generation bot. Here's how to use me:\n\n• *Generate an image:* \`@JPT generate image of a sunset over mountains\`\n• *Generate a video:* \`@JPT generate video of a futuristic city at night\``,
    });
    return NextResponse.json({ ok: true });
  }

  // Post "generating..." message immediately so Slack sees a <3s response
  const generatingMsg = await postMessage(event.channel, {
    ...generatingBlock(type, prompt),
    text: `⏳ Generating your ${type}...`,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Build webhook URL that carries context back to us
  const webhookUrl = `${appUrl}/api/pixelbin/webhook?jobId=${jobId}`;

  // Save job metadata so the webhook handler can look it up
  saveJob({
    jobId,
    type,
    prompt,
    slackChannelId: event.channel,
    slackUserId: event.user,
    slackTs: generatingMsg,
    status: "processing",
    createdAt: Date.now(),
  });

  // Fire generation async (don't await — the webhook will notify us when done)
  try {
    if (type === "image") {
      await createImageJob(prompt, webhookUrl);
    } else {
      await createVideoJob(prompt, webhookUrl);
    }
  } catch (err) {
    console.error("PixelBin job creation failed:", err);
    if (generatingMsg) {
      const { updateMessage } = await import("@/lib/slack");
      await updateMessage(event.channel, generatingMsg, {
        text: `❌ Failed to start ${type} generation. Please try again.`,
        blocks: [],
      });
    }
  }

  return NextResponse.json({ ok: true });
}
