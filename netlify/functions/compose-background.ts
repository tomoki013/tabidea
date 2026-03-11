import { processComposeJob } from "../../src/lib/services/itinerary/process-compose-job";

interface NetlifyEvent {
  body: string | null;
  headers?: Record<string, string | undefined>;
}

export async function handler(event: NetlifyEvent) {
  const configuredSecret = process.env.COMPOSE_JOB_SECRET;
  const providedSecret = event.headers?.["x-compose-job-secret"] ?? event.headers?.["X-Compose-Job-Secret"];

  if (configuredSecret && providedSecret !== configuredSecret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "unauthorized" }),
    };
  }

  const parsed = event.body ? JSON.parse(event.body) : null;
  const jobId = parsed?.jobId;
  if (typeof jobId !== "string" || jobId.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "jobId is required" }),
    };
  }

  try {
    await processComposeJob(jobId);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, jobId }),
    };
  } catch (error) {
    console.error("[compose-background] Failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "compose_background_failed",
      }),
    };
  }
}

export const config = {
  type: "experimental-background",
};
