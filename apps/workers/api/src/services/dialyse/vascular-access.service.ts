/**
 * Vascular Access Service
 * Manage FAV, catheters, and grafts
 */

import { eq, and, desc } from 'drizzle-orm';
import { drizzleDb } from '../../db';
import { vascularAccesses, dialysePatients } from '@perfex/database';
import type {
  VascularAccess,
  CreateVascularAccessInput,
  UpdateVascularAccessInput,
} from '@perfex/shared';

export class VascularAccessService {
  /**
   * Create a new vascular access
   */
  async create(organizationId: string, userId: string, data: CreateVascularAccessInput): Promise<VascularAccess> {
    const now = new Date();
    const accessId = crypto.randomUUID();

    // Verify patient exists
    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(and(eq(dialysePatients.id, data.patientId), eq(dialysePatients.organizationId, organizationId)))
      .get() as any;

    if (!patient) {
      throw new Error('Patient not found');
    }

    // If setting as active, deactivate other active accesses for this patient
    if (data.status === 'active') {
      await drizzleDb
        .update(vascularAccesses)
        .set({ status: 'removed', updatedAt: now })
        .where(
          and(
            eq(vascularAccesses.patientId, data.patientId),
            eq(vascularAccesses.organizationId, organizationId),
            eq(vascularAccesses.status, 'active')
          )
        );
    }

    await drizzleDb.insert(vascularAccesses).values({
      id: accessId,
      organizationId,
      patientId: data.patientId,
      type: data.type,
      location: data.location,
      creationDate: data.creationDate ? new Date(data.creationDate) : null,
      surgeon: data.surgeon || null,
      status: data.status || 'active',
      lastControlDate: data.lastControlDate ? new Date(data.lastControlDate) : null,
      nextControlDate: data.nextControlDate ? new Date(data.nextControlDate) : null,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const access = await this.getById(organizationId, accessId);
    if (!access) {
      throw new Error('Failed to create vascular access');
    }

    return access;
  }

  /**
   * Get vascular access by ID
   */
  async getById(organizationId: string, accessId: string): Promise<VascularAccess | null> {
    const access = await drizzleDb
      .select()
      .from(vascularAccesses)
      .where(and(eq(vascularAccesses.id, accessId), eq(vascularAccesses.organizationId, organizationId)))
      .get() as any;

    return access as VascularAccess || null;
  }

  /**
   * List vascular accesses for a patient
   */
  async listByPatient(organizationId: string, patientId: string): Promise<VascularAccess[]> {
    const accesses = await drizzleDb
      .select()
      .from(vascularAccesses)
      .where(
        and(
          eq(vascularAccesses.patientId, patientId),
          eq(vascularAccesses.organizationId, organizationId)
        )
      )
      .orderBy(desc(vascularAccesses.createdAt))
      .all() as any[];

    return accesses as VascularAccess[];
  }

  /**
   * Get active vascular access for a patient
   */
  async getActiveByPatient(organizationId: string, patientId: string): Promise<VascularAccess | null> {
    const access = await drizzleDb
      .select()
      .from(vascularAccesses)
      .where(
        and(
          eq(vascularAccesses.patientId, patientId),
          eq(vascularAccesses.organizationId, organizationId),
          eq(vascularAccesses.status, 'active')
        )
      )
      .get() as any;

    return access as VascularAccess || null;
  }

  /**
   * Update vascular access
   */
  async update(organizationId: string, accessId: string, data: UpdateVascularAccessInput): Promise<VascularAccess> {
    const existing = await this.getById(organizationId, accessId);
    if (!existing) {
      throw new Error('Vascular access not found');
    }

    const now = new Date();

    // If setting as active, deactivate other active accesses for this patient
    if (data.status === 'active' && existing.status !== 'active') {
      await drizzleDb
        .update(vascularAccesses)
        .set({ status: 'removed', updatedAt: now })
        .where(
          and(
            eq(vascularAccesses.patientId, existing.patientId),
            eq(vascularAccesses.organizationId, organizationId),
            eq(vascularAccesses.status, 'active')
          )
        );
    }

    const updateData: any = { updatedAt: now };

    if (data.type !== undefined) updateData.type = data.type;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.creationDate !== undefined) updateData.creationDate = data.creationDate ? new Date(data.creationDate) : null;
    if (data.surgeon !== undefined) updateData.surgeon = data.surgeon;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.failureDate !== undefined) updateData.failureDate = data.failureDate ? new Date(data.failureDate) : null;
    if (data.failureReason !== undefined) updateData.failureReason = data.failureReason;
    if (data.removalDate !== undefined) updateData.removalDate = data.removalDate ? new Date(data.removalDate) : null;
    if (data.lastControlDate !== undefined) updateData.lastControlDate = data.lastControlDate ? new Date(data.lastControlDate) : null;
    if (data.nextControlDate !== undefined) updateData.nextControlDate = data.nextControlDate ? new Date(data.nextControlDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await drizzleDb
      .update(vascularAccesses)
      .set(updateData)
      .where(and(eq(vascularAccesses.id, accessId), eq(vascularAccesses.organizationId, organizationId)));

    const updated = await this.getById(organizationId, accessId);
    if (!updated) {
      throw new Error('Failed to update vascular access');
    }

    return updated;
  }

  /**
   * Mark vascular access as failed
   */
  async markAsFailed(
    organizationId: string,
    accessId: string,
    failureReason: string
  ): Promise<VascularAccess> {
    return this.update(organizationId, accessId, {
      status: 'failed',
      failureDate: new Date().toISOString(),
      failureReason,
    });
  }

  /**
   * Delete vascular access
   */
  async delete(organizationId: string, accessId: string): Promise<void> {
    const existing = await this.getById(organizationId, accessId);
    if (!existing) {
      throw new Error('Vascular access not found');
    }

    await drizzleDb
      .delete(vascularAccesses)
      .where(and(eq(vascularAccesses.id, accessId), eq(vascularAccesses.organizationId, organizationId)));
  }
}

export const vascularAccessService = new VascularAccessService();
