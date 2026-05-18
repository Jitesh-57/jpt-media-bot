import Anthropic from "@anthropic-ai/sdk";
import type { MediaType } from "@/types";

/**
 * Generate a platform-optimised social media caption with hashtags.
 * Falls back to a simple template if the API key isn't set or is a placeholder.
 */
export async function generateCaption(
  prompt: string,
  mediaType: MediaType
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("placeholder") || !apiKey.startsWith("sk-ant-")) {
    return `✨ ${prompt}\n\n#AI #GeneratedContent #PixelBin #JPT`;
  }

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Write a compelling social media caption for a ${mediaType} about: "${prompt}".

Requirements:
- 2-3 punchy sentences that hook the reader
- Match the vibe of the content (cinematic, energetic, calm, etc.)
- End with 6-10 relevant hashtags
- Keep total length under 250 characters (excluding hashtags)
- Return only the caption text + hashtags, nothing else`,
        },
      ],
    });

    return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch (err) {
    console.error("Caption generation failed:", err);
    return `✨ ${prompt}\n\n#AI #GeneratedContent #PixelBin`;
  }
}
