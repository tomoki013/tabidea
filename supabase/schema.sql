-- ============================================
-- Tabidea Database Schema
-- Supabase (PostgreSQL)
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  auth_provider TEXT,  -- 'google', 'twitter'

  -- 暗号化用ソルト（キー生成に使用）
  encryption_salt TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),

  -- メタデータ
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. PLANS TABLE
-- ============================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- 共有用ユニークコード (nanoid形式: 10文字)
  share_code TEXT UNIQUE NOT NULL,

  -- 公開時のみ平文で保存（検索・一覧表示用）
  -- 非公開時はNULL
  destination TEXT,
  duration_days INTEGER,
  thumbnail_url TEXT,

  -- 暗号化データ（すべてのプラン詳細を含む）
  encrypted_data TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,

  -- 暗号化キーバージョン（キーローテーション対応）
  key_version INTEGER NOT NULL DEFAULT 1,

  -- 公開設定
  is_public BOOLEAN DEFAULT FALSE,

  -- 統計（公開プランのみ更新）
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2.1 ENCRYPTION_KEY_VERSIONS TABLE
-- ============================================
CREATE TABLE encryption_key_versions (
  version INTEGER PRIMARY KEY,
  algorithm TEXT NOT NULL DEFAULT 'sha256',
  iterations INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deprecated', 'compromised')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ,
  notes TEXT
);

INSERT INTO encryption_key_versions (version, algorithm, iterations, status, notes)
VALUES (1, 'sha256', 1, 'active', 'Initial version - simple SHA256 derivation');

CREATE INDEX idx_plans_share_code ON plans(share_code);
CREATE INDEX idx_plans_user_id ON plans(user_id);
CREATE INDEX idx_plans_public ON plans(is_public, created_at DESC) WHERE is_public = TRUE;
CREATE INDEX idx_plans_key_version ON plans(key_version) WHERE key_version < (SELECT MAX(version) FROM encryption_key_versions WHERE status = 'active');

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public plans"
  ON plans FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can view own plans"
  ON plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- share_code経由のアクセス用 Security Definer Function
-- ============================================
CREATE OR REPLACE FUNCTION get_plan_by_share_code(p_share_code TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  share_code TEXT,
  destination TEXT,
  duration_days INTEGER,
  thumbnail_url TEXT,
  encrypted_data TEXT,
  encryption_iv TEXT,
  key_version INTEGER,
  is_public BOOLEAN,
  view_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_encryption_salt TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.share_code,
    p.destination,
    p.duration_days,
    p.thumbnail_url,
    p.encrypted_data,
    p.encryption_iv,
    p.key_version,
    p.is_public,
    p.view_count,
    p.created_at,
    p.updated_at,
    u.encryption_salt as owner_encryption_salt
  FROM plans p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE p.share_code = p_share_code;

  UPDATE plans SET view_count = view_count + 1
  WHERE plans.share_code = p_share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2.2 RATE_LIMITS TABLE
-- ============================================
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  max_requests INTEGER NOT NULL DEFAULT 10,
  UNIQUE(user_id, action_type)
);

CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action_type);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_record
  FROM rate_limits
  WHERE user_id = p_user_id AND action_type = p_action_type
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (user_id, action_type, window_start, request_count, window_seconds, max_requests)
    VALUES (p_user_id, p_action_type, v_now, 1, p_window_seconds, p_max_requests);

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  END IF;

  IF v_now > v_record.window_start + (v_record.window_seconds || ' seconds')::INTERVAL THEN
    UPDATE rate_limits
    SET window_start = v_now, request_count = 1
    WHERE user_id = p_user_id AND action_type = p_action_type;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  END IF;

  IF v_record.request_count >= v_record.max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_record.window_start + (v_record.window_seconds || ' seconds')::INTERVAL,
      'error', 'rate_limit_exceeded'
    );
  END IF;

  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id AND action_type = p_action_type;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_record.max_requests - v_record.request_count - 1,
    'reset_at', v_record.window_start + (v_record.window_seconds || ' seconds')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2.3 RATE_LIMIT_CONFIG TABLE
-- ============================================
CREATE TABLE rate_limit_config (
  action_type TEXT PRIMARY KEY,
  default_window_seconds INTEGER NOT NULL DEFAULT 60,
  default_max_requests INTEGER NOT NULL DEFAULT 10,
  plan_overrides JSONB DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO rate_limit_config (action_type, default_window_seconds, default_max_requests, plan_overrides, description)
VALUES
  ('plan_generation', 60, 3, '{"pro": {"max_requests": 10}, "premium": {"max_requests": 30}}', 'AI旅行プラン生成'),
  ('pdf_export', 60, 5, '{"pro": {"max_requests": 20}}', 'PDF出力'),
  ('api_call', 1, 10, '{}', '一般APIコール');

-- ============================================
-- 3. USER_SAVED_PLANS TABLE
-- ============================================
CREATE TABLE user_saved_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

CREATE INDEX idx_saved_plans_user ON user_saved_plans(user_id);

ALTER TABLE user_saved_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved plans"
  ON user_saved_plans FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 4. ENTITLEMENT TYPES
-- ============================================
CREATE TABLE entitlement_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_monthly_limit INTEGER,
  is_consumable BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO entitlement_types (code, name, description, default_monthly_limit, is_consumable) VALUES
  ('plan_generation', 'プラン生成', 'AIによる旅行プラン生成', 3, TRUE),
  ('pdf_export', 'PDF出力', '旅程表のPDF出力', 1, TRUE),
  ('premium_ai', 'プレミアムAI', '高品質AIモデルの使用', 0, TRUE),
  ('unlimited_history', '履歴無制限', 'プラン履歴の無制限保存', NULL, FALSE),
  ('priority_support', '優先サポート', '優先的なカスタマーサポート', NULL, FALSE);

-- ============================================
-- 5. GRANT TYPES
-- ============================================
CREATE TABLE grant_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  auto_expire BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO grant_types (code, name, description, is_recurring, auto_expire) VALUES
  ('free_tier', '無料プラン', '基本無料枠', TRUE, FALSE),
  ('subscription', 'サブスクリプション', '月額/年額課金', TRUE, TRUE),
  ('ticket_pack', '回数券', 'まとめ買いチケット', FALSE, TRUE),
  ('campaign', 'キャンペーン', '期間限定特典', FALSE, TRUE),
  ('one_time', '単発購入', '1回限りの購入', FALSE, TRUE),
  ('admin_grant', '管理者付与', '手動での権限付与', FALSE, FALSE),
  ('referral', '紹介特典', '友達紹介による特典', FALSE, TRUE),
  ('achievement', '実績解除', '特定条件達成による付与', FALSE, FALSE);

-- ============================================
-- 6. ENTITLEMENT_GRANTS TABLE
-- ============================================
CREATE TABLE entitlement_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement_type TEXT NOT NULL REFERENCES entitlement_types(code),
  grant_type TEXT NOT NULL REFERENCES grant_types(code),
  granted_count INTEGER,
  remaining_count INTEGER,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  source_type TEXT,
  source_id UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired', 'revoked')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grants_user ON entitlement_grants(user_id);
CREATE INDEX idx_grants_user_type ON entitlement_grants(user_id, entitlement_type);
CREATE INDEX idx_grants_active ON entitlement_grants(user_id, status, valid_until);
CREATE INDEX idx_grants_source ON entitlement_grants(source_type, source_id);

ALTER TABLE entitlement_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grants"
  ON entitlement_grants FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 7. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  payment_provider TEXT,
  external_subscription_id TEXT,
  external_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_external ON subscriptions(external_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 8. TICKET_PACKS TABLE
-- ============================================
CREATE TABLE ticket_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_code TEXT NOT NULL,
  entitlement_type TEXT NOT NULL REFERENCES entitlement_types(code),
  initial_count INTEGER NOT NULL,
  remaining_count INTEGER NOT NULL,
  purchase_price INTEGER,
  currency TEXT DEFAULT 'jpy',
  payment_provider TEXT,
  external_payment_id TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_packs_user ON ticket_packs(user_id);

ALTER TABLE ticket_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ticket packs"
  ON ticket_packs FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 9. CAMPAIGNS TABLE
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  entitlement_type TEXT NOT NULL REFERENCES entitlement_types(code),
  grant_count INTEGER,
  grant_duration_days INTEGER,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_total_redemptions INTEGER,
  max_per_user INTEGER DEFAULT 1,
  current_redemptions INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_code ON campaigns(code);
CREATE INDEX idx_campaigns_active ON campaigns(is_active, starts_at, ends_at);

-- ============================================
-- 10. CAMPAIGN_REDEMPTIONS TABLE
-- ============================================
CREATE TABLE campaign_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_id UUID REFERENCES entitlement_grants(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX idx_redemptions_user ON campaign_redemptions(user_id);

-- ============================================
-- 11. BILLING_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'jpy',
  payment_provider TEXT,
  external_transaction_id TEXT,
  status TEXT DEFAULT 'succeeded'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'disputed')),
  related_type TEXT,
  related_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_user ON billing_transactions(user_id);
CREATE INDEX idx_billing_created ON billing_transactions(created_at DESC);

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON billing_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 12. PRODUCT_CONFIG TABLE
-- ============================================
CREATE TABLE product_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

INSERT INTO product_config (key, value, description) VALUES
(
  'subscription_plans',
  '{
    "pro_monthly": {
      "name": "Pro（月額）",
      "price": 980,
      "currency": "jpy",
      "interval": "month",
      "entitlements": {
        "plan_generation": -1,
        "pdf_export": -1,
        "premium_ai": 10
      }
    },
    "pro_yearly": {
      "name": "Pro（年額）",
      "price": 9800,
      "currency": "jpy",
      "interval": "year",
      "entitlements": {
        "plan_generation": -1,
        "pdf_export": -1,
        "premium_ai": -1,
        "priority_support": true
      }
    }
  }',
  'サブスクリプションプランの定義'
),
(
  'ticket_packs',
  '{
    "plan_5pack": {
      "name": "プラン生成5回券",
      "price": 400,
      "entitlement_type": "plan_generation",
      "count": 5,
      "expires_days": 90
    },
    "plan_10pack": {
      "name": "プラン生成10回券",
      "price": 700,
      "entitlement_type": "plan_generation",
      "count": 10,
      "expires_days": 180
    }
  }',
  '回数券パックの定義'
),
(
  'free_tier_limits',
  '{
    "plan_generation": 3,
    "pdf_export": 1,
    "premium_ai": 0,
    "reset_interval": "month"
  }',
  '無料プランの月間制限'
);

-- ============================================
-- 13. FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS TABLE (
  entitlement_type TEXT,
  total_remaining INTEGER,
  has_unlimited BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eg.entitlement_type,
    CASE
      WHEN bool_or(eg.remaining_count IS NULL) THEN NULL
      ELSE SUM(eg.remaining_count)::INTEGER
    END as total_remaining,
    bool_or(eg.remaining_count IS NULL) as has_unlimited
  FROM entitlement_grants eg
  WHERE eg.user_id = p_user_id
    AND eg.status = 'active'
    AND (eg.valid_until IS NULL OR eg.valid_until > NOW())
    AND (eg.remaining_count IS NULL OR eg.remaining_count > 0)
  GROUP BY eg.entitlement_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION consume_entitlement(
  p_user_id UUID,
  p_entitlement_type TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_grant_id UUID;
  v_remaining INTEGER;
  v_updated_rows INTEGER;
BEGIN
  SELECT id, remaining_count INTO v_grant_id, v_remaining
  FROM entitlement_grants
  WHERE user_id = p_user_id
    AND entitlement_type = p_entitlement_type
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (remaining_count IS NULL OR remaining_count >= p_count)
  ORDER BY
    remaining_count NULLS FIRST,
    valid_until ASC NULLS LAST
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_grant_id IS NULL THEN
    PERFORM pg_sleep(0.1);

    SELECT id, remaining_count INTO v_grant_id, v_remaining
    FROM entitlement_grants
    WHERE user_id = p_user_id
      AND entitlement_type = p_entitlement_type
      AND status = 'active'
      AND (valid_until IS NULL OR valid_until > NOW())
      AND (remaining_count IS NULL OR remaining_count >= p_count)
    ORDER BY
      remaining_count NULLS FIRST,
      valid_until ASC NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF v_grant_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'no_available_entitlement'
      );
    END IF;
  END IF;

  IF v_remaining IS NOT NULL THEN
    UPDATE entitlement_grants
    SET
      remaining_count = remaining_count - p_count,
      status = CASE WHEN remaining_count - p_count <= 0 THEN 'exhausted' ELSE 'active' END,
      updated_at = NOW()
    WHERE id = v_grant_id
      AND remaining_count >= p_count;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    IF v_updated_rows = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'concurrent_consumption_conflict'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'grant_id', v_grant_id,
    'remaining', CASE WHEN v_remaining IS NULL THEN NULL ELSE v_remaining - p_count END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION grant_free_tier(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_config JSONB;
  v_entitlement TEXT;
  v_limit INTEGER;
BEGIN
  SELECT value INTO v_config FROM product_config WHERE key = 'free_tier_limits';

  FOR v_entitlement, v_limit IN
    SELECT key, (value::INTEGER)
    FROM jsonb_each_text(v_config)
    WHERE key != 'reset_interval'
  LOOP
    IF v_limit > 0 THEN
      INSERT INTO entitlement_grants (
        user_id, entitlement_type, grant_type,
        granted_count, remaining_count,
        valid_until, source_type
      ) VALUES (
        p_user_id, v_entitlement, 'free_tier',
        v_limit, v_limit,
        date_trunc('month', NOW()) + INTERVAL '1 month',
        'system'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_share_code(length INTEGER DEFAULT 10)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER entitlement_grants_updated_at
  BEFORE UPDATE ON entitlement_grants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, display_name, avatar_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NEW.raw_app_meta_data->>'provider'
  );

  -- Grant free tier entitlements (ignore errors to not block user creation)
  BEGIN
    PERFORM grant_free_tier(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to grant free tier for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
