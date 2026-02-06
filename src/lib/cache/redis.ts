/**
 * Upstash Redis クライアント
 * Vercel環境でのキャッシュ用
 */

// ============================================
// Types
// ============================================

interface RedisResponse<T = unknown> {
  result: T;
}

// ============================================
// Client
// ============================================

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Upstash Redis REST APIを呼び出し
 */
async function redisCommand<T = unknown>(
  command: string[]
): Promise<T | null> {
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${REDIS_REST_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      console.error(`[redis] Command failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as RedisResponse<T>;
    return data.result;
  } catch (error) {
    console.error('[redis] Connection error:', error);
    return null;
  }
}

/**
 * Redis設定が有効かチェック
 */
export function isUpstashConfigured(): boolean {
  return !!REDIS_REST_URL && !!REDIS_REST_TOKEN;
}

/**
 * キャッシュからデータを取得
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const result = await redisCommand<string>(['GET', key]);
  if (!result) return null;

  try {
    return JSON.parse(result) as T;
  } catch {
    return null;
  }
}

/**
 * キャッシュにデータを保存（TTL秒指定）
 */
export async function cacheSet<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<boolean> {
  const serialized = JSON.stringify(data);
  const result = await redisCommand<string>([
    'SET',
    key,
    serialized,
    'EX',
    ttlSeconds.toString(),
  ]);
  return result === 'OK';
}

/**
 * キャッシュからデータを削除
 */
export async function cacheDel(key: string): Promise<boolean> {
  const result = await redisCommand<number>(['DEL', key]);
  return (result ?? 0) > 0;
}

/**
 * パターンに一致するキーを削除
 */
export async function cacheDelByPattern(pattern: string): Promise<number> {
  const keys = await redisCommand<string[]>(['KEYS', pattern]);
  if (!keys || keys.length === 0) return 0;

  let deleted = 0;
  for (const key of keys) {
    const ok = await cacheDel(key);
    if (ok) deleted++;
  }
  return deleted;
}
