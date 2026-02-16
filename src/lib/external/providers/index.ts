import { amadeusProvider } from '@/lib/external/providers/amadeus';
import type { ExternalProvider, ExternalSearchProvider } from '@/lib/external/types';

export function getExternalProvider(provider: ExternalProvider): ExternalSearchProvider {
  switch (provider) {
    case 'amadeus':
    default:
      return amadeusProvider;
  }
}
