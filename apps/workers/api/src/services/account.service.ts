/**
 * Account Service
 * Chart of accounts management
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, isNull } from 'drizzle-orm';
import { accounts, type Account } from '@perfex/database';
import type { CreateAccountInput, UpdateAccountInput, AccountWithBalance } from '@perfex/shared';

export class AccountService {
  constructor(private db: D1Database) {}

  /**
   * Create account
   */
  async create(
    organizationId: string,
    data: CreateAccountInput
  ): Promise<Account> {
    const drizzleDb = drizzle(this.db);

    // Check if code already exists
    const existing = await drizzleDb
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.organizationId, organizationId),
          eq(accounts.code, data.code)
        )
      )
      .get();

    if (existing) {
      throw new Error('Account code already exists');
    }

    // Create account
    const accountId = crypto.randomUUID();
    const now = new Date();

    await drizzleDb.insert(accounts).values({
      id: accountId,
      organizationId,
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      currency: data.currency || 'EUR',
      active: true,
      system: false,
      createdAt: now,
      updatedAt: now,
    });

    const account = await drizzleDb
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .get();

    if (!account) {
      throw new Error('Failed to create account');
    }

    return account as Account;
  }

  /**
   * Get accounts list
   */
  async list(
    organizationId: string,
    options?: { type?: string; active?: boolean }
  ): Promise<Account[]> {
    const drizzleDb = drizzle(this.db);

    let query = drizzleDb
      .select()
      .from(accounts)
      .where(eq(accounts.organizationId, organizationId));

    const accountsList = await query.all();

    // Filter by type if provided
    let filtered = accountsList;
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }
    if (options?.active !== undefined) {
      filtered = filtered.filter(a => a.active === options.active);
    }

    return filtered as Account[];
  }

  /**
   * Get account by ID
   */
  async getById(accountId: string, organizationId: string): Promise<Account> {
    const drizzleDb = drizzle(this.db);

    const account = await drizzleDb
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, accountId),
          eq(accounts.organizationId, organizationId)
        )
      )
      .get();

    if (!account) {
      throw new Error('Account not found');
    }

    return account as Account;
  }

  /**
   * Update account
   */
  async update(
    accountId: string,
    organizationId: string,
    data: UpdateAccountInput
  ): Promise<Account> {
    const drizzleDb = drizzle(this.db);

    // Check if account exists and is not system
    const account = await this.getById(accountId, organizationId);

    if (account.system) {
      throw new Error('Cannot update system account');
    }

    await drizzleDb
      .update(accounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId));

    return this.getById(accountId, organizationId);
  }

  /**
   * Delete account
   */
  async delete(accountId: string, organizationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    const account = await this.getById(accountId, organizationId);

    if (account.system) {
      throw new Error('Cannot delete system account');
    }

    // TODO: Check if account is used in journal entries

    await drizzleDb
      .delete(accounts)
      .where(eq(accounts.id, accountId));
  }

  /**
   * Get account hierarchy (parent-child)
   */
  async getHierarchy(organizationId: string): Promise<Account[]> {
    const allAccounts = await this.list(organizationId);

    // Sort by code for hierarchical display
    return allAccounts.sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * Import chart of accounts template
   */
  async importTemplate(
    organizationId: string,
    template: 'french' | 'syscohada'
  ): Promise<number> {
    // TODO: Load template data and bulk insert
    // For now, just create a few basic accounts

    const basicAccounts = [
      { code: '10000', name: 'Capital', type: 'equity' as const },
      { code: '40000', name: 'Fournisseurs', type: 'liability' as const },
      { code: '41000', name: 'Clients', type: 'asset' as const },
      { code: '51200', name: 'Banque', type: 'asset' as const },
      { code: '53000', name: 'Caisse', type: 'asset' as const },
      { code: '60000', name: 'Achats', type: 'expense' as const },
      { code: '70000', name: 'Ventes', type: 'revenue' as const },
    ];

    let count = 0;
    for (const acc of basicAccounts) {
      try {
        await this.create(organizationId, {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          currency: 'EUR',
        });
        count++;
      } catch (error) {
        // Skip if exists
      }
    }

    return count;
  }
}
