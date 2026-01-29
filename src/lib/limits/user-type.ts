import { createClient } from '@/lib/supabase/server';
import { isAdmin } from './admin';
import type { UserType } from './config';

export interface UserInfo {
  type: UserType;
  userId: string | null;
  email: string | null;
}

/**
 * Server Action内でユーザー種別を取得
 *
 * 判定順序:
 * 1. 未認証 → 'anonymous'
 * 2. 管理者メール → 'admin'
 * 3. サブスク有効 → 'premium' (課金実装後)
 * 4. それ以外 → 'free'
 */
export async function getUserInfo(): Promise<UserInfo> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { type: 'anonymous', userId: null, email: null };
  }

  // 管理者チェック
  if (isAdmin(user.email)) {
    return { type: 'admin', userId: user.id, email: user.email ?? null };
  }

  // TODO: 課金実装後にサブスクチェックを追加
  // const { data: subscription } = await supabase
  //   .from('subscriptions')
  //   .select('status')
  //   .eq('user_id', user.id)
  //   .eq('status', 'active')
  //   .single();
  //
  // if (subscription) {
  //   return { type: 'premium', userId: user.id, email: user.email ?? null };
  // }

  return { type: 'free', userId: user.id, email: user.email ?? null };
}

/**
 * クライアント用ユーザー種別（表示用のみ）
 *
 * 注意: 実際の制限チェックはサーバーで行うため、表示用途のみ使用
 */
export async function getUserTypeClient(): Promise<UserType> {
  // クライアントコンポーネント用
  // 実際の制限チェックはサーバーで行うため、表示用途のみ
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 'anonymous';
  if (isAdmin(user.email)) return 'admin';
  // TODO: premium判定
  return 'free';
}
