import type { PricingPlanInfo } from '@/types/billing';

/**
 * 料金プラン情報
 */
export const PRICING_PLANS: PricingPlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    description: '無料で始める',
    price: 0,
    priceDisplay: '無料',
    features: [
      '月3回までプラン生成',
      '渡航情報は週1回・3カテゴリのみ',
      'プランの保存（2件まで）',
    ],
    buttonLabel: '現在のプラン',
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    description: 'すべての機能を無制限に',
    price: 10,
    priceDisplay: '$10/月',
    features: [
      'プラン生成無制限',
      '渡航情報無制限・全カテゴリ',
      'プラン内で渡航情報・持ち物リスト閲覧',
      'プランの保存（無制限）',
      '優先サポート',
    ],
    isRecommended: true,
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
    price: 2,
    priceDisplay: '$2',
    features: ['1回プラン生成', '購入から30日間有効'],
    buttonLabel: '購入する',
    ticketCount: 1,
  },
  {
    id: 'ticket_5',
    name: '5回券',
    description: '1回分お得！',
    price: 8,
    priceDisplay: '$8',
    features: ['5回プラン生成', '購入から90日間有効', '1回あたり$1.6'],
    buttonLabel: '購入する',
    ticketCount: 5,
  },
  {
    id: 'ticket_10',
    name: '10回券',
    description: '2回分お得！',
    price: 14,
    priceDisplay: '$14',
    features: ['10回プラン生成', '購入から180日間有効', '1回あたり$1.4'],
    isRecommended: true,
    buttonLabel: '購入する',
    ticketCount: 10,
  },
];
