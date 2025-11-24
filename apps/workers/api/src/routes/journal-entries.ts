/**
 * Journal Entry Routes
 * Double-entry bookkeeping endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createJournalEntrySchema, postJournalEntrySchema } from '@perfex/shared';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { JournalEntryService } from '../services/journal-entry.service';

const journalEntries = new Hono<{ Bindings: Env }>();

// All routes require authentication
journalEntries.use('/*', authMiddleware);

/**
 * List journal entries
 * GET /journal-entries?journalId=xxx&status=draft&startDate=2024-01-01&endDate=2024-12-31&limit=50&offset=0
 */
journalEntries.get(
  '/',
  checkPermission('finance:journal_entries:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const journalId = c.req.query('journalId');
    const status = c.req.query('status');
    const startDateStr = c.req.query('startDate');
    const endDateStr = c.req.query('endDate');
    const limitStr = c.req.query('limit');
    const offsetStr = c.req.query('offset');

    const options: any = {};
    if (journalId) options.journalId = journalId;
    if (status) options.status = status;
    if (startDateStr) options.startDate = new Date(startDateStr);
    if (endDateStr) options.endDate = new Date(endDateStr);
    if (limitStr) options.limit = parseInt(limitStr, 10);
    if (offsetStr) options.offset = parseInt(offsetStr, 10);

    const journalEntryService = new JournalEntryService(c.env.DB);
    const entries = await journalEntryService.list(organizationId, options);

    return c.json({ data: entries });
  }
);

/**
 * Get journal entry by ID
 * GET /journal-entries/:id
 */
journalEntries.get(
  '/:id',
  checkPermission('finance:journal_entries:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const entryId = c.req.param('id');
    const journalEntryService = new JournalEntryService(c.env.DB);
    const entry = await journalEntryService.getById(entryId, organizationId);

    return c.json({ data: entry });
  }
);

/**
 * Create journal entry (draft)
 * POST /journal-entries
 */
journalEntries.post(
  '/',
  checkPermission('finance:journal_entries:create'),
  zValidator('json', createJournalEntrySchema),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const userId = c.get('userId');
    const data = c.req.valid('json');
    const journalEntryService = new JournalEntryService(c.env.DB);
    const entry = await journalEntryService.create(organizationId, userId, data);

    return c.json({ data: entry }, 201);
  }
);

/**
 * Post journal entry (make immutable)
 * POST /journal-entries/:id/post
 */
journalEntries.post(
  '/:id/post',
  checkPermission('finance:journal_entries:post'),
  zValidator('json', postJournalEntrySchema.optional()),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const entryId = c.req.param('id');
    const userId = c.get('userId');
    const data = c.req.valid('json');
    const journalEntryService = new JournalEntryService(c.env.DB);
    const entry = await journalEntryService.post(entryId, organizationId, userId, data);

    return c.json({ data: entry });
  }
);

/**
 * Cancel journal entry
 * POST /journal-entries/:id/cancel
 */
journalEntries.post(
  '/:id/cancel',
  checkPermission('finance:journal_entries:delete'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const entryId = c.req.param('id');
    const journalEntryService = new JournalEntryService(c.env.DB);
    const entry = await journalEntryService.cancel(entryId, organizationId);

    return c.json({ data: entry });
  }
);

/**
 * Delete journal entry (drafts only)
 * DELETE /journal-entries/:id
 */
journalEntries.delete(
  '/:id',
  checkPermission('finance:journal_entries:delete'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const entryId = c.req.param('id');
    const journalEntryService = new JournalEntryService(c.env.DB);
    await journalEntryService.delete(entryId, organizationId);

    return c.json({ data: { message: 'Journal entry deleted successfully' } });
  }
);

/**
 * Reverse journal entry (create reversal)
 * POST /journal-entries/:id/reverse
 */
journalEntries.post(
  '/:id/reverse',
  checkPermission('finance:journal_entries:create'),
  zValidator('json', z.object({
    reversalDate: z.string().datetime().or(z.date()).optional(),
  }).optional()),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const entryId = c.req.param('id');
    const userId = c.get('userId');
    const data = c.req.valid('json');
    const reversalDate = data?.reversalDate
      ? typeof data.reversalDate === 'string' ? new Date(data.reversalDate) : data.reversalDate
      : undefined;

    const journalEntryService = new JournalEntryService(c.env.DB);
    const reversalEntry = await journalEntryService.reverse(
      entryId,
      organizationId,
      userId,
      reversalDate
    );

    return c.json({ data: reversalEntry }, 201);
  }
);

export default journalEntries;
