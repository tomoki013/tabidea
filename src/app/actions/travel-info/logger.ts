/**
 * travel-info用ロギングユーティリティ
 */

/**
 * タイムスタンプ付きログ出力（情報）
 */
export function logInfo(
  context: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] [travel-info] [${context}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ''
  );
}

/**
 * タイムスタンプ付きログ出力（警告）
 */
export function logWarn(
  context: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  console.warn(
    `[${timestamp}] [travel-info] [${context}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ''
  );
}

/**
 * タイムスタンプ付きログ出力（エラー）
 */
export function logError(
  context: string,
  message: string,
  error?: unknown,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorInfo =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        }
      : { raw: String(error) };
  console.error(`[${timestamp}] [travel-info] [${context}] ${message}`, {
    error: errorInfo,
    ...data,
  });
}

/**
 * リクエストIDを生成
 */
export function generateRequestId(prefix: string = 'req'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
