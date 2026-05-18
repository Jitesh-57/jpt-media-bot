export type MediaType = "image" | "video";
export type SocialPlatform = "instagram" | "linkedin" | "twitter" | "youtube";
export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface GenerationJob {
  jobId: string;
  type: MediaType;
  prompt: string;
  slackChannelId: string;
  slackUserId: string;
  slackTs?: string;         // timestamp of the "generating..." message to update
  status: "pending" | "processing" | "done" | "failed";
  resultUrl?: string;
  createdAt: number;
}

export interface PredictionResult {
  _id: string;
  status: "SUCCESS" | "FAILURE" | "PROCESSING" | "PENDING";
  output?: {
    url?: string;
    urls?: string[];
    [key: string]: unknown;
  };
  error?: string;
}

export interface SlackInteractionPayload {
  type: string;
  callback_id?: string;
  trigger_id: string;
  user: { id: string; name: string };
  channel: { id: string; name: string };
  actions?: SlackAction[];
  view?: SlackView;
  message?: { ts: string; blocks: unknown[] };
  response_url?: string;
}

export interface SlackAction {
  action_id: string;
  block_id: string;
  type: string;
  value?: string;
  selected_options?: Array<{ value: string }>;
}

export interface SlackView {
  id: string;
  callback_id: string;
  state: {
    values: Record<string, Record<string, { value?: string; selected_options?: Array<{ value: string }> }>>;
  };
  private_metadata?: string;
}

export interface SocialPostRequest {
  platforms: SocialPlatform[];
  mediaUrl: string;
  mediaType: MediaType;
  content: string;
  channelId: string;
  userId: string;
}

export interface PostResult {
  platform: SocialPlatform;
  success: boolean;
  postUrl?: string;
  error?: string;
}
