import type { PricingPlanInfo } from '@/types/billing';
import { PRO_PLAN_NAME, PREMIUM_PLAN_NAME } from './constants';
import { TICKET_VALIDITY_DAYS } from '@/lib/limits/config';

/**
 * 料金プラン情報
 */
export const PRICING_PLANS: PricingPlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    description: '無料で始める',
    price: 0,
    priceDisplay: '$0',
    features: [
      '月3回までプラン生成',
      '渡航情報は週1回・3カテゴリのみ',
      'プランの保存数：無制限',
      '静的マップ表示',
    ],
    buttonLabel: '現在のプラン',
  },
  {
    id: 'pro_monthly',
    name: PRO_PLAN_NAME,
    description: '旅行計画をもっと便利に',
    price: 10,
    priceDisplay: '$10',
    features: [
      '月30回までプラン生成',
      'プラン保存数：無制限',
      '渡航情報 月10回・3カテゴリ',
      'Places詳細 10件/プラン',
      '航空券・ホテル候補 3件',
      'Leafletインタラクティブマップ',
    ],
    isRecommended: true,
    buttonLabel: 'このプランを選ぶ',
  },
  {
    id: 'premium_monthly',
    name: PREMIUM_PLAN_NAME,
    description: 'すべての機能を最大限に活用',
    price: 30,
    priceDisplay: '$30',
    features: [
      '月100回までプラン生成',
      'プラン保存数：無制限',
      '渡航情報無制限・全カテゴリ',
      'Places詳細 無制限',
      '航空券・ホテル候補 7件',
      'Google Mapsフル機能',
      'AIプロバイダー選択 (Gemini/OpenAI)',
      'プラン内で渡航情報・持ち物リスト閲覧',
      'AI設定（旅のスタイル・カスタム指示）',
    ],
    buttonLabel: 'このプランを選ぶ',
  },
];

/**
 * 回数券情報
 */
export const TICKET_PLANS: PricingPlanInfo[] = [
  {
    id: 'ticket_1',
    name: '1回券',
    description: '1回だけ試したい方に',
    price: 3,
    priceDisplay: '$3',
    features: [
      '1回プラン生成',
      `購入から${TICKET_VALIDITY_DAYS.ticket_1}日間有効`
    ],
    buttonLabel: '購入する',
    ticketCount: 1,
  },
  {
    id: 'ticket_5',
    name: '5回券',
    description: '1回分お得！',
    price: 12,
    priceDisplay: '$12',
    features: [
      '5回プラン生成',
      `購入から${TICKET_VALIDITY_DAYS.ticket_5}日間有効`,
      '1回あたり$2.40'
    ],
    buttonLabel: '購入する',
    ticketCount: 5,
  },
  {
    id: 'ticket_10',
    name: '10回券',
    description: '2回分お得！',
    price: 20,
    priceDisplay: '$20',
    features: [
      '10回プラン生成',
      `購入から${TICKET_VALIDITY_DAYS.ticket_10}日間有効`,
      '1回あたり$2'
    ],
    isRecommended: true,
    buttonLabel: '購入する',
    ticketCount: 10,
  },
];
