import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, parseGenerateCommand, isGreeting, postMessage } from "@/lib/slack";
import { kickOffGeneration } from "@/lib/generation";
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

  // Only respond to app_mention events from real users (not bots).
  // Slack only delivers app_mention events in channels where the bot is a member,
  // so this inherently restricts responses to channels the bot has been added to.
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
    ...generatingBlock(type, prompt, "16:9"),
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
    aspectRatio: "16:9",
  });

  return NextResponse.json({ ok: true });
}
