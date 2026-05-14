import { WebClient, type ChatPostMessageArguments } from "@slack/web-api";
import crypto from "crypto";

export const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Verify that a request genuinely came from Slack
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex");
  const computed = `v0=${hmac}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Parse @JPT mentions: "generate image on <topic>" or "generate video of <topic>"
export function parseGenerateCommand(text: string): {
  type: "image" | "video" | null;
  prompt: string;
} {
  // Strip Slack user mention tags like <@U12345>
  const clean = text.replace(/<@[A-Z0-9]+>/g, "").trim().toLowerCase();

  const imageMatch = clean.match(
    /generate\s+(?:an?\s+)?image\s+(?:of|on|about|for|showing)?\s*(.+)/i
  );
  if (imageMatch) return { type: "image", prompt: imageMatch[1].trim() };

  const videoMatch = clean.match(
    /generate\s+(?:a\s+)?video\s+(?:of|on|about|for|showing)?\s*(.+)/i
  );
  if (videoMatch) return { type: "video", prompt: videoMatch[1].trim() };

  return { type: null, prompt: "" };
}

// Post a message and return its timestamp (for later updates)
export async function postMessage(
  channel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<string | undefined> {
  const res = await slack.chat.postMessage({ channel, ...payload } as ChatPostMessageArguments);
  return res.ts as string | undefined;
}

// Update an existing message
export async function updateMessage(
  channel: string,
  ts: string,
  payload: Record<string, unknown>
): Promise<void> {
  await slack.chat.update({ channel, ts, ...payload } as Parameters<typeof slack.chat.update>[0]);
}

// Post an ephemeral message (only visible to one user)
export async function postEphemeral(
  channel: string,
  user: string,
  payload: Record<string, unknown>
): Promise<void> {
  await slack.chat.postEphemeral({ channel, user, ...payload } as Parameters<typeof slack.chat.postEphemeral>[0]);
}
