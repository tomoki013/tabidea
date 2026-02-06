import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/app/actions/travel-planner';
import { createClient } from '@/lib/supabase/server';

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

export default async function MetricsPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect('/');
  }

  const summary = await getMetricsSummary();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">AI生成品質ダッシュボード</h1>
      <p className="text-stone-500 mb-8">直近30日間のKPIサマリー</p>

      {!summary ? (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-8 text-center text-stone-500">
          <p>メトリクスデータがまだありません</p>
          <p className="text-sm mt-2">プランが生成されると、ここにKPIが表示されます</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="総生成数"
            value={summary.totalGenerations.toString()}
            unit="件"
          />
          <MetricCard
            label="平均生成時間"
            value={(summary.avgTotalTime / 1000).toFixed(1)}
            unit="秒"
          />
          <MetricCard
            label="検証通過率"
            value={(summary.avgValidationPassRate * 100).toFixed(1)}
            unit="%"
          />
          <MetricCard
            label="Citation率"
            value={(summary.avgCitationRate * 100).toFixed(1)}
            unit="%"
          />
          <MetricCard
            label="平均ユーザー評価"
            value={summary.avgUserRating > 0 ? summary.avgUserRating.toFixed(1) : 'N/A'}
            unit={summary.avgUserRating > 0 ? '/ 5' : ''}
          />
          <MetricCard
            label="報告された問題"
            value={summary.totalIssues.toString()}
            unit="件"
          />
        </div>
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
