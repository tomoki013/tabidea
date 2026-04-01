-- RLS Performance Optimization
-- auth.uid() を STABLE SECURITY DEFINER でラップして per-row 評価を排除する。
-- Postgres は STABLE 関数をクエリ内で1回だけ評価するため、大量行の EXISTS フィルタで
-- auth.uid() が行ごとに呼ばれるオーバーヘッドを排除できる。
-- また run_events(run_id) の単列インデックスを追加して RLS JOIN の効率を改善する。

-- 1. auth_uid() ラッパー関数
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT auth.uid()
$$;

GRANT EXECUTE ON FUNCTION auth_uid() TO authenticated;

-- 2. run_events の SELECT ポリシーを auth_uid() に更新
DROP POLICY IF EXISTS "users_read_own_run_events" ON run_events;
CREATE POLICY "users_read_own_run_events"
  ON run_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM runs
      WHERE runs.id = run_events.run_id
        AND runs.user_id = auth_uid()
    )
  );

-- 3. eval_results の SELECT ポリシーを auth_uid() に更新
DROP POLICY IF EXISTS "users_read_own_eval_results" ON eval_results;
CREATE POLICY "users_read_own_eval_results"
  ON eval_results
  FOR SELECT
  TO authenticated
  USING (
    (trip_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM trips
      WHERE trips.trip_id = eval_results.trip_id
        AND trips.user_id = auth_uid()
    ))
    OR
    (run_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM runs
      WHERE runs.id = eval_results.run_id
        AND runs.user_id = auth_uid()
    ))
  );

-- 4. tool_audit_logs の SELECT ポリシーを auth_uid() に更新
DROP POLICY IF EXISTS "users_read_own_tool_audit_logs" ON tool_audit_logs;
CREATE POLICY "users_read_own_tool_audit_logs"
  ON tool_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM runs
      WHERE runs.id = tool_audit_logs.run_id
        AND runs.user_id = auth_uid()
    )
  );

-- 5. RLS フィルタ専用の単列インデックス（既存の複合インデックス (run_id, seq) を補完）
CREATE INDEX IF NOT EXISTS idx_run_events_run_id_only
  ON run_events(run_id);
