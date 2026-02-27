import { executeOutlineGeneration } from "@/lib/services/plan-generation/generate-outline";
import type { UserInput } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  let body: { input: UserInput; options?: { isRetry?: boolean } };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { input, options } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, payload: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
          );
        } catch {
          // Stream may already be closed
        }
      };

      try {
        const result = await executeOutlineGeneration(
          input,
          options,
          (step, message) => emit("progress", { step, message })
        );

        if (result.success) {
          emit("complete", { result });
        } else {
          emit("error", {
            message: result.message || "生成に失敗しました",
            limitExceeded: result.limitExceeded,
            userType: result.userType,
            resetAt: result.resetAt,
            remaining: result.remaining,
          });
        }
      } catch (err) {
        emit("error", {
          message:
            err instanceof Error ? err.message : "予期しないエラーが発生しました",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
