import type { MediaType, PostResult } from "@/types";

const BASE = "https://graph.facebook.com/v19.0";

/**
 * Post an image or video to an Instagram Business account.
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 *
 * Required env vars:
 *   INSTAGRAM_ACCESS_TOKEN        – long-lived user access token
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID – IG Business account ID
 */
export async function postToInstagram(
  mediaUrl: string,
  mediaType: MediaType,
  caption: string
): Promise<PostResult> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !accountId) {
    return { platform: "instagram", success: false, error: "Instagram credentials not configured" };
  }

  try {
    // Step 1: Create a media container
    const containerParams: Record<string, string> = {
      access_token: token,
      caption,
    };

    if (mediaType === "image") {
      containerParams.image_url = mediaUrl;
      containerParams.media_type = "IMAGE";
    } else {
      containerParams.video_url = mediaUrl;
      containerParams.media_type = "REELS";
    }

    const containerRes = await fetch(`${BASE}/${accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerParams),
    });
    const container = await containerRes.json();
    if (!container.id) throw new Error(container.error?.message ?? "Container creation failed");

    // For videos, wait for the container to finish processing
    if (mediaType === "video") await waitForVideoContainer(container.id, token);

    // Step 2: Publish the container
    const publishRes = await fetch(`${BASE}/${accountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    const published = await publishRes.json();
    if (!published.id) throw new Error(published.error?.message ?? "Publish failed");

    const postUrl = `https://www.instagram.com/p/${published.id}/`;
    return { platform: "instagram", success: true, postUrl };
  } catch (err) {
    return { platform: "instagram", success: false, error: String(err) };
  }
}

async function waitForVideoContainer(containerId: string, token: string) {
  for (let i = 0; i < 20; i++) {
    await sleep(5000);
    const res = await fetch(
      `${BASE}/${containerId}?fields=status_code&access_token=${token}`
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Video processing failed on Instagram");
  }
  throw new Error("Instagram video processing timed out");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
