import { WebClient, type ChatPostMessageArguments } from "@slack/web-api";
import crypto from "crypto";

export const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// ─── Signature verification ────────────────────────────────────────────────────
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) return false;
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex");
  const computed = `v0=${hmac}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Command parser ────────────────────────────────────────────────────────────
export function parseGenerateCommand(text: string): {
  type: "image" | "video" | null;
  prompt: string;
} {
  const clean = text.replace(/<@[A-Z0-9]+>/g, "").trim();

  const imageMatch = clean.match(/generate\s+(?:an?\s+)?image\s+(?:of|on|about|for|showing)?\s*(.+)/i);
  if (imageMatch) return { type: "image", prompt: imageMatch[1].trim() };

  const videoMatch = clean.match(/generate\s+(?:a\s+)?video\s+(?:of|on|about|for|showing)?\s*(.+)/i);
  if (videoMatch) return { type: "video", prompt: videoMatch[1].trim() };

  return { type: null, prompt: "" };
}

// Returns true if the message is a greeting (no generate command)
export function isGreeting(text: string): boolean {
  const clean = text.replace(/<@[A-Z0-9]+>/g, "").trim().toLowerCase();
  return (
    clean === "" ||
    /^(hi|hey|hello|sup|yo|hola|howdy|what's up|whatsup|help|start|create|make|build)[\s!?.]*$/.test(clean)
  );
}

// ─── Messaging helpers ─────────────────────────────────────────────────────────
export async function postMessage(
  channel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<string | undefined> {
  const res = await slack.chat.postMessage({ channel, ...payload } as ChatPostMessageArguments);
  return res.ts as string | undefined;
}

export async function updateMessage(
  channel: string,
  ts: string,
  payload: Record<string, unknown>
): Promise<void> {
  await slack.chat.update({
    channel,
    ts,
    ...payload,
  } as Parameters<typeof slack.chat.update>[0]);
}

export async function postEphemeral(
  channel: string,
  user: string,
  payload: Record<string, unknown>
): Promise<void> {
  await slack.chat.postEphemeral({
    channel,
    user,
    ...payload,
  } as Parameters<typeof slack.chat.postEphemeral>[0]);
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
export async function openModal(
  triggerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: Record<string, any>
): Promise<void> {
  await slack.views.open({ trigger_id: triggerId, view } as Parameters<typeof slack.views.open>[0]);
}

// ─── Upload video to Slack for native in-channel playback ─────────────────────
export async function uploadVideoToSlack(
  channelId: string,
  videoUrl: string,
  prompt: string,
  caption: string
): Promise<void> {
  // Download the video
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Upload to Slack using the v2 method (recommended for files >1MB)
  await (slack.files as unknown as {
    uploadV2: (args: Record<string, unknown>) => Promise<unknown>;
  }).uploadV2({
    channel_id: channelId,
    filename: "jpt-video.mp4",
    file: buffer,
    title: `🎬 ${prompt}`,
    initial_comment: caption,
  });
}
