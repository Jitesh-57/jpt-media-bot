import { PixelbinConfig, PixelbinClient } from "@pixelbin/admin";
import type { PredictionResult, AspectRatio } from "@/types";

const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  apiSecret: process.env.PIXELBIN_API_TOKEN!,
});

export const pixelbin = new PixelbinClient(config);

// Generate image via NanoBanana Pro
export async function createImageJob(
  prompt: string,
  webhookUrl: string,
  aspectRatio: AspectRatio = "16:9"
): Promise<{ jobId: string }> {
  const job = await pixelbin.predictions.create({
    name: "nanoBananaPro_generate",
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      output_resolution: "2K",
    },
    webhook: webhookUrl,
  });
  return { jobId: job._id };
}

// Generate video via Google Veo 3.1 Fast
// Note: Veo only supports 16:9 and 9:16 — map 1:1 → 16:9
export async function createVideoJob(
  prompt: string,
  webhookUrl: string,
  aspectRatio: AspectRatio = "16:9"
): Promise<{ jobId: string }> {
  const videoRatio = aspectRatio === "1:1" ? "16:9" : aspectRatio;
  const job = await pixelbin.predictions.create({
    name: "veo31Fast_generate",
    input: {
      prompt,
      aspect_ratio: videoRatio,
      resolution: "720p",
      duration: "8",
      audio: "true", // must be string — SDK uses FormData which can't handle booleans
    },
    webhook: webhookUrl,
  });
  return { jobId: job._id };
}

// Poll for job result (used as fallback if webhook doesn't fire)
export async function waitForJob(
  jobId: string,
  maxAttempts = 60,
  retryInterval = 5000
): Promise<PredictionResult> {
  return pixelbin.predictions.wait(jobId, { maxAttempts, retryInterval }) as Promise<PredictionResult>;
}

// Extract the CDN URL from a completed prediction result
export function extractMediaUrl(result: PredictionResult): string | null {
  if (result.status !== "SUCCESS") return null;
  const output = result.output;
  if (!output) return null;
  if (output.url) return output.url as string;
  if (output.urls && output.urls.length > 0) return output.urls[0];
  const firstUrl = Object.values(output).find(
    (v) => typeof v === "string" && (v.startsWith("https://cdn.pixelbin") || v.startsWith("https://"))
  );
  return (firstUrl as string) ?? null;
}
