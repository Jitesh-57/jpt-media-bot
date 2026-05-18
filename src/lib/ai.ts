import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { MediaType } from "@/types";

function fallbackPost(prompt: string): string {
  return `✨ ${prompt}\n\n#AI #GeneratedContent #PixelBin #AIArt #CreativeAI #DigitalArt #AIGenerated #Innovation #FutureOfCreativity #ContentCreation`;
}

const POST_PROMPT = (mediaRef: string) =>
  `You are a world-class social media content creator. Write a complete, ready-to-post social media post for ${mediaRef}.

Structure the post EXACTLY like this:
[A punchy, scroll-stopping first line / hook — no more than 12 words]

[2–3 sentences of vivid, engaging body text. Be descriptive and emotional. Make it feel authentic and human, not robotic. Match the mood — cinematic, energetic, calm, futuristic, etc.]

[One short call-to-action line — e.g. "Drop a 🔥 if you love this!" or "Save this for inspo!"]

#[15–20 highly relevant hashtags — mix of mega-popular (#AI #Photography), trending, and niche tags specific to the content, style, mood, and subject]

Rules:
- NEVER say "caption", "post", "hashtags" or meta-words
- Total body text under 200 characters (excluding hashtags)
- Hashtags go on a SEPARATE line at the end
- Return ONLY the post — no preamble, no explanation`;

// ── OpenAI / ChatGPT (GPT-4 Vision) ─────────────────────────────────────────
async function generateWithOpenAI(
  prompt: string,
  mediaType: MediaType,
  mediaUrl?: string
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.includes("placeholder") || !key.startsWith("sk-")) return null;

  const client = new OpenAI({ apiKey: key });
  const mediaRef =
    mediaType === "image" && mediaUrl
      ? "this AI-generated image (shown above)"
      : `this AI-generated ${mediaType} about: "${prompt}"`;

  type OAIContent = OpenAI.Chat.ChatCompletionContentPart;
  const content: OAIContent[] = [];
  if (mediaType === "image" && mediaUrl) {
    content.push({ type: "image_url", image_url: { url: mediaUrl, detail: "high" } });
  }
  content.push({ type: "text", text: POST_PROMPT(mediaRef) });

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 700,
      messages: [{ role: "user", content }],
    });
    return res.choices[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error("OpenAI post generation failed:", err);
    return null;
  }
}

// ── Anthropic / Claude Vision ─────────────────────────────────────────────────
async function generateWithAnthropic(
  prompt: string,
  mediaType: MediaType,
  mediaUrl?: string
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes("placeholder") || !key.startsWith("sk-ant-")) return null;

  const client = new Anthropic({ apiKey: key });
  const mediaRef =
    mediaType === "image" && mediaUrl
      ? "this AI-generated image (shown above)"
      : `this AI-generated ${mediaType} about: "${prompt}"`;

  type ContentBlock = Anthropic.ImageBlockParam | Anthropic.TextBlockParam;
  const content: ContentBlock[] = [];
  if (mediaType === "image" && mediaUrl) {
    content.push({ type: "image", source: { type: "url", url: mediaUrl } } as Anthropic.ImageBlockParam);
  }
  content.push({ type: "text", text: POST_PROMPT(mediaRef) });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [{ role: "user", content }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;
    return text || null;
  } catch (err) {
    console.error("Anthropic post generation failed:", err);
    return null;
  }
}

/**
 * Generate a complete social media post (hook + body + CTA + hashtags).
 * Tries OpenAI (ChatGPT/GPT-4 Vision) first if OPENAI_API_KEY is set,
 * then falls back to Claude Vision if ANTHROPIC_API_KEY is set,
 * then falls back to a template.
 */
export async function generatePost(
  prompt: string,
  mediaType: MediaType,
  mediaUrl?: string
): Promise<string> {
  // Try OpenAI first (user's preference: ChatGPT)
  const openaiResult = await generateWithOpenAI(prompt, mediaType, mediaUrl);
  if (openaiResult) return openaiResult;

  // Fall back to Claude Vision
  const anthropicResult = await generateWithAnthropic(prompt, mediaType, mediaUrl);
  if (anthropicResult) return anthropicResult;

  // Last resort template
  return fallbackPost(prompt);
}

// Alias for backwards compatibility
export const generateCaption = generatePost;
