/**
 * Journal Service
 * Journal management (sales, purchase, bank, cash, general)
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { journals, type Journal } from '@perfex/database';
import type { CreateJournalInput } from '@perfex/shared';

export class JournalService {
  constructor(private db: D1Database) {}

  /**
   * Create journal
   */
  async create(
    organizationId: string,
    data: CreateJournalInput
  ): Promise<Journal> {
    const drizzleDb = drizzle(this.db);

    // Check if code already exists
    const existing = await drizzleDb
      .select()
      .from(journals)
      .where(
        and(
          eq(journals.organizationId, organizationId),
          eq(journals.code, data.code)
        )
      )
      .get() as any;

    if (existing) {
      throw new Error('Journal code already exists');
    }

    // Create journal
    const journalId = crypto.randomUUID();
    const now = new Date();

    await drizzleDb.insert(journals).values({
      id: journalId,
      organizationId,
      code: data.code,
      name: data.name,
      type: data.type,
      active: true,
      createdAt: now,
    });

    const journal = await drizzleDb
      .select()
      .from(journals)
      .where(eq(journals.id, journalId))
      .get() as any;

    if (!journal) {
      throw new Error('Failed to create journal');
    }

    return journal as Journal;
  }

  /**
   * Get journals list
   */
  async list(
    organizationId: string,
    options?: { type?: string; active?: boolean }
  ): Promise<Journal[]> {
    const drizzleDb = drizzle(this.db);

    const journalsList = await drizzleDb
      .select()
      .from(journals)
      .where(eq(journals.organizationId, organizationId))
      .all() as any[];

    // Filter by type if provided
    let filtered = journalsList;
    if (options?.type) {
      filtered = filtered.filter(j => j.type === options.type);
    }
    if (options?.active !== undefined) {
      filtered = filtered.filter(j => j.active === options.active);
    }

    return filtered as Journal[];
  }

  /**
   * Get journal by ID
   */
  async getById(journalId: string, organizationId: string): Promise<Journal> {
    const drizzleDb = drizzle(this.db);

    const journal = await drizzleDb
      .select()
      .from(journals)
      .where(
        and(
          eq(journals.id, journalId),
          eq(journals.organizationId, organizationId)
        )
      )
      .get() as any;

    if (!journal) {
      throw new Error('Journal not found');
    }

    return journal as Journal;
  }

  /**
   * Update journal
   */
  async update(
    journalId: string,
    organizationId: string,
    data: { name?: string; active?: boolean }
  ): Promise<Journal> {
    const drizzleDb = drizzle(this.db);

    // Check if journal exists
    await this.getById(journalId, organizationId);

    await drizzleDb
      .update(journals)
      .set(data)
      .where(eq(journals.id, journalId));

    return this.getById(journalId, organizationId);
  }

  /**
   * Delete journal
   */
  async delete(journalId: string, organizationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    await this.getById(journalId, organizationId);

    // TODO: Check if journal is used in journal entries

    await drizzleDb
      .delete(journals)
      .where(eq(journals.id, journalId));
  }

  /**
   * Create default journals for organization
   */
  async createDefaults(organizationId: string): Promise<number> {
    const defaultJournals = [
      { code: 'GEN', name: 'Journal général', type: 'general' as const },
      { code: 'VEN', name: 'Journal des ventes', type: 'sales' as const },
      { code: 'ACH', name: 'Journal des achats', type: 'purchase' as const },
      { code: 'BQ', name: 'Journal de banque', type: 'bank' as const },
      { code: 'CAI', name: 'Journal de caisse', type: 'cash' as const },
    ];

    let count = 0;
    for (const journal of defaultJournals) {
      try {
        await this.create(organizationId, journal);
        count++;
      } catch (error) {
        // Skip if exists
      }
    }

    return count;
  }
}
