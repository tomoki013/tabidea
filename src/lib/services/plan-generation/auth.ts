/**
 * Session Access Guard
 * セッション所有権の検証ヘルパー
 */

import type { PlanGenerationSession } from '@/types/plan-generation';
import { getUser } from '@/lib/supabase/server';

/**
 * 現在の認証ユーザーがセッションの所有者であることを検証する。
 *
 * - セッションに userId がない場合 (匿名生成): アクセス許可
 * - 認証済みユーザーとセッション所有者が一致: アクセス許可
 * - 不一致: アクセス拒否
 *
 * @returns null if access is allowed, error message if denied
 */
export async function assertSessionAccess(
  session: PlanGenerationSession,
): Promise<string | null> {
  // 匿名セッション (ローカルプラン) はガードなし
  if (!session.userId) return null;

  const user = await getUser().catch(() => null);
  if (!user) {
    return 'Authentication required for this session';
  }

  if (user.id !== session.userId) {
    return 'Access denied: session belongs to another user';
  }

  return null;
}
