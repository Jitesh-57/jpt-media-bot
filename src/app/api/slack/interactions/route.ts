import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, openModal, postMessage } from "@/lib/slack";
import { creatorModal, postModal, generatingBlock, postResultBlock } from "@/lib/slack-blocks";
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

    // "Create Content" greeting button → open creator modal
    if (action.action_id === "open_creator_modal") {
      const channelId = payload.channel?.id ?? payload.container?.channel_id;
      const userId = payload.user?.id;
      await openModal(payload.trigger_id, creatorModal(channelId, userId));
      return NextResponse.json({ ok: true });
    }

    // "Post to Social Media" button on ready message → open post/edit modal
    if (action.action_id === "open_post_modal") {
      const val = JSON.parse(action.value ?? "{}");
      const channelId = payload.channel?.id ?? payload.container?.channel_id;
      await openModal(
        payload.trigger_id,
        postModal({
          mediaUrl: val.mediaUrl,
          mediaType: val.mediaType,
          caption: val.caption,
          jobId: val.jobId,
          channelId,
          preSelectedPlatforms: val.platforms ?? [],
        })
      );
      return NextResponse.json({ ok: true });
    }
  }

  // ── Modal submissions ──────────────────────────────────────────────────────
  if (payload.type === "view_submission") {
    const callbackId = payload.view?.callback_id;
    const state = payload.view?.state?.values ?? {};

    // Generate content modal submitted
    if (callbackId === "generate_content") {
      const meta = JSON.parse(payload.view?.private_metadata ?? "{}");
      const prompt: string = state["prompt_block"]?.["prompt_input"]?.value ?? "";
      const type: "image" | "video" =
        state["media_type_block"]?.["media_type_input"]?.selected_option?.value ?? "image";
      const platforms: string[] =
        state["platform_block"]?.["platforms_input"]?.selected_options?.map(
          (o: { value: string }) => o.value
        ) ?? [];
      const customCaption: string = state["caption_block"]?.["caption_input"]?.value ?? "";
      const channelId: string = meta.channelId;
      const userId: string = meta.userId ?? payload.user?.id;

      if (!prompt) {
        return NextResponse.json({
          response_action: "errors",
          errors: { prompt_block: "Please describe what you want to create." },
        });
      }

      // Post "generating..." to channel immediately
      const ts = await postMessage(channelId, {
        ...generatingBlock(type, prompt),
        text: `⏳ Generating your ${type}...`,
      });

      // Kick off generation in background
      kickOffGeneration({ type, prompt, channel: channelId, userId, ts, platforms, customCaption });

      return NextResponse.json({ response_action: "clear" });
    }

    // Post content modal submitted (caption edited + platforms chosen)
    if (callbackId === "post_content") {
      const meta = JSON.parse(payload.view?.private_metadata ?? "{}");
      const caption: string = state["caption_edit_block"]?.["caption_edit_input"]?.value ?? "";
      const platforms: SocialPlatform[] =
        state["platform_post_block"]?.["platforms_post_input"]?.selected_options?.map(
          (o: { value: string }) => o.value as SocialPlatform
        ) ?? [];

      if (platforms.length === 0) {
        return NextResponse.json({
          response_action: "errors",
          errors: { platform_post_block: "Please select at least one platform." },
        });
      }

      // Post to platforms async
      postSocialAndNotify({
        platforms,
        mediaUrl: meta.mediaUrl,
        mediaType: meta.mediaType,
        content: caption,
        channelId: meta.channelId,
        userId: payload.user?.id,
      });

      return NextResponse.json({ response_action: "clear" });
    }
  }

  return NextResponse.json({ ok: true });
}

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
      body: JSON.stringify(opts),
    });
    const results = await res.json();
    await postMessage(opts.channelId, postResultBlock(results));
  } catch (err) {
    console.error("Social posting failed:", err);
  }
}
