import enMessages from "@/messages/en.json";
import jaMessages from "@/messages/ja.json";
import {
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from "@/lib/i18n/locales";

type AppMessages = typeof enMessages;

const MESSAGES_BY_LANGUAGE: Record<LanguageCode, AppMessages> = {
  en: enMessages,
  ja: jaMessages,
};

function mergeWithFallback(
  fallback: Record<string, unknown>,
  localized: Record<string, unknown>,
  prefix = ""
): { merged: Record<string, unknown>; missingKeys: string[] } {
  const merged: Record<string, unknown> = {};
  const missingKeys: string[] = [];

  for (const key of Object.keys(fallback)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const fallbackValue = fallback[key];
    const localizedValue = localized[key];

    if (localizedValue === undefined) {
      merged[key] = fallbackValue;
      missingKeys.push(path);
      continue;
    }

    if (
      typeof fallbackValue === "object" &&
      fallbackValue !== null &&
      !Array.isArray(fallbackValue) &&
      typeof localizedValue === "object" &&
      localizedValue !== null &&
      !Array.isArray(localizedValue)
    ) {
      const nested = mergeWithFallback(
        fallbackValue as Record<string, unknown>,
        localizedValue as Record<string, unknown>,
        path
      );
      merged[key] = nested.merged;
      missingKeys.push(...nested.missingKeys);
      continue;
    }

    merged[key] = localizedValue;
  }

  for (const key of Object.keys(localized)) {
    if (!(key in merged)) {
      merged[key] = localized[key];
    }
  }

  return { merged, missingKeys };
}

export function getMessages(language: LanguageCode): AppMessages {
  const baseMessages = MESSAGES_BY_LANGUAGE[DEFAULT_LANGUAGE];
  const localizedMessages = MESSAGES_BY_LANGUAGE[language];

  if (!localizedMessages || language === DEFAULT_LANGUAGE) {
    return baseMessages;
  }

  const { merged, missingKeys } = mergeWithFallback(
    baseMessages as Record<string, unknown>,
    localizedMessages as Record<string, unknown>
  );

  if (process.env.NODE_ENV !== "production" && missingKeys.length > 0) {
    console.warn(
      `[i18n] Missing translation keys for "${language}". Falling back to ${DEFAULT_LANGUAGE}: ${missingKeys.join(", ")}`
    );
  }

  return merged as AppMessages;
}
