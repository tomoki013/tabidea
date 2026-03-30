export class PromiseTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    label: string = 'Operation',
  ) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = 'PromiseTimeoutError';
  }
}

export function isPromiseTimeoutError(error: unknown): error is PromiseTimeoutError {
  return error instanceof PromiseTimeoutError;
}

export async function withPromiseTimeout<T>(
  task: Promise<T> | (() => Promise<T>),
  timeoutMs: number,
  label: string = 'Operation',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      typeof task === 'function' ? task() : task,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new PromiseTimeoutError(timeoutMs, label));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
