import { TwitterApi } from "twitter-api-v2";
import sharp from "sharp";
import type { MediaType, PostResult } from "@/types";

// Twitter limits: images ≤ 5 MB, videos ≤ 512 MB
const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB to stay safely under

/**
 * Compress + convert image to JPEG ≤ 4.5 MB at max 1920px wide.
 * Twitter works best with JPEG; PNG from PixelBin can be 5–8 MB.
 */
async function compressImage(buffer: Buffer): Promise<{ data: Buffer; mimeType: "image/jpeg" }> {
  let quality = 85;
  let data = await sharp(buffer)
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  // Reduce quality further if still over limit
  while (data.length > MAX_IMAGE_BYTES && quality > 40) {
    quality -= 10;
    data = await sharp(buffer)
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  console.log(`Image compressed: ${(data.length / 1024 / 1024).toFixed(1)} MB at quality ${quality}`);
  return { data, mimeType: "image/jpeg" };
}

export async function postToTwitter(
  mediaUrl: string,
  mediaType: MediaType,
  caption: string
): Promise<PostResult> {

  // ── OAuth 1.0a (full media upload — preferred) ───────────────────────────
  const apiKey       = process.env.TWITTER_API_KEY;
  const apiSecret    = process.env.TWITTER_API_SECRET;
  const accessToken1 = process.env.TWITTER_ACCESS_TOKEN_OAUTH1;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (apiKey && apiSecret && accessToken1 && accessSecret) {
    return postWithOAuth1(apiKey, apiSecret, accessToken1, accessSecret, mediaUrl, mediaType, caption);
  }

  // ── OAuth 2.0 fallback (text + URL) ─────────────────────────────────────
  const accessToken2 = process.env.TWITTER_ACCESS_TOKEN;
  const clientId     = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const refreshToken = process.env.TWITTER_REFRESH_TOKEN;

  if (accessToken2) {
    return postWithOAuth2(clientId, clientSecret, accessToken2, refreshToken, mediaUrl, caption);
  }

  return { platform: "twitter", success: false, error: "Twitter credentials not configured" };
}

// ── OAuth 1.0a: uploads compressed media + posts native tweet ────────────────
async function postWithOAuth1(
  apiKey: string, apiSecret: string,
  accessToken: string, accessSecret: string,
  mediaUrl: string, mediaType: MediaType, caption: string
): Promise<PostResult> {
  try {
    const client = new TwitterApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret });

    // Download media
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) throw new Error(`Failed to download media: ${mediaRes.status}`);
    const rawBuffer = Buffer.from(await mediaRes.arrayBuffer());

    let uploadBuffer: Buffer;
    let mimeType: string;

    if (mediaType === "video") {
      uploadBuffer = rawBuffer;
      mimeType = "video/mp4";
    } else {
      // Compress image to stay under Twitter's 5 MB limit
      const compressed = await compressImage(rawBuffer);
      uploadBuffer = compressed.data;
      mimeType = compressed.mimeType;
    }

    // Upload media to Twitter
    const mediaId = await client.v1.uploadMedia(uploadBuffer, { mimeType });

    // Build tweet text (max 280 chars)
    const tweetText = caption.slice(0, 277) + (caption.length > 277 ? "..." : "");

    // Use v1.1 statuses/update — works on free tier; v2 tweets endpoint requires paid plan (402)
    const tweet = await client.v1.tweet(tweetText, { media_ids: mediaId });

    return {
      platform: "twitter",
      success: true,
      postUrl: `https://twitter.com/i/web/status/${tweet.id_str}`,
    };
  } catch (err) {
    console.error("Twitter OAuth1 post failed:", err);
    return { platform: "twitter", success: false, error: String(err) };
  }
}

// ── OAuth 2.0: text tweet with media URL (no media upload) ───────────────────
async function postWithOAuth2(
  clientId: string | undefined, clientSecret: string | undefined,
  accessToken: string, refreshToken: string | undefined,
  mediaUrl: string, caption: string
): Promise<PostResult> {
  try {
    let token = accessToken;

    if (refreshToken && clientId && clientSecret) {
      try {
        const { accessToken: newToken } = await new TwitterApi({ clientId, clientSecret })
          .refreshOAuth2Token(refreshToken);
        token = newToken;
      } catch { /* use existing token */ }
    }

    const client = new TwitterApi(token);
    const maxLen = 277 - mediaUrl.length;
    const text = caption.length > maxLen
      ? caption.slice(0, maxLen - 3) + `...\n${mediaUrl}`
      : `${caption}\n${mediaUrl}`;

    const tweet = await client.v2.tweet({ text });
    return {
      platform: "twitter",
      success: true,
      postUrl: `https://twitter.com/i/web/status/${tweet.data.id}`,
    };
  } catch (err) {
    console.error("Twitter OAuth2 post failed:", err);
    return { platform: "twitter", success: false, error: String(err) };
  }
}
