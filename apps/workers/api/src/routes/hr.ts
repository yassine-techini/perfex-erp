/**
 * HR API Routes
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { hrService } from '../services/hr.service';
import { logger } from '../utils/logger';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
} from '@perfex/shared';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// ============================================
// DEPARTMENTS
// ============================================

/**
 * GET /hr/departments
 * List all departments
 */
app.get('/departments', requirePermissions('hr:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const active = c.req.query('active');

    const departments = await hrService.listDepartments(organizationId, { active });

    return c.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * GET /hr/departments/:id
 * Get single department by ID
 */
app.get('/departments/:id', requirePermissions('hr:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const departmentId = c.req.param('id');

    const department = await hrService.getDepartmentById(organizationId, departmentId);

    if (!department) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DEPARTMENT_NOT_FOUND',
            message: 'Department not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: department,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * POST /hr/departments
 * Create new department
 */
app.post('/departments', requirePermissions('hr:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createDepartmentSchema.safeParse(body);
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

    const department = await hrService.createDepartment(organizationId, userId, validation.data);

    return c.json(
      {
        success: true,
        data: department,
      },
      201
    );
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * PUT /hr/departments/:id
 * Update department
 */
app.put('/departments/:id', requirePermissions('hr:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const departmentId = c.req.param('id');
    const body = await c.req.json();

    const validation = updateDepartmentSchema.safeParse(body);
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

    const department = await hrService.updateDepartment(organizationId, departmentId, validation.data);

    return c.json({
      success: true,
      data: department,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Department not found') {
      return c.json(
        {
          success: false,
          error: {
            code: 'DEPARTMENT_NOT_FOUND',
            message: 'Department not found',
          },
        },
        404
      );
    }
    logger.error('Route error', error, { route: 'hr' });
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
 * DELETE /hr/departments/:id
 * Delete department
 */
app.delete('/departments/:id', requirePermissions('hr:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const departmentId = c.req.param('id');

    await hrService.deleteDepartment(organizationId, departmentId);

    return c.json({
      success: true,
      data: null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Department not found') {
      return c.json(
        {
          success: false,
          error: {
            code: 'DEPARTMENT_NOT_FOUND',
            message: 'Department not found',
          },
        },
        404
      );
    }
    logger.error('Route error', error, { route: 'hr' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

// ============================================
// EMPLOYEES
// ============================================

/**
 * GET /hr/employees
 * List all employees
 */
app.get('/employees', requirePermissions('hr:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const departmentId = c.req.query('departmentId');
    const employmentType = c.req.query('employmentType');
    const active = c.req.query('active');
    const search = c.req.query('search');

    const employees = await hrService.listEmployees(organizationId, {
      departmentId,
      employmentType,
      active,
      search,
    });

    return c.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * GET /hr/employees/stats
 * Get HR statistics
 */
app.get('/employees/stats', requirePermissions('hr:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const stats = await hrService.getStats(organizationId);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * GET /hr/employees/:id
 * Get single employee by ID
 */
app.get('/employees/:id', requirePermissions('hr:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const employeeId = c.req.param('id');

    const employee = await hrService.getEmployeeById(organizationId, employeeId);

    if (!employee) {
      return c.json(
        {
          success: false,
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * POST /hr/employees
 * Create new employee
 */
app.post('/employees', requirePermissions('hr:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createEmployeeSchema.safeParse(body);
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

    const employee = await hrService.createEmployee(organizationId, userId, validation.data);

    return c.json(
      {
        success: true,
        data: employee,
      },
      201
    );
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * PUT /hr/employees/:id
 * Update employee
 */
app.put('/employees/:id', requirePermissions('hr:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const employeeId = c.req.param('id');
    const body = await c.req.json();

    const validation = updateEmployeeSchema.safeParse(body);
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

    const employee = await hrService.updateEmployee(organizationId, employeeId, validation.data);

    return c.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Employee not found') {
      return c.json(
        {
          success: false,
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
          },
        },
        404
      );
    }
    logger.error('Route error', error, { route: 'hr' });
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
 * DELETE /hr/employees/:id
 * Delete employee
 */
app.delete('/employees/:id', requirePermissions('hr:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const employeeId = c.req.param('id');

    await hrService.deleteEmployee(organizationId, employeeId);

    return c.json({
      success: true,
      data: null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Employee not found') {
      return c.json(
        {
          success: false,
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
          },
        },
        404
      );
    }
    logger.error('Route error', error, { route: 'hr' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

// ============================================
// LEAVE REQUESTS
// ============================================

/**
 * GET /hr/leave-requests
 * List all leave requests
 */
app.get('/leave-requests', requirePermissions('hr:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const employeeId = c.req.query('employeeId');
    const status = c.req.query('status');
    const leaveType = c.req.query('leaveType');

    const leaveRequests = await hrService.listLeaveRequests(organizationId, {
      employeeId,
      status,
      leaveType,
    });

    return c.json({
      success: true,
      data: leaveRequests,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * GET /hr/leave-requests/:id
 * Get single leave request by ID
 */
app.get('/leave-requests/:id', requirePermissions('hr:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const leaveRequestId = c.req.param('id');

    const leaveRequest = await hrService.getLeaveRequestById(organizationId, leaveRequestId);

    if (!leaveRequest) {
      return c.json(
        {
          success: false,
          error: {
            code: 'LEAVE_REQUEST_NOT_FOUND',
            message: 'Leave request not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: leaveRequest,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * POST /hr/leave-requests
 * Create new leave request
 */
app.post('/leave-requests', requirePermissions('hr:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createLeaveRequestSchema.safeParse(body);
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

    const leaveRequest = await hrService.createLeaveRequest(organizationId, userId, validation.data);

    return c.json(
      {
        success: true,
        data: leaveRequest,
      },
      201
    );
  } catch (error) {
    logger.error('Route error', error, { route: 'hr' });
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
 * PUT /hr/leave-requests/:id
 * Update leave request
 */
app.put('/leave-requests/:id', requirePermissions('hr:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const leaveRequestId = c.req.param('id');
    const body = await c.req.json();

    const validation = updateLeaveRequestSchema.safeParse(body);
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

    const leaveRequest = await hrService.updateLeaveRequest(organizationId, leaveRequestId, userId, validation.data);

    return c.json({
      success: true,
      data: leaveRequest,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Leave request not found') {
      return c.json(
        {
          success: false,
          error: {
            code: 'LEAVE_REQUEST_NOT_FOUND',
            message: 'Leave request not found',
          },
        },
        404
      );
    }
    logger.error('Route error', error, { route: 'hr' });
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
 * DELETE /hr/leave-requests/:id
 * Delete leave request
 */
app.delete('/leave-requests/:id', requirePermissions('hr:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const leaveRequestId = c.req.param('id');

    await hrService.deleteLeaveRequest(organizationId, leaveRequestId);

    return c.json({
      success: true,
      data: null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Leave request not found') {
      return c.json(
        {
          success: false,
          error: {
            code: 'LEAVE_REQUEST_NOT_FOUND',
            message: 'Leave request not found',
          },
        },
        404
      );
    }
    logger.error('Route error', error, { route: 'hr' });
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
