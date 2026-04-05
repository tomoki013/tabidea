-- Plan Runs Rebuild Migration
-- 設計書 (design/tabidea_plan_generation_redesign_20260404.md) に基づく
-- 新パイプライン用 plan_runs テーブル

-- ============================================
-- plan_runs テーブル
-- ============================================

create table if not exists public.plan_runs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete set null,
  -- 匿名アクセストークン (設計書 §8.2)
  access_token          text,
  state                 text not null default 'created',
  idempotency_key       text,
  input_hash            text,
  input_snapshot        jsonb,
  model_name            text,
  -- Pass 1: 正規化済み入力
  normalized_input      jsonb,
  -- Pass 2: trip/city/day 骨格
  plan_frame            jsonb,
  -- Pass 3: AI semantic draft
  draft_trip            jsonb,
  -- Pass 4: 検証結果
  validation_result     jsonb,
  -- Pass 5: 修復履歴
  repair_history        jsonb not null default '[]'::jsonb,
  -- Pass 6: タイムライン
  timeline              jsonb,
  -- Pass 7: gate 通過時刻
  gate_passed_at        timestamptz,
  -- Pass 8: 完成済み trip
  completed_trip_id     uuid references public.trips(trip_id) on delete set null,
  completed_trip_version integer,
  -- pause/resume コンテキスト
  pause_context         jsonb,
  active_pass_id        text,
  runtime_profile       text default 'netlify_free_30s',
  warnings              jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- state チェック制約
alter table public.plan_runs
  add constraint plan_runs_state_check check (
    state in (
      'created',
      'request_normalized',
      'frame_built',
      'draft_generated',
      'draft_validated',
      'draft_repaired',
      'timeline_finalized',
      'gate_passed',
      'completed',
      'failed',
      'paused'
    )
  );

-- インデックス
create index if not exists plan_runs_user_id_idx on public.plan_runs(user_id);
create index if not exists plan_runs_state_idx on public.plan_runs(state);
create index if not exists plan_runs_input_hash_idx on public.plan_runs(input_hash);
create index if not exists plan_runs_idempotency_key_idx on public.plan_runs(idempotency_key) where idempotency_key is not null;
create index if not exists plan_runs_created_at_idx on public.plan_runs(created_at desc);

-- updated_at 自動更新
create or replace function public.update_plan_runs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plan_runs_updated_at
  before update on public.plan_runs
  for each row execute function public.update_plan_runs_updated_at();

-- ============================================
-- RLS ポリシー (設計書 §8.4, §9)
-- ============================================

alter table public.plan_runs enable row level security;

-- オーナーは全操作可能
create policy "plan_runs_owner_all"
  on public.plan_runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 匿名 run は access_token で参照可能 (読み取りのみ)
-- application layer で access_token 照合を行う (RLS では service role を使用)

-- service role は全アクセス可能 (RLS bypass)
-- create policy "plan_runs_service_role_all" は不要 (service_role は RLS を bypass する)

-- ============================================
-- TTL 管理用: 完了・失敗した匿名 run は 30 日後に削除
-- (設計書 §10.2 保持期間限定)
-- ============================================
-- 実際の削除は cron job または Supabase scheduled functions で実施
-- このマイグレーションでは設計意図のみコメントとして記載

comment on table public.plan_runs is
  '新パイプライン (plan_run rebuild) の実行ランを管理するテーブル。
   設計書: design/tabidea_plan_generation_redesign_20260404.md
   - 匿名 run: access_token で保護、TTL 30日
   - ログイン run: user_id で保護
   - pause/resume: pause_context で状態を保持';
