/**
 * Reusable SSE (Server-Sent Events) stream reader.
 * Parses `data:` lines from a ReadableStream and dispatches parsed JSON events.
 */

export interface SSEReaderOptions {
  signal?: AbortSignal;
}

/**
 * Read an SSE stream from a fetch Response.
 * Calls `handler` for each parsed JSON event.
 * Returns when the stream ends or handler returns 'stop'.
 */
export async function readSSEStream<T>(
  response: Response,
  handler: (event: T) => void | 'stop',
  options?: SSEReaderOptions,
): Promise<void> {
  const body = response.body;
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (options?.signal?.aborted) break;

      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const dataLines = chunk
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim());

        if (dataLines.length === 0) continue;

        try {
          const event = JSON.parse(dataLines.join('\n')) as T;
          const result = handler(event);
          if (result === 'stop') return;
        } catch {
          // Skip malformed JSON
        }
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}
