-- ============================================
-- 利用制限システム - DBスキーマ
-- ============================================
-- セキュリティ設計:
-- 1. サーバーサイドで全ての検証を行う
-- 2. DBの時刻（NOW()）を使用してサーバー時刻で判定
-- 3. 未ログインユーザーはIPハッシュで識別
-- 4. アトミックな制限チェック＆記録

-- ============================================
-- 1. USAGE_LOGS TABLE (使用履歴)
-- ============================================
-- 全ての使用履歴をサーバー時刻で記録
-- 未ログインユーザーはIPアドレスで識別

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ユーザー識別（ログインユーザーはuser_id、未ログインはip_hash）
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash TEXT,  -- SHA256(IP + 月別ソルト) で匿名化

  -- アクション情報
  action_type TEXT NOT NULL,  -- 'plan_generation', 'travel_info'

  -- サーバー時刻で記録（改ざん不可）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 追加メタデータ（デバッグ用）
  metadata JSONB DEFAULT '{}'
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_period
  ON usage_logs(user_id, action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_ip_period
  ON usage_logs(ip_hash, action_type, created_at);

-- RLS
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON usage_logs;
DROP POLICY IF EXISTS "Service role can manage all" ON usage_logs;

CREATE POLICY "Users can view own usage"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all"
  ON usage_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. IP_SALT TABLE (IP匿名化用ソルト)
-- ============================================
-- 月ごとにソルトをローテーション（プライバシー保護）

CREATE TABLE IF NOT EXISTS ip_salts (
  month TEXT PRIMARY KEY,  -- 'YYYY-MM' 形式
  salt TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 使用回数カウント関数（サーバー時刻使用）
-- ============================================

-- 月初を取得（サーバー時刻基準）
CREATE OR REPLACE FUNCTION get_month_start()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN date_trunc('month', NOW());
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 週初（月曜）を取得（サーバー時刻基準）
CREATE OR REPLACE FUNCTION get_week_start()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- date_trunc('week', ...) はISO週（月曜始まり）
  RETURN date_trunc('week', NOW());
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ユーザーの使用回数をカウント
CREATE OR REPLACE FUNCTION count_user_usage(
  p_user_id UUID,
  p_action_type TEXT,
  p_period TEXT  -- 'month' or 'week'
)
RETURNS INTEGER AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  IF p_period = 'month' THEN
    v_period_start := get_month_start();
  ELSIF p_period = 'week' THEN
    v_period_start := get_week_start();
  ELSE
    RAISE EXCEPTION 'Invalid period: %', p_period;
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM usage_logs
    WHERE user_id = p_user_id
      AND action_type = p_action_type
      AND created_at >= v_period_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IPの使用回数をカウント
CREATE OR REPLACE FUNCTION count_ip_usage(
  p_ip_hash TEXT,
  p_action_type TEXT,
  p_period TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  IF p_period = 'month' THEN
    v_period_start := get_month_start();
  ELSIF p_period = 'week' THEN
    v_period_start := get_week_start();
  ELSE
    RAISE EXCEPTION 'Invalid period: %', p_period;
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM usage_logs
    WHERE ip_hash = p_ip_hash
      AND action_type = p_action_type
      AND created_at >= v_period_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 使用記録関数
-- ============================================

CREATE OR REPLACE FUNCTION record_usage(
  p_user_id UUID,
  p_ip_hash TEXT,
  p_action_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO usage_logs (user_id, ip_hash, action_type, metadata)
  VALUES (p_user_id, p_ip_hash, p_action_type, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 制限チェック関数（アトミック）
-- ============================================

CREATE OR REPLACE FUNCTION check_and_record_usage(
  p_user_id UUID,
  p_ip_hash TEXT,
  p_action_type TEXT,
  p_limit INTEGER,
  p_period TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_current_count INTEGER;
  v_period_start TIMESTAMPTZ;
  v_next_reset TIMESTAMPTZ;
BEGIN
  -- 期間の開始日を取得
  IF p_period = 'month' THEN
    v_period_start := get_month_start();
    v_next_reset := v_period_start + INTERVAL '1 month';
  ELSIF p_period = 'week' THEN
    v_period_start := get_week_start();
    v_next_reset := v_period_start + INTERVAL '1 week';
  ELSE
    RETURN jsonb_build_object('allowed', false, 'error', 'Invalid period');
  END IF;

  -- 現在の使用回数を取得（ロック付き）
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_current_count
    FROM usage_logs
    WHERE user_id = p_user_id
      AND action_type = p_action_type
      AND created_at >= v_period_start
    FOR UPDATE;
  ELSE
    SELECT COUNT(*)::INTEGER INTO v_current_count
    FROM usage_logs
    WHERE ip_hash = p_ip_hash
      AND action_type = p_action_type
      AND created_at >= v_period_start
    FOR UPDATE;
  END IF;

  -- 制限チェック
  IF v_current_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'limit', p_limit,
      'reset_at', v_next_reset,
      'error', 'limit_exceeded'
    );
  END IF;

  -- 使用を記録
  INSERT INTO usage_logs (user_id, ip_hash, action_type, metadata)
  VALUES (p_user_id, p_ip_hash, p_action_type, p_metadata);

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count + 1,
    'limit', p_limit,
    'remaining', p_limit - v_current_count - 1,
    'reset_at', v_next_reset
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. IP匿名化関数
-- ============================================

CREATE OR REPLACE FUNCTION get_ip_hash(p_ip TEXT)
RETURNS TEXT AS $$
DECLARE
  v_month TEXT;
  v_salt TEXT;
BEGIN
  v_month := to_char(NOW(), 'YYYY-MM');

  -- 今月のソルトを取得（なければ作成）
  INSERT INTO ip_salts (month)
  VALUES (v_month)
  ON CONFLICT (month) DO NOTHING;

  SELECT salt INTO v_salt FROM ip_salts WHERE month = v_month;

  -- SHA256(IP + salt)
  RETURN encode(sha256((p_ip || v_salt)::bytea), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. プラン数カウント関数
-- ============================================

CREATE OR REPLACE FUNCTION count_user_plans(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM plans
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. 古いIPソルトのクリーンアップ（月次で実行）
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_ip_salts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM ip_salts
  WHERE month < to_char(NOW() - INTERVAL '2 months', 'YYYY-MM');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
