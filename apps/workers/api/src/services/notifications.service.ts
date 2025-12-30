/**
 * Notifications Service
 * Manage user notifications, audit logs, and system settings
 */

import { eq, and, desc } from 'drizzle-orm';
import { drizzleDb } from '../db';
import {
  notifications,
  auditLogs,
  systemSettings,
} from '@perfex/database';
import type {
  Notification,
  AuditLog,
  SystemSetting,
  CreateNotificationInput,
  CreateSystemSettingInput,
  UpdateSystemSettingInput,
  AuditAction,
} from '@perfex/shared';

export class NotificationsService {
  // ============================================
  // NOTIFICATIONS
  // ============================================

  async createNotification(organizationId: string, data: CreateNotificationInput): Promise<Notification> {
    const now = new Date();
    const notificationId = crypto.randomUUID();

    await drizzleDb.insert(notifications).values({
      id: notificationId,
      organizationId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message || null,
      link: data.link || null,
      relatedId: data.relatedId || null,
      relatedType: data.relatedType || null,
      isRead: false,
      readAt: null,
      createdAt: now,
    });

    const notification = await this.getNotificationById(organizationId, notificationId);
    if (!notification) throw new Error('Failed to create notification');
    return notification;
  }

  async getNotificationById(organizationId: string, notificationId: string): Promise<Notification | null> {
    const notification = await drizzleDb
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.organizationId, organizationId)))
      .get() as any;
    return notification || null;
  }

  async listUserNotifications(organizationId: string, userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    let query = drizzleDb
      .select()
      .from(notifications)
      .where(and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId)));

    if (unreadOnly) {
      query = query.where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    }

    return await query.orderBy(desc(notifications.createdAt)).limit(50).all() as any[];
  }

  async markAsRead(organizationId: string, userId: string, notificationIds: string[]): Promise<void> {
    const now = new Date();

    for (const notificationId of notificationIds) {
      await drizzleDb
        .update(notifications)
        .set({ isRead: true, readAt: now })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.organizationId, organizationId),
            eq(notifications.userId, userId)
          )
        );
    }
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<void> {
    const now = new Date();

    await drizzleDb
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    const unread = await this.listUserNotifications(organizationId, userId, true);
    return unread.length;
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  async createAuditLog(
    organizationId: string,
    userId: string | null,
    action: AuditAction,
    entityType: string,
    entityId: string | null,
    changes: any = null,
    metadata: any = null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<void> {
    const now = new Date();

    await drizzleDb.insert(auditLogs).values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      action,
      entityType,
      entityId,
      changes: changes ? JSON.stringify(changes) : null,
      ipAddress,
      userAgent,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: now,
    });
  }

  async listAuditLogs(organizationId: string, filters?: { entityType?: string; entityId?: string; userId?: string }): Promise<AuditLog[]> {
    let query = drizzleDb.select().from(auditLogs).where(eq(auditLogs.organizationId, organizationId));

    if (filters?.entityType) {
      query = query.where(and(eq(auditLogs.organizationId, organizationId), eq(auditLogs.entityType, filters.entityType)));
    }

    if (filters?.entityId) {
      query = query.where(and(eq(auditLogs.organizationId, organizationId), eq(auditLogs.entityId, filters.entityId)));
    }

    if (filters?.userId) {
      query = query.where(and(eq(auditLogs.organizationId, organizationId), eq(auditLogs.userId, filters.userId)));
    }

    return await query.orderBy(desc(auditLogs.createdAt)).limit(100).all() as any[];
  }

  // ============================================
  // SYSTEM SETTINGS
  // ============================================

  async getSetting(organizationId: string, category: string, key: string): Promise<SystemSetting | null> {
    const setting = await drizzleDb
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.organizationId, organizationId),
          eq(systemSettings.category, category),
          eq(systemSettings.key, key)
        )
      )
      .get() as any;
    return setting || null;
  }

  async listSettings(organizationId: string, category?: string): Promise<SystemSetting[]> {
    let query = drizzleDb.select().from(systemSettings).where(eq(systemSettings.organizationId, organizationId));

    if (category) {
      query = query.where(and(eq(systemSettings.organizationId, organizationId), eq(systemSettings.category, category)));
    }

    return await query.orderBy(desc(systemSettings.updatedAt)).all() as any[];
  }

  async createSetting(organizationId: string, userId: string, data: CreateSystemSettingInput): Promise<SystemSetting> {
    const now = new Date();
    const settingId = crypto.randomUUID();

    await drizzleDb.insert(systemSettings).values({
      id: settingId,
      organizationId,
      category: data.category,
      key: data.key,
      value: data.value,
      description: data.description || null,
      updatedBy: userId,
      updatedAt: now,
      createdAt: now,
    });

    const setting = await this.getSetting(organizationId, data.category, data.key);
    if (!setting) throw new Error('Failed to create setting');
    return setting;
  }

  async updateSetting(
    organizationId: string,
    userId: string,
    category: string,
    key: string,
    data: UpdateSystemSettingInput
  ): Promise<SystemSetting> {
    const now = new Date();

    await drizzleDb
      .update(systemSettings)
      .set({
        value: data.value,
        updatedBy: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(systemSettings.organizationId, organizationId),
          eq(systemSettings.category, category),
          eq(systemSettings.key, key)
        )
      );

    const setting = await this.getSetting(organizationId, category, key);
    if (!setting) throw new Error('Setting not found');
    return setting;
  }
}

export const notificationsService = new NotificationsService();
