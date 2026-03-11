import { ComposeJobStore } from "@/lib/services/itinerary/compose-job-store";
import { runComposePipeline } from "@/lib/services/itinerary/pipeline-orchestrator";

export async function processComposeJob(jobId: string): Promise<void> {
  const store = new ComposeJobStore();
  const job = await store.getJobInput(jobId);

  if (!job) {
    throw new Error(`Compose job not found: ${jobId}`);
  }

  await store.markRunning(jobId);

  const result = await runComposePipeline(job.input, job.options, async (event) => {
    try {
      await store.appendProgress(jobId, event);
    } catch (error) {
      console.warn("[compose-job] Failed to persist progress:", error);
    }
  });

  if (result.success) {
    await store.markCompleted(jobId, result);
    return;
  }

  await store.markFailed(jobId, result);
}
