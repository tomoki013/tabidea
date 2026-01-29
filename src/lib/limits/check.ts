import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getUserInfo } from './user-type';
import {
  PLAN_GENERATION_LIMITS,
  TRAVEL_INFO_LIMITS,
  PLAN_STORAGE_LIMITS,
  isUnlimited,
  type UserType,
  type ActionType,
} from './config';

export interface LimitCheckResult {
  allowed: boolean;
  userType: UserType;
  userId: string | null;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: Date | null;
  error?: string;
}

/**
 * IPアドレスを取得（プロキシ対応）
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();

  // Vercel/Cloudflare等のプロキシ経由
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // フォールバック
  return '0.0.0.0';
}

/**
 * 制限をチェックし、許可されれば使用を記録する（アトミック操作）
 *
 * ⚠️ 重要: この関数は必ずServer Action内で呼び出すこと
 * クライアントから直接呼び出してはいけない
 */
export async function checkAndRecordUsage(
  action: ActionType,
  metadata?: Record<string, unknown>
): Promise<LimitCheckResult> {
  const supabase = await createClient();
  const userInfo = await getUserInfo();

  // 制限設定を取得
  const limitConfig =
    action === 'plan_generation'
      ? PLAN_GENERATION_LIMITS[userInfo.type]
      : TRAVEL_INFO_LIMITS[userInfo.type];

  // 無制限ユーザーは即座に許可
  if (isUnlimited(limitConfig)) {
    return {
      allowed: true,
      userType: userInfo.type,
      userId: userInfo.userId,
      currentCount: 0,
      limit: -1,
      remaining: -1,
      resetAt: null,
    };
  }

  // IPハッシュを取得（未ログイン用）
  let ipHash: string | null = null;
  if (!userInfo.userId) {
    const clientIP = await getClientIP();
    const { data: hashData } = await supabase.rpc('get_ip_hash', {
      p_ip: clientIP,
    });
    ipHash = hashData;
  }

  // アトミックにチェック＆記録
  const { data, error } = await supabase.rpc('check_and_record_usage', {
    p_user_id: userInfo.userId,
    p_ip_hash: ipHash,
    p_action_type: action,
    p_limit: limitConfig.limit,
    p_period: limitConfig.period,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error('Limit check error:', error);
    return {
      allowed: false,
      userType: userInfo.type,
      userId: userInfo.userId,
      currentCount: 0,
      limit: limitConfig.limit,
      remaining: 0,
      resetAt: null,
      error: 'システムエラーが発生しました',
    };
  }

  return {
    allowed: data.allowed,
    userType: userInfo.type,
    userId: userInfo.userId,
    currentCount: data.current_count,
    limit: data.limit,
    remaining: data.remaining ?? 0,
    resetAt: data.reset_at ? new Date(data.reset_at) : null,
    error: data.error,
  };
}

/**
 * 現在の使用状況を取得（表示用、記録はしない）
 */
export async function getUsageStatus(action: ActionType): Promise<{
  userType: UserType;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: Date | null;
}> {
  const supabase = await createClient();
  const userInfo = await getUserInfo();

  const limitConfig =
    action === 'plan_generation'
      ? PLAN_GENERATION_LIMITS[userInfo.type]
      : TRAVEL_INFO_LIMITS[userInfo.type];

  if (isUnlimited(limitConfig)) {
    return {
      userType: userInfo.type,
      currentCount: 0,
      limit: -1,
      remaining: -1,
      resetAt: null,
    };
  }

  let currentCount = 0;

  if (userInfo.userId) {
    const { data } = await supabase.rpc('count_user_usage', {
      p_user_id: userInfo.userId,
      p_action_type: action,
      p_period: limitConfig.period,
    });
    currentCount = data || 0;
  } else {
    const clientIP = await getClientIP();
    const { data: ipHash } = await supabase.rpc('get_ip_hash', {
      p_ip: clientIP,
    });
    const { data } = await supabase.rpc('count_ip_usage', {
      p_ip_hash: ipHash,
      p_action_type: action,
      p_period: limitConfig.period,
    });
    currentCount = data || 0;
  }

  // リセット日時を計算
  const now = new Date();
  let resetAt: Date | null = null;

  if (limitConfig.period === 'month') {
    resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (limitConfig.period === 'week') {
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    resetAt = new Date(now);
    resetAt.setDate(now.getDate() + daysUntilMonday);
    resetAt.setHours(0, 0, 0, 0);
  }

  return {
    userType: userInfo.type,
    currentCount,
    limit: limitConfig.limit,
    remaining: Math.max(0, limitConfig.limit - currentCount),
    resetAt,
  };
}

/**
 * プラン保存数をチェック
 */
export async function checkPlanStorageLimit(): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const supabase = await createClient();
  const userInfo = await getUserInfo();

  const limitConfig = PLAN_STORAGE_LIMITS[userInfo.type];

  if (limitConfig.limit === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  if (!userInfo.userId) {
    // 未ログインはローカルストレージで管理（クライアント側で制御）
    return { allowed: true, currentCount: 0, limit: limitConfig.limit };
  }

  const { data } = await supabase.rpc('count_user_plans', {
    p_user_id: userInfo.userId,
  });

  const currentCount = data || 0;

  return {
    allowed: currentCount < limitConfig.limit,
    currentCount,
    limit: limitConfig.limit,
  };
}
