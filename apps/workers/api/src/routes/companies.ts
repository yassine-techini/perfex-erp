/**
 * Companies Routes
 * /api/v1/companies
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createCompanySchema, updateCompanySchema } from '@perfex/shared';
import { companyService } from '../services/company.service';
import { requireAuth, requirePermission } from '../middleware/auth';
import type { Env } from '../types';

const companies = new Hono<{ Bindings: Env }>();

// All routes require authentication
companies.use('/*', requireAuth);

/**
 * GET /companies
 * List companies with optional filters
 */
companies.get(
  '/',
  requirePermission('crm:companies:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const type = c.req.query('type');
    const status = c.req.query('status');
    const assignedTo = c.req.query('assignedTo');
    const search = c.req.query('search');

    const filters = {
      type,
      status,
      assignedTo,
      search,
    };

    const result = await companyService.list(organizationId, filters);

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /companies/stats
 * Get company statistics
 */
companies.get(
  '/stats',
  requirePermission('crm:companies:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const stats = await companyService.getStats(organizationId);

    return c.json({
      success: true,
      data: stats,
    });
  }
);

/**
 * GET /companies/:id
 * Get a single company
 */
companies.get(
  '/:id',
  requirePermission('crm:companies:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const companyId = c.req.param('id');

    const company = await companyService.getById(organizationId, companyId);

    if (!company) {
      return c.json({ success: false, error: 'Company not found' }, 404);
    }

    return c.json({
      success: true,
      data: company,
    });
  }
);

/**
 * POST /companies
 * Create a new company
 */
companies.post(
  '/',
  requirePermission('crm:companies:create'),
  zValidator('json', createCompanySchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const userId = c.get('userId');
    const data = c.req.valid('json');

    const company = await companyService.create(organizationId, userId, data);

    return c.json({
      success: true,
      data: company,
    }, 201);
  }
);

/**
 * PUT /companies/:id
 * Update a company
 */
companies.put(
  '/:id',
  requirePermission('crm:companies:update'),
  zValidator('json', updateCompanySchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const companyId = c.req.param('id');
    const data = c.req.valid('json');

    const company = await companyService.update(organizationId, companyId, data);

    return c.json({
      success: true,
      data: company,
    });
  }
);

/**
 * DELETE /companies/:id
 * Delete a company
 */
companies.delete(
  '/:id',
  requirePermission('crm:companies:delete'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const companyId = c.req.param('id');

    await companyService.delete(organizationId, companyId);

    return c.json({
      success: true,
      data: { message: 'Company deleted successfully' },
    });
  }
);

export default companies;
