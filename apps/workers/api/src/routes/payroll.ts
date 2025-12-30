/**
 * Payroll API Routes
 * Manage payroll periods, payslips, and compensation
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { payrollService } from '../services/payroll.service';
import { logger } from '../utils/logger';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// ============================================
// PAYROLL PERIODS
// ============================================

/**
 * GET /payroll/periods
 * List payroll periods
 */
app.get('/periods', requirePermissions('payroll:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const year = c.req.query('year');

    const periods = await payrollService.listPeriods(
      organizationId,
      year ? parseInt(year) : undefined
    );

    return c.json({
      success: true,
      data: periods,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * GET /payroll/periods/:id
 * Get period by ID
 */
app.get('/periods/:id', requirePermissions('payroll:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const periodId = c.req.param('id');

    const period = await payrollService.getPeriodById(organizationId, periodId);

    if (!period) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Period not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: period,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/periods
 * Create a new payroll period
 */
app.post('/periods', requirePermissions('payroll:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const body = await c.req.json();

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const period = await payrollService.createPeriod({
      organizationId,
      name: body.name || `${monthNames[body.month - 1]} ${body.year}`,
      year: body.year,
      month: body.month,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
      status: body.status || 'draft',
    });

    return c.json({
      success: true,
      data: period,
    }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * PUT /payroll/periods/:id
 * Update a payroll period
 */
app.put('/periods/:id', requirePermissions('payroll:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const periodId = c.req.param('id');
    const body = await c.req.json();

    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    if (body.paymentDate) body.paymentDate = new Date(body.paymentDate);

    const period = await payrollService.updatePeriod(periodId, organizationId, body);

    if (!period) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Period not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: period,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * DELETE /payroll/periods/:id
 * Delete a payroll period
 */
app.delete('/periods/:id', requirePermissions('payroll:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const periodId = c.req.param('id');

    await payrollService.deletePeriod(periodId, organizationId);

    return c.json({
      success: true,
      message: 'Period deleted',
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// SALARY COMPONENTS
// ============================================

/**
 * GET /payroll/components
 * List salary components
 */
app.get('/components', requirePermissions('payroll:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const components = await payrollService.listComponents(organizationId);

    return c.json({
      success: true,
      data: components,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/components
 * Create a salary component
 */
app.post('/components', requirePermissions('payroll:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const body = await c.req.json();

    const component = await payrollService.createComponent({
      organizationId,
      code: body.code,
      name: body.name,
      type: body.type,
      category: body.category,
      calculationType: body.calculationType,
      defaultValue: body.defaultValue,
      formula: body.formula,
      isTaxable: body.isTaxable !== false,
      affectsNet: body.affectsNet !== false,
      sortOrder: body.sortOrder || 0,
      active: body.active !== false,
    });

    return c.json({
      success: true,
      data: component,
    }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * PUT /payroll/components/:id
 * Update a salary component
 */
app.put('/components/:id', requirePermissions('payroll:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const componentId = c.req.param('id');
    const body = await c.req.json();

    const component = await payrollService.updateComponent(componentId, organizationId, body);

    if (!component) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Component not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: component,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * DELETE /payroll/components/:id
 * Delete a salary component
 */
app.delete('/components/:id', requirePermissions('payroll:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const componentId = c.req.param('id');

    await payrollService.deleteComponent(componentId, organizationId);

    return c.json({
      success: true,
      message: 'Component deleted',
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// EMPLOYEE SALARIES
// ============================================

/**
 * GET /payroll/employees/:employeeId/salary
 * Get employee salary configuration
 */
app.get('/employees/:employeeId/salary', requirePermissions('payroll:read'), async (c) => {
  try {
    const employeeId = c.req.param('employeeId');

    const salary = await payrollService.getEmployeeSalary(employeeId);

    if (!salary) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee salary not configured' },
      }, 404);
    }

    return c.json({
      success: true,
      data: salary,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/employees/:employeeId/salary
 * Create/update employee salary configuration
 */
app.post('/employees/:employeeId/salary', requirePermissions('payroll:create'), async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const body = await c.req.json();

    const salary = await payrollService.createEmployeeSalary({
      employeeId,
      effectiveFrom: new Date(body.effectiveFrom || Date.now()),
      baseSalary: body.baseSalary,
      hourlyRate: body.hourlyRate,
      paymentMethod: body.paymentMethod || 'bank_transfer',
      bankName: body.bankName,
      bankAccount: body.bankAccount,
      bankIban: body.bankIban,
      bankBic: body.bankBic,
      socialSecurityNumber: body.socialSecurityNumber,
      taxId: body.taxId,
      status: body.status || 'active',
      notes: body.notes,
    });

    return c.json({
      success: true,
      data: salary,
    }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * GET /payroll/employees/:employeeId/payslips
 * Get employee payslips
 */
app.get('/employees/:employeeId/payslips', requirePermissions('payroll:read'), async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const year = c.req.query('year');

    const payslips = await payrollService.getEmployeePayslips(
      employeeId,
      year ? parseInt(year) : undefined
    );

    return c.json({
      success: true,
      data: payslips,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// PAYSLIPS
// ============================================

/**
 * GET /payroll/periods/:periodId/payslips
 * List payslips for a period
 */
app.get('/periods/:periodId/payslips', requirePermissions('payroll:read'), async (c) => {
  try {
    const periodId = c.req.param('periodId');

    const payslips = await payrollService.listPayslips(periodId);

    return c.json({
      success: true,
      data: payslips,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * GET /payroll/payslips/:id
 * Get payslip by ID with lines
 */
app.get('/payslips/:id', requirePermissions('payroll:read'), async (c) => {
  try {
    const payslipId = c.req.param('id');

    const payslip = await payrollService.getPayslipById(payslipId);

    if (!payslip) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payslip not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: payslip,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/periods/:periodId/calculate/:employeeId
 * Calculate payslip for an employee
 */
app.post('/periods/:periodId/calculate/:employeeId', requirePermissions('payroll:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const periodId = c.req.param('periodId');
  const employeeId = c.req.param('employeeId');

  try {
    const payslip = await payrollService.calculatePayslip(periodId, employeeId, organizationId);

    return c.json({
      success: true,
      data: payslip,
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: { code: 'CALCULATION_ERROR', message: (error as Error).message },
    }, 400);
  }
});

/**
 * PUT /payroll/payslips/:id
 * Update payslip status
 */
app.put('/payslips/:id', requirePermissions('payroll:update'), async (c) => {
  try {
    const payslipId = c.req.param('id');
    const body = await c.req.json();

    if (body.paymentDate) body.paymentDate = new Date(body.paymentDate);

    const payslip = await payrollService.updatePayslip(payslipId, body);

    if (!payslip) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payslip not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: payslip,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// BONUSES
// ============================================

/**
 * GET /payroll/bonuses
 * List bonuses
 */
app.get('/bonuses', requirePermissions('payroll:read'), async (c) => {
  try {
    const employeeId = c.req.query('employeeId');
    const periodId = c.req.query('periodId');

    const bonuses = await payrollService.listBonuses(employeeId, periodId);

    return c.json({
      success: true,
      data: bonuses,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/bonuses
 * Create a bonus
 */
app.post('/bonuses', requirePermissions('payroll:create'), async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const bonus = await payrollService.createBonus({
      employeeId: body.employeeId,
      payrollPeriodId: body.payrollPeriodId,
      type: body.type,
      name: body.name,
      amount: body.amount,
      isTaxable: body.isTaxable !== false,
      status: body.status || 'pending',
      reason: body.reason,
      notes: body.notes,
      createdBy: userId,
    });

    return c.json({
      success: true,
      data: bonus,
    }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * PUT /payroll/bonuses/:id
 * Update a bonus
 */
app.put('/bonuses/:id', requirePermissions('payroll:update'), async (c) => {
  try {
    const userId = c.get('userId');
    const bonusId = c.req.param('id');
    const body = await c.req.json();

    // If approving, add approver info
    if (body.status === 'approved') {
      body.approvedBy = userId;
      body.approvedAt = new Date();
    }

    const bonus = await payrollService.updateBonus(bonusId, body);

    if (!bonus) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bonus not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: bonus,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * DELETE /payroll/bonuses/:id
 * Delete a bonus
 */
app.delete('/bonuses/:id', requirePermissions('payroll:delete'), async (c) => {
  try {
    const bonusId = c.req.param('id');

    await payrollService.deleteBonus(bonusId);

    return c.json({
      success: true,
      message: 'Bonus deleted',
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// SOCIAL CONTRIBUTIONS
// ============================================

/**
 * GET /payroll/contributions
 * List social contributions
 */
app.get('/contributions', requirePermissions('payroll:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const contributions = await payrollService.listContributions(organizationId);

    return c.json({
      success: true,
      data: contributions,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/contributions
 * Create a social contribution
 */
app.post('/contributions', requirePermissions('payroll:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const body = await c.req.json();

    const contribution = await payrollService.createContribution({
      organizationId,
      code: body.code,
      name: body.name,
      description: body.description,
      employeeRate: body.employeeRate,
      employerRate: body.employerRate,
      ceiling: body.ceiling || 'none',
      base: body.base || 'gross',
      effectiveFrom: new Date(body.effectiveFrom || Date.now()),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
      mandatory: body.mandatory !== false,
      active: body.active !== false,
    });

    return c.json({
      success: true,
      data: contribution,
    }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * PUT /payroll/contributions/:id
 * Update a social contribution
 */
app.put('/contributions/:id', requirePermissions('payroll:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const contributionId = c.req.param('id');
    const body = await c.req.json();

    if (body.effectiveFrom) body.effectiveFrom = new Date(body.effectiveFrom);
    if (body.effectiveTo) body.effectiveTo = new Date(body.effectiveTo);

    const contribution = await payrollService.updateContribution(contributionId, organizationId, body);

    if (!contribution) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contribution not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: contribution,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// OVERTIME RULES
// ============================================

/**
 * GET /payroll/overtime-rules
 * List overtime rules
 */
app.get('/overtime-rules', requirePermissions('payroll:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const rules = await payrollService.listOvertimeRules(organizationId);

    return c.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/overtime-rules
 * Create an overtime rule
 */
app.post('/overtime-rules', requirePermissions('payroll:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const body = await c.req.json();

    const rule = await payrollService.createOvertimeRule({
      organizationId,
      name: body.name,
      hoursFrom: body.hoursFrom,
      hoursTo: body.hoursTo,
      multiplier: body.multiplier,
      isNight: body.isNight || false,
      isHoliday: body.isHoliday || false,
      isSunday: body.isSunday || false,
      active: body.active !== false,
      sortOrder: body.sortOrder || 0,
    });

    return c.json({
      success: true,
      data: rule,
    }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * PUT /payroll/overtime-rules/:id
 * Update an overtime rule
 */
app.put('/overtime-rules/:id', requirePermissions('payroll:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const ruleId = c.req.param('id');
    const body = await c.req.json();

    const rule = await payrollService.updateOvertimeRule(ruleId, organizationId, body);

    if (!rule) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Rule not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// DECLARATIONS
// ============================================

/**
 * GET /payroll/declarations
 * List payroll declarations
 */
app.get('/declarations', requirePermissions('payroll:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const periodId = c.req.query('periodId');

    const declarations = await payrollService.listDeclarations(organizationId, periodId);

    return c.json({
      success: true,
      data: declarations,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/declarations
 * Create a declaration
 */
app.post('/declarations', requirePermissions('payroll:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const body = await c.req.json();

    const declaration = await payrollService.createDeclaration({
      organizationId,
      payrollPeriodId: body.payrollPeriodId,
      type: body.type,
      declarationDate: new Date(body.declarationDate || Date.now()),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      status: body.status || 'draft',
      totalAmount: body.totalAmount,
      notes: body.notes,
    });

    return c.json({
      success: true,
      data: declaration,
    }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * PUT /payroll/declarations/:id
 * Update a declaration
 */
app.put('/declarations/:id', requirePermissions('payroll:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const declarationId = c.req.param('id');
    const body = await c.req.json();

    if (body.declarationDate) body.declarationDate = new Date(body.declarationDate);
    if (body.dueDate) body.dueDate = new Date(body.dueDate);

    // If submitting, add submission info
    if (body.status === 'submitted') {
      body.submittedAt = new Date();
      body.submittedBy = userId;
    }

    const declaration = await payrollService.updateDeclaration(declarationId, organizationId, body);

    if (!declaration) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Declaration not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: declaration,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
// STATISTICS & SEED
// ============================================

/**
 * GET /payroll/stats
 * Get payroll statistics
 */
app.get('/stats', requirePermissions('payroll:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const year = c.req.query('year');

    const stats = await payrollService.getStats(organizationId, year ? parseInt(year) : undefined);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
 * POST /payroll/seed
 * Seed default data
 */
app.post('/seed', requirePermissions('payroll:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;

    const contributions = await payrollService.seedDefaultContributions(organizationId);
    const overtimeRules = await payrollService.seedDefaultOvertimeRules(organizationId);

    return c.json({
      success: true,
      data: {
        contributions,
        overtimeRules,
      },
    });
  } catch (error) {
    logger.error('Route error', error, { route: 'payroll' });
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
