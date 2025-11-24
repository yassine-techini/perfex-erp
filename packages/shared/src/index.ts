/**
 * @perfex/shared
 * Shared types, validators, and utilities for Perfex ERP
 */

// Types
export * from './types/auth';
export * from './types/finance';
export * from './types/crm';

// Validators
export * from './validators/auth';
export * from './validators/finance';
export * from './validators/crm';

// Note: Organization types and validators are intentionally not exported here
// to avoid conflicts with auth exports. Import them directly from:
// - @perfex/shared/types/organizations
// - @perfex/shared/validators/organizations
