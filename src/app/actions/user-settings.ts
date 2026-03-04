"use server";

import { getUser, createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LANGUAGE,
  getDefaultRegionForLanguage,
  isLanguageCode,
  isRegionCode,
  resolveRegionalLocale,
  type LanguageCode,
  type RegionCode,
  type RegionalLocale,
} from "@/lib/i18n/locales";

export interface UserSettings {
  customInstructions?: string;
  travelStyle?: string;
  preferredLanguage?: LanguageCode;
  preferredRegion?: RegionCode;
  preferredLocale?: RegionalLocale;
}

/**
 * Get user settings from public.users metadata
 */
export async function getUserSettings(): Promise<{ success: boolean; settings?: UserSettings; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Failed to fetch user settings:", error);
      return { success: false, error: "設定の取得に失敗しました" };
    }

    // Default to empty object if metadata is null
    const metadata = data?.metadata || {};
    const preferredLanguage = isLanguageCode(metadata.preferredLanguage)
      ? metadata.preferredLanguage
      : DEFAULT_LANGUAGE;
    const preferredRegion = isRegionCode(metadata.preferredRegion)
      ? metadata.preferredRegion
      : getDefaultRegionForLanguage(preferredLanguage);
    const preferredLocale = resolveRegionalLocale(preferredLanguage, preferredRegion);

    return {
      success: true,
      settings: {
        customInstructions: metadata.customInstructions || "",
        travelStyle: metadata.travelStyle || "",
        preferredLanguage,
        preferredRegion,
        preferredLocale,
      }
    };
  } catch (error) {
    console.error("Failed to get user settings:", error);
    return { success: false, error: "設定の取得に失敗しました" };
  }
}

/**
 * Update user settings in public.users metadata
 */
export async function updateUserSettings(settings: UserSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const supabase = await createClient();

    // First fetch existing metadata to merge
    const { data: currentData, error: fetchError } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error("Failed to fetch current metadata for update:", fetchError);
      return { success: false, error: "設定の更新に失敗しました" };
    }

    const currentMetadata = currentData?.metadata || {};
    const currentLanguage = isLanguageCode(currentMetadata.preferredLanguage)
      ? currentMetadata.preferredLanguage
      : DEFAULT_LANGUAGE;
    const currentRegion = isRegionCode(currentMetadata.preferredRegion)
      ? currentMetadata.preferredRegion
      : getDefaultRegionForLanguage(currentLanguage);

    let preferredLanguage = settings.preferredLanguage ?? currentLanguage;
    let preferredRegion = settings.preferredRegion ?? currentRegion;

    if (settings.preferredLanguage && !settings.preferredRegion) {
      preferredRegion = getDefaultRegionForLanguage(settings.preferredLanguage);
    }

    if (!isLanguageCode(preferredLanguage)) {
      preferredLanguage = DEFAULT_LANGUAGE;
    }

    if (!isRegionCode(preferredRegion)) {
      preferredRegion = getDefaultRegionForLanguage(preferredLanguage);
    }

    const preferredLocale = resolveRegionalLocale(preferredLanguage, preferredRegion);

    // Merge new settings
    const newMetadata = {
      ...currentMetadata,
      ...settings,
      preferredLanguage,
      preferredRegion,
      preferredLocale,
    };

    const { error: updateError } = await supabase
      .from('users')
      .update({ metadata: newMetadata })
      .eq('id', user.id);

    if (updateError) {
      console.error("Failed to update user settings:", updateError);
      return { success: false, error: "設定の更新に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return { success: false, error: "設定の更新に失敗しました" };
  }
}
