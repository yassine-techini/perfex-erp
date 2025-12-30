/**
 * Report Service
 * Financial reports (General Ledger, Trial Balance, Balance Sheet, Income Statement)
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  accounts,
  journalEntries,
  journalEntryLines,
  type Account,
} from '@perfex/database';
import type { ReportFiltersInput, TrialBalanceEntry, GeneralLedgerEntry } from '@perfex/shared';

export class ReportService {
  constructor(private db: D1Database) {}

  /**
   * Generate General Ledger for an account
   * Shows all posted journal entry lines for a specific account
   */
  async getGeneralLedger(
    organizationId: string,
    accountId: string,
    filters: ReportFiltersInput
  ): Promise<GeneralLedgerEntry[]> {
    const drizzleDb = drizzle(this.db);

    // Verify account exists
    const account = await drizzleDb
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, accountId),
          eq(accounts.organizationId, organizationId)
        )
      )
      .get() as any;

    if (!account) {
      throw new Error('Account not found');
    }

    const startDate = typeof filters.startDate === 'string' ? new Date(filters.startDate) : filters.startDate;
    const endDate = typeof filters.endDate === 'string' ? new Date(filters.endDate) : filters.endDate;

    // Get all posted journal entries within date range
    const entries = await drizzleDb
      .select({
        entryId: journalEntries.id,
        date: journalEntries.date,
        reference: journalEntries.reference,
        description: journalEntries.description,
        lineLabel: journalEntryLines.label,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
      })
      .from(journalEntries)
      .innerJoin(journalEntryLines, eq(journalEntries.id, journalEntryLines.entryId))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.status, 'posted'),
          eq(journalEntryLines.accountId, accountId),
          gte(journalEntries.date, startDate),
          lte(journalEntries.date, endDate)
        )
      )
      .orderBy(journalEntries.date)
      .all() as any[];

    // Calculate running balance
    let balance = 0;
    const ledgerEntries: GeneralLedgerEntry[] = entries.map((entry) => {
      // For asset and expense accounts: debit increases, credit decreases
      // For liability, equity, and revenue accounts: credit increases, debit decreases
      if (account.type === 'asset' || account.type === 'expense') {
        balance += entry.debit - entry.credit;
      } else {
        balance += entry.credit - entry.debit;
      }

      return {
        date: entry.date,
        reference: entry.reference,
        description: entry.lineLabel || entry.description || '',
        debit: entry.debit,
        credit: entry.credit,
        balance,
      };
    });

    return ledgerEntries;
  }

  /**
   * Generate Trial Balance
   * Shows all accounts with their debit/credit totals and balances
   */
  async getTrialBalance(
    organizationId: string,
    filters: ReportFiltersInput
  ): Promise<TrialBalanceEntry[]> {
    const drizzleDb = drizzle(this.db);

    const startDate = typeof filters.startDate === 'string' ? new Date(filters.startDate) : filters.startDate;
    const endDate = typeof filters.endDate === 'string' ? new Date(filters.endDate) : filters.endDate;

    // Get all accounts
    let accountsQuery = drizzleDb
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.organizationId, organizationId),
          eq(accounts.active, true)
        )
      );

    // Filter by account IDs if provided
    if (filters.accountIds && filters.accountIds.length > 0) {
      // Note: Drizzle with D1 doesn't support inArray, so we'll filter in memory
    }

    const accountsList = await accountsQuery.all() as any[];

    // Calculate totals for each account
    const trialBalance: TrialBalanceEntry[] = [];

    for (const account of accountsList) {
      // Skip if accountIds filter is provided and account is not in list
      if (filters.accountIds && filters.accountIds.length > 0 && !filters.accountIds.includes(account.id)) {
        continue;
      }

      // Get all posted journal entry lines for this account within date range
      const lines = await drizzleDb
        .select({
          debit: journalEntryLines.debit,
          credit: journalEntryLines.credit,
        })
        .from(journalEntries)
        .innerJoin(journalEntryLines, eq(journalEntries.id, journalEntryLines.entryId))
        .where(
          and(
            eq(journalEntries.organizationId, organizationId),
            eq(journalEntries.status, 'posted'),
            eq(journalEntryLines.accountId, account.id),
            gte(journalEntries.date, startDate),
            lte(journalEntries.date, endDate)
          )
        )
        .all() as any[];

      // Calculate totals
      const debit = lines.reduce((sum, line) => sum + line.debit, 0);
      const credit = lines.reduce((sum, line) => sum + line.credit, 0);

      // Calculate balance based on account type
      let balance: number;
      if (account.type === 'asset' || account.type === 'expense') {
        balance = debit - credit; // Normal debit balance
      } else {
        balance = credit - debit; // Normal credit balance
      }

      // Only include accounts with activity
      if (debit !== 0 || credit !== 0) {
        trialBalance.push({
          accountCode: account.code,
          accountName: account.name,
          debit,
          credit,
          balance,
        });
      }
    }

    // Sort by account code
    return trialBalance.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  /**
   * Generate Balance Sheet
   * Shows assets, liabilities, and equity at a specific date
   */
  async getBalanceSheet(
    organizationId: string,
    asOfDate: Date
  ): Promise<{
    assets: TrialBalanceEntry[];
    liabilities: TrialBalanceEntry[];
    equity: TrialBalanceEntry[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }> {
    const drizzleDb = drizzle(this.db);

    const date = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;

    // Get all active accounts
    const accountsList = await drizzleDb
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.organizationId, organizationId),
          eq(accounts.active, true)
        )
      )
      .all() as any[];

    const assets: TrialBalanceEntry[] = [];
    const liabilities: TrialBalanceEntry[] = [];
    const equity: TrialBalanceEntry[] = [];

    for (const account of accountsList) {
      // Get all posted journal entry lines for this account up to the date
      const lines = await drizzleDb
        .select({
          debit: journalEntryLines.debit,
          credit: journalEntryLines.credit,
        })
        .from(journalEntries)
        .innerJoin(journalEntryLines, eq(journalEntries.id, journalEntryLines.entryId))
        .where(
          and(
            eq(journalEntries.organizationId, organizationId),
            eq(journalEntries.status, 'posted'),
            eq(journalEntryLines.accountId, account.id),
            lte(journalEntries.date, date)
          )
        )
        .all() as any[];

      const debit = lines.reduce((sum, line) => sum + line.debit, 0);
      const credit = lines.reduce((sum, line) => sum + line.credit, 0);
      const balance = debit - credit;

      // Only include accounts with balance
      if (Math.abs(balance) >= 0.01) {
        const entry: TrialBalanceEntry = {
          accountCode: account.code,
          accountName: account.name,
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? -balance : 0,
          balance: Math.abs(balance),
        };

        if (account.type === 'asset') {
          assets.push(entry);
        } else if (account.type === 'liability') {
          liabilities.push(entry);
        } else if (account.type === 'equity') {
          equity.push(entry);
        }
      }
    }

    // Calculate totals
    const totalAssets = assets.reduce((sum, entry) => sum + entry.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, entry) => sum + entry.balance, 0);
    const totalEquity = equity.reduce((sum, entry) => sum + entry.balance, 0);

    return {
      assets: assets.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      liabilities: liabilities.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      equity: equity.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }

  /**
   * Generate Income Statement (Profit & Loss)
   * Shows revenue and expenses for a period
   */
  async getIncomeStatement(
    organizationId: string,
    filters: ReportFiltersInput
  ): Promise<{
    revenue: TrialBalanceEntry[];
    expenses: TrialBalanceEntry[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }> {
    const drizzleDb = drizzle(this.db);

    const startDate = typeof filters.startDate === 'string' ? new Date(filters.startDate) : filters.startDate;
    const endDate = typeof filters.endDate === 'string' ? new Date(filters.endDate) : filters.endDate;

    // Get all revenue and expense accounts
    const accountsList = await drizzleDb
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.organizationId, organizationId),
          eq(accounts.active, true)
        )
      )
      .all() as any[];

    const revenue: TrialBalanceEntry[] = [];
    const expenses: TrialBalanceEntry[] = [];

    for (const account of accountsList) {
      // Only process revenue and expense accounts
      if (account.type !== 'revenue' && account.type !== 'expense') {
        continue;
      }

      // Get all posted journal entry lines for this account within date range
      const lines = await drizzleDb
        .select({
          debit: journalEntryLines.debit,
          credit: journalEntryLines.credit,
        })
        .from(journalEntries)
        .innerJoin(journalEntryLines, eq(journalEntries.id, journalEntryLines.entryId))
        .where(
          and(
            eq(journalEntries.organizationId, organizationId),
            eq(journalEntries.status, 'posted'),
            eq(journalEntryLines.accountId, account.id),
            gte(journalEntries.date, startDate),
            lte(journalEntries.date, endDate)
          )
        )
        .all() as any[];

      const debit = lines.reduce((sum, line) => sum + line.debit, 0);
      const credit = lines.reduce((sum, line) => sum + line.credit, 0);

      // Revenue: credit increases (normal credit balance)
      // Expenses: debit increases (normal debit balance)
      const balance = account.type === 'revenue' ? credit - debit : debit - credit;

      // Only include accounts with activity
      if (Math.abs(balance) >= 0.01) {
        const entry: TrialBalanceEntry = {
          accountCode: account.code,
          accountName: account.name,
          debit: account.type === 'expense' ? balance : 0,
          credit: account.type === 'revenue' ? balance : 0,
          balance: Math.abs(balance),
        };

        if (account.type === 'revenue') {
          revenue.push(entry);
        } else {
          expenses.push(entry);
        }
      }
    }

    // Calculate totals
    const totalRevenue = revenue.reduce((sum, entry) => sum + entry.balance, 0);
    const totalExpenses = expenses.reduce((sum, entry) => sum + entry.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      revenue: revenue.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      expenses: expenses.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      totalRevenue,
      totalExpenses,
      netIncome,
    };
  }
}
