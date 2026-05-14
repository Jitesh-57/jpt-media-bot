import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/job-store";
import { updateMessage, postMessage } from "@/lib/slack";
import { mediaReadyBlock } from "@/lib/slack-blocks";
import { extractMediaUrl } from "@/lib/pixelbin";
import type { PredictionResult } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ ok: true });

  const result: PredictionResult = await req.json();

  const job = getJob(jobId);
  if (!job) {
    console.warn(`Webhook received for unknown jobId: ${jobId}`);
    return NextResponse.json({ ok: true });
  }

  if (result.status === "SUCCESS") {
    const mediaUrl = extractMediaUrl(result);
    if (!mediaUrl) {
      console.error("SUCCESS but no media URL found in result:", result);
      await notifyFailure(job.slackChannelId, job.slackTs, job.type);
      updateJob(jobId, { status: "failed" });
      return NextResponse.json({ ok: true });
    }

    updateJob(jobId, { status: "done", resultUrl: mediaUrl });

    const readyPayload = mediaReadyBlock(job.type, job.prompt, mediaUrl, jobId);

    if (job.slackTs) {
      // Update the "generating…" message in-place
      await updateMessage(job.slackChannelId, job.slackTs, {
        ...readyPayload,
        text: `Your ${job.type} is ready!`,
      });
    } else {
      await postMessage(job.slackChannelId, {
        ...readyPayload,
        text: `Your ${job.type} is ready!`,
      });
    }
  } else if (result.status === "FAILURE") {
    updateJob(jobId, { status: "failed" });
    await notifyFailure(job.slackChannelId, job.slackTs, job.type, result.error);
  }
  // PROCESSING / PENDING → do nothing, wait for next webhook call

  return NextResponse.json({ ok: true });
}

async function notifyFailure(
  channelId: string,
  ts: string | undefined,
  type: string,
  error?: string
) {
  const text = `❌ ${type} generation failed.${error ? `\n> ${error}` : ""}\nPlease try again.`;
  if (ts) {
    await updateMessage(channelId, ts, { text, blocks: [] });
  } else {
    await postMessage(channelId, { text });
  }
}
