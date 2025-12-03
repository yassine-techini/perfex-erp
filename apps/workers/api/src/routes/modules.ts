/**
 * Module Management Routes
 * Manage which modules are enabled for an organization
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../index';
import { ModuleService } from '../services/module.service';
import { authMiddleware } from '../middleware/auth';

const modules = new Hono<{ Bindings: Env }>();

// All routes require authentication
modules.use('*', authMiddleware);

// Validation schemas
const updateModuleSchema = z.object({
  enabled: z.boolean(),
  settings: z.record(z.any()).optional(),
});

const bulkUpdateModulesSchema = z.object({
  modules: z.array(z.object({
    moduleId: z.string(),
    enabled: z.boolean(),
    settings: z.record(z.any()).optional(),
  })),
});

/**
 * GET /modules/registry
 * Get all available modules
 */
modules.get('/registry', async (c) => {
  try {
    const moduleService = new ModuleService(c.env.DB);
    const registry = await moduleService.getModuleRegistry();

    return c.json(registry);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get module registry';

    return c.json({
      error: {
        code: 'FETCH_FAILED',
        message,
      },
    }, 500);
  }
});

/**
 * GET /modules/organization/:orgId
 * Get modules for an organization (with enabled status)
 */
modules.get('/organization/:orgId', async (c) => {
  const orgId = c.req.param('orgId');

  try {
    const moduleService = new ModuleService(c.env.DB);
    const modules = await moduleService.getOrganizationModules(orgId);

    return c.json(modules);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get organization modules';

    return c.json({
      error: {
        code: 'FETCH_FAILED',
        message,
      },
    }, 500);
  }
});

/**
 * GET /modules/organization/:orgId/enabled
 * Get only enabled module IDs for an organization (optimized for navigation)
 */
modules.get('/organization/:orgId/enabled', async (c) => {
  const orgId = c.req.param('orgId');

  try {
    const moduleService = new ModuleService(c.env.DB);
    const enabledModules = await moduleService.getEnabledModuleIds(orgId);

    return c.json({ modules: enabledModules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get enabled modules';

    return c.json({
      error: {
        code: 'FETCH_FAILED',
        message,
      },
    }, 500);
  }
});

/**
 * PUT /modules/organization/:orgId/:moduleId
 * Enable or disable a module for an organization
 */
modules.put('/organization/:orgId/:moduleId', zValidator('json', updateModuleSchema), async (c) => {
  const userId = c.get('userId');
  const orgId = c.req.param('orgId');
  const moduleId = c.req.param('moduleId');
  const data = c.req.valid('json');

  try {
    const moduleService = new ModuleService(c.env.DB);
    const result = await moduleService.updateOrganizationModule(orgId, moduleId, {
      enabled: data.enabled,
      settings: data.settings,
      enabledBy: userId,
    });

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update module';

    return c.json({
      error: {
        code: 'UPDATE_FAILED',
        message,
      },
    }, 400);
  }
});

/**
 * PUT /modules/organization/:orgId
 * Bulk update modules for an organization
 */
modules.put('/organization/:orgId', zValidator('json', bulkUpdateModulesSchema), async (c) => {
  const userId = c.get('userId');
  const orgId = c.req.param('orgId');
  const data = c.req.valid('json');

  try {
    const moduleService = new ModuleService(c.env.DB);
    const results = await moduleService.bulkUpdateOrganizationModules(orgId, data.modules, userId);

    return c.json({ modules: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update modules';

    return c.json({
      error: {
        code: 'UPDATE_FAILED',
        message,
      },
    }, 400);
  }
});

/**
 * POST /modules/seed
 * Seed the module registry (admin only, run once)
 */
modules.post('/seed', async (c) => {
  try {
    const moduleService = new ModuleService(c.env.DB);
    await moduleService.seedModuleRegistry();

    return c.json({ message: 'Module registry seeded successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed module registry';

    return c.json({
      error: {
        code: 'SEED_FAILED',
        message,
      },
    }, 500);
  }
});

/**
 * POST /modules/organization/:orgId/initialize
 * Initialize modules for a new organization with defaults
 */
modules.post('/organization/:orgId/initialize', async (c) => {
  const userId = c.get('userId');
  const orgId = c.req.param('orgId');

  try {
    const moduleService = new ModuleService(c.env.DB);
    await moduleService.initializeOrganizationModules(orgId, userId);

    return c.json({ message: 'Organization modules initialized successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize modules';

    return c.json({
      error: {
        code: 'INIT_FAILED',
        message,
      },
    }, 500);
  }
});

export default modules;
