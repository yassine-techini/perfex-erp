/**
 * Payment Routes
 * Payment and allocation endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPaymentSchema } from '@perfex/shared';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { PaymentService } from '../services/payment.service';

const paymentsRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
paymentsRouter.use('/*', authMiddleware);

/**
 * List payments
 * GET /payments?customerId=xxx&supplierId=xxx&startDate=2024-01-01&endDate=2024-12-31&limit=50&offset=0
 */
paymentsRouter.get(
  '/',
  checkPermission('finance:payments:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const customerId = c.req.query('customerId');
    const supplierId = c.req.query('supplierId');
    const startDateStr = c.req.query('startDate');
    const endDateStr = c.req.query('endDate');
    const limitStr = c.req.query('limit');
    const offsetStr = c.req.query('offset');

    const options: any = {};
    if (customerId) options.customerId = customerId;
    if (supplierId) options.supplierId = supplierId;
    if (startDateStr) options.startDate = new Date(startDateStr);
    if (endDateStr) options.endDate = new Date(endDateStr);
    if (limitStr) options.limit = parseInt(limitStr, 10);
    if (offsetStr) options.offset = parseInt(offsetStr, 10);

    const paymentService = new PaymentService(c.env.DB);
    const paymentsList = await paymentService.list(organizationId, options);

    return c.json({ data: paymentsList });
  }
);

/**
 * Get payment by ID
 * GET /payments/:id
 */
paymentsRouter.get(
  '/:id',
  checkPermission('finance:payments:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const paymentId = c.req.param('id');
    const paymentService = new PaymentService(c.env.DB);
    const payment = await paymentService.getWithAllocations(paymentId, organizationId);

    return c.json({ data: payment });
  }
);

/**
 * Create payment
 * POST /payments
 */
paymentsRouter.post(
  '/',
  checkPermission('finance:payments:create'),
  zValidator('json', createPaymentSchema),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const userId = c.get('userId');
    const data = c.req.valid('json');
    const paymentService = new PaymentService(c.env.DB);
    const payment = await paymentService.create(organizationId, userId, data);

    return c.json({ data: payment }, 201);
  }
);

/**
 * Get allocations for invoice
 * GET /payments/invoices/:invoiceId/allocations
 */
paymentsRouter.get(
  '/invoices/:invoiceId/allocations',
  checkPermission('finance:payments:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const invoiceId = c.req.param('invoiceId');
    const paymentService = new PaymentService(c.env.DB);
    const allocations = await paymentService.getAllocationsForInvoice(invoiceId, organizationId);

    return c.json({ data: allocations });
  }
);

/**
 * Delete payment
 * DELETE /payments/:id
 */
paymentsRouter.delete(
  '/:id',
  checkPermission('finance:payments:delete'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const paymentId = c.req.param('id');
    const paymentService = new PaymentService(c.env.DB);
    await paymentService.delete(paymentId, organizationId);

    return c.json({ data: { message: 'Payment deleted successfully' } });
  }
);

export default paymentsRouter;
