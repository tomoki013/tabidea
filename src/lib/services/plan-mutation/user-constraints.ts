import { getUserSettings } from '@/app/actions/user-settings';
import {
  getDefaultHomeBaseCityForRegion,
  getDefaultRegionForLanguage,
  isLanguageCode,
  type LanguageCode,
  DEFAULT_LANGUAGE,
} from '@/lib/i18n/locales';

/**
 * Fetch and format user custom instructions (travel style + constraints).
 */
export async function getUserConstraintPrompt(): Promise<string> {
  const { settings } = await getUserSettings();
  const preferredLanguage: LanguageCode =
    settings?.preferredLanguage && isLanguageCode(settings.preferredLanguage)
      ? settings.preferredLanguage
      : DEFAULT_LANGUAGE;
  const preferredRegion =
    settings?.preferredRegion ?? getDefaultRegionForLanguage(preferredLanguage);
  const homeBaseCity =
    settings?.homeBaseCity?.trim() ||
    getDefaultHomeBaseCityForRegion(preferredRegion);
  const outputLanguageLabel = preferredLanguage === 'en' ? 'English' : 'Japanese';

  let prompt = `\n=== OUTPUT LANGUAGE (MUST FOLLOW) ===
All user-facing itinerary text MUST be written in ${outputLanguageLabel}.
Do not switch to other languages except for proper nouns or official place names.
=====================================\n`;

  if (homeBaseCity) {
    prompt += `\nUser's home base city: ${homeBaseCity}\n`;
  }

  const customInstructions = settings?.customInstructions?.trim();
  if (customInstructions) {
    prompt += `\n=== USER TRAVEL PREFERENCES (MUST FOLLOW) ===\n${customInstructions}\n=====================================\n`;
  }

  return prompt;
}
