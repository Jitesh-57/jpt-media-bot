import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, postMessage, updateMessage } from "@/lib/slack";
import { postResultBlock } from "@/lib/slack-blocks";
import type { SlackInteractionPayload, SocialPlatform, SocialPostRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-slack-signature") ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";

  if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET!, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Slack sends interactions as URL-encoded payload parameter
  const params = new URLSearchParams(rawBody);
  const payload: SlackInteractionPayload = JSON.parse(params.get("payload") ?? "{}");

  if (payload.type === "block_actions") {
    const postAction = payload.actions?.find((a) => a.action_id === "post_to_social");
    if (!postAction) return NextResponse.json({ ok: true });

    const { jobId, mediaUrl, mediaType } = JSON.parse(postAction.value ?? "{}");

    // Collect selected platforms from the checkboxes in the same message
    const platformAction = payload.actions?.find((a) => a.action_id === "platforms_chosen");
    const platforms: SocialPlatform[] =
      (platformAction?.selected_options?.map((o) => o.value as SocialPlatform)) ?? [];

    if (platforms.length === 0) {
      // Respond ephemerally — user hasn't picked any platform
      return NextResponse.json({
        response_action: "errors",
        errors: { platform_select: "Please select at least one platform." },
      });
    }

    // Collect caption from the input block
    const msgBlocks = (payload.message?.blocks ?? []) as Array<{ block_id?: string; element?: { action_id?: string }; state?: unknown }>;
    // Caption is captured via view state in Slack; fallback to empty string
    const caption = "";   // Will be picked up from view state in modal flow below

    // Acknowledge immediately — social posting is done async
    const channelId = payload.channel.id;
    const userId = payload.user.id;

    // Fire and forget
    postSocialMedia({
      platforms,
      mediaUrl,
      mediaType,
      content: caption,
      channelId,
      userId,
    }).then(async (results) => {
      await postMessage(channelId, {
        ...postResultBlock(results),
        text: "Social media posting results",
      });
    }).catch(console.error);

    return NextResponse.json({ ok: true });
  }

  // Handle modal submission (caption + platform selection via modal)
  if (payload.type === "view_submission") {
    const meta = JSON.parse(payload.view?.private_metadata ?? "{}");
    const stateValues = payload.view?.state?.values ?? {};

    const platforms: SocialPlatform[] =
      stateValues["platform_block"]?.["platforms_input"]?.selected_options?.map(
        (o: { value: string }) => o.value as SocialPlatform
      ) ?? [];

    const caption = stateValues["caption_block"]?.["caption_input"]?.value ?? "";

    postSocialMedia({
      platforms,
      mediaUrl: meta.mediaUrl,
      mediaType: meta.mediaType,
      content: caption,
      channelId: meta.channelId,
      userId: payload.user.id,
    }).then(async (results) => {
      await postMessage(meta.channelId, {
        ...postResultBlock(results),
        text: "Social media posting results",
      });
    }).catch(console.error);

    return NextResponse.json({ response_action: "clear" });
  }

  return NextResponse.json({ ok: true });
}

async function postSocialMedia(req: SocialPostRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const res = await fetch(`${appUrl}/api/social/post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}
