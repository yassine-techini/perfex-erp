/**
 * Journal Entry Service
 * Double-entry bookkeeping management
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import {
  journalEntries,
  journalEntryLines,
  journals,
  accounts,
  type JournalEntry,
  type JournalEntryLine,
} from '@perfex/database';
import type {
  CreateJournalEntryInput,
  PostJournalEntryInput,
  JournalEntryWithLines,
} from '@perfex/shared';

export class JournalEntryService {
  constructor(private db: D1Database) {}

  /**
   * Generate next reference number for journal
   */
  private async generateReference(
    organizationId: string,
    journalId: string
  ): Promise<string> {
    const drizzleDb = drizzle(this.db);

    // Get journal code
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

    // Get last entry for this journal
    const lastEntry = await drizzleDb
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.journalId, journalId),
          eq(journalEntries.organizationId, organizationId)
        )
      )
      .orderBy(desc(journalEntries.createdAt))
      .limit(1)
      .get() as any;

    // Extract number from last reference (e.g., "VEN-2024-001" -> 1)
    let nextNumber = 1;
    if (lastEntry?.reference) {
      const match = lastEntry.reference.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format: CODE-YYYY-NNN
    const year = new Date().getFullYear();
    const paddedNumber = String(nextNumber).padStart(3, '0');
    return `${journal.code}-${year}-${paddedNumber}`;
  }

  /**
   * Create journal entry (draft)
   */
  async create(
    organizationId: string,
    userId: string,
    data: CreateJournalEntryInput
  ): Promise<JournalEntryWithLines> {
    const drizzleDb = drizzle(this.db);

    // Validate journal exists
    const journal = await drizzleDb
      .select()
      .from(journals)
      .where(
        and(
          eq(journals.id, data.journalId),
          eq(journals.organizationId, organizationId)
        )
      )
      .get() as any;

    if (!journal) {
      throw new Error('Journal not found');
    }

    // Validate all accounts exist
    for (const line of data.lines) {
      const account = await drizzleDb
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, line.accountId),
            eq(accounts.organizationId, organizationId)
          )
        )
        .get() as any;

      if (!account) {
        throw new Error(`Account ${line.accountId} not found`);
      }
    }

    // Calculate totals
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);

    // Validate balance (already validated by Zod, but double-check)
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new Error('Total debits must equal total credits');
    }

    // Generate reference if not provided
    const reference = data.reference || await this.generateReference(organizationId, data.journalId);

    // Create entry
    const entryId = crypto.randomUUID();
    const now = new Date();
    const entryDate = typeof data.date === 'string' ? new Date(data.date) : data.date;

    await drizzleDb.insert(journalEntries).values({
      id: entryId,
      organizationId,
      journalId: data.journalId,
      reference,
      date: entryDate,
      description: data.description || null,
      status: 'draft',
      totalDebit,
      totalCredit,
      createdBy: userId,
      postedAt: null,
      postedBy: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create lines
    for (const line of data.lines) {
      const lineId = crypto.randomUUID();
      await drizzleDb.insert(journalEntryLines).values({
        id: lineId,
        entryId,
        accountId: line.accountId,
        label: line.label || null,
        debit: line.debit,
        credit: line.credit,
        reconciled: false,
        reconciledAt: null,
        createdAt: now,
      });
    }

    return this.getById(entryId, organizationId);
  }

  /**
   * Get journal entry by ID with lines
   */
  async getById(
    entryId: string,
    organizationId: string
  ): Promise<JournalEntryWithLines> {
    const drizzleDb = drizzle(this.db);

    const entry = await drizzleDb
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.id, entryId),
          eq(journalEntries.organizationId, organizationId)
        )
      )
      .get() as any;

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    // Get lines
    const lines = await drizzleDb
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.entryId, entryId))
      .all() as any[];

    // Get journal
    const journal = await drizzleDb
      .select()
      .from(journals)
      .where(eq(journals.id, entry.journalId))
      .get() as any;

    if (!journal) {
      throw new Error('Journal not found');
    }

    return {
      ...(entry as JournalEntry),
      lines: lines as JournalEntryLine[],
      journal: journal as any,
    };
  }

  /**
   * List journal entries
   */
  async list(
    organizationId: string,
    options?: {
      journalId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<JournalEntryWithLines[]> {
    const drizzleDb = drizzle(this.db);

    let query = drizzleDb
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.organizationId, organizationId))
      .orderBy(desc(journalEntries.date));

    const entriesList = await query.all() as any[];

    // Filter in memory (Drizzle with D1 has limited filtering capabilities)
    let filtered = entriesList;

    if (options?.journalId) {
      filtered = filtered.filter(e => e.journalId === options.journalId);
    }

    if (options?.status) {
      filtered = filtered.filter(e => e.status === options.status);
    }

    if (options?.startDate) {
      filtered = filtered.filter(e => new Date(e.date) >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(e => new Date(e.date) <= options.endDate!);
    }

    // Apply limit and offset
    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    // Get lines and journals for each entry
    const entriesWithLines: JournalEntryWithLines[] = [];
    for (const entry of filtered) {
      const entryWithLines = await this.getById(entry.id, organizationId);
      entriesWithLines.push(entryWithLines);
    }

    return entriesWithLines;
  }

  /**
   * Post journal entry (make immutable)
   */
  async post(
    entryId: string,
    organizationId: string,
    userId: string,
    data?: PostJournalEntryInput
  ): Promise<JournalEntryWithLines> {
    const drizzleDb = drizzle(this.db);

    // Get entry
    const entry = await this.getById(entryId, organizationId);

    if (entry.status === 'posted') {
      throw new Error('Journal entry is already posted');
    }

    if (entry.status === 'cancelled') {
      throw new Error('Cannot post cancelled journal entry');
    }

    // Update status to posted
    const postedAt = data?.date
      ? typeof data.date === 'string' ? new Date(data.date) : data.date
      : new Date();

    await drizzleDb
      .update(journalEntries)
      .set({
        status: 'posted',
        postedAt,
        postedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, entryId));

    return this.getById(entryId, organizationId);
  }

  /**
   * Cancel journal entry
   */
  async cancel(
    entryId: string,
    organizationId: string
  ): Promise<JournalEntryWithLines> {
    const drizzleDb = drizzle(this.db);

    // Get entry
    const entry = await this.getById(entryId, organizationId);

    if (entry.status === 'posted') {
      throw new Error('Cannot cancel posted journal entry. Create a reversal entry instead.');
    }

    if (entry.status === 'cancelled') {
      throw new Error('Journal entry is already cancelled');
    }

    // Update status to cancelled
    await drizzleDb
      .update(journalEntries)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, entryId));

    return this.getById(entryId, organizationId);
  }

  /**
   * Delete journal entry (only drafts)
   */
  async delete(entryId: string, organizationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    // Get entry
    const entry = await this.getById(entryId, organizationId);

    if (entry.status !== 'draft') {
      throw new Error('Can only delete draft journal entries');
    }

    // Delete lines first
    await drizzleDb
      .delete(journalEntryLines)
      .where(eq(journalEntryLines.entryId, entryId));

    // Delete entry
    await drizzleDb
      .delete(journalEntries)
      .where(eq(journalEntries.id, entryId));
  }

  /**
   * Create reversal entry for posted entry
   */
  async reverse(
    entryId: string,
    organizationId: string,
    userId: string,
    reversalDate?: Date
  ): Promise<JournalEntryWithLines> {
    // Get original entry
    const originalEntry = await this.getById(entryId, organizationId);

    if (originalEntry.status !== 'posted') {
      throw new Error('Can only reverse posted journal entries');
    }

    // Create reversal entry with inverted debits/credits
    const reversalLines = originalEntry.lines.map(line => ({
      accountId: line.accountId,
      label: line.label ? `Reversal: ${line.label}` : null,
      debit: line.credit, // Swap debit and credit
      credit: line.debit,
    }));

    const reversalData: CreateJournalEntryInput = {
      journalId: originalEntry.journalId,
      reference: undefined, // Will auto-generate
      date: reversalDate || new Date(),
      description: `Reversal of ${originalEntry.reference}`,
      lines: reversalLines,
    };

    return this.create(organizationId, userId, reversalData);
  }
}
