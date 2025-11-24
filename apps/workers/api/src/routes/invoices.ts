/**
 * Invoice Routes
 * Customer invoice endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createInvoiceSchema, updateInvoiceSchema } from '@perfex/shared';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { InvoiceService } from '../services/invoice.service';

const invoicesRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
invoicesRouter.use('/*', authMiddleware);

/**
 * List invoices
 * GET /invoices?customerId=xxx&status=draft&startDate=2024-01-01&endDate=2024-12-31&limit=50&offset=0
 */
invoicesRouter.get(
  '/',
  checkPermission('finance:invoices:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const customerId = c.req.query('customerId');
    const status = c.req.query('status');
    const startDateStr = c.req.query('startDate');
    const endDateStr = c.req.query('endDate');
    const limitStr = c.req.query('limit');
    const offsetStr = c.req.query('offset');

    const options: any = {};
    if (customerId) options.customerId = customerId;
    if (status) options.status = status;
    if (startDateStr) options.startDate = new Date(startDateStr);
    if (endDateStr) options.endDate = new Date(endDateStr);
    if (limitStr) options.limit = parseInt(limitStr, 10);
    if (offsetStr) options.offset = parseInt(offsetStr, 10);

    const invoiceService = new InvoiceService(c.env.DB);
    const invoicesList = await invoiceService.list(organizationId, options);

    return c.json({ data: invoicesList });
  }
);

/**
 * Get invoice by ID
 * GET /invoices/:id
 */
invoicesRouter.get(
  '/:id',
  checkPermission('finance:invoices:read'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const invoiceId = c.req.param('id');
    const invoiceService = new InvoiceService(c.env.DB);
    const invoice = await invoiceService.getById(invoiceId, organizationId);

    return c.json({ data: invoice });
  }
);

/**
 * Create invoice
 * POST /invoices
 */
invoicesRouter.post(
  '/',
  checkPermission('finance:invoices:create'),
  zValidator('json', createInvoiceSchema),
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
    const invoiceService = new InvoiceService(c.env.DB);
    const invoice = await invoiceService.create(organizationId, userId, data);

    return c.json({ data: invoice }, 201);
  }
);

/**
 * Update invoice
 * PUT /invoices/:id
 */
invoicesRouter.put(
  '/:id',
  checkPermission('finance:invoices:update'),
  zValidator('json', updateInvoiceSchema),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const invoiceId = c.req.param('id');
    const data = c.req.valid('json');
    const invoiceService = new InvoiceService(c.env.DB);
    const invoice = await invoiceService.update(invoiceId, organizationId, data);

    return c.json({ data: invoice });
  }
);

/**
 * Mark invoice as sent
 * POST /invoices/:id/send
 */
invoicesRouter.post(
  '/:id/send',
  checkPermission('finance:invoices:update'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const invoiceId = c.req.param('id');
    const invoiceService = new InvoiceService(c.env.DB);
    const invoice = await invoiceService.markAsSent(invoiceId, organizationId);

    return c.json({ data: invoice });
  }
);

/**
 * Record payment for invoice
 * POST /invoices/:id/payments
 */
invoicesRouter.post(
  '/:id/payments',
  checkPermission('finance:payments:create'),
  zValidator('json', z.object({
    amount: z.number().min(0.01),
  })),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const invoiceId = c.req.param('id');
    const { amount } = c.req.valid('json');
    const invoiceService = new InvoiceService(c.env.DB);
    const invoice = await invoiceService.recordPayment(invoiceId, organizationId, amount);

    return c.json({ data: invoice });
  }
);

/**
 * Cancel invoice
 * POST /invoices/:id/cancel
 */
invoicesRouter.post(
  '/:id/cancel',
  checkPermission('finance:invoices:delete'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const invoiceId = c.req.param('id');
    const invoiceService = new InvoiceService(c.env.DB);
    const invoice = await invoiceService.cancel(invoiceId, organizationId);

    return c.json({ data: invoice });
  }
);

/**
 * Delete invoice (drafts only)
 * DELETE /invoices/:id
 */
invoicesRouter.delete(
  '/:id',
  checkPermission('finance:invoices:delete'),
  async (c) => {
    const organizationId = c.req.header('x-organization-id');
    if (!organizationId) {
      return c.json(
        { error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        400
      );
    }

    const invoiceId = c.req.param('id');
    const invoiceService = new InvoiceService(c.env.DB);
    await invoiceService.delete(invoiceId, organizationId);

    return c.json({ data: { message: 'Invoice deleted successfully' } });
  }
);

export default invoicesRouter;
