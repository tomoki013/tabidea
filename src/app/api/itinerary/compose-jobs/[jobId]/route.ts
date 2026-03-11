import { ComposeJobStore } from "@/lib/services/itinerary/compose-job-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const { searchParams } = new URL(req.url);
  const accessToken = searchParams.get("accessToken");

  if (!accessToken) {
    return Response.json({ error: "accessToken is required" }, { status: 400 });
  }

  const store = new ComposeJobStore();

  try {
    const job = await store.verifyAndGetJob(jobId, accessToken);
    if (!job) {
      return Response.json({ error: "Compose job not found" }, { status: 404 });
    }

    return Response.json(job, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch compose job",
      },
      { status: 500 }
    );
  }
}
