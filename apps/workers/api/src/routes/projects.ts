/**
 * Projects API Routes
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { projectService } from '../services/project.service';
import { logger } from '../utils/logger';
import { createProjectSchema, updateProjectSchema } from '@perfex/shared';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

/**
 * GET /projects
 * List all projects with optional filters
 */
app.get('/', requirePermissions('projects:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const companyId = c.req.query('companyId');
    const projectManagerId = c.req.query('projectManagerId');
    const search = c.req.query('search');

    const projects = await projectService.list(organizationId, {
      status,
      priority,
      companyId,
      projectManagerId,
      search,
    });

    return c.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'projects' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

/**
 * GET /projects/stats
 * Get project statistics
 */
app.get('/stats', requirePermissions('projects:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const stats = await projectService.getStats(organizationId);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'projects' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

/**
 * GET /projects/:id
 * Get single project by ID
 */
app.get('/:id', requirePermissions('projects:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const projectId = c.req.param('id');

    const project = await projectService.getById(organizationId, projectId);

    if (!project) {
      return c.json(
        {
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'projects' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

/**
 * POST /projects
 * Create new project
 */
app.post('/', requirePermissions('projects:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    // Validate input
    const validation = createProjectSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.errors,
          },
        },
        400
      );
    }

    const project = await projectService.create(organizationId, userId, validation.data);

    return c.json(
      {
        success: true,
        data: project,
      },
      201
    );
  } catch (error) {
    logger.error('Route error', error, { route: 'projects' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

/**
 * PUT /projects/:id
 * Update project
 */
app.put('/:id', requirePermissions('projects:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const projectId = c.req.param('id');
    const body = await c.req.json();

    // Validate input
    const validation = updateProjectSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.errors,
          },
        },
        400
      );
    }

    try {
      const project = await projectService.update(organizationId, projectId, validation.data);

      return c.json({
        success: true,
        data: project,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        return c.json(
          {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          },
          404
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error('Route error', error, { route: 'projects' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

/**
 * DELETE /projects/:id
 * Delete project
 */
app.delete('/:id', requirePermissions('projects:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const projectId = c.req.param('id');

    try {
      await projectService.delete(organizationId, projectId);

      return c.json({
        success: true,
        data: null,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        return c.json(
          {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          },
          404
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error('Route error', error, { route: 'projects' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

export default app;
