import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ComposeLoadingAnimation from './ComposeLoadingAnimation';
import type { ComposeStep } from '@/lib/hooks/useComposeGeneration';

const messages = {
  'components.features.planner.composeLoadingAnimation.waiting': '出発の準備中...',
  'components.features.planner.composeLoadingAnimation.stepsProgress': '{completed} / {total}',
  'components.features.planner.composeLoadingAnimation.daysCount': '{days}日間の旅',
  'components.features.planner.composeLoadingAnimation.eyebrow': 'Journey now boarding',
  'components.features.planner.composeLoadingAnimation.leadReady': '行き先が固まったら、日ごとの予定を順番に作っています。',
  'components.features.planner.composeLoadingAnimation.snapshotLabel': '旅のスナップショット',
  'components.features.planner.composeLoadingAnimation.routePlanLabel': '工程ごとの進み方',
  'components.features.planner.composeLoadingAnimation.upcomingLabel': 'このあと進む工程',
  'components.features.planner.composeLoadingAnimation.dayPill': '{days}日分を順番に作成中',
  'components.features.planner.composeLoadingAnimation.noDestinationYet': '旅先の骨格がまとまり次第、ここに目的地プレビューが表示されます。',
  'components.features.planner.composeLoadingAnimation.progressLabel': '全体の進行',
  'components.features.planner.composeLoadingAnimation.currentStepLabel': 'ただいまの工程',
  'components.features.planner.composeLoadingAnimation.statusLive': 'いまの進み具合',
  'components.features.planner.composeLoadingAnimation.stageDone': '完了',
  'components.features.planner.composeLoadingAnimation.stageActive': '進行中',
  'components.features.planner.composeLoadingAnimation.stagePending': '待機中',
  'components.features.planner.composeLoadingAnimation.remainingSteps': '残り {count} 工程',
  'components.features.planner.composeLoadingAnimation.allStepsReady': '最終仕上げを待っています',
  'components.features.planner.composeLoadingAnimation.stepListLabel': '進行中のチェックリスト',
  'components.features.planner.composeLoadingAnimation.stages.concept.title': '旅の骨格づくり',
  'components.features.planner.composeLoadingAnimation.stages.concept.description': '旅の大まかな流れと、各日の過ごし方を決めています。',
  'components.features.planner.composeLoadingAnimation.stages.spots.title': '立ち寄り先を選定',
  'components.features.planner.composeLoadingAnimation.stages.spots.description': '各日ごとに、行く場所や立ち寄り先を具体的に選んでいます。',
  'components.features.planner.composeLoadingAnimation.stages.polish.title': 'しおりとして仕上げ',
  'components.features.planner.composeLoadingAnimation.stages.polish.description': '時間や説明を整えて、見やすい旅程に仕上げています。',
  'components.features.planner.composeLoadingTips.label': '旅の豆知識',
};

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const translator = (key: string, values?: Record<string, string | number>) => {
      const fullKey = `${namespace}.${key}`;
      let template = messages[fullKey as keyof typeof messages] ?? fullKey;
      if (values) {
        for (const [name, value] of Object.entries(values)) {
          template = template.replace(`{${name}}`, String(value));
        }
      }
      return template;
    };

    translator.raw = (key: string) => {
      if (`${namespace}.${key}` === 'components.features.planner.composeLoadingTips.tips') {
        return ['テスト用のヒント'];
      }
      return [];
    };

    return translator;
  },
}));

describe('ComposeLoadingAnimation', () => {
  it('shows the travel dashboard layout and the active day message', () => {
    const steps: ComposeStep[] = [
      { id: 'usage_check', message: '利用状況を確認中...', status: 'completed' },
      { id: 'normalize', message: '旅の条件を整理中...', status: 'completed' },
      { id: 'semantic_plan', message: '2日目のスポットを作成中...', status: 'active' },
      { id: 'place_resolve', message: 'スポットの場所を確認中...', status: 'pending' },
      { id: 'feasibility_score', message: '営業時間や回りやすさを確認中...', status: 'pending' },
      { id: 'route_optimize', message: '回りやすい順に調整中...', status: 'pending' },
      { id: 'timeline_build', message: '時間を入れながら順番を整え中...', status: 'pending' },
      { id: 'narrative_render', message: '旅程を読みやすく整え中...', status: 'pending' },
      { id: 'hero_image', message: 'ぴったりの写真を探し中...', status: 'pending' },
    ];

    render(
      <ComposeLoadingAnimation
        steps={steps}
        currentStep="semantic_plan"
        previewDestination="Paris"
        previewDescription="セーヌ川沿いから美術館、街歩きへつなぐ3日間の旅。"
        totalDays={3}
      />
    );

    expect(screen.getByText('旅のスナップショット')).toBeInTheDocument();
    expect(screen.getByText('工程ごとの進み方')).toBeInTheDocument();
    expect(screen.getAllByText('このあと進む工程').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2日目のスポットを作成中...').length).toBeGreaterThan(0);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('3日間の旅')).toBeInTheDocument();
    expect(screen.getByText('3日分を順番に作成中')).toBeInTheDocument();
    expect(screen.getByText('セーヌ川沿いから美術館、街歩きへつなぐ3日間の旅。')).toBeInTheDocument();
  });
});
