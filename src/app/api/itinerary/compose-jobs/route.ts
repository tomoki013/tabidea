import { getUser } from "@/lib/supabase/server";
import { ComposeJobStore } from "@/lib/services/itinerary/compose-job-store";
import { processComposeJob } from "@/lib/services/itinerary/process-compose-job";
import type { UserInput } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildBackgroundUrl(requestUrl: string): string {
  const requestOrigin = new URL(requestUrl).origin;
  const siteUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    requestOrigin;
  const normalizedBase = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  return new URL("/.netlify/functions/compose-background", normalizedBase).toString();
}

async function triggerBackgroundJob(jobId: string, requestUrl: string): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.COMPOSE_JOB_SECRET) {
    headers["x-compose-job-secret"] = process.env.COMPOSE_JOB_SECRET;
  }

  try {
    await fetch(buildBackgroundUrl(requestUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({ jobId }),
    });
  } catch (error) {
    console.warn("[compose-jobs] Background trigger failed, using in-process fallback:", error);
    queueMicrotask(() => {
      void processComposeJob(jobId).catch((jobError) => {
        console.error("[compose-jobs] In-process compose fallback failed:", jobError);
      });
    });
  }
}

export async function POST(req: Request) {
  let body: { input: UserInput; options?: { isRetry?: boolean } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.input) {
    return Response.json({ error: "input is required" }, { status: 400 });
  }

  const user = await getUser();
  const store = new ComposeJobStore();
  const jobId = crypto.randomUUID();

  try {
    const created = await store.createJob({
      jobId,
      input: body.input,
      options: body.options,
      userId: user?.id ?? null,
    });

    void triggerBackgroundJob(jobId, req.url);

    return Response.json(
      {
        jobId: created.jobId,
        accessToken: created.accessToken,
      },
      { status: 202 }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create compose job",
      },
      { status: 500 }
    );
  }
}
