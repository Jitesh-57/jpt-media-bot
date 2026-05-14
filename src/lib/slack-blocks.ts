import type { MediaType } from "@/types";

// "Generating…" status message
export function generatingBlock(type: MediaType, prompt: string) {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⏳ *Generating your ${type}...*\n> _${prompt}_\n\nThis may take a moment. I'll update this message when it's ready!`,
        },
      },
    ],
  };
}

// Media ready message with social sharing options
export function mediaReadyBlock(
  type: MediaType,
  prompt: string,
  mediaUrl: string,
  jobId: string
) {
  const emoji = type === "video" ? "🎬" : "🖼️";
  const previewBlock =
    type === "image"
      ? [{ type: "image", image_url: mediaUrl, alt_text: prompt }]
      : [];

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *Your ${type} is ready!*\n> _${prompt}_\n\n<${mediaUrl}|View / Download ${type}>`,
        },
      },
      ...previewBlock,
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Share to social media:*\nSelect one or more platforms, add optional caption, then hit *Post*.",
        },
      },
      {
        type: "actions",
        block_id: "platform_select",
        elements: [
          {
            type: "checkboxes",
            action_id: "platforms_chosen",
            options: [
              { text: { type: "plain_text", text: "📸 Instagram" }, value: "instagram" },
              { text: { type: "plain_text", text: "💼 LinkedIn" }, value: "linkedin" },
              { text: { type: "plain_text", text: "🐦 Twitter / X" }, value: "twitter" },
              { text: { type: "plain_text", text: "▶️ YouTube" }, value: "youtube" },
            ],
          },
        ],
      },
      {
        type: "input",
        block_id: "caption_block",
        optional: true,
        label: { type: "plain_text", text: "Caption / Content (optional)" },
        element: {
          type: "plain_text_input",
          action_id: "caption_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Write your caption here, or leave empty to post media only…",
          },
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
            text: { type: "plain_text", text: "🚀 Post to Selected Platforms" },
            // Encode context in value as JSON
            value: JSON.stringify({ jobId, mediaUrl, mediaType: type }),
            confirm: {
              title: { type: "plain_text", text: "Post to social media?" },
              text: { type: "mrkdwn", text: "This will post your content to all selected platforms." },
              confirm: { type: "plain_text", text: "Yes, post it!" },
              deny: { type: "plain_text", text: "Cancel" },
            },
          },
        ],
      },
    ],
  };
}

// Post result summary block
export function postResultBlock(
  results: Array<{ platform: string; success: boolean; postUrl?: string; error?: string }>
) {
  const lines = results.map(({ platform, success, postUrl, error }) => {
    const icon = success ? "✅" : "❌";
    const name = platform.charAt(0).toUpperCase() + platform.slice(1);
    const link = postUrl ? ` — <${postUrl}|View post>` : "";
    const err = error ? ` (${error})` : "";
    return `${icon} *${name}*${link}${err}`;
  });

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Social media posting results:*\n${lines.join("\n")}`,
        },
      },
    ],
  };
}
