/**
 * Role Service
 * Manages custom roles and permissions
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import {
  roles,
  userRoles,
  organizationMembers,
  type Role,
} from '@perfex/database';
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from '@perfex/shared';

export class RoleService {
  constructor(private db: D1Database) {}

  /**
   * Create a custom role
   */
  async create(
    data: CreateRoleInput,
    userId: string
  ): Promise<Role> {
    const drizzleDb = drizzle(this.db);

    // If organizationId is provided, check if user is owner/admin
    if (data.organizationId) {
      const member = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, data.organizationId),
            eq(organizationMembers.userId, userId)
          )
        )
        .get() as any;

      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new Error('Permission denied');
      }
    }

    // Validate permissions
    this.validatePermissions(data.permissions);

    // Create role
    const roleId = crypto.randomUUID();
    const now = new Date();

    await drizzleDb.insert(roles).values({
      id: roleId,
      organizationId: data.organizationId || null,
      name: data.name,
      permissions: JSON.stringify(data.permissions),
      createdAt: now,
    });

    const role = await drizzleDb
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .get() as any;

    if (!role) {
      throw new Error('Failed to create role');
    }

    return {
      ...role,
      permissions: JSON.parse(role.permissions),
    } as Role;
  }

  /**
   * Get roles (system-wide or organization-specific)
   */
  async list(
    organizationId?: string,
    userId?: string
  ): Promise<Role[]> {
    const drizzleDb = drizzle(this.db);

    // If organizationId is provided, check access
    if (organizationId && userId) {
      const member = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId)
          )
        )
        .get() as any;

      if (!member) {
        throw new Error('Access denied');
      }
    }

    let query;
    if (organizationId) {
      // Get organization-specific roles
      query = drizzleDb
        .select()
        .from(roles)
        .where(eq(roles.organizationId, organizationId));
    } else {
      // Get system-wide roles (organizationId is null)
      query = drizzleDb
        .select()
        .from(roles)
        .where(eq(roles.organizationId, null));
    }

    const rolesList = await query.all() as any[];

    return rolesList.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions),
    })) as Role[];
  }

  /**
   * Get role by ID
   */
  async getById(roleId: string): Promise<Role> {
    const drizzleDb = drizzle(this.db);

    const role = await drizzleDb
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .get() as any;

    if (!role) {
      throw new Error('Role not found');
    }

    return {
      ...role,
      permissions: JSON.parse(role.permissions),
    } as Role;
  }

  /**
   * Update role
   */
  async update(
    roleId: string,
    data: UpdateRoleInput,
    userId: string
  ): Promise<Role> {
    const drizzleDb = drizzle(this.db);

    const role = await this.getById(roleId);

    // If role belongs to an organization, check permissions
    if (role.organizationId) {
      const member = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, role.organizationId),
            eq(organizationMembers.userId, userId)
          )
        )
        .get() as any;

      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new Error('Permission denied');
      }
    }

    // Validate permissions if provided
    if (data.permissions) {
      this.validatePermissions(data.permissions);
    }

    await drizzleDb
      .update(roles)
      .set({
        name: data.name,
        permissions: data.permissions ? JSON.stringify(data.permissions) : undefined,
      })
      .where(eq(roles.id, roleId));

    return this.getById(roleId);
  }

  /**
   * Delete role
   */
  async delete(roleId: string, userId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    const role = await this.getById(roleId);

    // If role belongs to an organization, check permissions
    if (role.organizationId) {
      const member = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, role.organizationId),
            eq(organizationMembers.userId, userId)
          )
        )
        .get() as any;

      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new Error('Permission denied');
      }
    }

    // Delete user role assignments
    await drizzleDb
      .delete(userRoles)
      .where(eq(userRoles.roleId, roleId));

    // Delete role
    await drizzleDb
      .delete(roles)
      .where(eq(roles.id, roleId));
  }

  /**
   * Assign role to user
   */
  async assignToUser(
    roleId: string,
    userId: string,
    assignedBy: string,
    organizationId?: string
  ): Promise<void> {
    const drizzleDb = drizzle(this.db);

    // Verify role exists
    const role = await this.getById(roleId);

    // If organization is specified, verify membership
    if (organizationId) {
      const member = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, assignedBy)
          )
        )
        .get() as any;

      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new Error('Permission denied');
      }
    }

    // Check if already assigned
    const existing = await drizzleDb
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          organizationId
            ? eq(userRoles.organizationId, organizationId)
            : eq(userRoles.organizationId, null)
        )
      )
      .get() as any;

    if (existing) {
      throw new Error('Role already assigned to user');
    }

    // Assign role
    await drizzleDb.insert(userRoles).values({
      id: crypto.randomUUID(),
      userId,
      roleId,
      organizationId: organizationId || null,
    });
  }

  /**
   * Get user's roles
   */
  async getUserRoles(
    userId: string,
    organizationId?: string
  ): Promise<Role[]> {
    const drizzleDb = drizzle(this.db);

    let query;
    if (organizationId) {
      query = drizzleDb
        .select({ role: roles })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.organizationId, organizationId)
          )
        );
    } else {
      query = drizzleDb
        .select({ role: roles })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));
    }

    const result = await query.all() as any[];

    return result.map(({ role }) => ({
      ...role,
      permissions: JSON.parse(role.permissions),
    })) as Role[];
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    organizationId?: string
  ): Promise<boolean> {
    // Get user's roles
    const userRolesList = await this.getUserRoles(userId, organizationId);

    // Check if any role has the permission
    for (const role of userRolesList) {
      const perms = typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions;
      if (Array.isArray(perms) && perms.includes(permission)) {
        return true;
      }
    }

    // Also check organization role
    if (organizationId) {
      const drizzleDb = drizzle(this.db);
      const member = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId)
          )
        )
        .get() as any;

      if (member) {
        const { DEFAULT_ROLE_PERMISSIONS } = await import('@perfex/shared');
        const rolePermissions = DEFAULT_ROLE_PERMISSIONS[member.role as 'owner' | 'admin' | 'member'];
        return rolePermissions.includes(permission);
      }
    }

    return false;
  }

  /**
   * Validate permissions array
   */
  private validatePermissions(permissions: string[]): void {
    const { PERMISSIONS } = require('@perfex/shared');
    const validPermissions = Object.keys(PERMISSIONS);

    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }
}
