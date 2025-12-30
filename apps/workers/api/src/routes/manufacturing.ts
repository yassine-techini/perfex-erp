/**
 * Manufacturing API Routes
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { manufacturingService } from '../services/manufacturing.service';
import {
  createBOMSchema,
  updateBOMSchema,
  createRoutingSchema,
  updateRoutingSchema,
  createWorkOrderSchema,
  updateWorkOrderSchema,
} from '@perfex/shared';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// ============================================
// BILL OF MATERIALS (BOM)
// ============================================

app.get('/boms', requirePermissions('manufacturing:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const productId = c.req.query('productId');
  const status = c.req.query('status');

  const boms = await manufacturingService.listBOMs(organizationId, { productId, status });
  return c.json({ success: true, data: boms });
});

app.get('/boms/stats', requirePermissions('manufacturing:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const stats = await manufacturingService.getStats(organizationId);
  return c.json({ success: true, data: stats });
});

app.get('/boms/:id', requirePermissions('manufacturing:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const bomId = c.req.param('id');

  const bom = await manufacturingService.getBOMById(organizationId, bomId);
  if (!bom) {
    return c.json({ success: false, error: { code: 'BOM_NOT_FOUND', message: 'BOM not found' } }, 404);
  }

  return c.json({ success: true, data: bom });
});

app.post('/boms', requirePermissions('manufacturing:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createBOMSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  const bom = await manufacturingService.createBOM(organizationId, userId, validation.data);
  return c.json({ success: true, data: bom }, 201);
});

app.put('/boms/:id', requirePermissions('manufacturing:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const bomId = c.req.param('id');
  const body = await c.req.json();

  const validation = updateBOMSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  try {
    const bom = await manufacturingService.updateBOM(organizationId, bomId, validation.data);
    return c.json({ success: true, data: bom });
  } catch (error) {
    if (error instanceof Error && error.message === 'BOM not found') {
      return c.json({ success: false, error: { code: 'BOM_NOT_FOUND', message: 'BOM not found' } }, 404);
    }
    throw error;
  }
});

app.delete('/boms/:id', requirePermissions('manufacturing:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const bomId = c.req.param('id');

  try {
    await manufacturingService.deleteBOM(organizationId, bomId);
    return c.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof Error && error.message === 'BOM not found') {
      return c.json({ success: false, error: { code: 'BOM_NOT_FOUND', message: 'BOM not found' } }, 404);
    }
    throw error;
  }
});

// ============================================
// ROUTINGS
// ============================================

app.get('/routings', requirePermissions('manufacturing:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const productId = c.req.query('productId');
  const status = c.req.query('status');

  const routings = await manufacturingService.listRoutings(organizationId, { productId, status });
  return c.json({ success: true, data: routings });
});

app.get('/routings/:id', requirePermissions('manufacturing:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const routingId = c.req.param('id');

  const routing = await manufacturingService.getRoutingById(organizationId, routingId);
  if (!routing) {
    return c.json({ success: false, error: { code: 'ROUTING_NOT_FOUND', message: 'Routing not found' } }, 404);
  }

  return c.json({ success: true, data: routing });
});

app.post('/routings', requirePermissions('manufacturing:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createRoutingSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  const routing = await manufacturingService.createRouting(organizationId, userId, validation.data);
  return c.json({ success: true, data: routing }, 201);
});

app.put('/routings/:id', requirePermissions('manufacturing:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const routingId = c.req.param('id');
  const body = await c.req.json();

  const validation = updateRoutingSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  try {
    const routing = await manufacturingService.updateRouting(organizationId, routingId, validation.data);
    return c.json({ success: true, data: routing });
  } catch (error) {
    if (error instanceof Error && error.message === 'Routing not found') {
      return c.json({ success: false, error: { code: 'ROUTING_NOT_FOUND', message: 'Routing not found' } }, 404);
    }
    throw error;
  }
});

app.delete('/routings/:id', requirePermissions('manufacturing:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const routingId = c.req.param('id');

  try {
    await manufacturingService.deleteRouting(organizationId, routingId);
    return c.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof Error && error.message === 'Routing not found') {
      return c.json({ success: false, error: { code: 'ROUTING_NOT_FOUND', message: 'Routing not found' } }, 404);
    }
    throw error;
  }
});

// ============================================
// WORK ORDERS
// ============================================

app.get('/work-orders', requirePermissions('manufacturing:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const search = c.req.query('search');

  const workOrders = await manufacturingService.listWorkOrders(organizationId, { status, priority, search });
  return c.json({ success: true, data: workOrders });
});

app.get('/work-orders/:id', requirePermissions('manufacturing:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const workOrderId = c.req.param('id');

  const workOrder = await manufacturingService.getWorkOrderById(organizationId, workOrderId);
  if (!workOrder) {
    return c.json({ success: false, error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order not found' } }, 404);
  }

  return c.json({ success: true, data: workOrder });
});

app.post('/work-orders', requirePermissions('manufacturing:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createWorkOrderSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  const workOrder = await manufacturingService.createWorkOrder(organizationId, userId, validation.data);
  return c.json({ success: true, data: workOrder }, 201);
});

app.put('/work-orders/:id', requirePermissions('manufacturing:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const workOrderId = c.req.param('id');
  const body = await c.req.json();

  const validation = updateWorkOrderSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  try {
    const workOrder = await manufacturingService.updateWorkOrder(organizationId, workOrderId, validation.data);
    return c.json({ success: true, data: workOrder });
  } catch (error) {
    if (error instanceof Error && error.message === 'Work order not found') {
      return c.json({ success: false, error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order not found' } }, 404);
    }
    throw error;
  }
});

app.delete('/work-orders/:id', requirePermissions('manufacturing:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const workOrderId = c.req.param('id');

  try {
    await manufacturingService.deleteWorkOrder(organizationId, workOrderId);
    return c.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof Error && error.message === 'Work order not found') {
      return c.json({ success: false, error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order not found' } }, 404);
    }
    throw error;
  }
});

export default app;
