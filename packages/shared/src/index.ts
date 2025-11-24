/**
 * @perfex/shared
 * Shared types, validators, and utilities for Perfex ERP
 */

// Types
export * from './types/auth';
export * from './types/finance';
export * from './types/crm';
export * from './types/projects';
export * from './types/inventory';
export * from './types/hr';
export * from './types/procurement';

// Validators
export * from './validators/auth';
export * from './validators/finance';
export * from './validators/crm';
export * from './validators/projects';
export * from './validators/inventory';
export * from './validators/hr';
export * from './validators/procurement';

// Note: Organization types and validators are intentionally not exported here
// to avoid conflicts with auth exports. Import them directly from:
// - @perfex/shared/types/organizations
// - @perfex/shared/validators/organizations
