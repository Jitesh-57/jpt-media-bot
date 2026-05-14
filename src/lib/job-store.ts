import type { GenerationJob } from "@/types";

// In-memory store for pending generation jobs.
// On Vercel each serverless invocation may get a fresh instance, so for
// production you'd swap this for Vercel KV / Redis. For single-instance
// deployments (Docker / Railway) this works perfectly.
const jobs = new Map<string, GenerationJob>();

export function saveJob(job: GenerationJob): void {
  jobs.set(job.jobId, job);
}

export function getJob(jobId: string): GenerationJob | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, patch: Partial<GenerationJob>): void {
  const existing = jobs.get(jobId);
  if (existing) jobs.set(jobId, { ...existing, ...patch });
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}
