/**
 * Pipeline helper functions shared between preflight and pipeline orchestrator
 */

import type { UserType } from '@/lib/limits/config';
import type { ModelResolution } from '@/lib/services/ai/model-resolver';
import { getDefaultProvider, resolveModelForPhase } from '@/lib/services/ai/model-resolver';

export function getItineraryProvider(): 'gemini' | 'openai' {
  const provider = process.env.AI_PROVIDER_ITINERARY;
  if (provider === 'gemini' || provider === 'openai') {
    return provider;
  }
  return getDefaultProvider();
}

export function toComposeModelTier(userType: UserType): 'flash' | 'pro' {
  return userType === 'pro' || userType === 'premium' || userType === 'admin'
    ? 'pro'
    : 'flash';
}

export function resolveModelsForPipeline(userType: UserType): {
  semanticModel: ModelResolution;
  narrativeModel: ModelResolution;
  modelTier: 'flash' | 'pro';
  provider: 'gemini' | 'openai';
} {
  const provider = getItineraryProvider();
  const semanticModel = resolveModelForPhase('outline', userType, provider);
  const narrativeModel = resolveModelForPhase('chunk', userType, provider);
  const modelTier = toComposeModelTier(userType);

  return { semanticModel, narrativeModel, modelTier, provider };
}
