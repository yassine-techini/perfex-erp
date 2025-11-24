/**
 * Opportunities Routes
 * /api/v1/opportunities
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createOpportunitySchema, updateOpportunitySchema } from '@perfex/shared';
import { opportunityService } from '../services/opportunity.service';
import { requireAuth, requirePermission } from '../middleware/auth';
import type { Env } from '../types';

const opportunities = new Hono<{ Bindings: Env }>();

// All routes require authentication
opportunities.use('/*', requireAuth);

/**
 * GET /opportunities
 * List opportunities with optional filters
 */
opportunities.get(
  '/',
  requirePermission('crm:opportunities:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const companyId = c.req.query('companyId');
    const stageId = c.req.query('stageId');
    const status = c.req.query('status');
    const assignedTo = c.req.query('assignedTo');
    const minValue = c.req.query('minValue');
    const maxValue = c.req.query('maxValue');

    const filters = {
      companyId,
      stageId,
      status,
      assignedTo,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
    };

    const result = await opportunityService.list(organizationId, filters);

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /opportunities/stats
 * Get opportunity statistics
 */
opportunities.get(
  '/stats',
  requirePermission('crm:opportunities:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const stats = await opportunityService.getStats(organizationId);

    return c.json({
      success: true,
      data: stats,
    });
  }
);

/**
 * GET /opportunities/:id
 * Get a single opportunity with details
 */
opportunities.get(
  '/:id',
  requirePermission('crm:opportunities:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const opportunityId = c.req.param('id');

    const opportunity = await opportunityService.getByIdWithDetails(organizationId, opportunityId);

    if (!opportunity) {
      return c.json({ success: false, error: 'Opportunity not found' }, 404);
    }

    return c.json({
      success: true,
      data: opportunity,
    });
  }
);

/**
 * POST /opportunities
 * Create a new opportunity
 */
opportunities.post(
  '/',
  requirePermission('crm:opportunities:create'),
  zValidator('json', createOpportunitySchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const userId = c.get('userId');
    const data = c.req.valid('json');

    const opportunity = await opportunityService.create(organizationId, userId, data);

    return c.json({
      success: true,
      data: opportunity,
    }, 201);
  }
);

/**
 * PUT /opportunities/:id
 * Update an opportunity
 */
opportunities.put(
  '/:id',
  requirePermission('crm:opportunities:update'),
  zValidator('json', updateOpportunitySchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const opportunityId = c.req.param('id');
    const data = c.req.valid('json');

    const opportunity = await opportunityService.update(organizationId, opportunityId, data);

    return c.json({
      success: true,
      data: opportunity,
    });
  }
);

/**
 * DELETE /opportunities/:id
 * Delete an opportunity
 */
opportunities.delete(
  '/:id',
  requirePermission('crm:opportunities:delete'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const opportunityId = c.req.param('id');

    await opportunityService.delete(organizationId, opportunityId);

    return c.json({
      success: true,
      data: { message: 'Opportunity deleted successfully' },
    });
  }
);

export default opportunities;
