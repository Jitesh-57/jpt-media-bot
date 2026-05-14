import { postToInstagram } from "./instagram";
import { postToLinkedIn } from "./linkedin";
import { postToTwitter } from "./twitter";
import { postToYouTube } from "./youtube";
import type { SocialPlatform, MediaType, PostResult } from "@/types";

export async function postToAllPlatforms(
  platforms: SocialPlatform[],
  mediaUrl: string,
  mediaType: MediaType,
  caption: string
): Promise<PostResult[]> {
  const tasks = platforms.map((platform) => {
    switch (platform) {
      case "instagram": return postToInstagram(mediaUrl, mediaType, caption);
      case "linkedin":  return postToLinkedIn(mediaUrl, mediaType, caption);
      case "twitter":   return postToTwitter(mediaUrl, mediaType, caption);
      case "youtube":   return postToYouTube(mediaUrl, mediaType, caption);
      default: return Promise.resolve<PostResult>({ platform, success: false, error: "Unknown platform" });
    }
  });

  return Promise.all(tasks);
}
