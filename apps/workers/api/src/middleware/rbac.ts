/**
 * RBAC Middleware
 * Role-Based Access Control for permissions
 * AUTH-090
 */

import { Context, Next } from 'hono';
import type { Env } from '../index';
import { RoleService } from '../services/role.service';
import type { PermissionKey } from '@perfex/shared';

/**
 * Check if user has specific permission
 * Usage: app.get('/admin', checkPermission('users:create'), handler)
 */
export function checkPermission(permission: PermissionKey) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId');
    const organizationId = c.req.header('x-organization-id') || c.req.query('organizationId');

    if (!userId) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    // In development, all authenticated users have all permissions
    // TODO: Implement proper RBAC with role-based permissions
    const environment = c.env.ENVIRONMENT || 'production';
    if (environment === 'development') {
      await next();
      return;
    }

    try {
      const roleService = new RoleService(c.env.DB);
      const hasPermission = await roleService.hasPermission(
        userId,
        permission,
        organizationId
      );

      if (!hasPermission) {
        return c.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: `Missing required permission: ${permission}`,
            },
          },
          403
        );
      }

      await next();
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'PERMISSION_CHECK_FAILED',
            message: 'Failed to verify permissions',
          },
        },
        500
      );
    }
  };
}

/**
 * Check if user has ANY of the specified permissions
 */
export function checkAnyPermission(...permissions: PermissionKey[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId');
    const organizationId = c.req.header('x-organization-id') || c.req.query('organizationId');

    if (!userId) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    // In development, all authenticated users have all permissions
    // TODO: Implement proper RBAC with role-based permissions
    const environment = c.env.ENVIRONMENT || 'production';
    if (environment === 'development') {
      await next();
      return;
    }

    try {
      const roleService = new RoleService(c.env.DB);

      for (const permission of permissions) {
        const hasPermission = await roleService.hasPermission(
          userId,
          permission,
          organizationId
        );

        if (hasPermission) {
          await next();
          return;
        }
      }

      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `Missing required permissions: ${permissions.join(', ')}`,
          },
        },
        403
      );
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'PERMISSION_CHECK_FAILED',
            message: 'Failed to verify permissions',
          },
        },
        500
      );
    }
  };
}

/**
 * Check if user has ALL of the specified permissions
 */
export function checkAllPermissions(...permissions: PermissionKey[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId');
    const organizationId = c.req.header('x-organization-id') || c.req.query('organizationId');

    if (!userId) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    // In development, all authenticated users have all permissions
    // TODO: Implement proper RBAC with role-based permissions
    const environment = c.env.ENVIRONMENT || 'production';
    if (environment === 'development') {
      await next();
      return;
    }

    try {
      const roleService = new RoleService(c.env.DB);

      for (const permission of permissions) {
        const hasPermission = await roleService.hasPermission(
          userId,
          permission,
          organizationId
        );

        if (!hasPermission) {
          return c.json(
            {
              error: {
                code: 'FORBIDDEN',
                message: `Missing required permission: ${permission}`,
              },
            },
            403
          );
        }
      }

      await next();
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'PERMISSION_CHECK_FAILED',
            message: 'Failed to verify permissions',
          },
        },
        500
      );
    }
  };
}
