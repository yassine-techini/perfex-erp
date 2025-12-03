/**
 * Perfex Integrations Package
 * Tunisian market connectors for payments, SMS, shipping, and fiscal services
 */

// Types
export * from './types';

// Payment Providers
export {
  paymentProviders,
  paymentProviderInfo,
  createPaymentProvider,
  D17Provider,
  FlouciProvider,
  KonnectProvider,
  PaymeeProvider,
  D17ConfigSchema,
  FlouciConfigSchema,
  KonnectConfigSchema,
  PaymeeConfigSchema,
} from './providers/payments';

// Fiscal Providers
export {
  fiscalProviders,
  fiscalProviderInfo,
  createFiscalProvider,
  CnssProvider,
  CnssConfigSchema,
  CNSS_RATES,
  EMPLOYEE_CATEGORIES,
  generateCnssDeclaration,
} from './providers/fiscal';

// SMS Providers
export {
  smsProviders,
  smsProviderInfo,
  createSmsProvider,
  OoredooProvider,
  TunisieTelecomProvider,
  OoredooConfigSchema,
  TunisieTelecomConfigSchema,
} from './providers/sms';

// Shipping Providers
export {
  shippingProviders,
  shippingProviderInfo,
  createShippingProvider,
  AramexProvider,
  LivriliProvider,
  AramexConfigSchema,
  LivriliConfigSchema,
  ARAMEX_SERVICES,
  LIVRILI_SERVICES,
  GOVERNORATES,
} from './providers/shipping';

// All providers info for UI
import { paymentProviderInfo } from './providers/payments';
import { fiscalProviderInfo } from './providers/fiscal';
import { smsProviderInfo } from './providers/sms';
import { shippingProviderInfo } from './providers/shipping';
import type { ProviderInfo, ProviderCategory } from './types';

export const allProviderInfo: Record<string, ProviderInfo> = {
  ...paymentProviderInfo,
  ...fiscalProviderInfo,
  ...smsProviderInfo,
  ...shippingProviderInfo,
};

export function getProvidersByCategory(category: ProviderCategory): ProviderInfo[] {
  return Object.values(allProviderInfo).filter(p => p.category === category);
}

export function getProviderInfo(providerId: string): ProviderInfo | undefined {
  return allProviderInfo[providerId];
}

// Provider categories with labels
export const providerCategories: Array<{ id: ProviderCategory; label: string; description: string }> = [
  {
    id: 'payment',
    label: 'Paiements',
    description: 'Solutions de paiement mobile et en ligne tunisiennes',
  },
  {
    id: 'fiscal',
    label: 'Fiscal & Social',
    description: 'Déclarations CNSS et impôts',
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Services SMS professionnels',
  },
  {
    id: 'shipping',
    label: 'Livraison',
    description: 'Services de livraison et expédition',
  },
];
