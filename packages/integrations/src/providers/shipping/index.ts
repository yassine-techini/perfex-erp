/**
 * Shipping Providers Index
 * Tunisian delivery services
 */

export * from './aramex';
export * from './livrili';

import { AramexProvider, createAramexProvider, ARAMEX_SERVICES } from './aramex';
import { LivriliProvider, createLivriliProvider, LIVRILI_SERVICES, GOVERNORATES } from './livrili';
import type { ProviderInfo } from '../../types';

// Provider registry
export const shippingProviders = {
  aramex: createAramexProvider,
  livrili: createLivriliProvider,
} as const;

export type ShippingProviderId = keyof typeof shippingProviders;

// Provider info for UI display
export const shippingProviderInfo: Record<ShippingProviderId, ProviderInfo> = {
  aramex: {
    id: 'aramex',
    name: 'Aramex Tunisia',
    category: 'shipping',
    description: 'Service de livraison express national et international',
    logo: '/integrations/aramex.png',
    website: 'https://www.aramex.com',
    isAvailable: true,
    requiredCredentials: ['accountNumber', 'accountPin', 'username', 'password'],
    optionalCredentials: ['accountEntity', 'accountCountryCode', 'environment'],
  },
  livrili: {
    id: 'livrili',
    name: 'Livrili',
    category: 'shipping',
    description: 'Service de livraison local avec paiement à la livraison',
    logo: '/integrations/livrili.png',
    website: 'https://livrili.tn',
    isAvailable: true,
    requiredCredentials: ['apiKey', 'storeId'],
    optionalCredentials: ['environment'],
  },
};

// Factory function
export function createShippingProvider(id: ShippingProviderId) {
  const factory = shippingProviders[id];
  if (!factory) {
    throw new Error(`Unknown shipping provider: ${id}`);
  }
  return factory();
}

// Export constants
export { ARAMEX_SERVICES, LIVRILI_SERVICES, GOVERNORATES };

// Type exports
export type { AramexProvider, LivriliProvider };
