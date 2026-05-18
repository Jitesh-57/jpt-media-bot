import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, openModal, postMessage } from "@/lib/slack";
import { creatorModal, generatingBlock, postResultBlock } from "@/lib/slack-blocks";
import { kickOffGeneration } from "@/app/api/slack/events/route";
import type { SocialPlatform } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-slack-signature") ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";

  if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET!, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = JSON.parse(params.get("payload") ?? "{}");

  // ── Block actions ──────────────────────────────────────────────────────────
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0];
    if (!action) return NextResponse.json({ ok: true });

    // "Create Content" button → open modal
    if (action.action_id === "open_creator_modal") {
      const channelId = payload.channel?.id ?? payload.container?.channel_id;
      const userId = payload.user?.id;
      await openModal(payload.trigger_id, creatorModal(channelId, userId));
      return NextResponse.json({ ok: true });
    }

    // "Post to Social" button
    if (action.action_id === "post_to_social") {
      const { jobId, mediaUrl, mediaType } = JSON.parse(action.value ?? "{}");
      const channelId = payload.channel?.id ?? payload.container?.channel_id;
      const userId = payload.user?.id;

      // Read platforms from the checkbox block in the same message state
      const messageState = payload.state?.values ?? {};
      const platforms: SocialPlatform[] =
        messageState["platform_post_block"]?.["platforms_post_input"]?.selected_options?.map(
          (o: { value: string }) => o.value as SocialPlatform
        ) ?? [];

      // Read caption from the input block
      const caption: string =
        messageState["caption_edit_block"]?.["caption_edit_input"]?.value ?? "";

      if (platforms.length === 0) {
        return NextResponse.json({ ok: true }); // Slack will show nothing — user must select a platform
      }

      // Fire and forget
      postSocialAndNotify({ platforms, mediaUrl, mediaType, content: caption, channelId, userId });
      return NextResponse.json({ ok: true });
    }
  }

  // ── Modal submission ───────────────────────────────────────────────────────
  if (payload.type === "view_submission" && payload.view?.callback_id === "generate_content") {
    const meta = JSON.parse(payload.view?.private_metadata ?? "{}");
    const state = payload.view?.state?.values ?? {};

    const prompt: string = state["prompt_block"]?.["prompt_input"]?.value ?? "";
    const type: "image" | "video" = state["media_type_block"]?.["media_type_input"]?.selected_option?.value ?? "image";
    const platforms: string[] =
      state["platform_block"]?.["platforms_input"]?.selected_options?.map(
        (o: { value: string }) => o.value
      ) ?? [];
    const customCaption: string = state["caption_block"]?.["caption_input"]?.value ?? "";
    const channelId: string = meta.channelId;
    const userId: string = meta.userId ?? payload.user?.id;

    if (!prompt || !channelId) {
      return NextResponse.json({
        response_action: "errors",
        errors: { prompt_block: "Please describe what you want to create." },
      });
    }

    // Post "generating..." immediately, then start job async
    const ts = await postMessage(channelId, {
      ...generatingBlock(type, prompt),
      text: `⏳ Generating your ${type}...`,
    });

    // Kick off generation without awaiting (fire & forget so modal closes instantly)
    kickOffGeneration({ type, prompt, channel: channelId, userId, ts, platforms, customCaption });

    // Close the modal immediately
    return NextResponse.json({ response_action: "clear" });
  }

  return NextResponse.json({ ok: true });
}

// ── Post to social media and notify result in Slack ────────────────────────────
async function postSocialAndNotify(opts: {
  platforms: SocialPlatform[];
  mediaUrl: string;
  mediaType: string;
  content: string;
  channelId: string;
  userId: string;
}) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const res = await fetch(`${appUrl}/api/social/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platforms: opts.platforms,
        mediaUrl: opts.mediaUrl,
        mediaType: opts.mediaType,
        content: opts.content,
        channelId: opts.channelId,
        userId: opts.userId,
      }),
    });
    const results = await res.json();
    await postMessage(opts.channelId, {
      ...postResultBlock(results),
      text: "Social media posting results",
    });
  } catch (err) {
    console.error("Social posting failed:", err);
  }
}
