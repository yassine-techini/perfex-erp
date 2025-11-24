/**
 * Account Routes
 * Chart of accounts endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAccountSchema, updateAccountSchema } from '@perfex/shared';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { AccountService } from '../services/account.service';

const accounts = new Hono<{ Bindings: Env }>();

// All routes require authentication
accounts.use('/*', authMiddleware);

/**
 * Get accounts list
 * GET /accounts?type=asset&active=true
 */
accounts.get(
  '/',
  checkPermission('finance:accounts:read'),
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

    const accountService = new AccountService(c.env.DB);
    const accountsList = await accountService.list(organizationId, { type, active });

    return c.json({ data: accountsList });
  }
);

/**
 * Get account hierarchy
 * GET /accounts/hierarchy
 */
accounts.get(
  '/hierarchy',
  checkPermission('finance:accounts:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const accountService = new AccountService(c.env.DB);
    const hierarchy = await accountService.getHierarchy(organizationId);

    return c.json({ data: hierarchy });
  }
);

/**
 * Import chart of accounts template
 * POST /accounts/import/:template
 */
accounts.post(
  '/import/:template',
  checkPermission('finance:accounts:create'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const template = c.req.param('template');
    if (template !== 'french' && template !== 'syscohada') {
      return c.json(
        { error: { code: 'INVALID_TEMPLATE', message: 'Template must be "french" or "syscohada"' } },
        400
      );
    }

    const accountService = new AccountService(c.env.DB);
    const count = await accountService.importTemplate(organizationId, template);

    return c.json({ data: { count, message: `Imported ${count} accounts` } }, 201);
  }
);

/**
 * Get account by ID
 * GET /accounts/:id
 */
accounts.get(
  '/:id',
  checkPermission('finance:accounts:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const accountId = c.req.param('id');
    const accountService = new AccountService(c.env.DB);
    const account = await accountService.getById(accountId, organizationId);

    return c.json({ data: account });
  }
);

/**
 * Create account
 * POST /accounts
 */
accounts.post(
  '/',
  checkPermission('finance:accounts:create'),
  zValidator('json', createAccountSchema),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const data = c.req.valid('json');
    const accountService = new AccountService(c.env.DB);
    const account = await accountService.create(organizationId, data);

    return c.json({ data: account }, 201);
  }
);

/**
 * Update account
 * PUT /accounts/:id
 */
accounts.put(
  '/:id',
  checkPermission('finance:accounts:update'),
  zValidator('json', updateAccountSchema),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const accountId = c.req.param('id');
    const data = c.req.valid('json');
    const accountService = new AccountService(c.env.DB);
    const account = await accountService.update(accountId, organizationId, data);

    return c.json({ data: account });
  }
);

/**
 * Delete account
 * DELETE /accounts/:id
 */
accounts.delete(
  '/:id',
  checkPermission('finance:accounts:delete'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const accountId = c.req.param('id');
    const accountService = new AccountService(c.env.DB);
    await accountService.delete(accountId, organizationId);

    return c.json({ data: { message: 'Account deleted successfully' } });
  }
);

export default accounts;
