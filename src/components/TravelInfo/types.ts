/**
 * TravelInfo Component Types
 * UIコンポーネント用の型定義
 */

import type {
  TravelInfoCategory,
  CategoryDataEntry,
  TravelInfoSource,
} from "@/lib/types/travel-info";

export type { TravelInfoCategory, CategoryDataEntry };

// ============================================
// カテゴリ情報定義
// ============================================

/**
 * カテゴリの表示情報
 */
export interface CategoryDisplayInfo {
  /** カテゴリラベル */
  label: string;
  /** 説明文 */
  description: string;
  /** アイコン名（Lucide React） */
  icon: CategoryIcon;
}

/**
 * 使用可能なアイコン名
 */
export type CategoryIcon =
  | "Globe"
  | "Shield"
  | "Cloud"
  | "FileText"
  | "Heart"
  | "Car"
  | "Utensils"
  | "ShoppingBag"
  | "Calendar"
  | "Zap"
  | "Stethoscope"
  | "Bath"
  | "Cigarette"
  | "Wine";

/**
 * カテゴリ情報マッピング
 */
export const CATEGORY_INFO: Record<TravelInfoCategory, CategoryDisplayInfo> = {
  basic: {
    label: "基本情報",
    description: "通貨・言語・時差",
    icon: "Globe",
  },
  safety: {
    label: "安全・医療",
    description: "危険度・緊急連絡先",
    icon: "Shield",
  },
  climate: {
    label: "気候・服装",
    description: "天気予報・服装アドバイス",
    icon: "Cloud",
  },
  visa: {
    label: "ビザ・手続き",
    description: "入国要件・必要書類",
    icon: "FileText",
  },
  manner: {
    label: "マナー・チップ",
    description: "現地の習慣・タブー",
    icon: "Heart",
  },
  transport: {
    label: "交通事情",
    description: "公共交通・配車サービス",
    icon: "Car",
  },
  local_food: {
    label: "グルメ",
    description: "代表的な料理・食事マナー",
    icon: "Utensils",
  },
  souvenir: {
    label: "お土産・買い物",
    description: "人気のお土産・免税情報",
    icon: "ShoppingBag",
  },
  events: {
    label: "イベント・祭り",
    description: "主要イベント・季節の祭り",
    icon: "Calendar",
  },
  technology: {
    label: "電源・通信",
    description: "コンセント・Wi-Fi・SIM",
    icon: "Zap",
  },
  healthcare: {
    label: "医療・衛生",
    description: "水・ワクチン・医療事情",
    icon: "Stethoscope",
  },
  restrooms: {
    label: "トイレ事情",
    description: "清潔度・利用時の注意",
    icon: "Bath",
  },
  smoking: {
    label: "喫煙ルール",
    description: "喫煙場所・罰金",
    icon: "Cigarette",
  },
  alcohol: {
    label: "飲酒ルール",
    description: "年齢制限・販売規制",
    icon: "Wine",
  },
};

// ============================================
// CategorySelector Props
// ============================================

/**
 * CategorySelector コンポーネントのProps
 */
export interface CategorySelectorProps {
  /** 選択中のカテゴリ一覧 */
  selectedCategories: TravelInfoCategory[];
  /** 選択変更時のコールバック */
  onSelectionChange: (categories: TravelInfoCategory[]) => void;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 最大選択数（デフォルト: 6） */
  maxSelections?: number;
}

// ============================================
// CategoryCard Props
// ============================================

/**
 * CategoryCard コンポーネントのProps
 */
export interface CategoryCardProps {
  /** カテゴリ */
  category: TravelInfoCategory;
  /** 選択状態 */
  selected: boolean;
  /** トグル時のコールバック */
  onToggle: () => void;
  /** 無効化フラグ */
  disabled?: boolean;
}

// ============================================
// TravelInfoDisplay Props
// ============================================

/**
 * カテゴリ別の状態（プログレッシブローディング用）
 */
export interface CategoryState {
  status: "loading" | "success" | "error";
  data?: CategoryDataEntry;
  error?: string;
}

/**
 * TravelInfoDisplay コンポーネントのProps（プログレッシブローディング対応）
 */
export interface TravelInfoDisplayProps {
  /** 目的地 */
  destination: string;
  /** 国名 */
  country: string;
  /** カテゴリ別の状態 */
  categoryStates: Map<TravelInfoCategory, CategoryState>;
  /** 選択されたカテゴリ */
  selectedCategories: TravelInfoCategory[];
  /** ソース情報 */
  sources: CategoryDataEntry["source"][];
  /** 渡航日程（オプション） */
  dates?: { start: string; end: string };
  /** カテゴリ再取得コールバック */
  onRetryCategory?: (category: TravelInfoCategory) => void;
}

// ============================================
// InfoSection Props
// ============================================

/**
 * InfoSection コンポーネントのProps
 */
export interface InfoSectionProps {
  /** カテゴリ */
  category: TravelInfoCategory;
  /** 展開状態 */
  isExpanded: boolean;
  /** 展開トグル時のコールバック */
  onToggle: () => void;
  /** セクションの内容 */
  children: React.ReactNode;
  /** ソース情報 */
  source?: CategoryDataEntry["source"];
}

// ============================================
// SourceBadge Props
// ============================================

/**
 * SourceBadge コンポーネントのProps
 */
export interface SourceBadgeProps {
  /** ソースタイプ */
  sourceType: "official_api" | "web_search" | "ai_generated" | "blog";
  /** ソース名 */
  sourceName: string;
  /** ソースURL（オプション） */
  sourceUrl?: string;
  /** 信頼性スコア（0-100） */
  reliabilityScore: number;
  /** 取得日時 */
  retrievedAt: Date;
  /** コンパクト表示 */
  compact?: boolean;
}

// ============================================
// LoadingState Props
// ============================================

/**
 * LoadingState コンポーネントのProps
 */
export interface LoadingStateProps {
  /** ローディングメッセージ */
  message?: string;
  /** カテゴリ数（スケルトン表示用） */
  categoryCount?: number;
}

// ============================================
// ShareButton Props
// ============================================

/**
 * ShareButton コンポーネントのProps
 */
export interface ShareButtonProps {
  /** 目的地 */
  destination: string;
  /** 選択されたカテゴリ */
  categories: TravelInfoCategory[];
  /** 渡航日程（オプション） */
  dates?: { start: string; end: string };
}

// ============================================
// セクションコンポーネント共通Props
// ============================================

/**
 * 各セクションコンポーネントの共通Props
 */
export interface SectionBaseProps<T> {
  /** セクションのデータ */
  data: T;
  /** ソース情報 */
  source?: TravelInfoSource;
}
