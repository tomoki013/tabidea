/**
 * Outlineキャッシュ
 * 同一/類似の旅行プラン入力に対して、キャッシュから高速に応答
 */

import { cacheGet, cacheSet, isUpstashConfigured } from './redis';
import type { PlanOutline, Article } from '@/types';

// ============================================
// Constants
// ============================================

/** キャッシュ有効期間: 7日間 */
const OUTLINE_CACHE_TTL = 7 * 24 * 60 * 60;

/** プロンプトバージョン（プロンプト更新時にインクリメントする） */
const PROMPT_VERSION = 'v1';

/** キャッシュキープレフィックス */
const KEY_PREFIX = `outline:${PROMPT_VERSION}:`;

// ============================================
// Types
// ============================================

interface OutlineCacheData {
  outline: PlanOutline;
  context: Article[];
  heroImage?: { url: string; photographer: string; photographerUrl: string } | null;
  cachedAt: string;
}

interface OutlineCacheParams {
  destinations: string[];
  days: string;
  companions: string;
  theme: string[];
  budget: string;
  pace: string;
  isDestinationDecided?: boolean;
  region?: string;
  travelVibe?: string;
}

// ============================================
// Hash Generation
// ============================================

/**
 * 入力パラメータからキャッシュキーのハッシュを生成
 * Web Crypto APIを使用（Node.js 18+/Edge Runtime対応）
 */
async function generateHash(params: OutlineCacheParams): Promise<string> {
  const normalized = {
    destinations: [...params.destinations].sort().map((d) => d.trim().toLowerCase()),
    days: params.days.trim(),
    companions: params.companions.trim().toLowerCase(),
    theme: [...params.theme].sort().map((t) => t.trim().toLowerCase()),
    budget: params.budget.trim().toLowerCase(),
    pace: params.pace.trim().toLowerCase(),
    isDestinationDecided: params.isDestinationDecided ?? true,
    region: params.region?.trim().toLowerCase() ?? '',
    travelVibe: params.travelVibe?.trim().toLowerCase() ?? '',
  };

  const str = JSON.stringify(normalized);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// Cache Operations
// ============================================

/**
 * Outlineキャッシュを取得
 */
export async function getOutlineCache(
  params: OutlineCacheParams
): Promise<OutlineCacheData | null> {
  if (!isUpstashConfigured()) return null;

  try {
    const hash = await generateHash(params);
    const key = `${KEY_PREFIX}${hash}`;
    const cached = await cacheGet<OutlineCacheData>(key);

    if (cached) {
      console.log(`[outline-cache] Cache HIT: ${key.substring(0, 30)}...`);
      return cached;
    }

    console.log(`[outline-cache] Cache MISS: ${key.substring(0, 30)}...`);
    return null;
  } catch (error) {
    console.error('[outline-cache] Get error:', error);
    return null;
  }
}

/**
 * Outlineキャッシュを保存
 */
export async function setOutlineCache(
  params: OutlineCacheParams,
  data: {
    outline: PlanOutline;
    context: Article[];
    heroImage?: { url: string; photographer: string; photographerUrl: string } | null;
  }
): Promise<boolean> {
  if (!isUpstashConfigured()) return false;

  try {
    const hash = await generateHash(params);
    const key = `${KEY_PREFIX}${hash}`;

    const cacheData: OutlineCacheData = {
      ...data,
      cachedAt: new Date().toISOString(),
    };

    const success = await cacheSet(key, cacheData, OUTLINE_CACHE_TTL);
    if (success) {
      console.log(`[outline-cache] Cached: ${key.substring(0, 30)}...`);
    }
    return success;
  } catch (error) {
    console.error('[outline-cache] Set error:', error);
    return false;
  }
}
