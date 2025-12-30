/**
 * Notifications API Routes
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { notificationsService } from '../services/notifications.service';
import {
  createNotificationSchema,
  markNotificationReadSchema,
  createSystemSettingSchema,
  updateSystemSettingSchema,
} from '@perfex/shared';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// ============================================
// USER NOTIFICATIONS
// ============================================

app.get('/', async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const unreadOnly = c.req.query('unreadOnly') === 'true';

  const notifications = await notificationsService.listUserNotifications(organizationId, userId, unreadOnly);
  return c.json({ success: true, data: notifications });
});

app.get('/unread-count', async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');

  const count = await notificationsService.getUnreadCount(organizationId, userId);
  return c.json({ success: true, data: { count } });
});

app.post('/mark-read', async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = markNotificationReadSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  await notificationsService.markAsRead(organizationId, userId, validation.data.notificationIds);
  return c.json({ success: true, data: null });
});

app.post('/mark-all-read', async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');

  await notificationsService.markAllAsRead(organizationId, userId);
  return c.json({ success: true, data: null });
});

// ============================================
// AUDIT LOGS
// ============================================

app.get('/audit-logs', requirePermissions('admin'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const entityType = c.req.query('entityType');
  const entityId = c.req.query('entityId');
  const userId = c.req.query('userId');

  const logs = await notificationsService.listAuditLogs(organizationId, { entityType, entityId, userId });
  return c.json({ success: true, data: logs });
});

// ============================================
// SYSTEM SETTINGS
// ============================================

app.get('/settings', requirePermissions('admin'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const category = c.req.query('category');

  const settings = await notificationsService.listSettings(organizationId, category);
  return c.json({ success: true, data: settings });
});

app.get('/settings/:category/:key', requirePermissions('admin'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const category = c.req.param('category');
  const key = c.req.param('key');

  const setting = await notificationsService.getSetting(organizationId, category, key);
  if (!setting) {
    return c.json({ success: false, error: { code: 'SETTING_NOT_FOUND', message: 'Setting not found' } }, 404);
  }

  return c.json({ success: true, data: setting });
});

app.post('/settings', requirePermissions('admin'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createSystemSettingSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  const setting = await notificationsService.createSetting(organizationId, userId, validation.data);
  return c.json({ success: true, data: setting }, 201);
});

app.put('/settings/:category/:key', requirePermissions('admin'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const category = c.req.param('category');
  const key = c.req.param('key');
  const body = await c.req.json();

  const validation = updateSystemSettingSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors } },
      400
    );
  }

  try {
    const setting = await notificationsService.updateSetting(organizationId, userId, category, key, validation.data);
    return c.json({ success: true, data: setting });
  } catch (error) {
    if (error instanceof Error && error.message === 'Setting not found') {
      return c.json({ success: false, error: { code: 'SETTING_NOT_FOUND', message: 'Setting not found' } }, 404);
    }
    throw error;
  }
});

export default app;
