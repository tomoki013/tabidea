"use server";

import { getUser, createClient } from "@/lib/supabase/server";

export interface UserSettings {
  customInstructions?: string;
  travelStyle?: string;
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

    return {
      success: true,
      settings: {
        customInstructions: metadata.customInstructions || "",
        travelStyle: metadata.travelStyle || "",
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

    // Merge new settings
    const newMetadata = {
      ...currentMetadata,
      ...settings,
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
