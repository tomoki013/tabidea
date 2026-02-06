/**
 * コスト概算データ
 * 予算レベル別の単価テーブルと地域別物価係数
 */

// ============================================
// Types
// ============================================

export type BudgetLevel = 'saving' | 'standard' | 'high' | 'luxury';

export interface CostPerDay {
  /** 宿泊費（1泊あたり） */
  accommodation: { min: number; max: number };
  /** 食費（1日あたり） */
  meals: { min: number; max: number };
  /** 交通費（1日あたり） */
  transport: { min: number; max: number };
  /** アクティビティ費（1日あたり） */
  activities: { min: number; max: number };
}

export interface RegionMultiplier {
  label: string;
  multiplier: number;
}

// ============================================
// Budget Level Mapping
// ============================================

/**
 * UserInputのbudget値を内部の予算レベルにマッピング
 */
export function mapBudgetLevel(budget: string): BudgetLevel {
  const normalized = budget.toLowerCase();
  if (normalized.includes('安') || normalized.includes('節約') || normalized.includes('saving')) {
    return 'saving';
  }
  if (normalized.includes('高') || normalized.includes('贅沢') || normalized.includes('high')) {
    return 'high';
  }
  if (normalized.includes('最高') || normalized.includes('ラグジュアリー') || normalized.includes('luxury')) {
    return 'luxury';
  }
  return 'standard';
}

// ============================================
// 国内旅行コストテーブル（JPY）
// ============================================

export const DOMESTIC_COSTS: Record<BudgetLevel, CostPerDay> = {
  saving: {
    accommodation: { min: 3000, max: 6000 },
    meals: { min: 2000, max: 3000 },
    transport: { min: 1000, max: 3000 },
    activities: { min: 500, max: 2000 },
  },
  standard: {
    accommodation: { min: 8000, max: 15000 },
    meals: { min: 3000, max: 5000 },
    transport: { min: 2000, max: 5000 },
    activities: { min: 1000, max: 3000 },
  },
  high: {
    accommodation: { min: 20000, max: 40000 },
    meals: { min: 5000, max: 10000 },
    transport: { min: 3000, max: 8000 },
    activities: { min: 2000, max: 5000 },
  },
  luxury: {
    accommodation: { min: 50000, max: 100000 },
    meals: { min: 10000, max: 20000 },
    transport: { min: 5000, max: 15000 },
    activities: { min: 5000, max: 15000 },
  },
};

// ============================================
// 海外旅行コストテーブル（JPY換算目安）
// ============================================

export const OVERSEAS_COSTS: Record<BudgetLevel, CostPerDay> = {
  saving: {
    accommodation: { min: 5000, max: 10000 },
    meals: { min: 3000, max: 5000 },
    transport: { min: 1000, max: 3000 },
    activities: { min: 1000, max: 3000 },
  },
  standard: {
    accommodation: { min: 15000, max: 25000 },
    meals: { min: 5000, max: 8000 },
    transport: { min: 2000, max: 5000 },
    activities: { min: 2000, max: 5000 },
  },
  high: {
    accommodation: { min: 30000, max: 60000 },
    meals: { min: 8000, max: 15000 },
    transport: { min: 5000, max: 10000 },
    activities: { min: 5000, max: 10000 },
  },
  luxury: {
    accommodation: { min: 80000, max: 150000 },
    meals: { min: 15000, max: 30000 },
    transport: { min: 10000, max: 20000 },
    activities: { min: 10000, max: 25000 },
  },
};

// ============================================
// 地域別物価係数
// ============================================

export const REGION_MULTIPLIERS: Record<string, RegionMultiplier> = {
  // 国内
  '東京': { label: '東京', multiplier: 1.2 },
  '大阪': { label: '大阪', multiplier: 1.0 },
  '京都': { label: '京都', multiplier: 1.1 },
  '北海道': { label: '北海道', multiplier: 1.0 },
  '沖縄': { label: '沖縄', multiplier: 1.1 },
  '福岡': { label: '福岡', multiplier: 0.9 },

  // 海外: アジア
  'タイ': { label: 'タイ', multiplier: 0.6 },
  'ベトナム': { label: 'ベトナム', multiplier: 0.5 },
  '台湾': { label: '台湾', multiplier: 0.7 },
  '韓国': { label: '韓国', multiplier: 0.8 },
  'シンガポール': { label: 'シンガポール', multiplier: 1.1 },
  '香港': { label: '香港', multiplier: 1.0 },
  'バリ': { label: 'バリ島', multiplier: 0.6 },

  // 海外: ヨーロッパ
  'パリ': { label: 'パリ', multiplier: 1.5 },
  'ロンドン': { label: 'ロンドン', multiplier: 1.6 },
  'ローマ': { label: 'ローマ', multiplier: 1.2 },
  'バルセロナ': { label: 'バルセロナ', multiplier: 1.1 },

  // 海外: 北米
  'ニューヨーク': { label: 'ニューヨーク', multiplier: 1.7 },
  'ロサンゼルス': { label: 'ロサンゼルス', multiplier: 1.4 },
  'ハワイ': { label: 'ハワイ', multiplier: 1.5 },

  // 海外: オセアニア
  'シドニー': { label: 'シドニー', multiplier: 1.3 },
  'メルボルン': { label: 'メルボルン', multiplier: 1.2 },
};

/**
 * 目的地から地域係数を取得
 * マッチしない場合はデフォルト1.0
 */
export function getRegionMultiplier(destination: string): number {
  for (const [keyword, info] of Object.entries(REGION_MULTIPLIERS)) {
    if (destination.includes(keyword)) {
      return info.multiplier;
    }
  }
  return 1.0;
}

// ============================================
// 節約のコツ
// ============================================

export const SAVING_TIPS: Record<BudgetLevel, string[]> = {
  saving: [
    'ゲストハウスやホステルを活用すると宿泊費を抑えられます',
    'ローカルフードや屋台を楽しむとグルメも節約もできます',
    '公共交通機関の1日乗車券がお得です',
  ],
  standard: [
    '早期予約で宿泊費が20-30%割引になることがあります',
    'ランチタイムはディナーより安くレストランを楽しめます',
    '周遊パスや共通チケットで観光費をまとめて節約できます',
  ],
  high: [
    'ホテルの会員プログラムでアップグレードが期待できます',
    'レストランのランチコースはディナーの半額以下のことも',
    '現地のガイドツアーで効率的に観光できます',
  ],
  luxury: [
    'コンシェルジュサービスを活用して特別な体験を手配できます',
    'プライベートツアーで自分だけの時間を楽しめます',
    'ラウンジアクセス付きのホテルで快適な滞在を',
  ],
};
