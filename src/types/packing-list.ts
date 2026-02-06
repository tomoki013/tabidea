/**
 * 持ち物リスト関連の型定義
 */

export interface PackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  quantity?: number;
  note?: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export type PackingCategory =
  | 'documents'
  | 'clothing'
  | 'electronics'
  | 'toiletries'
  | 'medicine'
  | 'theme'
  | 'other';

export interface PackingList {
  items: PackingItem[];
  generatedAt: string;
  basedOn: {
    destination: string;
    days: number;
    climate?: string;
    themes: string[];
  };
}

export const PACKING_CATEGORY_LABELS: Record<PackingCategory, string> = {
  documents: '書類・貴重品',
  clothing: '衣類',
  electronics: '電子機器',
  toiletries: '衛生用品',
  medicine: '医薬品',
  theme: 'テーマ別',
  other: 'その他',
};

export const PACKING_CATEGORY_ICONS: Record<PackingCategory, string> = {
  documents: '📄',
  clothing: '👕',
  electronics: '🔌',
  toiletries: '🧴',
  medicine: '💊',
  theme: '🎯',
  other: '📦',
};

export const PACKING_PRIORITY_LABELS: Record<PackingItem['priority'], string> = {
  essential: '必須',
  recommended: 'おすすめ',
  optional: 'あると便利',
};
