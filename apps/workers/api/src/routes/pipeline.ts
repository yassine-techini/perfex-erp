/**
 * Pipeline Routes
 * /api/v1/pipeline
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPipelineStageSchema, updatePipelineStageSchema } from '@perfex/shared';
import { pipelineService } from '../services/pipeline.service';
import { requireAuth, requirePermission } from '../middleware/auth';
import type { Env } from '../types';

const pipeline = new Hono<{ Bindings: Env }>();

// All routes require authentication
pipeline.use('/*', requireAuth);

/**
 * GET /pipeline
 * List pipeline stages
 */
pipeline.get(
  '/',
  requirePermission('crm:pipeline:read'),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    const activeOnly = c.req.query('active') === 'true';

    const stages = await pipelineService.list(organizationId, activeOnly);

    return c.json({
      success: true,
      data: stages,
    });
  }
);

/**
 * POST /pipeline/defaults
 * Create default pipeline stages
 */
pipeline.post(
  '/defaults',
  requirePermission('crm:pipeline:create'),
  async (c) => {
    const organizationId = c.get('organizationId')!;

    await pipelineService.createDefaults(organizationId);

    const stages = await pipelineService.list(organizationId);

    return c.json({
      success: true,
      data: stages,
    }, 201);
  }
);

/**
 * GET /pipeline/:id
 * Get a single pipeline stage
 */
pipeline.get(
  '/:id',
  requirePermission('crm:pipeline:read'),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    const stageId = c.req.param('id');

    const stage = await pipelineService.getById(organizationId, stageId);

    if (!stage) {
      return c.json({ success: false, error: 'Pipeline stage not found' }, 404);
    }

    return c.json({
      success: true,
      data: stage,
    });
  }
);

/**
 * POST /pipeline
 * Create a new pipeline stage
 */
pipeline.post(
  '/',
  requirePermission('crm:pipeline:create'),
  zValidator('json', createPipelineStageSchema),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    const data = c.req.valid('json');

    const stage = await pipelineService.create(organizationId, data);

    return c.json({
      success: true,
      data: stage,
    }, 201);
  }
);

/**
 * PUT /pipeline/:id
 * Update a pipeline stage
 */
pipeline.put(
  '/:id',
  requirePermission('crm:pipeline:update'),
  zValidator('json', updatePipelineStageSchema),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    const stageId = c.req.param('id');
    const data = c.req.valid('json');

    const stage = await pipelineService.update(organizationId, stageId, data);

    return c.json({
      success: true,
      data: stage,
    });
  }
);

/**
 * DELETE /pipeline/:id
 * Delete a pipeline stage
 */
pipeline.delete(
  '/:id',
  requirePermission('crm:pipeline:delete'),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    const stageId = c.req.param('id');

    await pipelineService.delete(organizationId, stageId);

    return c.json({
      success: true,
      data: { message: 'Pipeline stage deleted successfully' },
    });
  }
);

export default pipeline;
