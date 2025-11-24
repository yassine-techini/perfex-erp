/**
 * Database schemas export
 * Central export point for all Drizzle schemas
 */

export * from './users';
export * from './finance';
export * from './crm';

// Export all tables for drizzle-kit
export {
  users,
  organizations,
  organizationMembers,
  roles,
  userRoles,
  sessions,
} from './users';

export {
  accounts,
  journals,
  journalEntries,
  journalEntryLines,
  fiscalYears,
  taxRates,
  invoices,
  invoiceLines,
  payments,
  paymentAllocations,
  bankAccounts,
} from './finance';

export {
  companies,
  contacts,
  pipelineStages,
  opportunities,
  activities,
  products,
  opportunityProducts,
} from './crm';
