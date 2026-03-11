import type { Itinerary, UserInput } from "@/types";
import { savePlanOnServer } from "@/lib/plans/save-plan";

type SavePlanRequest = {
  input: UserInput;
  itinerary: Itinerary;
  isPublic?: boolean;
};

function isSavePlanRequest(value: unknown): value is SavePlanRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return "input" in candidate && "itinerary" in candidate;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }

  if (!isSavePlanRequest(body)) {
    return Response.json({ error: "invalid_save_plan_payload" }, { status: 400 });
  }

  const result = await savePlanOnServer(
    body.input,
    body.itinerary,
    body.isPublic ?? false
  );

  const status = result.success
    ? 200
    : result.error === "authentication_required"
      ? 401
      : 400;

  return Response.json(result, { status });
}
