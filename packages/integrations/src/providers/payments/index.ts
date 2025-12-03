/**
 * Payment Providers Index
 * Tunisian payment solutions
 */

export * from './d17';
export * from './flouci';
export * from './konnect';
export * from './paymee';

import { D17Provider, createD17Provider } from './d17';
import { FlouciProvider, createFlouciProvider } from './flouci';
import { KonnectProvider, createKonnectProvider } from './konnect';
import { PaymeeProvider, createPaymeeProvider } from './paymee';
import type { ProviderInfo } from '../../types';

// Provider registry
export const paymentProviders = {
  d17: createD17Provider,
  flouci: createFlouciProvider,
  konnect: createKonnectProvider,
  paymee: createPaymeeProvider,
} as const;

export type PaymentProviderId = keyof typeof paymentProviders;

// Provider info for UI display
export const paymentProviderInfo: Record<PaymentProviderId, ProviderInfo> = {
  d17: {
    id: 'd17',
    name: 'D17',
    category: 'payment',
    description: 'Solution de paiement mobile par Banque de Tunisie',
    logo: '/integrations/d17.png',
    website: 'https://www.d17.tn',
    isAvailable: true,
    requiredCredentials: ['merchantId', 'apiKey', 'secretKey'],
    optionalCredentials: ['environment'],
  },
  flouci: {
    id: 'flouci',
    name: 'Flouci',
    category: 'payment',
    description: 'Paiement mobile simple et rapide en Tunisie',
    logo: '/integrations/flouci.png',
    website: 'https://flouci.com',
    isAvailable: true,
    requiredCredentials: ['appToken', 'appSecret'],
    optionalCredentials: ['environment'],
  },
  konnect: {
    id: 'konnect',
    name: 'Konnect',
    category: 'payment',
    description: 'Passerelle de paiement multi-canaux (carte, wallet, e-DINAR)',
    logo: '/integrations/konnect.png',
    website: 'https://konnect.network',
    isAvailable: true,
    requiredCredentials: ['apiKey', 'receiverWalletId'],
    optionalCredentials: ['environment'],
  },
  paymee: {
    id: 'paymee',
    name: 'Paymee',
    category: 'payment',
    description: 'Passerelle de paiement en ligne tunisienne',
    logo: '/integrations/paymee.png',
    website: 'https://paymee.tn',
    isAvailable: true,
    requiredCredentials: ['apiToken', 'vendorId'],
    optionalCredentials: ['environment'],
  },
};

// Factory function
export function createPaymentProvider(id: PaymentProviderId) {
  const factory = paymentProviders[id];
  if (!factory) {
    throw new Error(`Unknown payment provider: ${id}`);
  }
  return factory();
}

// Type exports
export type { D17Provider, FlouciProvider, KonnectProvider, PaymeeProvider };
