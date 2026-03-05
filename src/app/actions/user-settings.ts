"use server";

import { getUser, createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LANGUAGE,
  getDefaultHomeBaseCityForRegion,
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
  homeBaseCity?: string;
}

/**
 * Get user settings from public.users metadata
 */
export async function getUserSettings(): Promise<{ success: boolean; settings?: UserSettings; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "authentication_required" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Failed to fetch user settings:", error);
      return { success: false, error: "settings_fetch_failed" };
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
    const homeBaseCity =
      typeof metadata.homeBaseCity === "string" && metadata.homeBaseCity.trim().length > 0
        ? metadata.homeBaseCity.trim()
        : getDefaultHomeBaseCityForRegion(preferredRegion, preferredLanguage);

    return {
      success: true,
      settings: {
        customInstructions: metadata.customInstructions || "",
        travelStyle: metadata.travelStyle || "",
        preferredLanguage,
        preferredRegion,
        preferredLocale,
        homeBaseCity,
      }
    };
  } catch (error) {
    console.error("Failed to get user settings:", error);
    return { success: false, error: "settings_fetch_failed" };
  }
}

/**
 * Update user settings in public.users metadata
 */
export async function updateUserSettings(settings: UserSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "authentication_required" };
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
      return { success: false, error: "settings_update_failed" };
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

    const fallbackHomeBaseCity = getDefaultHomeBaseCityForRegion(
      preferredRegion,
      preferredLanguage
    );
    const homeBaseCity =
      typeof settings.homeBaseCity === "string" && settings.homeBaseCity.trim().length > 0
        ? settings.homeBaseCity.trim()
        : typeof currentMetadata.homeBaseCity === "string" && currentMetadata.homeBaseCity.trim().length > 0
          ? currentMetadata.homeBaseCity.trim()
          : fallbackHomeBaseCity;

    const preferredLocale = resolveRegionalLocale(preferredLanguage, preferredRegion);

    // Merge new settings
    const newMetadata = {
      ...currentMetadata,
      ...settings,
      preferredLanguage,
      preferredRegion,
      preferredLocale,
      homeBaseCity,
    };

    const { error: updateError } = await supabase
      .from('users')
      .update({ metadata: newMetadata })
      .eq('id', user.id);

    if (updateError) {
      console.error("Failed to update user settings:", updateError);
      return { success: false, error: "settings_update_failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return { success: false, error: "settings_update_failed" };
  }
}
