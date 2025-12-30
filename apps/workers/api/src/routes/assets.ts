/**
 * Assets API Routes
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { assetsService } from '../services/assets.service';
import {
  createAssetCategorySchema,
  updateAssetCategorySchema,
  createFixedAssetSchema,
  updateFixedAssetSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
} from '@perfex/shared';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// ============================================
// ASSET CATEGORIES
// ============================================

app.get('/categories', requirePermissions('assets:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const categories = await assetsService.listCategories(organizationId);
  return c.json({ success: true, data: categories });
});

app.post('/categories', requirePermissions('assets:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createAssetCategorySchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  const category = await assetsService.createCategory(organizationId, userId, validation.data);
  return c.json({ success: true, data: category }, 201);
});

// ============================================
// FIXED ASSETS
// ============================================

app.get('/assets', requirePermissions('assets:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const categoryId = c.req.query('categoryId');
  const status = c.req.query('status');
  const search = c.req.query('search');

  const assets = await assetsService.listAssets(organizationId, { categoryId, status, search });
  return c.json({ success: true, data: assets });
});

app.get('/assets/stats', requirePermissions('assets:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const stats = await assetsService.getStats(organizationId);
  return c.json({ success: true, data: stats });
});

app.get('/assets/:id', requirePermissions('assets:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const assetId = c.req.param('id');

  const asset = await assetsService.getAssetById(organizationId, assetId);
  if (!asset) {
    return c.json({ success: false, error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' } }, 404);
  }

  return c.json({ success: true, data: asset });
});

app.post('/assets', requirePermissions('assets:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createFixedAssetSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  const asset = await assetsService.createAsset(organizationId, userId, validation.data);
  return c.json({ success: true, data: asset }, 201);
});

app.put('/assets/:id', requirePermissions('assets:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const assetId = c.req.param('id');
  const body = await c.req.json();

  const validation = updateFixedAssetSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  try {
    const asset = await assetsService.updateAsset(organizationId, assetId, validation.data);
    return c.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof Error && error.message === 'Asset not found') {
      return c.json({ success: false, error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' } }, 404);
    }
    throw error;
  }
});

app.delete('/assets/:id', requirePermissions('assets:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const assetId = c.req.param('id');

  try {
    await assetsService.deleteAsset(organizationId, assetId);
    return c.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof Error && error.message === 'Asset not found') {
      return c.json({ success: false, error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' } }, 404);
    }
    throw error;
  }
});

// ============================================
// MAINTENANCE
// ============================================

app.get('/maintenance', requirePermissions('assets:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const assetId = c.req.query('assetId');
  const status = c.req.query('status');

  const maintenance = await assetsService.listMaintenance(organizationId, { assetId, status });
  return c.json({ success: true, data: maintenance });
});

app.post('/maintenance', requirePermissions('assets:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createMaintenanceSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  const maintenance = await assetsService.createMaintenance(organizationId, userId, validation.data);
  return c.json({ success: true, data: maintenance }, 201);
});

export default app;
