-- ============================================
-- Places Cache Table
-- Phase 3: Google Places API キャッシュ
-- ============================================

-- ============================================
-- 1. PLACES_CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 検索クエリキー（正規化済み: spotname__location）
  query_key TEXT UNIQUE NOT NULL,

  -- Google Place ID
  place_id TEXT NOT NULL,

  -- キャッシュデータ（PlaceValidationResult の JSON）
  data JSONB NOT NULL,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- インデックス
CREATE INDEX idx_places_cache_query ON places_cache(query_key);
CREATE INDEX idx_places_cache_place_id ON places_cache(place_id);
CREATE INDEX idx_places_cache_expires ON places_cache(expires_at);

-- RLS（サービスロールのみアクセス可能）
ALTER TABLE places_cache ENABLE ROW LEVEL SECURITY;

-- サービスロールのフルアクセス
CREATE POLICY "Service role has full access to places_cache"
  ON places_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. CLEANUP FUNCTION
-- 期限切れキャッシュの自動削除
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_places_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM places_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. COMMENTS
-- ============================================
COMMENT ON TABLE places_cache IS 'Google Places API のレスポンスキャッシュ（7日間有効）';
COMMENT ON COLUMN places_cache.query_key IS '検索クエリの正規化キー（スポット名__場所）';
COMMENT ON COLUMN places_cache.place_id IS 'Google Place ID';
COMMENT ON COLUMN places_cache.data IS 'PlaceValidationResult の JSON データ';
COMMENT ON COLUMN places_cache.expires_at IS 'キャッシュ有効期限（デフォルト7日後）';
