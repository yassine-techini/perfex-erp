/**
 * Report Routes
 * Financial reporting endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { reportFiltersSchema } from '@perfex/shared';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { ReportService } from '../services/report.service';

const reportsRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
reportsRouter.use('/*', authMiddleware);

/**
 * Get General Ledger for an account
 * POST /reports/general-ledger/:accountId
 */
reportsRouter.post(
  '/general-ledger/:accountId',
  checkPermission('finance:reports:read'),
  zValidator('json', reportFiltersSchema),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const accountId = c.req.param('accountId');
    const filters = c.req.valid('json');
    const reportService = new ReportService(c.env.DB);
    const generalLedger = await reportService.getGeneralLedger(organizationId, accountId, filters);

    return c.json({ data: generalLedger });
  }
);

/**
 * Get Trial Balance
 * POST /reports/trial-balance
 */
reportsRouter.post(
  '/trial-balance',
  checkPermission('finance:reports:read'),
  zValidator('json', reportFiltersSchema),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const filters = c.req.valid('json');
    const reportService = new ReportService(c.env.DB);
    const trialBalance = await reportService.getTrialBalance(organizationId, filters);

    return c.json({ data: trialBalance });
  }
);

/**
 * Get Balance Sheet
 * POST /reports/balance-sheet
 */
reportsRouter.post(
  '/balance-sheet',
  checkPermission('finance:reports:read'),
  zValidator('json', z.object({
    asOfDate: z.string().datetime().or(z.date()),
  })),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const { asOfDate } = c.req.valid('json');
    const date = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;
    const reportService = new ReportService(c.env.DB);
    const balanceSheet = await reportService.getBalanceSheet(organizationId, date);

    return c.json({ data: balanceSheet });
  }
);

/**
 * Get Income Statement (Profit & Loss)
 * POST /reports/income-statement
 */
reportsRouter.post(
  '/income-statement',
  checkPermission('finance:reports:read'),
  zValidator('json', reportFiltersSchema),
  async (c) => {
    const organizationId = c.get('organizationId')!;
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const filters = c.req.valid('json');
    const reportService = new ReportService(c.env.DB);
    const incomeStatement = await reportService.getIncomeStatement(organizationId, filters);

    return c.json({ data: incomeStatement });
  }
);

export default reportsRouter;
