import { REGION_OPTIONS, type RegionCode, type UiLanguage } from "@/lib/i18n/regions";

export type RegionSearchOption = {
  value: RegionCode;
  label: string;
};

export const INITIAL_REGION_OPTION_LIMIT = 20;
export const SEARCH_REGION_OPTION_LIMIT = 40;

type IndexedRegionOption = {
  value: RegionCode;
  label: string;
  defaultOrder: number;
  normalizedCode: string;
  normalizedLocalizedName: string;
  normalizedJaName: string;
  normalizedEnName: string;
  localizedTokens: string[];
  enTokens: string[];
};

const PRIORITY_CODES: RegionCode[] = ["JP", "US"];
const LANGUAGE_COLLATOR = {
  ja: new Intl.Collator("ja"),
  en: new Intl.Collator("en"),
};

const regionIndexCache = new Map<UiLanguage, IndexedRegionOption[]>();

function resolveUiLanguage(language: UiLanguage): "ja" | "en" {
  return language === "ja" ? "ja" : "en";
}

function normalizeText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[\s\-_/(),.]+/)
    .filter(Boolean);
}

function getRegionPriority(code: RegionCode): number {
  const index = PRIORITY_CODES.indexOf(code);
  return index === -1 ? PRIORITY_CODES.length : index;
}

function getLocalizedName(
  option: (typeof REGION_OPTIONS)[number],
  language: UiLanguage
): string {
  return language === "en" ? option.nameEn : option.nameJa;
}

function buildRegionIndex(language: UiLanguage): IndexedRegionOption[] {
  const uiLanguage = resolveUiLanguage(language);
  const sorted = [...REGION_OPTIONS].sort((left, right) => {
    const priorityDiff = getRegionPriority(left.code) - getRegionPriority(right.code);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return LANGUAGE_COLLATOR[uiLanguage].compare(
      getLocalizedName(left, uiLanguage),
      getLocalizedName(right, uiLanguage)
    );
  });

  return sorted.map((option, index) => {
    const localizedName = getLocalizedName(option, uiLanguage);
    const label = `${localizedName} (${option.code})`;

    return {
      value: option.code,
      label,
      defaultOrder: index,
      normalizedCode: normalizeText(option.code),
      normalizedLocalizedName: normalizeText(localizedName),
      normalizedJaName: normalizeText(option.nameJa),
      normalizedEnName: normalizeText(option.nameEn),
      localizedTokens: tokenize(localizedName),
      enTokens: tokenize(option.nameEn),
    };
  });
}

function getRegionIndex(language: UiLanguage): IndexedRegionOption[] {
  const cached = regionIndexCache.get(language);
  if (cached) {
    return cached;
  }

  const built = buildRegionIndex(language);
  regionIndexCache.set(language, built);
  return built;
}

function hasTokenPrefix(tokens: string[], query: string): boolean {
  return tokens.some((token) => token.startsWith(query));
}

function scoreRegion(option: IndexedRegionOption, query: string): number {
  if (option.normalizedCode === query) {
    return 1000;
  }
  if (option.normalizedLocalizedName.startsWith(query)) {
    return 920;
  }
  if (option.normalizedJaName.startsWith(query) || option.normalizedEnName.startsWith(query)) {
    return 900;
  }
  if (option.normalizedCode.startsWith(query)) {
    return 860;
  }
  if (hasTokenPrefix(option.localizedTokens, query)) {
    return 760;
  }
  if (hasTokenPrefix(option.enTokens, query)) {
    return 740;
  }
  if (option.normalizedLocalizedName.includes(query)) {
    return 620;
  }
  if (option.normalizedJaName.includes(query) || option.normalizedEnName.includes(query)) {
    return 600;
  }
  if (option.normalizedCode.includes(query)) {
    return 540;
  }

  return 0;
}

function toSearchOption(option: IndexedRegionOption): RegionSearchOption {
  return {
    value: option.value,
    label: option.label,
  };
}

export function getInitialRegionOptions(
  language: UiLanguage,
  limit = INITIAL_REGION_OPTION_LIMIT
): RegionSearchOption[] {
  if (limit <= 0) {
    return [];
  }

  return getRegionIndex(language).slice(0, limit).map(toSearchOption);
}

export function searchRegionOptions(
  language: UiLanguage,
  query: string,
  limit = SEARCH_REGION_OPTION_LIMIT
): RegionSearchOption[] {
  if (limit <= 0) {
    return [];
  }

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return getInitialRegionOptions(language, limit);
  }

  return getRegionIndex(language)
    .map((option) => ({
      option,
      score: scoreRegion(option, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.option.defaultOrder - right.option.defaultOrder;
    })
    .slice(0, limit)
    .map((entry) => toSearchOption(entry.option));
}
