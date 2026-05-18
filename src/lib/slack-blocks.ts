import type { MediaType, AspectRatio } from "@/types";

const RATIO_LABEL: Record<AspectRatio, string> = {
  "16:9": "🖥️ Desktop / Landscape (16:9)",
  "9:16": "📱 Mobile / Portrait (9:16)",
  "1:1":  "⬛ Square (1:1)",
};

// ─── Greeting message ──────────────────────────────────────────────────────────
export function greetingBlock(userId: string) {
  return {
    text: `Hey <@${userId}>! 👋 I'm JPT — your AI content creator.`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hey <@${userId}>! 👋 I'm *JPT*, your AI-powered content creator.\n\nDescribe what you want and I'll generate a stunning image or video — then write a *full social-media post* with hashtags and help you publish to Instagram, LinkedIn, Twitter and YouTube.`,
        },
      },
      {
        type: "actions",
        block_id: "greeting_actions",
        elements: [
          {
            type: "button",
            action_id: "open_creator_modal",
            style: "primary",
            text: { type: "plain_text", text: "🎨 Create Content", emoji: true },
            value: "open",
          },
        ],
      },
    ],
  };
}

// ─── Creator modal (opened on button click) ────────────────────────────────────
export function creatorModal(channelId: string, userId: string) {
  return {
    type: "modal",
    callback_id: "generate_content",
    title: { type: "plain_text", text: "🎨 Create Content", emoji: true },
    submit: { type: "plain_text", text: "✨ Generate", emoji: true },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({ channelId, userId }),
    blocks: [
      // ── Prompt ──
      {
        type: "input",
        block_id: "prompt_block",
        label: { type: "plain_text", text: "Describe your content" },
        element: {
          type: "plain_text_input",
          action_id: "prompt_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "e.g. A cinematic golden-hour sunset over the Himalayas with soft clouds...",
          },
        },
      },
      // ── Media type ──
      {
        type: "input",
        block_id: "media_type_block",
        label: { type: "plain_text", text: "Media Type" },
        element: {
          type: "radio_buttons",
          action_id: "media_type_input",
          options: [
            { text: { type: "plain_text", text: "🖼️ Image  (NanoBanana Pro · ~1 min)", emoji: true }, value: "image" },
            { text: { type: "plain_text", text: "🎬 Video  (Google Veo 3.1 · ~3 min)", emoji: true }, value: "video" },
          ],
          initial_option: {
            text: { type: "plain_text", text: "🖼️ Image  (NanoBanana Pro · ~1 min)", emoji: true },
            value: "image",
          },
        },
      },
      // ── Aspect ratio ──
      {
        type: "input",
        block_id: "aspect_ratio_block",
        label: { type: "plain_text", text: "Format / Aspect Ratio" },
        element: {
          type: "radio_buttons",
          action_id: "aspect_ratio_input",
          options: [
            {
              text: { type: "plain_text", text: "🖥️ Desktop / Landscape (16:9)  — YouTube, Twitter, LinkedIn", emoji: true },
              value: "16:9",
            },
            {
              text: { type: "plain_text", text: "📱 Mobile / Portrait (9:16)  — Stories, Reels, TikTok, Shorts", emoji: true },
              value: "9:16",
            },
            {
              text: { type: "plain_text", text: "⬛ Square (1:1)  — Instagram Feed, LinkedIn (image only)", emoji: true },
              value: "1:1",
            },
          ],
          initial_option: {
            text: { type: "plain_text", text: "🖥️ Desktop / Landscape (16:9)  — YouTube, Twitter, LinkedIn", emoji: true },
            value: "16:9",
          },
        },
      },
      // ── Platforms ──
      {
        type: "input",
        block_id: "platform_block",
        label: { type: "plain_text", text: "Post to social media (optional)" },
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "platforms_input",
          options: [
            { text: { type: "plain_text", text: "📸 Instagram", emoji: true }, value: "instagram" },
            { text: { type: "plain_text", text: "💼 LinkedIn", emoji: true }, value: "linkedin" },
            { text: { type: "plain_text", text: "🐦 Twitter / X", emoji: true }, value: "twitter" },
            { text: { type: "plain_text", text: "▶️ YouTube", emoji: true }, value: "youtube" },
          ],
        },
      },
      // ── Custom caption ──
      {
        type: "input",
        block_id: "caption_block",
        label: { type: "plain_text", text: "Custom Post Copy (leave empty = AI generates ✨)" },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "caption_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Leave empty — JPT will look at your image/video and write the full post + hashtags automatically.",
          },
        },
      },
    ],
  };
}

// ─── "Post & Edit" modal (opened when user clicks 🚀 Post button) ──────────────
export function postModal(opts: {
  mediaUrl: string;
  mediaType: MediaType;
  caption: string;
  jobId: string;
  channelId: string;
  preSelectedPlatforms: string[];
}) {
  const platformOptions = [
    { text: { type: "plain_text", text: "📸 Instagram", emoji: true }, value: "instagram" },
    { text: { type: "plain_text", text: "💼 LinkedIn", emoji: true }, value: "linkedin" },
    { text: { type: "plain_text", text: "🐦 Twitter / X", emoji: true }, value: "twitter" },
    { text: { type: "plain_text", text: "▶️ YouTube", emoji: true }, value: "youtube" },
  ];
  const initialOptions = platformOptions.filter((o) => opts.preSelectedPlatforms.includes(o.value));

  return {
    type: "modal",
    callback_id: "post_content",
    title: { type: "plain_text", text: "🚀 Post to Social Media", emoji: true },
    submit: { type: "plain_text", text: "Post Now", emoji: true },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({
      mediaUrl: opts.mediaUrl,
      mediaType: opts.mediaType,
      jobId: opts.jobId,
      channelId: opts.channelId,
    }),
    blocks: [
      {
        type: "input",
        block_id: "caption_edit_block",
        label: { type: "plain_text", text: "Post Copy (edit before publishing)" },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "caption_edit_input",
          multiline: true,
          initial_value: opts.caption,
          placeholder: { type: "plain_text", text: "Your post copy with hashtags..." },
        },
      },
      {
        type: "input",
        block_id: "platform_post_block",
        label: { type: "plain_text", text: "Post to" },
        element: {
          type: "checkboxes",
          action_id: "platforms_post_input",
          options: platformOptions,
          ...(initialOptions.length > 0 ? { initial_options: initialOptions } : {}),
        },
      },
    ],
  };
}

// ─── "Generating…" status message ─────────────────────────────────────────────
export function generatingBlock(type: MediaType, prompt: string, aspectRatio: AspectRatio = "16:9") {
  const ratioLabel = RATIO_LABEL[aspectRatio];
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⏳ *Generating your ${type}...*\n> _${prompt}_\n\n*Format:* ${ratioLabel}\n\nThis may take ${type === "video" ? "2–4 minutes" : "~1 minute"}. I'll update this message when it's ready!`,
        },
      },
    ],
  };
}

// ─── Image ready message (inline preview + Post button) ───────────────────────
export function imageReadyBlock(opts: {
  prompt: string;
  mediaUrl: string;
  caption: string;
  jobId: string;
  platforms: string[];
  aspectRatio?: AspectRatio;
}) {
  const ratioLabel = opts.aspectRatio ? RATIO_LABEL[opts.aspectRatio] : "";
  return {
    text: `🖼️ Your image is ready!`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🖼️ *Your image is ready!*\n> _${opts.prompt}_${ratioLabel ? `  ·  ${ratioLabel}` : ""}`,
        },
        accessory: {
          type: "button",
          action_id: "open_post_modal",
          style: "primary",
          text: { type: "plain_text", text: "🚀 Post to Social Media", emoji: true },
          value: JSON.stringify({
            mediaUrl: opts.mediaUrl,
            mediaType: "image",
            caption: opts.caption,
            jobId: opts.jobId,
            platforms: opts.platforms,
          }),
        },
      },
      { type: "image", image_url: opts.mediaUrl, alt_text: opts.prompt },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✍️ *AI-generated post:*\n${opts.caption}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<${opts.mediaUrl}|View / Download image>  ·  Click *Post to Social Media* to edit & publish`,
          },
        ],
      },
    ],
  };
}

// ─── Video ready message (link + Post button — video uploaded separately) ──────
export function videoReadyBlock(opts: {
  prompt: string;
  mediaUrl: string;
  caption: string;
  jobId: string;
  platforms: string[];
  aspectRatio?: AspectRatio;
}) {
  const ratioLabel = opts.aspectRatio ? RATIO_LABEL[opts.aspectRatio] : "";
  return {
    text: `🎬 Your video is ready!`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎬 *Your video is ready!*\n> _${opts.prompt}_${ratioLabel ? `  ·  ${ratioLabel}` : ""}`,
        },
        accessory: {
          type: "button",
          action_id: "open_post_modal",
          style: "primary",
          text: { type: "plain_text", text: "🚀 Post to Social Media", emoji: true },
          value: JSON.stringify({
            mediaUrl: opts.mediaUrl,
            mediaType: "video",
            caption: opts.caption,
            jobId: opts.jobId,
            platforms: opts.platforms,
          }),
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✍️ *AI-generated post:*\n${opts.caption}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<${opts.mediaUrl}|View / Download video>  ·  Video is uploading to Slack below for native playback`,
          },
        ],
      },
    ],
  };
}

// ─── Post result summary ───────────────────────────────────────────────────────
export function postResultBlock(
  results: Array<{ platform: string; success: boolean; postUrl?: string; error?: string }>
) {
  const lines = results.map(({ platform, success, postUrl, error }) => {
    const icon = success ? "✅" : "❌";
    const name = platform.charAt(0).toUpperCase() + platform.slice(1);
    const link = postUrl ? ` — <${postUrl}|View post>` : "";
    const err = error ? ` _(${error})_` : "";
    return `${icon} *${name}*${link}${err}`;
  });
  return {
    text: "Social media posting results",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Social posting results:*\n${lines.join("\n")}` },
      },
    ],
  };
}
