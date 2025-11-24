/**
 * Finance types
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type JournalType = 'general' | 'sales' | 'purchase' | 'bank' | 'cash';
export type JournalEntryStatus = 'draft' | 'posted' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other';
export type TaxRateType = 'sales' | 'purchase' | 'both';
export type FiscalYearStatus = 'open' | 'closed';

/**
 * Account (Chart of Accounts)
 */
export interface Account {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  currency: string;
  active: boolean;
  system: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Account with balance
 */
export interface AccountWithBalance extends Account {
  balance: number;
  debitTotal: number;
  creditTotal: number;
}

/**
 * Journal
 */
export interface Journal {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: JournalType;
  active: boolean;
  createdAt: Date;
}

/**
 * Journal Entry
 */
export interface JournalEntry {
  id: string;
  organizationId: string;
  journalId: string;
  reference: string;
  date: Date;
  description: string | null;
  status: JournalEntryStatus;
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  postedAt: Date | null;
  postedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Journal Entry Line
 */
export interface JournalEntryLine {
  id: string;
  entryId: string;
  accountId: string;
  label: string | null;
  debit: number;
  credit: number;
  reconciled: boolean;
  reconciledAt: Date | null;
  createdAt: Date;
}

/**
 * Journal Entry with Lines
 */
export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
  journal: Journal;
}

/**
 * Tax Rate
 */
export interface TaxRate {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  rate: number;
  type: TaxRateType;
  accountId: string | null;
  active: boolean;
  createdAt: Date;
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  organizationId: string;
  number: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  date: Date;
  dueDate: Date;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  pdfUrl: string | null;
  journalEntryId: string | null;
  createdBy: string;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice Line
 */
export interface InvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId: string | null;
  taxRate: number;
  taxAmount: number;
  total: number;
  accountId: string | null;
  createdAt: Date;
}

/**
 * Invoice with Lines
 */
export interface InvoiceWithLines extends Invoice {
  lines: InvoiceLine[];
}

/**
 * Payment
 */
export interface Payment {
  id: string;
  organizationId: string;
  reference: string;
  date: Date;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  customerId: string | null;
  supplierId: string | null;
  accountId: string | null;
  journalEntryId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

/**
 * Payment Allocation
 */
export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  createdAt: Date;
}

/**
 * Bank Account
 */
export interface BankAccount {
  id: string;
  organizationId: string;
  name: string;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  bankName: string | null;
  currency: string;
  balance: number;
  accountId: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trial Balance Entry
 */
export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * General Ledger Entry
 */
export interface GeneralLedgerEntry {
  date: Date;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}
