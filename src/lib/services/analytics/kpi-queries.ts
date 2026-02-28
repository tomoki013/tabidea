/**
 * KPI クエリ関数群
 *
 * 戦略文書のKPIを計測可能にする。
 * 各関数は Supabase クライアントを受け取り、集計結果を返す。
 * ゼロ除算は安全に処理（0 を返す）。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export interface KPIResult {
  /** KPI 名 */
  name: string;
  /** 値 (0-1 の割合) */
  value: number;
  /** 分子 */
  numerator: number;
  /** 分母 */
  denominator: number;
  /** 計測期間 */
  period: { from: string; to: string };
}

// ============================================================================
// Helpers
// ============================================================================

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function buildPeriod(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

// ============================================================================
// KPI: Plan to Action Rate (提案→行動変換率)
// ============================================================================

/**
 * 提案→行動変換率
 * = replan_selected / replan_shown
 */
export async function getPlanToActionRate(
  supabase: SupabaseClient,
  days = 30
): Promise<KPIResult> {
  const period = buildPeriod(days);

  const { count: shown } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "replan_shown")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const { count: selected } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "replan_selected")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const numerator = selected ?? 0;
  const denominator = shown ?? 0;

  return {
    name: "plan_to_action_rate",
    value: safeRate(numerator, denominator),
    numerator,
    denominator,
    period,
  };
}

// ============================================================================
// KPI: Replan Rate (リプラン利用率)
// ============================================================================

/**
 * リプラン利用率
 * = plans with replan / total plans viewed
 */
export async function getReplanRate(
  supabase: SupabaseClient,
  days = 30
): Promise<KPIResult> {
  const period = buildPeriod(days);

  const { count: totalPlans } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "plan_viewed")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const { count: replanTriggered } = await supabase
    .from("replan_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const numerator = replanTriggered ?? 0;
  const denominator = totalPlans ?? 0;

  return {
    name: "replan_rate",
    value: safeRate(numerator, denominator),
    numerator,
    denominator,
    period,
  };
}

// ============================================================================
// KPI: Rescue Success Rate (リプラン成功率)
// ============================================================================

/**
 * リプラン成功率
 * = replan accepted / replan triggered
 */
export async function getRescueSuccessRate(
  supabase: SupabaseClient,
  days = 30
): Promise<KPIResult> {
  const period = buildPeriod(days);

  const { count: triggered } = await supabase
    .from("replan_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const { count: accepted } = await supabase
    .from("replan_events")
    .select("*", { count: "exact", head: true })
    .eq("suggestion_accepted", true)
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const numerator = accepted ?? 0;
  const denominator = triggered ?? 0;

  return {
    name: "rescue_success_rate",
    value: safeRate(numerator, denominator),
    numerator,
    denominator,
    period,
  };
}

// ============================================================================
// KPI: Reusage Intent Rate (再利用意向率)
// ============================================================================

/**
 * 再利用意向率
 * = reflections with satisfaction = 'helped' / total reflections
 */
export async function getReusageIntentRate(
  supabase: SupabaseClient,
  days = 30
): Promise<KPIResult> {
  const period = buildPeriod(days);

  const { count: total } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "reflection_submitted")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const { count: helped } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "reflection_submitted")
    .eq("metadata->>satisfaction", "helped")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const numerator = helped ?? 0;
  const denominator = total ?? 0;

  return {
    name: "reusage_intent_rate",
    value: safeRate(numerator, denominator),
    numerator,
    denominator,
    period,
  };
}

// ============================================================================
// KPI: Companion Share Rate (同行者シェア率)
// ============================================================================

/**
 * 同行者シェア率
 * = plan_shared / plan_generated
 */
export async function getCompanionShareRate(
  supabase: SupabaseClient,
  days = 30
): Promise<KPIResult> {
  const period = buildPeriod(days);

  const { count: generated } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "plan_generated")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const { count: shared } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "plan_shared")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  const numerator = shared ?? 0;
  const denominator = generated ?? 0;

  return {
    name: "companion_share_rate",
    value: safeRate(numerator, denominator),
    numerator,
    denominator,
    period,
  };
}
