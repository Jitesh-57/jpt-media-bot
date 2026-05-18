import { TwitterApi } from "twitter-api-v2";
import type { MediaType, PostResult } from "@/types";

/**
 * Post an image or video to Twitter / X.
 *
 * Supports two auth modes (uses whichever credentials are set):
 *
 * Mode A — OAuth 2.0 (what you have now):
 *   TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET
 *   TWITTER_ACCESS_TOKEN  (OAuth 2.0 user access token)
 *   TWITTER_REFRESH_TOKEN
 *   → Posts tweet with text + media URL appended
 *
 * Mode B — OAuth 1.0a (full media upload, native preview):
 *   TWITTER_API_KEY + TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN_OAUTH1 + TWITTER_ACCESS_TOKEN_SECRET
 *   → Uploads media directly, native image/video in tweet
 */
export async function postToTwitter(
  mediaUrl: string,
  mediaType: MediaType,
  caption: string
): Promise<PostResult> {

  // ── Mode B: OAuth 1.0a (full media upload) ──────────────────────────────
  const apiKey        = process.env.TWITTER_API_KEY;
  const apiSecret     = process.env.TWITTER_API_SECRET;
  const accessToken1  = process.env.TWITTER_ACCESS_TOKEN_OAUTH1;
  const accessSecret  = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (apiKey && apiSecret && accessToken1 && accessSecret) {
    return postWithOAuth1(apiKey, apiSecret, accessToken1, accessSecret, mediaUrl, mediaType, caption);
  }

  // ── Mode A: OAuth 2.0 (text + URL, no native media upload) ─────────────
  const clientId      = process.env.TWITTER_CLIENT_ID;
  const clientSecret  = process.env.TWITTER_CLIENT_SECRET;
  const accessToken2  = process.env.TWITTER_ACCESS_TOKEN;
  const refreshToken  = process.env.TWITTER_REFRESH_TOKEN;

  if (accessToken2) {
    return postWithOAuth2(clientId, clientSecret, accessToken2, refreshToken, mediaUrl, caption);
  }

  return { platform: "twitter", success: false, error: "Twitter credentials not configured" };
}

// ── OAuth 1.0a: uploads media + posts native tweet ──────────────────────────
async function postWithOAuth1(
  apiKey: string, apiSecret: string,
  accessToken: string, accessSecret: string,
  mediaUrl: string, mediaType: MediaType, caption: string
): Promise<PostResult> {
  try {
    const client = new TwitterApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret });

    const mediaRes = await fetch(mediaUrl);
    const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer());
    const mimeType = mediaType === "video" ? "video/mp4" : "image/jpeg";

    const mediaId = await client.v1.uploadMedia(mediaBuffer, { mimeType });
    const tweet = await client.v2.tweet({
      text: caption.slice(0, 280),
      media: { media_ids: [mediaId] },
    });

    return {
      platform: "twitter",
      success: true,
      postUrl: `https://twitter.com/i/web/status/${tweet.data.id}`,
    };
  } catch (err) {
    return { platform: "twitter", success: false, error: String(err) };
  }
}

// ── OAuth 2.0: text tweet + media URL (refreshes token if needed) ────────────
async function postWithOAuth2(
  clientId: string | undefined,
  clientSecret: string | undefined,
  accessToken: string,
  refreshToken: string | undefined,
  mediaUrl: string,
  caption: string
): Promise<PostResult> {
  try {
    let token = accessToken;

    // Try to refresh if client credentials are available
    if (refreshToken && clientId && clientSecret) {
      try {
        const refreshClient = new TwitterApi({ clientId, clientSecret });
        const { accessToken: newToken, refreshToken: newRefresh } =
          await refreshClient.refreshOAuth2Token(refreshToken);
        token = newToken;
        // Log new tokens so they can be updated (Vercel doesn't auto-update env vars)
        if (newRefresh) {
          console.log("Twitter token refreshed. New refresh token:", newRefresh.slice(0, 20) + "...");
        }
      } catch (refreshErr) {
        console.warn("Token refresh failed, using existing token:", refreshErr);
      }
    }

    const client = new TwitterApi(token);

    // Build tweet text — keep under 280 chars, append media URL for preview
    const maxTextLen = 280 - mediaUrl.length - 2;
    const text = caption.length > maxTextLen
      ? caption.slice(0, maxTextLen - 3) + `...\n${mediaUrl}`
      : `${caption}\n${mediaUrl}`;

    const tweet = await client.v2.tweet({ text });

    return {
      platform: "twitter",
      success: true,
      postUrl: `https://twitter.com/i/web/status/${tweet.data.id}`,
    };
  } catch (err) {
    return { platform: "twitter", success: false, error: String(err) };
  }
}
