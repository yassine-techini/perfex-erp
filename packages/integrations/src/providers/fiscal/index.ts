/**
 * Fiscal Providers Index
 * Tunisian tax and social security integrations
 */

export * from './cnss';

import { CnssProvider, createCnssProvider, CNSS_RATES, EMPLOYEE_CATEGORIES, generateCnssDeclaration } from './cnss';
import type { ProviderInfo } from '../../types';

// Provider registry
export const fiscalProviders = {
  cnss: createCnssProvider,
} as const;

export type FiscalProviderId = keyof typeof fiscalProviders;

// Provider info for UI display
export const fiscalProviderInfo: Record<FiscalProviderId, ProviderInfo> = {
  cnss: {
    id: 'cnss',
    name: 'CNSS',
    category: 'fiscal',
    description: 'Caisse Nationale de Sécurité Sociale - Déclarations mensuelles',
    logo: '/integrations/cnss.png',
    website: 'https://www.cnss.tn',
    isAvailable: true,
    requiredCredentials: ['employerNumber', 'accessCode', 'password'],
    optionalCredentials: ['environment'],
  },
};

// Factory function
export function createFiscalProvider(id: FiscalProviderId) {
  const factory = fiscalProviders[id];
  if (!factory) {
    throw new Error(`Unknown fiscal provider: ${id}`);
  }
  return factory();
}

// Export helpers and constants
export { CNSS_RATES, EMPLOYEE_CATEGORIES, generateCnssDeclaration };

// Type exports
export type { CnssProvider };
