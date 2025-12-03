/**
 * SMS Providers Index
 * Tunisian SMS services
 */

export * from './ooredoo';
export * from './tunisie-telecom';

import { OoredooProvider, createOoredooProvider } from './ooredoo';
import { TunisieTelecomProvider, createTunisieTelecomProvider } from './tunisie-telecom';
import type { ProviderInfo } from '../../types';

// Provider registry
export const smsProviders = {
  ooredoo: createOoredooProvider,
  'tunisie-telecom': createTunisieTelecomProvider,
} as const;

export type SmsProviderId = keyof typeof smsProviders;

// Provider info for UI display
export const smsProviderInfo: Record<SmsProviderId, ProviderInfo> = {
  ooredoo: {
    id: 'ooredoo',
    name: 'Ooredoo Tunisia',
    category: 'sms',
    description: 'Service SMS professionnel Ooredoo Tunisie',
    logo: '/integrations/ooredoo.png',
    website: 'https://www.ooredoo.tn',
    isAvailable: true,
    requiredCredentials: ['username', 'password', 'senderId'],
    optionalCredentials: ['environment'],
  },
  'tunisie-telecom': {
    id: 'tunisie-telecom',
    name: 'Tunisie Telecom',
    category: 'sms',
    description: 'Service SMS professionnel Tunisie Telecom',
    logo: '/integrations/tunisie-telecom.png',
    website: 'https://www.tunisietelecom.tn',
    isAvailable: true,
    requiredCredentials: ['apiKey', 'apiSecret', 'senderId'],
    optionalCredentials: ['environment'],
  },
};

// Factory function
export function createSmsProvider(id: SmsProviderId) {
  const factory = smsProviders[id];
  if (!factory) {
    throw new Error(`Unknown SMS provider: ${id}`);
  }
  return factory();
}

// Type exports
export type { OoredooProvider, TunisieTelecomProvider };
