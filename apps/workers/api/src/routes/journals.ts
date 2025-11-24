/**
 * Journal Routes
 * Journal management endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createJournalSchema } from '@perfex/shared';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { JournalService } from '../services/journal.service';

const journals = new Hono<{ Bindings: Env }>();

// All routes require authentication
journals.use('/*', authMiddleware);

/**
 * Get journals list
 * GET /journals?type=sales&active=true
 */
journals.get(
  '/',
  checkPermission('finance:journals:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const type = c.req.query('type');
    const activeParam = c.req.query('active');
    const active = activeParam ? activeParam === 'true' : undefined;

    const journalService = new JournalService(c.env.DB);
    const journalsList = await journalService.list(organizationId, { type, active });

    return c.json({ data: journalsList });
  }
);

/**
 * Create default journals
 * POST /journals/defaults
 */
journals.post(
  '/defaults',
  checkPermission('finance:journals:create'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const journalService = new JournalService(c.env.DB);
    const count = await journalService.createDefaults(organizationId);

    return c.json({ data: { count, message: `Created ${count} default journals` } }, 201);
  }
);

/**
 * Get journal by ID
 * GET /journals/:id
 */
journals.get(
  '/:id',
  checkPermission('finance:journals:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const journalId = c.req.param('id');
    const journalService = new JournalService(c.env.DB);
    const journal = await journalService.getById(journalId, organizationId);

    return c.json({ data: journal });
  }
);

/**
 * Create journal
 * POST /journals
 */
journals.post(
  '/',
  checkPermission('finance:journals:create'),
  zValidator('json', createJournalSchema),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const data = c.req.valid('json');
    const journalService = new JournalService(c.env.DB);
    const journal = await journalService.create(organizationId, data);

    return c.json({ data: journal }, 201);
  }
);

/**
 * Update journal
 * PUT /journals/:id
 */
journals.put(
  '/:id',
  checkPermission('finance:journals:update'),
  zValidator('json', z.object({
    name: z.string().min(2).max(100).optional(),
    active: z.boolean().optional(),
  })),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const journalId = c.req.param('id');
    const data = c.req.valid('json');
    const journalService = new JournalService(c.env.DB);
    const journal = await journalService.update(journalId, organizationId, data);

    return c.json({ data: journal });
  }
);

/**
 * Delete journal
 * DELETE /journals/:id
 */
journals.delete(
  '/:id',
  checkPermission('finance:journals:delete'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const journalId = c.req.param('id');
    const journalService = new JournalService(c.env.DB);
    await journalService.delete(journalId, organizationId);

    return c.json({ data: { message: 'Journal deleted successfully' } });
  }
);

export default journals;
