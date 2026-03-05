import type {
  TravelInfoCategory,
  CategoryDataEntry,
  TravelInfoSource,
} from '@/types';

export type { TravelInfoCategory, CategoryDataEntry };

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

export type CategoryInfoTranslationKey =
  | `${TravelInfoCategory}.label`
  | `${TravelInfoCategory}.description`;

export type CategoryInfoTranslator = (key: CategoryInfoTranslationKey) => string;

export interface CategoryInfoDefinition {
  label: CategoryInfoTranslationKey;
  description: CategoryInfoTranslationKey;
  icon: CategoryIcon;
}

export interface CategoryDisplayInfo {
  label: string;
  description: string;
  icon: CategoryIcon;
}

export const CATEGORY_INFO: Record<TravelInfoCategory, CategoryInfoDefinition> = {
  basic: {
    label: "basic.label",
    description: "basic.description",
    icon: "Globe",
  },
  safety: {
    label: "safety.label",
    description: "safety.description",
    icon: "Shield",
  },
  climate: {
    label: "climate.label",
    description: "climate.description",
    icon: "Cloud",
  },
  visa: {
    label: "visa.label",
    description: "visa.description",
    icon: "FileText",
  },
  manner: {
    label: "manner.label",
    description: "manner.description",
    icon: "Heart",
  },
  transport: {
    label: "transport.label",
    description: "transport.description",
    icon: "Car",
  },
  local_food: {
    label: "local_food.label",
    description: "local_food.description",
    icon: "Utensils",
  },
  souvenir: {
    label: "souvenir.label",
    description: "souvenir.description",
    icon: "ShoppingBag",
  },
  events: {
    label: "events.label",
    description: "events.description",
    icon: "Calendar",
  },
  technology: {
    label: "technology.label",
    description: "technology.description",
    icon: "Zap",
  },
  healthcare: {
    label: "healthcare.label",
    description: "healthcare.description",
    icon: "Stethoscope",
  },
  restrooms: {
    label: "restrooms.label",
    description: "restrooms.description",
    icon: "Bath",
  },
  smoking: {
    label: "smoking.label",
    description: "smoking.description",
    icon: "Cigarette",
  },
  alcohol: {
    label: "alcohol.label",
    description: "alcohol.description",
    icon: "Wine",
  },
};

export const TRAVEL_INFO_CATEGORIES = Object.keys(CATEGORY_INFO) as TravelInfoCategory[];

export function getCategoryInfo(
  category: TravelInfoCategory,
  t: CategoryInfoTranslator
): CategoryDisplayInfo {
  const info = CATEGORY_INFO[category];
  return {
    label: t(info.label),
    description: t(info.description),
    icon: info.icon,
  };
}

export interface CategorySelectorProps {
  selectedCategories: TravelInfoCategory[];
  onSelectionChange: (categories: TravelInfoCategory[]) => void;
  disabled?: boolean;
  maxSelections?: number;
}

export interface CategoryCardProps {
  category: TravelInfoCategory;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export interface CategoryState {
  status: "loading" | "success" | "error";
  data?: CategoryDataEntry;
  error?: string;
}

export interface TravelInfoDisplayProps {
  destination: string;
  country: string;
  categoryStates: Map<TravelInfoCategory, CategoryState>;
  selectedCategories: TravelInfoCategory[];
  sources: CategoryDataEntry["source"][];
  dates?: { start: string; end: string };
  onRetryCategory?: (category: TravelInfoCategory) => void;
}

export interface InfoSectionProps {
  category: TravelInfoCategory;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  source?: CategoryDataEntry["source"];
}

export interface SourceBadgeProps {
  sourceType: "official_api" | "web_search" | "ai_generated" | "blog";
  sourceName: string;
  sourceUrl?: string;
  reliabilityScore: number;
  retrievedAt: Date;
  compact?: boolean;
}

export interface LoadingStateProps {
  message?: string;
  categoryCount?: number;
}

export interface ShareButtonProps {
  destination: string;
  categories: TravelInfoCategory[];
  dates?: { start: string; end: string };
}

export interface SectionBaseProps<T> {
  data: T;
  source?: TravelInfoSource;
}
