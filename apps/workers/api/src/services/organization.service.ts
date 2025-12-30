/**
 * Organization Service
 * Manages organizations, members, and invitations
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import {
  organizations,
  organizationMembers,
  users,
  type Organization,
  type OrganizationMember,
} from '@perfex/database';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  OrganizationWithStats,
  OrganizationMemberWithUser,
} from '@perfex/shared';
import { generateRandomToken } from '../utils/crypto';

/**
 * Generate slug from organization name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class OrganizationService {
  constructor(
    private db: D1Database,
    private cache: KVNamespace
  ) {}

  /**
   * Create a new organization
   */
  async create(
    data: CreateOrganizationInput,
    userId: string
  ): Promise<Organization> {
    const drizzleDb = drizzle(this.db);

    // Generate slug if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check if slug already exists
    const existing = await drizzleDb
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .get() as any;

    if (existing) {
      throw new Error('Organization slug already exists');
    }

    // Create organization
    const orgId = crypto.randomUUID();
    const now = new Date();

    await drizzleDb.insert(organizations).values({
      id: orgId,
      name: data.name,
      slug,
      logoUrl: data.logoUrl || null,
      settings: data.settings ? JSON.stringify(data.settings) : null,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as owner
    await drizzleDb.insert(organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId,
      role: 'owner',
      joinedAt: now,
    });

    const org = await drizzleDb
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .get() as any;

    if (!org) {
      throw new Error('Failed to create organization');
    }

    return org as Organization;
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<OrganizationWithStats[]> {
    const drizzleDb = drizzle(this.db);

    // Get all organizations where user is a member
    const result = await drizzleDb
      .select({
        org: organizations,
        member: organizationMembers,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .all() as any[];

    // Get member counts and owner info for each org
    const orgsWithStats: OrganizationWithStats[] = [];

    for (const { org, member } of result) {
      // Count members
      const memberCountResult = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, org.id))
        .all() as any[];

      // Get owner
      const ownerMember = await drizzleDb
        .select({
          user: users,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.organizationId, org.id),
            eq(organizationMembers.role, 'owner')
          )
        )
        .get() as any;

      const ownerName = ownerMember?.user
        ? `${ownerMember.user.firstName || ''} ${ownerMember.user.lastName || ''}`.trim() || ownerMember.user.email
        : 'Unknown';

      orgsWithStats.push({
        ...org,
        settings: org.settings ? JSON.parse(org.settings as string) : null,
        memberCount: memberCountResult.length,
        ownerName,
      } as OrganizationWithStats);
    }

    return orgsWithStats;
  }

  /**
   * Get organization by ID
   */
  async getById(orgId: string, userId: string): Promise<Organization> {
    const drizzleDb = drizzle(this.db);

    // Check if user has access
    const member = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .get() as any;

    if (!member) {
      throw new Error('Organization not found or access denied');
    }

    const org = await drizzleDb
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .get() as any;

    if (!org) {
      throw new Error('Organization not found');
    }

    return {
      ...org,
      settings: org.settings ? JSON.parse(org.settings as string) : null,
    } as Organization;
  }

  /**
   * Update organization
   */
  async update(
    orgId: string,
    userId: string,
    data: UpdateOrganizationInput
  ): Promise<Organization> {
    const drizzleDb = drizzle(this.db);

    // Check if user is owner or admin
    const member = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .get() as any;

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Permission denied');
    }

    await drizzleDb
      .update(organizations)
      .set({
        ...data,
        settings: data.settings ? JSON.stringify(data.settings) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    return this.getById(orgId, userId);
  }

  /**
   * Delete organization
   */
  async delete(orgId: string, userId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    // Check if user is owner
    const member = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .get() as any;

    if (!member || member.role !== 'owner') {
      throw new Error('Only organization owner can delete the organization');
    }

    // Delete all members
    await drizzleDb
      .delete(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));

    // Delete organization
    await drizzleDb
      .delete(organizations)
      .where(eq(organizations.id, orgId));
  }

  /**
   * Get organization members
   */
  async getMembers(orgId: string, userId: string): Promise<OrganizationMemberWithUser[]> {
    const drizzleDb = drizzle(this.db);

    // Check if user has access
    const userMember = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .get() as any;

    if (!userMember) {
      throw new Error('Access denied');
    }

    // Get all members with user info
    const members = await drizzleDb
      .select({
        member: organizationMembers,
        user: users,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, orgId))
      .all() as any[];

    return members.map(({ member, user }) => ({
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role as 'owner' | 'admin' | 'member',
      joinedAt: member.joinedAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
    }));
  }

  /**
   * Invite member to organization
   */
  async inviteMember(
    orgId: string,
    userId: string,
    data: InviteMemberInput
  ): Promise<{ invitationToken: string }> {
    const drizzleDb = drizzle(this.db);

    // Check if user is owner or admin
    const member = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .get() as any;

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Permission denied');
    }

    // Check if user exists and isn't already a member
    const invitedUser = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .get() as any;

    if (invitedUser) {
      const existingMember = await drizzleDb
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, invitedUser.id)
          )
        )
        .get() as any;

      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }
    }

    // Generate invitation token
    const invitationToken = generateRandomToken(32);

    // Store invitation in KV (expires in 7 days)
    const invitationKey = `invitation:${invitationToken}`;
    const invitationData = {
      organizationId: orgId,
      email: data.email,
      role: data.role,
      invitedBy: userId,
      createdAt: new Date().toISOString(),
    };

    await this.cache.put(invitationKey, JSON.stringify(invitationData), {
      expirationTtl: 7 * 24 * 60 * 60, // 7 days
    });

    // TODO: Send invitation email

    return { invitationToken };
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    userId: string,
    data: UpdateMemberRoleInput
  ): Promise<void> {
    const drizzleDb = drizzle(this.db);

    // Check if user is owner or admin
    const member = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .get() as any;

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Permission denied');
    }

    // Can't change owner role
    const targetMember = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, targetUserId)
        )
      )
      .get() as any;

    if (!targetMember) {
      throw new Error('Member not found');
    }

    if (targetMember.role === 'owner') {
      throw new Error('Cannot change owner role');
    }

    await drizzleDb
      .update(organizationMembers)
      .set({ role: data.role })
      .where(eq(organizationMembers.id, targetMember.id));
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    orgId: string,
    targetUserId: string,
    userId: string
  ): Promise<void> {
    const drizzleDb = drizzle(this.db);

    // Check if user is owner or admin
    const member = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .get() as any;

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Permission denied');
    }

    // Can't remove owner
    const targetMember = await drizzleDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, targetUserId)
        )
      )
      .get() as any;

    if (!targetMember) {
      throw new Error('Member not found');
    }

    if (targetMember.role === 'owner') {
      throw new Error('Cannot remove organization owner');
    }

    await drizzleDb
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, targetMember.id));
  }
}
