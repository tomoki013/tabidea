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

function shouldRetryComposeJob(result: Awaited<ReturnType<typeof runComposePipeline>>): boolean {
  if (result.success || result.limitExceeded || !result.failedStep) {
    return false;
  }

  if (!COMPOSE_RETRYABLE_STEPS.has(result.failedStep)) {
    return false;
  }

  return /timeout|timed out/i.test(result.message ?? "");
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

  if (shouldRetryComposeJob(result)) {
    result = await runComposePipeline(job.input, {
      ...job.options,
      isRetry: true,
    }, appendProgress);
  }

  if (result.success) {
    await store.markCompleted(jobId, result);
    return;
  }

  await store.markFailed(jobId, result);
}
