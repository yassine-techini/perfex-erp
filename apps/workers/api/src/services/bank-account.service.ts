/**
 * Bank Account Service
 * Bank account management and reconciliation
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { bankAccounts, accounts, type BankAccount } from '@perfex/database';
import type { CreateBankAccountInput, UpdateBankAccountInput } from '@perfex/shared';

export class BankAccountService {
  constructor(private db: D1Database) {}

  /**
   * Create bank account
   */
  async create(
    organizationId: string,
    data: CreateBankAccountInput
  ): Promise<BankAccount> {
    const drizzleDb = drizzle(this.db);

    // Validate linked account if provided
    if (data.accountId) {
      const account = await drizzleDb
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, data.accountId),
            eq(accounts.organizationId, organizationId)
          )
        )
        .get();

      if (!account) {
        throw new Error('Linked account not found');
      }

      // Ensure account is of type asset (bank accounts are assets)
      if (account.type !== 'asset') {
        throw new Error('Linked account must be of type asset');
      }
    }

    // Create bank account
    const bankAccountId = crypto.randomUUID();
    const now = new Date();

    await drizzleDb.insert(bankAccounts).values({
      id: bankAccountId,
      organizationId,
      name: data.name,
      accountNumber: data.accountNumber || null,
      iban: data.iban || null,
      swift: data.swift || null,
      bankName: data.bankName || null,
      currency: data.currency || 'EUR',
      balance: data.balance || 0,
      accountId: data.accountId || null,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const bankAccount = await drizzleDb
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId))
      .get();

    if (!bankAccount) {
      throw new Error('Failed to create bank account');
    }

    return bankAccount as BankAccount;
  }

  /**
   * Get bank accounts list
   */
  async list(
    organizationId: string,
    options?: { active?: boolean }
  ): Promise<BankAccount[]> {
    const drizzleDb = drizzle(this.db);

    const bankAccountsList = await drizzleDb
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.organizationId, organizationId))
      .all();

    // Filter by active if provided
    let filtered = bankAccountsList;
    if (options?.active !== undefined) {
      filtered = filtered.filter(ba => ba.active === options.active);
    }

    return filtered as BankAccount[];
  }

  /**
   * Get bank account by ID
   */
  async getById(bankAccountId: string, organizationId: string): Promise<BankAccount> {
    const drizzleDb = drizzle(this.db);

    const bankAccount = await drizzleDb
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, bankAccountId),
          eq(bankAccounts.organizationId, organizationId)
        )
      )
      .get();

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    return bankAccount as BankAccount;
  }

  /**
   * Update bank account
   */
  async update(
    bankAccountId: string,
    organizationId: string,
    data: UpdateBankAccountInput
  ): Promise<BankAccount> {
    const drizzleDb = drizzle(this.db);

    // Check if bank account exists
    await this.getById(bankAccountId, organizationId);

    await drizzleDb
      .update(bankAccounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, bankAccountId));

    return this.getById(bankAccountId, organizationId);
  }

  /**
   * Update bank account balance
   */
  async updateBalance(
    bankAccountId: string,
    organizationId: string,
    balance: number
  ): Promise<BankAccount> {
    const drizzleDb = drizzle(this.db);

    // Check if bank account exists
    await this.getById(bankAccountId, organizationId);

    await drizzleDb
      .update(bankAccounts)
      .set({
        balance,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, bankAccountId));

    return this.getById(bankAccountId, organizationId);
  }

  /**
   * Delete bank account
   */
  async delete(bankAccountId: string, organizationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    await this.getById(bankAccountId, organizationId);

    // TODO: Check if bank account is used in journal entries or payments

    await drizzleDb
      .delete(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));
  }
}
