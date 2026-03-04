import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/app/actions/travel-planner';
import { getRequestLanguage } from '@/lib/i18n/server';
import { localizePath } from '@/lib/i18n/locales';
import { createClient } from '@/lib/supabase/server';
import {
  getPlanToActionRate,
  getReplanRate,
  getRescueSuccessRate,
  getReusageIntentRate,
  getCompanionShareRate,
} from '@/lib/services/analytics/kpi-queries';
import type { KPIResult } from '@/lib/services/analytics/kpi-queries';

interface MetricsSummary {
  totalGenerations: number;
  avgTotalTime: number;
  avgValidationPassRate: number;
  avgCitationRate: number;
  avgUserRating: number;
  totalIssues: number;
}

async function getMetricsSummary(): Promise<MetricsSummary | null> {
  try {
    const supabase = await createClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('generation_metrics')
      .select('*')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return null;
    }

    const totalGenerations = data.length;
    const avgTotalTime = data.reduce((sum, d) => sum + (d.total_time_ms || 0), 0) / totalGenerations;
    const withValidation = data.filter((d) => d.validation_pass_rate !== null);
    const avgValidationPassRate = withValidation.length > 0
      ? withValidation.reduce((sum, d) => sum + d.validation_pass_rate, 0) / withValidation.length
      : 0;
    const withCitation = data.filter((d) => d.citation_rate !== null);
    const avgCitationRate = withCitation.length > 0
      ? withCitation.reduce((sum, d) => sum + d.citation_rate, 0) / withCitation.length
      : 0;
    const withRating = data.filter((d) => d.user_rating !== null);
    const avgUserRating = withRating.length > 0
      ? withRating.reduce((sum, d) => sum + d.user_rating, 0) / withRating.length
      : 0;
    const totalIssues = data.reduce((sum, d) => sum + (d.accuracy_issue_count || 0), 0);

    return {
      totalGenerations,
      avgTotalTime: Math.round(avgTotalTime),
      avgValidationPassRate,
      avgCitationRate,
      avgUserRating,
      totalIssues,
    };
  } catch {
    return null;
  }
}

async function getKPIs(): Promise<KPIResult[]> {
  try {
    const supabase = await createClient();
    const [planToAction, replan, rescue, reusage, share] = await Promise.all([
      getPlanToActionRate(supabase, 30),
      getReplanRate(supabase, 30),
      getRescueSuccessRate(supabase, 30),
      getReusageIntentRate(supabase, 30),
      getCompanionShareRate(supabase, 30),
    ]);
    return [planToAction, replan, rescue, reusage, share];
  } catch {
    return [];
  }
}

const KPI_LABELS: Record<'ja' | 'en', Record<string, string>> = {
  ja: {
    plan_to_action_rate: '提案→行動変換率',
    replan_rate: 'リプラン利用率',
    rescue_success_rate: 'リプラン成功率',
    reusage_intent_rate: '再利用意向率',
    companion_share_rate: '同行者シェア率',
  },
  en: {
    plan_to_action_rate: 'Plan-to-action rate',
    replan_rate: 'Replan usage rate',
    rescue_success_rate: 'Replan success rate',
    reusage_intent_rate: 'Reuse intent rate',
    companion_share_rate: 'Companion share rate',
  },
};

export default async function MetricsPage() {
  const language = await getRequestLanguage();
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect(localizePath('/', language));
  }

  const [summary, kpis] = await Promise.all([
    getMetricsSummary(),
    getKPIs(),
  ]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">
        {language === 'ja' ? 'AI生成品質ダッシュボード' : 'AI Generation Quality Dashboard'}
      </h1>
      <p className="text-stone-500 mb-8">
        {language === 'ja' ? '直近30日間のKPIサマリー' : 'KPI summary for the last 30 days'}
      </p>

      {!summary ? (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-8 text-center text-stone-500">
          <p>{language === 'ja' ? 'メトリクスデータがまだありません' : 'No metrics data yet'}</p>
          <p className="text-sm mt-2">
            {language === 'ja'
              ? 'プランが生成されると、ここにKPIが表示されます'
              : 'KPIs will appear here once plans are generated'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label={language === 'ja' ? '総生成数' : 'Total generations'}
            value={summary.totalGenerations.toString()}
            unit={language === 'ja' ? '件' : 'items'}
          />
          <MetricCard
            label={language === 'ja' ? '平均生成時間' : 'Avg generation time'}
            value={(summary.avgTotalTime / 1000).toFixed(1)}
            unit={language === 'ja' ? '秒' : 'sec'}
          />
          <MetricCard
            label={language === 'ja' ? '検証通過率' : 'Validation pass rate'}
            value={(summary.avgValidationPassRate * 100).toFixed(1)}
            unit="%"
          />
          <MetricCard
            label={language === 'ja' ? 'Citation率' : 'Citation rate'}
            value={(summary.avgCitationRate * 100).toFixed(1)}
            unit="%"
          />
          <MetricCard
            label={language === 'ja' ? '平均ユーザー評価' : 'Average user rating'}
            value={summary.avgUserRating > 0 ? summary.avgUserRating.toFixed(1) : 'N/A'}
            unit={summary.avgUserRating > 0 ? '/ 5' : ''}
          />
          <MetricCard
            label={language === 'ja' ? '報告された問題' : 'Reported issues'}
            value={summary.totalIssues.toString()}
            unit={language === 'ja' ? '件' : 'items'}
          />
        </div>
      )}

      {/* Replan KPIs */}
      {kpis.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-stone-800 mt-12 mb-4">
            {language === 'ja' ? 'リプラン KPI' : 'Replan KPI'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi) => (
              <MetricCard
                key={kpi.name}
                label={KPI_LABELS[language][kpi.name] ?? kpi.name}
                value={(kpi.value * 100).toFixed(1)}
                unit={`% (${kpi.numerator}/${kpi.denominator})`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm text-stone-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-stone-800">{value}</span>
        <span className="text-sm text-stone-400">{unit}</span>
      </div>
    </div>
  );
}
