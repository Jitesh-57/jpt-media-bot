import type { MediaType, PostResult } from "@/types";

const BASE = "https://api.linkedin.com/v2";

/**
 * Post an image or video to LinkedIn.
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
 *
 * Required env vars:
 *   LINKEDIN_ACCESS_TOKEN  – OAuth 2.0 access token (w/ w_member_social scope)
 *   LINKEDIN_PERSON_URN    – urn:li:person:XXXXXXX   (post as person)
 *   LINKEDIN_ORG_URN       – urn:li:organization:XXX (post as company page, optional)
 */
export async function postToLinkedIn(
  mediaUrl: string,
  mediaType: MediaType,
  caption: string
): Promise<PostResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_ORG_URN || process.env.LINKEDIN_PERSON_URN;

  if (!token || !author) {
    return { platform: "linkedin", success: false, error: "LinkedIn credentials not configured" };
  }

  try {
    let mediaAsset: string | undefined;

    if (mediaType === "image") {
      mediaAsset = await uploadLinkedInImage(mediaUrl, author, token);
    } else {
      mediaAsset = await uploadLinkedInVideo(mediaUrl, author, token);
    }

    // Create the post (UGC post)
    const postBody = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: caption || " " },
          shareMediaCategory: mediaType === "image" ? "IMAGE" : "VIDEO",
          media: [
            {
              status: "READY",
              media: mediaAsset,
            },
          ],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch(`${BASE}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? JSON.stringify(data));

    const postId = res.headers.get("x-restli-id") ?? data.id;
    const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}/` : undefined;
    return { platform: "linkedin", success: true, postUrl };
  } catch (err) {
    return { platform: "linkedin", success: false, error: String(err) };
  }
}

async function uploadLinkedInImage(imageUrl: string, owner: string, token: string): Promise<string> {
  // Register upload
  const registerRes = await fetch(`${BASE}/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  const register = await registerRes.json();
  const uploadUrl = register.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const asset = register.value?.asset;
  if (!uploadUrl || !asset) throw new Error("LinkedIn image upload registration failed");

  // Fetch image and PUT to upload URL
  const imgRes = await fetch(imageUrl);
  const imgBuffer = await imgRes.arrayBuffer();
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: imgBuffer,
  });

  return asset;
}

async function uploadLinkedInVideo(videoUrl: string, owner: string, token: string): Promise<string> {
  // Register upload
  const registerRes = await fetch(`${BASE}/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
        owner,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  const register = await registerRes.json();
  const uploadUrl = register.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const asset = register.value?.asset;
  if (!uploadUrl || !asset) throw new Error("LinkedIn video upload registration failed");

  const vidRes = await fetch(videoUrl);
  const vidBuffer = await vidRes.arrayBuffer();
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: vidBuffer,
  });

  return asset;
}
