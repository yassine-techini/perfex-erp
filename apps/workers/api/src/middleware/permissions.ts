// Permission middleware for role-based access control
import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

/**
 * Middleware to check if user has required permissions
 * For now, all authenticated users have all permissions (development mode)
 */
export const requirePermissions = (requiredPermissions: string[] | string) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          success: false,
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
    return next();
  });
};

/**
 * Middleware to check if user has any of the required permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    // Admin users have all permissions
    if (user.role === 'admin') {
      return next();
    }

    // Check if user has any of the required permissions
    const userPermissions = user.permissions || [];
    const hasAnyPermission = permissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            details: {
              required: permissions,
            },
          },
        },
        403
      );
    }

    return next();
  });
};

/**
 * Middleware to check if user has a specific role
 */
export const requireRole = (role: string) => {
  return createMiddleware(async (c: Context, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    if (user.role !== role && user.role !== 'admin') {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Role '${role}' required`,
          },
        },
        403
      );
    }

    return next();
  });
};
