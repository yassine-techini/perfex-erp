/**
 * Finance schemas
 * Accounting, invoicing, and financial management
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { users, organizations } from './users';

/**
 * Accounts (Plan Comptable)
 * Chart of accounts for general ledger
 */
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  code: text('code').notNull(), // Account code (e.g., "512000")
  name: text('name').notNull(),
  type: text('type', {
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
  }).notNull(),
  parentId: text('parent_id').references(() => accounts.id), // Hierarchical accounts
  currency: text('currency').notNull().default('EUR'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  system: integer('system', { mode: 'boolean' }).notNull().default(false), // System account, cannot be deleted
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Journals
 * Different journals for different types of transactions
 */
export const journals = sqliteTable('journals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  code: text('code').notNull(), // Journal code (e.g., "SALES", "PURCH")
  name: text('name').notNull(),
  type: text('type', {
    enum: ['general', 'sales', 'purchase', 'bank', 'cash'],
  }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Journal Entries
 * Main accounting entries
 */
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  journalId: text('journal_id')
    .notNull()
    .references(() => journals.id),
  reference: text('reference').notNull(), // Entry number
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['draft', 'posted', 'cancelled'],
  }).notNull().default('draft'),
  totalDebit: real('total_debit').notNull().default(0),
  totalCredit: real('total_credit').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  postedBy: text('posted_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Journal Entry Lines
 * Individual lines of journal entries (debits and credits)
 */
export const journalEntryLines = sqliteTable('journal_entry_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entryId: text('entry_id')
    .notNull()
    .references(() => journalEntries.id),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  label: text('label'),
  debit: real('debit').notNull().default(0),
  credit: real('credit').notNull().default(0),
  reconciled: integer('reconciled', { mode: 'boolean' }).notNull().default(false),
  reconciledAt: integer('reconciled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Fiscal Years
 * Financial year periods
 */
export const fiscalYears = sqliteTable('fiscal_years', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(), // e.g., "FY 2024"
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  status: text('status', {
    enum: ['open', 'closed'],
  }).notNull().default('open'),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  closedBy: text('closed_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Tax Rates
 * VAT/GST rates
 */
export const taxRates = sqliteTable('tax_rates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(), // e.g., "VAT 20%"
  code: text('code').notNull(), // e.g., "VAT20"
  rate: real('rate').notNull(), // Percentage (e.g., 20.0 for 20%)
  type: text('type', {
    enum: ['sales', 'purchase', 'both'],
  }).notNull().default('both'),
  accountId: text('account_id').references(() => accounts.id), // Tax collection account
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Invoices
 * Customer invoices
 */
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  number: text('number').notNull().unique(), // Invoice number
  customerId: text('customer_id').notNull(), // Reference to contact
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerAddress: text('customer_address'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
  status: text('status', {
    enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
  }).notNull().default('draft'),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  amountPaid: real('amount_paid').notNull().default(0),
  amountDue: real('amount_due').notNull().default(0),
  currency: text('currency').notNull().default('EUR'),
  notes: text('notes'),
  terms: text('terms'),
  pdfUrl: text('pdf_url'), // R2 storage URL
  journalEntryId: text('journal_entry_id').references(() => journalEntries.id),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Invoice Lines
 * Individual line items on invoices
 */
export const invoiceLines = sqliteTable('invoice_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  taxRateId: text('tax_rate_id').references(() => taxRates.id),
  taxRate: real('tax_rate').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  total: real('total').notNull(),
  accountId: text('account_id').references(() => accounts.id), // Revenue account
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Payments
 * Payment records
 */
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  reference: text('reference').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('EUR'),
  paymentMethod: text('payment_method', {
    enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'other'],
  }).notNull(),
  customerId: text('customer_id'), // For customer payments
  supplierId: text('supplier_id'), // For supplier payments
  accountId: text('account_id').references(() => accounts.id), // Payment account
  journalEntryId: text('journal_entry_id').references(() => journalEntries.id),
  notes: text('notes'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Payment Allocations
 * Link payments to invoices
 */
export const paymentAllocations = sqliteTable('payment_allocations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  paymentId: text('payment_id')
    .notNull()
    .references(() => payments.id),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id),
  amount: real('amount').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Bank Accounts
 * Bank account management
 */
export const bankAccounts = sqliteTable('bank_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  accountNumber: text('account_number'),
  iban: text('iban'),
  swift: text('swift'),
  bankName: text('bank_name'),
  currency: text('currency').notNull().default('EUR'),
  balance: real('balance').notNull().default(0),
  accountId: text('account_id').references(() => accounts.id), // Linked GL account
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Type exports
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type Journal = typeof journals.$inferSelect;
export type InsertJournal = typeof journals.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = typeof journalEntryLines.$inferInsert;
export type FiscalYear = typeof fiscalYears.$inferSelect;
export type InsertFiscalYear = typeof fiscalYears.$inferInsert;
export type TaxRate = typeof taxRates.$inferSelect;
export type InsertTaxRate = typeof taxRates.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InsertInvoiceLine = typeof invoiceLines.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type InsertPaymentAllocation = typeof paymentAllocations.$inferInsert;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;
