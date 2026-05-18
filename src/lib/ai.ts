import Anthropic from "@anthropic-ai/sdk";
import type { MediaType } from "@/types";

function fallbackPost(prompt: string): string {
  return `✨ ${prompt}\n\n#AI #GeneratedContent #PixelBin #AIArt #CreativeAI #DigitalArt #AIGenerated #Innovation #FutureOfCreativity #ContentCreation`;
}

function getApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes("placeholder") || !key.startsWith("sk-ant-")) return null;
  return key;
}

/**
 * Generate a complete social media post (hook + body + CTA + hashtags).
 * Uses Claude Vision to analyse the actual image when available.
 * Falls back gracefully if the API key is not configured.
 */
export async function generatePost(
  prompt: string,
  mediaType: MediaType,
  mediaUrl?: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return fallbackPost(prompt);

  const client = new Anthropic({ apiKey });

  // Build content blocks — include image for vision analysis when it's an image
  type ContentBlock = Anthropic.ImageBlockParam | Anthropic.TextBlockParam;
  const content: ContentBlock[] = [];

  if (mediaType === "image" && mediaUrl) {
    try {
      content.push({
        type: "image",
        source: { type: "url", url: mediaUrl },
      } as Anthropic.ImageBlockParam);
    } catch {
      // If image param fails, continue with text-only
    }
  }

  const mediaRef = mediaType === "image" && mediaUrl
    ? "this AI-generated image (shown above)"
    : `this AI-generated ${mediaType} about: "${prompt}"`;

  content.push({
    type: "text",
    text: `You are a world-class social media content creator. Write a complete, ready-to-post social media post for ${mediaRef}.

Structure the post EXACTLY like this:
[A punchy, scroll-stopping first line / hook — no more than 12 words]

[2–3 sentences of vivid, engaging body text. Be descriptive and emotional. Make it feel authentic and human, not robotic. Match the mood — cinematic, energetic, calm, futuristic, etc.]

[One short call-to-action line — e.g. "Drop a 🔥 if you love this!" or "Save this for inspo!"]

#[15–20 highly relevant hashtags — mix of mega-popular (#AI #Photography), trending, and niche tags specific to the image content, style, mood, and subject]

Rules:
- NEVER say "caption", "post", "hashtags" or meta-words
- Total body text under 200 characters (excluding hashtags)
- Hashtags go on a SEPARATE line at the end
- Return ONLY the post — no preamble, no explanation`,
  });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [{ role: "user", content }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    return text || fallbackPost(prompt);
  } catch (err) {
    console.error("Post generation failed:", err);
    return fallbackPost(prompt);
  }
}

// Keep old name as alias for any callers that haven't been updated yet
export const generateCaption = generatePost;
