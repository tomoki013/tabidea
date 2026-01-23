/**
 * TravelInfo Components Exports
 *
 * 渡航情報UIコンポーネントの統合エクスポート
 */

// メインコンポーネント
export { default as CategorySelector } from './CategorySelector';
export { default as CategoryCard } from './CategoryCard';
export { default as TravelInfoDisplay } from './TravelInfoDisplay';
export { default as InfoSection } from './InfoSection';
export { default as SourceBadge } from './SourceBadge';
export { default as LoadingState } from './LoadingState';
export { default as ShareButton } from './ShareButton';
export { default as PDFExportButton } from './PDFExportButton';
export { default as EmbeddedTravelInfo } from './EmbeddedTravelInfo';

// セクションコンポーネント
export {
  BasicInfoSection,
  SafetyInfoSection,
  ClimateInfoSection,
  VisaInfoSection,
  MannerInfoSection,
  TransportInfoSection,
} from './sections';

// 型定義
export type {
  CategorySelectorProps,
  CategoryCardProps,
  CategoryDisplayInfo,
  CategoryIcon,
  TravelInfoDisplayProps,
  InfoSectionProps,
  SourceBadgeProps,
  LoadingStateProps,
  ShareButtonProps,
  SectionBaseProps,
} from './types';

// カテゴリ情報定義
export { CATEGORY_INFO } from './types';
