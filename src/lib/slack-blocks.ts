import type { MediaType } from "@/types";

// ─── Greeting message — posted when user tags @JPT without a command ──────────
export function greetingBlock(userId: string) {
  return {
    text: `Hey <@${userId}>! 👋 I'm JPT — your AI content creator.`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hey <@${userId}>! 👋 I'm *JPT*, your AI-powered content creator.\n\nDescribe what you want and I'll generate a stunning image or video — then help you post it to Instagram, LinkedIn, Twitter and YouTube with an AI-written caption.`,
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

// ─── Creator modal ─────────────────────────────────────────────────────────────
export function creatorModal(channelId: string, userId: string) {
  return {
    type: "modal",
    callback_id: "generate_content",
    title: { type: "plain_text", text: "🎨 Create Content", emoji: true },
    submit: { type: "plain_text", text: "✨ Generate", emoji: true },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({ channelId, userId }),
    blocks: [
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
      {
        type: "input",
        block_id: "media_type_block",
        label: { type: "plain_text", text: "Media Type" },
        element: {
          type: "radio_buttons",
          action_id: "media_type_input",
          options: [
            {
              text: { type: "plain_text", text: "🖼️ Image  (NanoBanana Pro · ~1 min)", emoji: true },
              value: "image",
            },
            {
              text: { type: "plain_text", text: "🎬 Video  (Google Veo 3.1 · ~3 min)", emoji: true },
              value: "video",
            },
          ],
          initial_option: {
            text: { type: "plain_text", text: "🖼️ Image  (NanoBanana Pro · ~1 min)", emoji: true },
            value: "image",
          },
        },
      },
      {
        type: "input",
        block_id: "platform_block",
        label: { type: "plain_text", text: "Post to social media" },
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
      {
        type: "input",
        block_id: "caption_block",
        label: {
          type: "plain_text",
          text: "Custom Caption (leave empty to auto-generate with hashtags ✨)",
        },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "caption_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Leave empty and JPT will write a caption + hashtags for you...",
          },
        },
      },
    ],
  };
}

// ─── "Generating…" status message ─────────────────────────────────────────────
export function generatingBlock(type: MediaType, prompt: string) {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⏳ *Generating your ${type}...*\n> _${prompt}_\n\nThis may take ${type === "video" ? "2-4 minutes" : "~1 minute"}. I'll update this message when it's ready!`,
        },
      },
    ],
  };
}

// ─── Media ready — image (with inline preview) ─────────────────────────────────
export function imageReadyBlock(
  prompt: string,
  mediaUrl: string,
  caption: string,
  jobId: string,
  platforms: string[]
) {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🖼️ *Your image is ready!*\n> _${prompt}_\n\n<${mediaUrl}|View / Download image>`,
        },
      },
      { type: "image", image_url: mediaUrl, alt_text: prompt },
      { type: "divider" },
      _captionAndPlatformBlocks(caption, jobId, "image", mediaUrl, platforms),
    ].flat(),
  };
}

// ─── Media ready — video (uploaded to Slack for native playback) ───────────────
export function videoReadyBlock(
  prompt: string,
  mediaUrl: string,
  caption: string,
  jobId: string,
  platforms: string[]
) {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎬 *Your video is ready!*\n> _${prompt}_\n\n<${mediaUrl}|View / Download video>`,
        },
      },
      { type: "divider" },
      _captionAndPlatformBlocks(caption, jobId, "video", mediaUrl, platforms),
    ].flat(),
  };
}

// ─── Shared caption + platform selector blocks ─────────────────────────────────
function _captionAndPlatformBlocks(
  caption: string,
  jobId: string,
  mediaType: MediaType,
  mediaUrl: string,
  preSelectedPlatforms: string[]
) {
  const platformOptions = [
    { text: { type: "plain_text", text: "📸 Instagram", emoji: true }, value: "instagram" },
    { text: { type: "plain_text", text: "💼 LinkedIn", emoji: true }, value: "linkedin" },
    { text: { type: "plain_text", text: "🐦 Twitter / X", emoji: true }, value: "twitter" },
    { text: { type: "plain_text", text: "▶️ YouTube", emoji: true }, value: "youtube" },
  ];

  const initialOptions = platformOptions.filter((o) =>
    preSelectedPlatforms.includes(o.value)
  );

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*AI-generated caption & hashtags ✨*\nEdit below or use as-is, then select platforms and post.",
      },
    },
    {
      type: "input",
      block_id: "caption_edit_block",
      optional: true,
      label: { type: "plain_text", text: "Caption / Content" },
      element: {
        type: "plain_text_input",
        action_id: "caption_edit_input",
        multiline: true,
        initial_value: caption,
        placeholder: { type: "plain_text", text: "Your caption with hashtags..." },
      },
    },
    {
      type: "input",
      block_id: "platform_post_block",
      optional: true,
      label: { type: "plain_text", text: "Post to" },
      element: {
        type: "checkboxes",
        action_id: "platforms_post_input",
        options: platformOptions,
        ...(initialOptions.length > 0 ? { initial_options: initialOptions } : {}),
      },
    },
    {
      type: "actions",
      block_id: "post_actions",
      elements: [
        {
          type: "button",
          action_id: "post_to_social",
          style: "primary",
          text: { type: "plain_text", text: "🚀 Post to Selected Platforms", emoji: true },
          value: JSON.stringify({ jobId, mediaUrl, mediaType }),
          confirm: {
            title: { type: "plain_text", text: "Post to social media?" },
            text: { type: "mrkdwn", text: "This will post your content to all selected platforms." },
            confirm: { type: "plain_text", text: "Yes, post it!" },
            deny: { type: "plain_text", text: "Cancel" },
          },
        },
      ],
    },
  ];
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
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Social posting results:*\n${lines.join("\n")}` },
      },
    ],
  };
}
