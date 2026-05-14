import { TwitterApi } from "twitter-api-v2";
import type { MediaType, PostResult } from "@/types";

/**
 * Post an image or video to Twitter / X.
 * Docs: https://developer.twitter.com/en/docs/twitter-api
 *
 * Required env vars:
 *   TWITTER_API_KEY
 *   TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN
 *   TWITTER_ACCESS_TOKEN_SECRET
 */
export async function postToTwitter(
  mediaUrl: string,
  mediaType: MediaType,
  caption: string
): Promise<PostResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { platform: "twitter", success: false, error: "Twitter credentials not configured" };
  }

  try {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret,
    });

    // Download the media
    const mediaRes = await fetch(mediaUrl);
    const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer());
    const mimeType = mediaType === "image" ? "image/jpeg" : "video/mp4";

    // Upload media to Twitter
    const mediaId = await client.v1.uploadMedia(mediaBuffer, { mimeType });

    // Post tweet with media
    const tweet = await client.v2.tweet({
      text: caption || "",
      media: { media_ids: [mediaId] },
    });

    const tweetUrl = `https://twitter.com/i/web/status/${tweet.data.id}`;
    return { platform: "twitter", success: true, postUrl: tweetUrl };
  } catch (err) {
    return { platform: "twitter", success: false, error: String(err) };
  }
}
