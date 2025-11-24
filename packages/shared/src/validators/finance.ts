/**
 * Finance validators (Zod schemas)
 */

import { z } from 'zod';

/**
 * Create account schema
 */
export const createAccountSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[0-9A-Z]+$/),
  name: z.string().min(2).max(200),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parentId: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).default('EUR'),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * Update account schema
 */
export const updateAccountSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  active: z.boolean().optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/**
 * Create journal schema
 */
export const createJournalSchema = z.object({
  code: z.string().min(1).max(10).regex(/^[A-Z]+$/),
  name: z.string().min(2).max(100),
  type: z.enum(['general', 'sales', 'purchase', 'bank', 'cash']),
});

export type CreateJournalInput = z.infer<typeof createJournalSchema>;

/**
 * Create journal entry line schema
 */
const journalEntryLineSchema = z.object({
  accountId: z.string().uuid(),
  label: z.string().max(500).optional().nullable(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
});

/**
 * Create journal entry schema
 */
export const createJournalEntrySchema = z.object({
  journalId: z.string().uuid(),
  reference: z.string().max(50).optional(),
  date: z.string().datetime().or(z.date()),
  description: z.string().max(1000).optional().nullable(),
  lines: z.array(journalEntryLineSchema).min(2),
}).refine((data) => {
  // Check that total debits = total credits
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}, {
  message: 'Total debits must equal total credits',
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

/**
 * Post journal entry schema
 */
export const postJournalEntrySchema = z.object({
  date: z.string().datetime().or(z.date()).optional(),
});

export type PostJournalEntryInput = z.infer<typeof postJournalEntrySchema>;

/**
 * Create tax rate schema
 */
export const createTaxRateSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(1).max(20),
  rate: z.number().min(0).max(100),
  type: z.enum(['sales', 'purchase', 'both']).default('both'),
  accountId: z.string().uuid().optional().nullable(),
});

export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;

/**
 * Invoice line schema
 */
const invoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0).default(1),
  unitPrice: z.number(),
  taxRateId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
});

/**
 * Create invoice schema
 */
export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().optional().nullable(),
  customerAddress: z.string().max(1000).optional().nullable(),
  date: z.string().datetime().or(z.date()),
  dueDate: z.string().datetime().or(z.date()),
  currency: z.string().length(3).default('EUR'),
  lines: z.array(invoiceLineSchema).min(1),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * Update invoice schema
 */
export const updateInvoiceSchema = z.object({
  customerName: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().optional().nullable(),
  customerAddress: z.string().max(1000).optional().nullable(),
  date: z.string().datetime().or(z.date()).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  status: z.enum(['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']).optional(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/**
 * Create payment schema
 */
export const createPaymentSchema = z.object({
  reference: z.string().max(50).optional(),
  date: z.string().datetime().or(z.date()),
  amount: z.number().min(0.01),
  currency: z.string().length(3).default('EUR'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'check', 'credit_card', 'other']),
  customerId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  invoiceAllocations: z.array(z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().min(0.01),
  })).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/**
 * Create bank account schema
 */
export const createBankAccountSchema = z.object({
  name: z.string().min(2).max(200),
  accountNumber: z.string().max(50).optional().nullable(),
  iban: z.string().max(50).optional().nullable(),
  swift: z.string().max(50).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  currency: z.string().length(3).default('EUR'),
  balance: z.number().default(0),
  accountId: z.string().uuid().optional().nullable(),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

/**
 * Update bank account schema
 */
export const updateBankAccountSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  accountNumber: z.string().max(50).optional().nullable(),
  iban: z.string().max(50).optional().nullable(),
  swift: z.string().max(50).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  active: z.boolean().optional(),
});

export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

/**
 * Report filters schema
 */
export const reportFiltersSchema = z.object({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  accountIds: z.array(z.string().uuid()).optional(),
});

export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;
