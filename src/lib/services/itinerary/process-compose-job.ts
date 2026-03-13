import { ComposeJobStore } from "@/lib/services/itinerary/compose-job-store";
import { runComposePipeline } from "@/lib/services/itinerary/pipeline-orchestrator";

const COMPOSE_RETRYABLE_STEPS = new Set([
  "semantic_plan",
  "place_resolve",
  "feasibility_score",
  "route_optimize",
  "timeline_build",
  "narrative_render",
]);
const MAX_COMPOSE_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [800, 1_600];

function shouldRetryComposeJob(result: Awaited<ReturnType<typeof runComposePipeline>>): boolean {
  if (result.success || result.limitExceeded || !result.failedStep) {
    return false;
  }

  if (!COMPOSE_RETRYABLE_STEPS.has(result.failedStep)) {
    return false;
  }

  return /timeout|timed out/i.test(result.message ?? "");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processComposeJob(jobId: string): Promise<void> {
  const store = new ComposeJobStore();
  const job = await store.getJobInput(jobId);

  if (!job) {
    throw new Error(`Compose job not found: ${jobId}`);
  }

  await store.markRunning(jobId);

  const appendProgress = async (event: Parameters<typeof store.appendProgress>[1]) => {
    try {
      await store.appendProgress(jobId, event);
    } catch (error) {
      console.warn("[compose-job] Failed to persist progress:", error);
    }
  };

  let result = await runComposePipeline(job.input, job.options, appendProgress);

  let attempt = 1;
  while (attempt < MAX_COMPOSE_ATTEMPTS && shouldRetryComposeJob(result)) {
    const backoffMs = RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1] ?? 500;
    console.warn("[compose-job] retrying timed-out job", {
      jobId,
      attempt,
      nextAttempt: attempt + 1,
      failedStep: result.failedStep,
      message: result.message,
      backoffMs,
    });
    await sleep(backoffMs);
    result = await runComposePipeline(job.input, {
      ...job.options,
      isRetry: true,
    }, appendProgress);
    attempt += 1;
  }

  if (result.success) {
    await store.markCompleted(jobId, result);
    return;
  }

  await store.markFailed(jobId, result);
}
