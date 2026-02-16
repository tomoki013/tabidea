import { AmadeusProvider } from '@/lib/external/providers/amadeus';
import type { ExternalProvider, ExternalProviderClient } from '@/lib/external/types';

const clients: Record<ExternalProvider, ExternalProviderClient> = {
  amadeus: new AmadeusProvider(),
};

export function getExternalProvider(provider: ExternalProvider) {
  return clients[provider];
}
