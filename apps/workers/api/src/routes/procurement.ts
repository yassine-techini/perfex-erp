/**
 * Procurement API Routes
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { procurementService } from '../services/procurement.service';
import { logger } from '../utils/logger';
import {
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from '@perfex/shared';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// ============================================
// SUPPLIERS
// ============================================

app.get('/suppliers', requirePermissions('procurement:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const active = c.req.query('active');
    const search = c.req.query('search');

    const suppliers = await procurementService.listSuppliers(organizationId, { active, search });
    return c.json({ success: true, data: suppliers });
  } catch (error) {
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.get('/suppliers/stats', requirePermissions('procurement:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const stats = await procurementService.getStats(organizationId);
    return c.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.get('/suppliers/:id', requirePermissions('procurement:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const supplierId = c.req.param('id');

    const supplier = await procurementService.getSupplierById(organizationId, supplierId);
    if (!supplier) {
      return c.json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } }, 404);
    }

    return c.json({ success: true, data: supplier });
  } catch (error) {
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.post('/suppliers', requirePermissions('procurement:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createSupplierSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
        400
      );
    }

    const supplier = await procurementService.createSupplier(organizationId, userId, validation.data);
    return c.json({ success: true, data: supplier }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.put('/suppliers/:id', requirePermissions('procurement:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const supplierId = c.req.param('id');
    const body = await c.req.json();

    const validation = updateSupplierSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
        400
      );
    }

    const supplier = await procurementService.updateSupplier(organizationId, supplierId, validation.data);
    return c.json({ success: true, data: supplier });
  } catch (error) {
    if (error instanceof Error && error.message === 'Supplier not found') {
      return c.json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } }, 404);
    }
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.delete('/suppliers/:id', requirePermissions('procurement:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const supplierId = c.req.param('id');

    await procurementService.deleteSupplier(organizationId, supplierId);
    return c.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof Error && error.message === 'Supplier not found') {
      return c.json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } }, 404);
    }
    logger.error('Route error', error, { route: 'procurement' });
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
// PURCHASE ORDERS
// ============================================

app.get('/purchase-orders', requirePermissions('procurement:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const supplierId = c.req.query('supplierId');
    const status = c.req.query('status');

    const orders = await procurementService.listPurchaseOrders(organizationId, { supplierId, status });
    return c.json({ success: true, data: orders });
  } catch (error) {
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.get('/purchase-orders/:id', requirePermissions('procurement:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const orderId = c.req.param('id');

    const order = await procurementService.getPurchaseOrderById(organizationId, orderId);
    if (!order) {
      return c.json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Purchase order not found' } }, 404);
    }

    return c.json({ success: true, data: order });
  } catch (error) {
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.post('/purchase-orders', requirePermissions('procurement:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createPurchaseOrderSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
        400
      );
    }

    const order = await procurementService.createPurchaseOrder(organizationId, userId, validation.data);
    return c.json({ success: true, data: order }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.put('/purchase-orders/:id', requirePermissions('procurement:update'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const orderId = c.req.param('id');
    const body = await c.req.json();

    const validation = updatePurchaseOrderSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
        400
      );
    }

    const order = await procurementService.updatePurchaseOrder(organizationId, orderId, validation.data);
    return c.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof Error && error.message === 'Purchase order not found') {
      return c.json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Purchase order not found' } }, 404);
    }
    logger.error('Route error', error, { route: 'procurement' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.delete('/purchase-orders/:id', requirePermissions('procurement:delete'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const orderId = c.req.param('id');

    await procurementService.deletePurchaseOrder(organizationId, orderId);
    return c.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof Error && error.message === 'Purchase order not found') {
      return c.json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Purchase order not found' } }, 404);
    }
    logger.error('Route error', error, { route: 'procurement' });
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
